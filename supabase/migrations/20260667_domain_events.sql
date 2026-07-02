-- ============================================================
-- VELOX TMS — Projeto 05.1: Outbox / event bus (domain_events)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Hoje as transições-chave são escritas diretas com efeitos colaterais síncronos
-- e inline (alertas espalhados, recálculos no cliente). Não há log de eventos.
--
-- Solução (aditiva): `domain_events` é o OUTBOX append-only. A emissão é feita por
-- TRIGGERS nas tabelas-chave — captura toda transição (via RPC ou update direto)
-- SEM reescrever as RPCs (confirm_order/settle/etc.). Um evento é só um INSERT:
-- zero mudança de comportamento. Consumidores (P05.3) leem processed_at IS NULL.

CREATE TABLE IF NOT EXISTS public.domain_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL,               -- ex: 'order.status_changed', 'settlement.created'
  entity       TEXT NOT NULL,               -- 'order' | 'settlement' | 'incident' | 'transfer'
  entity_id    TEXT,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id     UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ                  -- NULL = ainda não consumido
);
CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed ON public.domain_events(created_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_domain_events_entity      ON public.domain_events(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_type        ON public.domain_events(type, created_at DESC);

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
-- Leitura: staff. Escrita: só via trigger/RPC definer — sem policy de INSERT.
DROP POLICY IF EXISTS domain_events_staff_read ON public.domain_events;
CREATE POLICY domain_events_staff_read ON public.domain_events
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- inserter interno (incondicional; usado por triggers e por emit_event) ----------
CREATE OR REPLACE FUNCTION public.domain_event_write(p_type TEXT, p_entity TEXT, p_entity_id TEXT, p_payload JSONB, p_actor UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.domain_events (type, entity, entity_id, payload, actor_id)
    VALUES (p_type, p_entity, p_entity_id, COALESCE(p_payload,'{}'::jsonb), p_actor)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
-- Interno: nunca chamável direto por clientes (triggers rodam como dono).
REVOKE ALL ON FUNCTION public.domain_event_write(TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;

-- ---------- emissão manual (staff) ----------
CREATE OR REPLACE FUNCTION public.emit_event(p_type TEXT, p_entity TEXT, p_entity_id TEXT DEFAULT NULL, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode emitir eventos.'; END IF;
  RETURN public.domain_event_write(p_type, p_entity, p_entity_id, p_payload, auth.uid());
END; $$;
GRANT EXECUTE ON FUNCTION public.emit_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================================
-- TRIGGERS — emissão automática nas transições-chave
-- ============================================================

-- Pedidos: criação + mudança de status
CREATE OR REPLACE FUNCTION public.tg_orders_events() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.domain_event_write('order.created', 'order', NEW.id::text,
      jsonb_build_object('protocol', NEW.protocol, 'status', NEW.status), auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.domain_event_write('order.status_changed', 'order', NEW.id::text,
      jsonb_build_object('protocol', NEW.protocol, 'from', OLD.status, 'to', NEW.status), auth.uid());
  END IF;
  RETURN NULL; -- AFTER trigger
END; $$;
DROP TRIGGER IF EXISTS trg_orders_events ON public.orders;
CREATE TRIGGER trg_orders_events AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_orders_events();

-- Liquidações (P04): criação e estorno
CREATE OR REPLACE FUNCTION public.tg_settlements_events() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.domain_event_write(
    CASE WHEN NEW.reversal_of IS NULL THEN 'settlement.created' ELSE 'settlement.reversed' END,
    'settlement', NEW.id::text,
    jsonb_build_object('target_type', NEW.target_type, 'target_id', NEW.target_id, 'amount', NEW.amount, 'source', NEW.source),
    auth.uid());
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_settlements_events ON public.settlements;
CREATE TRIGGER trg_settlements_events AFTER INSERT ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.tg_settlements_events();

-- Ocorrências: abertura + resolução
CREATE OR REPLACE FUNCTION public.tg_incidents_events() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.domain_event_write('incident.opened', 'incident', NEW.id::text,
      jsonb_build_object('type', NEW.type, 'status', NEW.status), auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'resolved' THEN
    PERFORM public.domain_event_write('incident.resolved', 'incident', NEW.id::text,
      jsonb_build_object('type', NEW.type), auth.uid());
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_incidents_events ON public.incidents;
CREATE TRIGGER trg_incidents_events AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.tg_incidents_events();

-- Transferências (cross-docking): mudança de status
CREATE OR REPLACE FUNCTION public.tg_transfers_events() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.domain_event_write('transfer.status_changed', 'transfer', NEW.id::text,
      jsonb_build_object('protocol', NEW.protocol, 'from', OLD.status, 'to', NEW.status), auth.uid());
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_transfers_events ON public.transfers;
CREATE TRIGGER trg_transfers_events AFTER UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.tg_transfers_events();

SELECT 'Projeto 05.1: domain_events + emit_event + triggers (orders/settlements/incidents/transfers).' AS resultado;

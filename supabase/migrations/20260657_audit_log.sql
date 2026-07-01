-- ============================================================
-- VELOX TMS — Roadmap 2.3 (parte 1): audit log central
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Trilha central de ações sensíveis (além do user_audit_log, que é só de admin).
-- Qualquer staff (admin/operator) registra via log_action; leitura só admin.
-- Aditivo: não altera RPCs existentes — a instrumentação chama log_action após
-- a ação. (Endurecimento futuro: gatilhos/logging dentro das RPCs.)

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,        -- ex: "Cancelou pedido", "Pagou fatura"
  entity      TEXT,                 -- ex: "order", "invoice", "trip"
  entity_id   TEXT,                 -- protocolo/número/id de referência
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Leitura: só admin. Inserção: apenas via RPC (SECURITY DEFINER); sem policy de INSERT.
DROP POLICY IF EXISTS audit_log_admin_read ON public.audit_log;
CREATE POLICY audit_log_admin_read ON public.audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role = 'admin' AND COALESCE(up.active,true)));

CREATE OR REPLACE FUNCTION public.log_action(p_action TEXT, p_entity TEXT DEFAULT NULL, p_entity_id TEXT DEFAULT NULL, p_detail TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  -- Só staff registra; se não for staff, ignora em silêncio (não trava a ação).
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)) THEN
    RETURN;
  END IF;
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity, entity_id, detail)
    VALUES (auth.uid(), v_email, p_action, NULLIF(p_entity,''), NULLIF(p_entity_id,''), NULLIF(p_detail,''));
END; $$;
GRANT EXECUTE ON FUNCTION public.log_action(TEXT, TEXT, TEXT, TEXT) TO authenticated;

SELECT 'Audit log central pronto: audit_log + log_action (staff) + leitura admin.' AS resultado;

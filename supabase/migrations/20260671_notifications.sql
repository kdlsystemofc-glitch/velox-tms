-- ============================================================
-- VELOX TMS — Projeto 06.5: Motor de notificações (multicanal)
-- Idempotente. Rode DEPOIS de 20260670.
-- ============================================================
-- Motor guiado por eventos: consome domain_events → aplica regras → enfileira
-- notificações por CANAL → despacha. Canal in-app entregue já (grava um alerta,
-- que o sino lê). Canal externo (e-mail) fica como ADAPTADOR pronto: sem provedor
-- configurado, o dispatch marca 'skipped' (liga-se quando o provedor for escolhido).

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID REFERENCES public.domain_events(id),
  channel    TEXT NOT NULL CHECK (channel IN ('inapp','email','whatsapp')),
  recipient  TEXT,
  subject    TEXT,
  body       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','failed')),
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON public.notifications(created_at) WHERE status = 'pending';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_staff_read ON public.notifications;
CREATE POLICY notifications_staff_read ON public.notifications
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- regras: eventos → notificações enfileiradas ----------
CREATE OR REPLACE FUNCTION public.notify_from_events()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD; v_email TEXT; v_n INTEGER := 0;
BEGIN
  FOR e IN SELECT * FROM public.domain_events WHERE processed_at IS NULL ORDER BY created_at LOOP
    IF e.type = 'incident.sla_breached' THEN
      INSERT INTO public.notifications (event_id, channel, recipient, subject, body)
        VALUES (e.id, 'inapp', 'staff', 'SLA estourado',
                'Ocorrência ' || COALESCE(e.payload->>'type','?') || ' (pedido ' || COALESCE(e.payload->>'protocol','?') || ') estourou o SLA.');
      v_n := v_n + 1;

    ELSIF e.type = 'invoice.created' THEN
      INSERT INTO public.notifications (event_id, channel, recipient, subject, body)
        VALUES (e.id, 'inapp', 'staff', 'Fatura gerada',
                'Fatura ' || COALESCE(e.payload->>'number','') || ' — R$ ' || COALESCE(e.payload->>'total','0'));
      -- canal externo (e-mail ao cliente): enfileira; dispatch decide o envio.
      SELECT email INTO v_email FROM public.clients WHERE id = (e.payload->>'client_id')::uuid;
      IF v_email IS NOT NULL AND v_email <> '' THEN
        INSERT INTO public.notifications (event_id, channel, recipient, subject, body)
          VALUES (e.id, 'email', v_email, 'Sua fatura Velox',
                  'Fatura ' || COALESCE(e.payload->>'number','') || ' no valor de R$ ' || COALESCE(e.payload->>'total','0') || '.');
      END IF;
      v_n := v_n + 1;
    END IF;

    -- Marca o evento consumido (único consumidor por ora).
    UPDATE public.domain_events SET processed_at = now() WHERE id = e.id;
  END LOOP;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.notify_from_events() FROM PUBLIC;

-- ---------- despachante multicanal ----------
-- in-app → grava alerta (o sino lê). email/whatsapp → sem provedor: 'skipped'
-- (adaptador externo pronto para plugar quando o provedor for definido).
CREATE OR REPLACE FUNCTION public.dispatch_notifications()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n RECORD; v_n INTEGER := 0;
BEGIN
  FOR n IN SELECT * FROM public.notifications WHERE status = 'pending' ORDER BY created_at LOOP
    IF n.channel = 'inapp' THEN
      INSERT INTO public.alerts (type, level, message, reference_type, read, resolved)
        VALUES ('notification', 'warning', COALESCE(n.subject || ' — ', '') || COALESCE(n.body,''), 'notification', false, false);
      UPDATE public.notifications SET status = 'sent', sent_at = now() WHERE id = n.id;
      v_n := v_n + 1;
    ELSE
      -- e-mail/whatsapp: provedor externo ainda não configurado (adiado).
      UPDATE public.notifications SET status = 'skipped', error = 'canal externo pendente de provedor', sent_at = now() WHERE id = n.id;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.dispatch_notifications() FROM PUBLIC;

-- ---------- despachante final: sweeps + notificações ----------
CREATE OR REPLACE FUNCTION public.run_due_jobs()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Apenas a equipe pode executar os jobs.';
  END IF;
  v_result := jsonb_build_object(
    'sweep_overdue',       public.sweep_overdue(),
    'run_billing_cycle',   public.run_billing_cycle(),
    'sweep_carrier',       public.sweep_carrier_settlements(),
    'auto_reconcile',      public.auto_reconcile(),
    'sweep_incident_sla',  public.sweep_incident_sla(),
    'notify_from_events',  public.notify_from_events(),
    'dispatch_notifications', public.dispatch_notifications(),
    'ran_at',              now()
  );
  INSERT INTO public.job_runs (job, result) VALUES ('run_due_jobs', v_result);
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.run_due_jobs() TO authenticated;

SELECT 'Projeto 06.5: motor de notificações (notifications + notify_from_events + dispatch) — in-app ativo, externo pluggable.' AS resultado;

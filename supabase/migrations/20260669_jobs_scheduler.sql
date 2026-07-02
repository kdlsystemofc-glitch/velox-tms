-- ============================================================
-- VELOX TMS — Projeto 05.3: Jobs/agendador + consumidor assíncrono
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Primeiro consumidor assíncrono em produção: varredura de vencidos (sweep_overdue)
-- roda fora da requisição do usuário — hoje "vencido" só é inferido ad-hoc no
-- cliente. run_due_jobs() é o despachante (chamado pelo pg_cron OU manualmente).
-- job_runs registra cada execução (observabilidade). Agendamento pg_cron é
-- TOLERANTE: se a extensão não existir (ex.: CI), vira no-op + aviso.

-- ---------- log de execuções (observabilidade) ----------
CREATE TABLE IF NOT EXISTS public.job_runs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job       TEXT NOT NULL,
  ran_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  result    JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_job_runs_ran ON public.job_runs(ran_at DESC);
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_runs_staff_read ON public.job_runs;
CREATE POLICY job_runs_staff_read ON public.job_runs FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- consumidor: varredura de vencidos ----------
-- Marca receitas 'receivable' vencidas como 'overdue' (idempotente; só por data,
-- sem tocar valores) e emite um evento-resumo. Retorna quantas mudaram.
CREATE OR REPLACE FUNCTION public.sweep_overdue()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n INTEGER;
BEGIN
  UPDATE public.revenues SET status = 'overdue'
    WHERE status = 'receivable' AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n > 0 THEN
    PERFORM public.domain_event_write('maintenance.overdue_swept', 'revenue', NULL,
      jsonb_build_object('marcadas', v_n), NULL);
  END IF;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.sweep_overdue() FROM PUBLIC;

-- ---------- despachante dos jobs agendados ----------
-- Chamado pelo pg_cron (auth.uid() nulo) OU manualmente por staff (RPC).
CREATE OR REPLACE FUNCTION public.run_due_jobs()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_overdue INTEGER; v_result JSONB;
BEGIN
  -- cron roda como postgres (sem auth.uid); staff também pode disparar manualmente.
  IF auth.uid() IS NOT NULL AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Apenas a equipe pode executar os jobs.';
  END IF;
  v_overdue := public.sweep_overdue();
  v_result  := jsonb_build_object('sweep_overdue', v_overdue, 'ran_at', now());
  INSERT INTO public.job_runs (job, result) VALUES ('run_due_jobs', v_result);
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.run_due_jobs() TO authenticated;

-- ---------- agendamento via pg_cron (TOLERANTE) ----------
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- idempotente: remove o agendamento anterior se existir, então reagenda
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'velox-daily-jobs') THEN
      PERFORM cron.unschedule('velox-daily-jobs');
    END IF;
    PERFORM cron.schedule('velox-daily-jobs', '0 6 * * *', 'SELECT public.run_due_jobs();');
    RAISE NOTICE 'pg_cron: job diário "velox-daily-jobs" agendado (06:00 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron ausente — habilite a extensão no painel e reexecute, ou chame run_due_jobs() manualmente.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Não foi possível agendar via pg_cron (%). Use run_due_jobs() manual.', SQLERRM;
END $do$;

SELECT 'Projeto 05.3: jobs (sweep_overdue/run_due_jobs) + job_runs + agendamento pg_cron tolerante.' AS resultado;

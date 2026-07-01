-- ============================================================
-- VELOX TMS — Roadmap 3.7 (base): observabilidade de erros do front (cost-free)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Persiste erros de renderização do front (ErrorBoundary) para o admin ver, sem
-- depender de serviço externo (Sentry continua opcional). Best-effort: nunca
-- deve travar o app. Leitura só admin; inserção via RPC (qualquer autenticado).

CREATE TABLE IF NOT EXISTS public.client_errors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  user_email TEXT,
  message    TEXT,
  stack      TEXT,
  url        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_errors_created ON public.client_errors(created_at DESC);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_errors_admin_read ON public.client_errors;
CREATE POLICY client_errors_admin_read ON public.client_errors FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role = 'admin' AND COALESCE(up.active,true)));

CREATE OR REPLACE FUNCTION public.log_client_error(p_message TEXT, p_stack TEXT DEFAULT NULL, p_url TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.client_errors (user_id, user_email, message, stack, url)
    VALUES (auth.uid(), v_email, LEFT(COALESCE(p_message,''), 1000), LEFT(COALESCE(p_stack,''), 6000), LEFT(COALESCE(p_url,''), 400));
END; $$;
GRANT EXECUTE ON FUNCTION public.log_client_error(TEXT, TEXT, TEXT) TO authenticated;

SELECT 'Observabilidade pronta: client_errors + log_client_error (leitura admin).' AS resultado;

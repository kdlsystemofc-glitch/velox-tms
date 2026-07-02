-- ============================================================
-- VELOX TMS — Projeto 07.3: Recuperação de MFA (reset por admin, auditado)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Pré-requisito do projeto: se o usuário perder o app autenticador, um ADMIN
-- redefine o 2FA. O SPA só tem a anon key (sem Admin API), então usamos uma
-- função SECURITY DEFINER (dona = postgres) que apaga os fatores em
-- auth.mfa_factors diretamente — sem service_role/edge function. Auditado.

CREATE OR REPLACE FUNCTION public.admin_reset_mfa(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_n INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem redefinir o 2FA.'; END IF;
  DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM public.log_action('Redefiniu 2FA', 'user', p_user_id::text, v_n || ' fator(es) removido(s)');
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.admin_reset_mfa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_mfa(UUID) TO authenticated;

SELECT 'Projeto 07.3: admin_reset_mfa pronto (reset de 2FA por admin, auditado).' AS resultado;

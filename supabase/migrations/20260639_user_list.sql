-- ============================================================
-- VELOX TMS — Usuários (Usr-2): listagem com último acesso
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Junta user_profiles com auth.users.last_sign_in_at (que o front não pode ler
-- direto). Só administradores executam.

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, role TEXT, active BOOLEAN,
  driver_id UUID, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.role, p.active, p.driver_id, p.created_at, u.last_sign_in_at
    FROM public.user_profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at ASC;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

SELECT 'Usuários Usr-2: listagem com último acesso pronta.' AS resultado;

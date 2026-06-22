-- ============================================================
-- VELOX TMS — Controle de papéis (quem é admin é definido por você)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Acaba com o "qualquer login vira admin". Agora:
--  • quem se cadastra sem perfil entra como 'pending' (SEM acesso);
--  • um ADMIN define o papel de cada um (admin / operator / motorista) no painel.

-- 1) Permite o papel 'pending' (sem privilégio) além dos existentes.
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operator','motorista','pending'));

-- helper: quem é admin (recriado aqui também por segurança/idempotência)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- 2) Definir o papel de um usuário (não deixa remover o ÚLTIMO admin)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id UUID, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old TEXT; v_admins INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_role NOT IN ('admin','operator','motorista','pending') THEN RAISE EXCEPTION 'Papel inválido'; END IF;
  SELECT role INTO v_old FROM public.user_profiles WHERE id = p_user_id;
  IF v_old = 'admin' AND p_role <> 'admin' THEN
    SELECT count(*) INTO v_admins FROM public.user_profiles WHERE role='admin';
    IF v_admins <= 1 THEN RAISE EXCEPTION 'Não é possível remover o último administrador'; END IF;
  END IF;
  UPDATE public.user_profiles SET role = p_role, active = true WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 3) Ativar / desativar um usuário (desativar = bloqueia o login)
CREATE OR REPLACE FUNCTION public.admin_set_user_active(p_user_id UUID, p_active BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_role TEXT; v_admins INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = p_user_id;
  IF NOT p_active AND v_role = 'admin' THEN
    SELECT count(*) INTO v_admins FROM public.user_profiles WHERE role='admin' AND COALESCE(active,true);
    IF v_admins <= 1 THEN RAISE EXCEPTION 'Não é possível desativar o último administrador'; END IF;
  END IF;
  UPDATE public.user_profiles SET active = p_active WHERE id = p_user_id;
  IF p_active THEN
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
  ELSE
    UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE id = p_user_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 4) Excluir um usuário (não exclui o último admin nem você mesmo)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_role TEXT; v_admins INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode excluir a si mesmo'; END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = p_user_id;
  IF v_role = 'admin' THEN
    SELECT count(*) INTO v_admins FROM public.user_profiles WHERE role='admin';
    IF v_admins <= 1 THEN RAISE EXCEPTION 'Não é possível excluir o último administrador'; END IF;
  END IF;
  UPDATE drivers SET user_id = NULL, app_access='none', app_email=NULL WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;  -- cascateia user_profiles e identities
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- ============================================================
-- BOOTSTRAP: defina o(s) administrador(es) por e-mail (rode UMA vez).
-- Troque pelo seu e-mail. Garante que você continua admin após a mudança.
-- ============================================================
-- UPDATE user_profiles SET role='admin', active=true
--   WHERE email = 'seu-email-admin@exemplo.com';

SELECT 'Controle de papéis criado. Defina os admins pelo painel (ou pelo UPDATE acima).' AS resultado;

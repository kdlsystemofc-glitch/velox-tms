-- ============================================================
-- VELOX TMS — Gestão de acesso do motorista (criar/senha/congelar/excluir)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Cria o login do app do motorista a partir do painel admin, com controle de
-- senha, congelamento e exclusão. Tudo via funções SECURITY DEFINER protegidas
-- (só administradores executam). Não expõe a service_role no front.
--
-- ⚠️ Estas funções tocam o schema `auth` do Supabase. Rode e crie UM motorista
--    de teste para validar na sua versão. Se algum campo do `auth.users` divergir,
--    me avise que ajusto (a estrutura muda pouco, mas pode variar por versão).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Espelho do estado de acesso no cadastro do motorista (para a UI ler sem tocar auth)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS app_access TEXT DEFAULT 'none' CHECK (app_access IN ('none','active','frozen'));
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS app_email TEXT;

-- Quem é admin?
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- ── Criar login do motorista ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_driver_login(
  p_driver_id UUID, p_email TEXT, p_password TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE v_uid UUID; v_name TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_email IS NULL OR length(p_password) < 6 THEN RAISE EXCEPTION 'E-mail e senha (mín. 6) são obrigatórios'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) THEN
    RAISE EXCEPTION 'Já existe um usuário com este e-mail';
  END IF;
  SELECT name INTO v_name FROM drivers WHERE id = p_driver_id;
  v_uid := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    lower(p_email), crypt(p_password, gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', COALESCE(v_name,'')),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now()
  );

  INSERT INTO public.user_profiles (id, email, full_name, role, driver_id, active)
  VALUES (v_uid, lower(p_email), COALESCE(v_name,''), 'motorista', p_driver_id, true)
  ON CONFLICT (id) DO UPDATE SET role='motorista', driver_id=p_driver_id, active=true;

  UPDATE drivers SET user_id = v_uid, app_access = 'active', app_email = lower(p_email) WHERE id = p_driver_id;
  RETURN jsonb_build_object('ok', true, 'user_id', v_uid);
END; $$;

-- ── Redefinir senha ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reset_driver_password(
  p_driver_id UUID, p_password TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE v_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF length(p_password) < 6 THEN RAISE EXCEPTION 'Senha mínima de 6 caracteres'; END IF;
  SELECT user_id INTO v_uid FROM drivers WHERE id = p_driver_id;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Motorista sem login'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() WHERE id = v_uid;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ── Congelar / reativar acesso ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_driver_access(
  p_driver_id UUID, p_frozen BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT user_id INTO v_uid FROM drivers WHERE id = p_driver_id;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Motorista sem login'; END IF;
  IF p_frozen THEN
    UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE id = v_uid;
    UPDATE public.user_profiles SET active = false WHERE id = v_uid;
    UPDATE drivers SET app_access = 'frozen' WHERE id = p_driver_id;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = v_uid;
    UPDATE public.user_profiles SET active = true WHERE id = v_uid;
    UPDATE drivers SET app_access = 'active' WHERE id = p_driver_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ── Excluir login ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_driver_login(
  p_driver_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT user_id INTO v_uid FROM drivers WHERE id = p_driver_id;
  UPDATE drivers SET user_id = NULL, app_access = 'none', app_email = NULL WHERE id = p_driver_id;
  IF v_uid IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_uid;  -- cascateia identities e user_profiles
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_driver_login(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_driver_password(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_driver_access(UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_driver_login(UUID) TO authenticated;

SELECT 'Gestão de acesso do motorista criada.' AS resultado;

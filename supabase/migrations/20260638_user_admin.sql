-- ============================================================
-- VELOX TMS — Usuários (Usr-1): criar usuário e redefinir senha pelo painel
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Espelha o padrão já validado de admin_create_driver_login: cria o login no
-- servidor via SECURITY DEFINER (sem expor a service_role no front). Só admins.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Criar usuário (admin / operator) ──────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT, p_password TEXT, p_full_name TEXT, p_role TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE v_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_email IS NULL OR length(p_password) < 6 THEN RAISE EXCEPTION 'E-mail e senha (mín. 6) são obrigatórios'; END IF;
  IF p_role NOT IN ('admin','operator','motorista','pending') THEN RAISE EXCEPTION 'Papel inválido'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) THEN
    RAISE EXCEPTION 'Já existe um usuário com este e-mail';
  END IF;
  v_uid := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    lower(p_email), crypt(p_password, gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', COALESCE(p_full_name,'')),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now()
  );

  INSERT INTO public.user_profiles (id, email, full_name, role, active)
  VALUES (v_uid, lower(p_email), COALESCE(p_full_name,''), p_role, true)
  ON CONFLICT (id) DO UPDATE SET role = p_role, full_name = COALESCE(p_full_name,''), active = true;

  RETURN jsonb_build_object('ok', true, 'user_id', v_uid);
END; $$;

-- ── Redefinir senha de um usuário ─────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id UUID, p_password TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF length(p_password) < 6 THEN RAISE EXCEPTION 'Senha mínima de 6 caracteres'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID,TEXT) TO authenticated;

SELECT 'Usuários Usr-1: criar usuário + redefinir senha prontos.' AS resultado;

-- ============================================================
-- VELOX TMS — Perfil automático no cadastro (corrige "Acesso não liberado")
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- PROBLEMA: quem se cadastra (e-mail ou Google) NÃO ganhava linha em user_profiles,
-- então o app o tratava como 'pending' (sem acesso) e ele nem aparecia em Usuários
-- para um admin liberar. Não havia admin inicial (chicken-and-egg).
--
-- SOLUÇÃO:
--  1) Garante o papel 'pending' no CHECK.
--  2) Trigger cria o perfil no signup. Se AINDA não existe nenhum admin ativo,
--     o novo usuário vira 'admin' (bootstrap do primeiro acesso); senão, 'pending'.
--  3) Backfill: cria perfil para usuários já existentes sem perfil.

-- 1) Permite 'pending'
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operator','motorista','pending'));

-- 2) Função + trigger de criação automática
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_has_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE role = 'admin' AND COALESCE(active, true)) INTO v_has_admin;
  INSERT INTO public.user_profiles (id, email, full_name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN v_has_admin THEN 'pending' ELSE 'admin' END,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Backfill: cria perfil 'pending' para quem já tem conta mas não tem perfil
INSERT INTO public.user_profiles (id, email, full_name, role, active)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', ''), 'pending', true
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4) Se ainda não há NENHUM admin ativo, promove o usuário mais antigo (desbloqueio inicial)
UPDATE public.user_profiles
SET role = 'admin', active = true
WHERE id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE role = 'admin' AND COALESCE(active, true));

SELECT 'Perfil automático no cadastro pronto. Primeiro usuário é admin.' AS resultado;

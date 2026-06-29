-- ============================================================
-- VELOX TMS — Portal do Cliente (Onda 1a): papel "client" + auto-cadastro
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Modelo: o cliente se cadastra sozinho (informando a empresa/CNPJ), entra como
-- 'pending' e um admin APROVA, vinculando ao client_id. Depois, o login leva ao
-- Portal do Cliente, que só enxerga os próprios pedidos (via RPC SECURITY DEFINER,
-- sem expor a tabela orders inteira).

-- 1) Permite o papel 'client' e os vínculos no perfil
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operator','motorista','client','pending'));
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS requested_company TEXT;

-- 2) Pedidos do cliente logado (escopo seguro por client_id do próprio perfil)
CREATE OR REPLACE FUNCTION public.my_client_orders()
RETURNS SETOF public.orders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.* FROM public.orders o
  WHERE o.client_id = (
    SELECT up.client_id FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false)
  );
$$;
GRANT EXECUTE ON FUNCTION public.my_client_orders() TO authenticated;

-- 3) Perfil do cliente logado (dados básicos do client vinculado + status)
CREATE OR REPLACE FUNCTION public.my_client_profile()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'role', up.role, 'active', up.active, 'client_id', up.client_id,
    'requested_company', up.requested_company,
    'client_name', c.company_name, 'client_cnpj', c.cpf_cnpj
  )
  FROM public.user_profiles up
  LEFT JOIN public.clients c ON c.id = up.client_id
  WHERE up.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.my_client_profile() TO authenticated;

-- 3.1) O próprio usuário recém-cadastrado registra a empresa que solicitou
CREATE OR REPLACE FUNCTION public.set_my_requested_company(p_company TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles SET requested_company = NULLIF(btrim(p_company), '')
  WHERE id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.set_my_requested_company(TEXT) TO authenticated;

-- 4) ADMIN: lista solicitações de acesso de cliente pendentes
CREATE OR REPLACE FUNCTION public.admin_pending_client_requests()
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, requested_company TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT up.id, up.email, up.full_name, up.requested_company, up.created_at
  FROM public.user_profiles up
  WHERE up.role = 'pending' AND up.requested_company IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_profiles me WHERE me.id = auth.uid() AND me.role = 'admin' AND COALESCE(me.active,true))
  ORDER BY up.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_pending_client_requests() TO authenticated;

-- 5) ADMIN: aprova um cliente, vinculando ao client_id e ativando
CREATE OR REPLACE FUNCTION public.admin_approve_client(p_user_id UUID, p_client_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin' AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar acessos de cliente.';
  END IF;
  UPDATE public.user_profiles
    SET role = 'client', client_id = p_client_id, active = true
    WHERE id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_approve_client(UUID, UUID) TO authenticated;

SELECT 'Portal do Cliente (1a) pronto: papel client + RPCs de pedidos/perfil/aprovação.' AS resultado;

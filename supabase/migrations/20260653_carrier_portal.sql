-- ============================================================
-- VELOX TMS — Portal da Transportadora (Mega-feature 2): subcontratação
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Modelo (espelha o Portal do Cliente):
--   1. A transportadora parceira se cadastra (/parceiro/cadastro), entra como
--      'pending' com requested_role='carrier'. Um admin aprova e vincula ao
--      carrier_id (vira role 'carrier').
--   2. O admin OFERTA um pedido a um parceiro (carrier_status='offered' + valor).
--   3. O parceiro ACEITA/RECUSA (carrier_respond_offer) e, aceitando, passa a
--      atualizar o status da carga (carrier_update_order_status).
--   Tudo via RPC SECURITY DEFINER, com escopo pelo carrier_id do próprio perfil.

-- 1) Papel 'carrier' + vínculos no perfil
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operator','motorista','client','carrier','pending'));
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS requested_role TEXT; -- 'client' | 'carrier'

-- 2) Transportadoras parceiras (subcontratadas)
CREATE TABLE IF NOT EXISTS public.carriers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     TEXT NOT NULL,
  cpf_cnpj         TEXT,
  contact_name     TEXT,
  phone            TEXT,
  email            TEXT,
  status           TEXT NOT NULL DEFAULT 'active',  -- active | inactive
  payment_term_days INTEGER DEFAULT 30,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES public.carriers(id);

ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
-- Só staff acessa a tabela direto; o parceiro vê os próprios dados via RPC.
DROP POLICY IF EXISTS carriers_staff_all ON public.carriers;
CREATE POLICY carriers_staff_all ON public.carriers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)));

-- 3) Subcontratação no pedido
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES public.carriers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_status TEXT;             -- offered | accepted | refused
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_amount NUMERIC;          -- valor combinado com o parceiro
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_offered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_responded_at TIMESTAMPTZ;

-- 4) Cadastro: o parceiro registra a empresa solicitada (separado do cliente)
CREATE OR REPLACE FUNCTION public.set_my_carrier_request(p_company TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles
    SET requested_company = NULLIF(btrim(p_company), ''), requested_role = 'carrier'
    WHERE id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.set_my_carrier_request(TEXT) TO authenticated;

-- 4.1) admin_pending_client_requests passa a EXCLUIR quem pediu acesso de parceiro
CREATE OR REPLACE FUNCTION public.admin_pending_client_requests()
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, requested_company TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT up.id, up.email, up.full_name, up.requested_company, up.created_at
  FROM public.user_profiles up
  WHERE up.role = 'pending' AND up.requested_company IS NOT NULL
    AND COALESCE(up.requested_role, 'client') <> 'carrier'
    AND EXISTS (SELECT 1 FROM public.user_profiles me WHERE me.id = auth.uid() AND me.role = 'admin' AND COALESCE(me.active,true))
  ORDER BY up.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_pending_client_requests() TO authenticated;

-- 5) ADMIN: solicitações de acesso de parceiro pendentes
CREATE OR REPLACE FUNCTION public.admin_pending_carrier_requests()
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, requested_company TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT up.id, up.email, up.full_name, up.requested_company, up.created_at
  FROM public.user_profiles up
  WHERE up.role = 'pending' AND up.requested_role = 'carrier'
    AND EXISTS (SELECT 1 FROM public.user_profiles me WHERE me.id = auth.uid() AND me.role = 'admin' AND COALESCE(me.active,true))
  ORDER BY up.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_pending_carrier_requests() TO authenticated;

-- 5.1) ADMIN: aprova o parceiro, vinculando ao carrier_id
CREATE OR REPLACE FUNCTION public.admin_approve_carrier(p_user_id UUID, p_carrier_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin' AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar acessos de transportadora.';
  END IF;
  UPDATE public.user_profiles
    SET role = 'carrier', carrier_id = p_carrier_id, active = true
    WHERE id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_approve_carrier(UUID, UUID) TO authenticated;

-- 5.2) ADMIN: oferta um pedido a um parceiro
CREATE OR REPLACE FUNCTION public.admin_offer_order(p_order_id UUID, p_carrier_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode ofertar pedidos a parceiros.';
  END IF;
  UPDATE public.orders
    SET carrier_id = p_carrier_id, carrier_amount = p_amount,
        carrier_status = 'offered', carrier_offered_at = now(), carrier_responded_at = NULL
    WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_offer_order(UUID, UUID, NUMERIC) TO authenticated;

-- 6) PARCEIRO: perfil, ofertas, cargas aceitas, responder oferta, atualizar status
CREATE OR REPLACE FUNCTION public.my_carrier_profile()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'role', up.role, 'active', up.active, 'carrier_id', up.carrier_id,
    'requested_company', up.requested_company,
    'carrier_name', c.company_name, 'carrier_cnpj', c.cpf_cnpj
  )
  FROM public.user_profiles up
  LEFT JOIN public.carriers c ON c.id = up.carrier_id
  WHERE up.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.my_carrier_profile() TO authenticated;

-- helper: carrier_id do usuário logado (parceiro ativo)
CREATE OR REPLACE FUNCTION public.my_carrier_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT up.carrier_id FROM public.user_profiles up
  WHERE up.id = auth.uid() AND up.role = 'carrier' AND COALESCE(up.active, false);
$$;
GRANT EXECUTE ON FUNCTION public.my_carrier_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_carrier_offers()
RETURNS SETOF public.orders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.* FROM public.orders o
  WHERE o.carrier_status = 'offered' AND o.carrier_id = public.my_carrier_id();
$$;
GRANT EXECUTE ON FUNCTION public.my_carrier_offers() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_carrier_orders()
RETURNS SETOF public.orders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.* FROM public.orders o
  WHERE o.carrier_status = 'accepted' AND o.carrier_id = public.my_carrier_id();
$$;
GRANT EXECUTE ON FUNCTION public.my_carrier_orders() TO authenticated;

CREATE OR REPLACE FUNCTION public.carrier_respond_offer(p_order_id UUID, p_accept BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := public.my_carrier_id();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Acesso de transportadora inválido.'; END IF;
  UPDATE public.orders
    SET carrier_status = CASE WHEN p_accept THEN 'accepted' ELSE 'refused' END,
        carrier_responded_at = now()
    WHERE id = p_order_id AND carrier_id = v_cid AND carrier_status = 'offered';
  IF NOT FOUND THEN RAISE EXCEPTION 'Oferta não encontrada ou já respondida.'; END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.carrier_respond_offer(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.carrier_update_order_status(p_order_id UUID, p_status TEXT, p_note TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID; v_order public.orders%ROWTYPE;
BEGIN
  v_cid := public.my_carrier_id();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Acesso de transportadora inválido.'; END IF;
  IF p_status NOT IN ('collecting','in_transit','delivered') THEN
    RAISE EXCEPTION 'Status inválido para o parceiro.';
  END IF;
  SELECT * INTO v_order FROM public.orders
    WHERE id = p_order_id AND carrier_id = v_cid AND carrier_status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Carga não encontrada para esta transportadora.'; END IF;
  UPDATE public.orders
    SET status = p_status,
        status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_object(
          'status', p_status, 'timestamp', now(),
          'user', 'Parceiro: ' || COALESCE((SELECT company_name FROM public.carriers WHERE id = v_cid), 'transportadora'),
          'note', NULLIF(btrim(p_note), '')
        )
    WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.carrier_update_order_status(UUID, TEXT, TEXT) TO authenticated;

SELECT 'Portal da Transportadora pronto: carriers + subcontratação no pedido + RPCs de oferta/aceite/status.' AS resultado;

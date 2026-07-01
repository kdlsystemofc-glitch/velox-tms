-- ============================================================
-- VELOX TMS — Roadmap 2.3 (parte 2): RBAC granular + segregação de funções
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Modelo SEGURO por padrão (deny-overlay): user_profiles.permissions é um JSONB
-- opcional. AUSENTE/null = herda TUDO do papel (comportamento atual, zero
-- mudança). O admin pode NEGAR capacidades específicas setando a chave = false.
-- Uma capacidade só é negada quando explicitamente false.

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS permissions JSONB;

-- Retorna true a menos que a capacidade esteja explicitamente negada (false).
CREATE OR REPLACE FUNCTION public.my_permission(p_key TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(
    (SELECT (permissions->>p_key)::boolean FROM public.user_profiles WHERE id = auth.uid()),
    true);
$$;
GRANT EXECUTE ON FUNCTION public.my_permission(TEXT) TO authenticated;

-- Admin define as permissões (deny-overlay) de um usuário.
CREATE OR REPLACE FUNCTION public.admin_set_user_permissions(p_user_id UUID, p_permissions JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin' AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar permissões.';
  END IF;
  UPDATE public.user_profiles SET permissions = p_permissions WHERE id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_permissions(UUID, JSONB) TO authenticated;

-- Enforcement de exemplo (segregação de funções real): baixar/pagar fatura.
-- Mantém o comportamento atual; só bloqueia quem foi explicitamente negado.
CREATE OR REPLACE FUNCTION public.pay_invoice(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_orders UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true)) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  IF NOT public.my_permission('pay_invoice') THEN
    RAISE EXCEPTION 'Segregação de funções: seu usuário não pode baixar faturas.';
  END IF;
  UPDATE public.invoices SET status = 'paid', paid_date = CURRENT_DATE WHERE id = p_invoice_id;
  SELECT array_agg((l->>'order_id')::uuid) INTO v_orders
    FROM public.invoices i, jsonb_array_elements(i.lines) l WHERE i.id = p_invoice_id;
  IF v_orders IS NOT NULL THEN
    UPDATE public.revenues SET status = 'received', received_date = CURRENT_DATE
      WHERE order_id = ANY(v_orders) AND status IN ('receivable','overdue');
    UPDATE public.orders SET payment_status = 'paid' WHERE id = ANY(v_orders);
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.pay_invoice(UUID) TO authenticated;

-- admin_list_users passa a retornar as permissões (para a UI de Usuários).
-- DROP necessário: CREATE OR REPLACE não altera o tipo de retorno (nova coluna).
DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, role TEXT, active BOOLEAN,
  driver_id UUID, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ, permissions JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.role, p.active, p.driver_id, p.created_at, u.last_sign_in_at, p.permissions
    FROM public.user_profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at ASC;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

SELECT 'RBAC granular pronto: user_profiles.permissions + my_permission/admin_set_user_permissions; SoD em pay_invoice.' AS resultado;

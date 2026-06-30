-- ============================================================
-- VELOX TMS — Portal: pedido único do cliente (C3 da auditoria)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- A tela de detalhe do portal carregava TODOS os pedidos para exibir 1.
-- Esta RPC retorna só o pedido pedido, e só se for do próprio cliente.
CREATE OR REPLACE FUNCTION public.my_client_order(p_id UUID)
RETURNS SETOF public.orders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.* FROM public.orders o
  WHERE o.id = p_id AND o.client_id = (
    SELECT up.client_id FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false)
  );
$$;
GRANT EXECUTE ON FUNCTION public.my_client_order(UUID) TO authenticated;

SELECT 'RPC my_client_order pronta.' AS resultado;

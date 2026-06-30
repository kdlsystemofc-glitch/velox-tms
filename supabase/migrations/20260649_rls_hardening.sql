-- ============================================================
-- VELOX TMS — Blindagem de acesso (RLS) — A4 da auditoria
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- MOTIVO: com o Portal do Cliente, um usuário "client" tem SESSÃO AUTENTICADA.
-- Se orders/clients/revenues estiverem abertos a qualquer autenticado, ele
-- poderia ler dados de OUTROS clientes direto pela tabela, driblando os RPCs.
-- Esta migration define o acesso mínimo e preserva os caminhos atuais.
--
-- ⚠️ TESTAR APÓS APLICAR: (1) agendamento público /agendar, (2) app do motorista,
--    (3) listas do admin, (4) Portal do Cliente. Funções SECURITY DEFINER
--    (confirm_order, my_client_orders, create_invoice, track_order, etc.) NÃO são
--    afetadas — elas rodam como dono e continuam funcionando.

-- Helpers de papel
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true));
$$;
CREATE OR REPLACE FUNCTION public.is_driver() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'motorista' AND COALESCE(active, true));
$$;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver() TO anon, authenticated;

-- ───────────────── orders ─────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Equipe (admin/operador): acesso total
DROP POLICY IF EXISTS "staff_all_orders" ON public.orders;
CREATE POLICY "staff_all_orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- Motorista: lê e atualiza (status na entrega). Não cria nem apaga.
DROP POLICY IF EXISTS "driver_read_orders" ON public.orders;
CREATE POLICY "driver_read_orders" ON public.orders FOR SELECT TO authenticated
  USING (public.is_driver());
DROP POLICY IF EXISTS "driver_update_orders" ON public.orders;
CREATE POLICY "driver_update_orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_driver()) WITH CHECK (public.is_driver());
-- Site público (anon): cria pedido pelo /agendar.
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
CREATE POLICY "anon_insert_orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
-- (Cliente do portal NÃO acessa a tabela direto — usa my_client_orders / create_client_order.)

-- ───────────────── clients ─────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all_clients" ON public.clients;
CREATE POLICY "staff_all_clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ───────────────── revenues ─────────────────
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all_revenues" ON public.revenues;
CREATE POLICY "staff_all_revenues" ON public.revenues FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

SELECT 'RLS blindado: orders (staff+driver+anon-insert), clients/revenues (staff). Clientes só via RPC.' AS resultado;

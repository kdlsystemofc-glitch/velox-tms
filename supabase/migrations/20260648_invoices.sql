-- ============================================================
-- VELOX TMS — Ciclo de faturamento (Onda 3): Fatura por cliente
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- A Fatura é um DOCUMENTO que agrupa pedidos faturáveis de um cliente em uma
-- cobrança única (número, vencimento, total, linhas). NÃO cria receita nova —
-- as receitas por pedido já existem (na confirmação). "Pagar" a fatura marca as
-- receitas vinculadas como recebidas. Cada pedido só entra em UMA fatura.

CREATE TABLE IF NOT EXISTS public.invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number      TEXT,
  client_id   UUID REFERENCES public.clients(id),
  client_name TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled')),
  issue_date  DATE DEFAULT CURRENT_DATE,
  due_date    DATE,
  total       NUMERIC DEFAULT 0,
  notes       TEXT,
  lines       JSONB DEFAULT '[]'::jsonb,
  paid_date   DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id);

-- Número sequencial por ano: FAT-2026-0001
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'FAT-' || to_char(now(), 'YYYY') || '-' ||
         lpad((count(*) + 1)::text, 4, '0')
  FROM public.invoices WHERE number LIKE 'FAT-' || to_char(now(), 'YYYY') || '-%';
$$;

-- Cria a fatura a partir de pedidos selecionados (admin/operador). Soma o frete,
-- monta as linhas, gera o número e marca os pedidos como faturados.
CREATE OR REPLACE FUNCTION public.create_invoice(p_client_id UUID, p_order_ids UUID[], p_due_date DATE, p_notes TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num TEXT; v_total NUMERIC; v_lines JSONB; v_name TEXT; v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true)) THEN
    RAISE EXCEPTION 'Sem permissão para faturar.';
  END IF;
  SELECT company_name INTO v_name FROM public.clients WHERE id = p_client_id;
  SELECT COALESCE(sum(freight_value), 0),
         COALESCE(jsonb_agg(jsonb_build_object('order_id', id, 'protocol', protocol, 'amount', freight_value) ORDER BY protocol), '[]'::jsonb)
    INTO v_total, v_lines
    FROM public.orders
    WHERE id = ANY(p_order_ids) AND client_id = p_client_id AND invoice_id IS NULL;
  IF v_lines = '[]'::jsonb THEN RAISE EXCEPTION 'Nenhum pedido faturável selecionado.'; END IF;
  v_num := public.next_invoice_number();
  INSERT INTO public.invoices (number, client_id, client_name, status, issue_date, due_date, total, lines, notes)
    VALUES (v_num, p_client_id, v_name, 'open', CURRENT_DATE, p_due_date, v_total, v_lines, NULLIF(btrim(p_notes), ''))
    RETURNING id INTO v_id;
  UPDATE public.orders SET invoice_id = v_id WHERE id = ANY(p_order_ids) AND client_id = p_client_id AND invoice_id IS NULL;
  RETURN v_num;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_invoice(UUID, UUID[], DATE, TEXT) TO authenticated;

-- Marca a fatura como paga e baixa as receitas dos pedidos vinculados.
CREATE OR REPLACE FUNCTION public.pay_invoice(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_orders UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true)) THEN
    RAISE EXCEPTION 'Sem permissão.';
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

-- Faturas do cliente logado (Portal do Cliente)
CREATE OR REPLACE FUNCTION public.my_client_invoices()
RETURNS SETOF public.invoices LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT i.* FROM public.invoices i
  WHERE i.client_id = (
    SELECT up.client_id FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false)
  )
  ORDER BY i.issue_date DESC;
$$;
GRANT EXECUTE ON FUNCTION public.my_client_invoices() TO authenticated;

-- RLS: staff (admin/operador) gere as faturas; cliente lê só pela RPC acima.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_invoices" ON public.invoices;
CREATE POLICY "staff_manage_invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active, true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active, true)));

SELECT 'Faturamento (Onda 3) pronto: invoices + create_invoice/pay_invoice/my_client_invoices.' AS resultado;

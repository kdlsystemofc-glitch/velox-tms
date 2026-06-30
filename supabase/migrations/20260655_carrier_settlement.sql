-- ============================================================
-- VELOX TMS — Roadmap 1.4: ciclo financeiro do parceiro (acerto/pagamento)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Fecha o laço da subcontratação: quando um pedido foi aceito por um parceiro
-- (carrier_status='accepted') com valor combinado, a equipe lança o PAGAMENTO
-- AO PARCEIRO como despesa "a pagar" (status pending), vinculada ao pedido.
-- Idempotente por pedido: orders.carrier_expense_id evita duplicar o lançamento.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_expense_id UUID REFERENCES public.expenses(id);

CREATE OR REPLACE FUNCTION public.settle_carrier_order(p_order_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order   public.orders%ROWTYPE;
  v_carrier TEXT;
  v_exp_id  UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode lançar pagamento ao parceiro.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF v_order.carrier_id IS NULL OR v_order.carrier_status <> 'accepted' THEN
    RAISE EXCEPTION 'Pedido sem parceiro com oferta aceita.';
  END IF;
  IF COALESCE(v_order.carrier_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Valor combinado com o parceiro inválido.';
  END IF;
  -- já lançado: idempotente
  IF v_order.carrier_expense_id IS NOT NULL THEN
    RETURN v_order.carrier_expense_id;
  END IF;

  SELECT company_name INTO v_carrier FROM public.carriers WHERE id = v_order.carrier_id;

  INSERT INTO public.expenses (category, description, amount, date, status)
    VALUES ('other',
            'Subcontratação — ' || COALESCE(v_carrier, 'parceiro') || ' · ' || COALESCE(v_order.protocol, ''),
            v_order.carrier_amount, CURRENT_DATE, 'pending')
    RETURNING id INTO v_exp_id;

  UPDATE public.orders SET carrier_expense_id = v_exp_id WHERE id = p_order_id;
  RETURN v_exp_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.settle_carrier_order(UUID) TO authenticated;

SELECT 'Acerto do parceiro pronto: orders.carrier_expense_id + settle_carrier_order.' AS resultado;

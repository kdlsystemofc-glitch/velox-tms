-- ============================================================
-- VELOX TMS — Roadmap 1.8: conciliação ligada à fatura
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Estende reconcile_bank_tx para aceitar p_type='invoice': um CRÉDITO do extrato
-- pode dar baixa numa FATURA em aberto, cascateando como pay_invoice (marca a
-- fatura paga + receitas recebidas + pedidos pagos), porém com a DATA DO EXTRATO.

CREATE OR REPLACE FUNCTION public.reconcile_bank_tx(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date   DATE;
  v_orders UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode conciliar lançamentos.';
  END IF;
  SELECT posted_at INTO v_date FROM public.bank_transactions WHERE id = p_tx_id;
  IF v_date IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado.'; END IF;

  IF p_type = 'revenue' THEN
    UPDATE public.revenues SET status = 'received', received_date = v_date WHERE id = p_target_id;

  ELSIF p_type = 'expense' THEN
    UPDATE public.expenses SET status = 'paid', paid_date = v_date WHERE id = p_target_id;

  ELSIF p_type = 'invoice' THEN
    -- baixa da fatura na data do extrato + cascata (mesma regra do pay_invoice)
    UPDATE public.invoices SET status = 'paid', paid_date = v_date WHERE id = p_target_id;
    SELECT array_agg((l->>'order_id')::uuid) INTO v_orders
      FROM public.invoices i, jsonb_array_elements(i.lines) l WHERE i.id = p_target_id;
    IF v_orders IS NOT NULL THEN
      UPDATE public.revenues SET status = 'received', received_date = v_date
        WHERE order_id = ANY(v_orders) AND status IN ('receivable','overdue');
      UPDATE public.orders SET payment_status = 'paid' WHERE id = ANY(v_orders);
    END IF;

  ELSE
    RAISE EXCEPTION 'Tipo inválido para conciliação: %', p_type;
  END IF;

  UPDATE public.bank_transactions
    SET status = 'matched', matched_type = p_type, matched_id = p_target_id, reconciled_at = now()
    WHERE id = p_tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_tx(UUID, TEXT, UUID) TO authenticated;

SELECT 'Conciliação por fatura pronta: reconcile_bank_tx aceita type=invoice.' AS resultado;

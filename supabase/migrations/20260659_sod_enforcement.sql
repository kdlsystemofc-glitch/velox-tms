-- ============================================================
-- VELOX TMS — Roadmap 2.3 (completar SoD server-side, cost-free)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Estende a segregação de funções (my_permission) para conciliação bancária e
-- oferta a parceiro, além do pay_invoice já feito. Deny-overlay: só bloqueia
-- quem foi explicitamente negado; comportamento padrão inalterado.

-- Conciliação bancária: exige a capacidade 'reconcile'.
CREATE OR REPLACE FUNCTION public.reconcile_bank_tx(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date   DATE;
  v_orders UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode conciliar lançamentos.';
  END IF;
  IF NOT public.my_permission('reconcile') THEN
    RAISE EXCEPTION 'Segregação de funções: seu usuário não pode conciliar.';
  END IF;
  SELECT posted_at INTO v_date FROM public.bank_transactions WHERE id = p_tx_id;
  IF v_date IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado.'; END IF;

  IF p_type = 'revenue' THEN
    UPDATE public.revenues SET status = 'received', received_date = v_date WHERE id = p_target_id;
  ELSIF p_type = 'expense' THEN
    UPDATE public.expenses SET status = 'paid', paid_date = v_date WHERE id = p_target_id;
  ELSIF p_type = 'invoice' THEN
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

-- Oferta a parceiro: exige a capacidade 'offer_carrier'.
CREATE OR REPLACE FUNCTION public.admin_offer_order(p_order_id UUID, p_carrier_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode ofertar pedidos a parceiros.';
  END IF;
  IF NOT public.my_permission('offer_carrier') THEN
    RAISE EXCEPTION 'Segregação de funções: seu usuário não pode ofertar a parceiros.';
  END IF;
  UPDATE public.orders
    SET carrier_id = p_carrier_id, carrier_amount = p_amount,
        carrier_status = 'offered', carrier_offered_at = now(), carrier_responded_at = NULL
    WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_offer_order(UUID, UUID, NUMERIC) TO authenticated;

SELECT 'SoD estendida: reconcile_bank_tx (reconcile) e admin_offer_order (offer_carrier).' AS resultado;

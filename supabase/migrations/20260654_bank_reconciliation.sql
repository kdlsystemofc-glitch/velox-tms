-- ============================================================
-- VELOX TMS — Conciliação bancária (Mega-feature 3)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Importa o extrato (OFX/CSV) para bank_transactions e concilia cada lançamento
-- com o ledger: CRÉDITO (entrada) ↔ Receita a receber; DÉBITO (saída) ↔ Despesa
-- a pagar. Ao conciliar, dá baixa (received/paid) com a data do extrato.
-- Tabela e baixa são restritas a staff (admin/operator).

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fitid         TEXT,                       -- id do lançamento no extrato (dedup)
  posted_at     DATE NOT NULL,
  amount        NUMERIC NOT NULL,           -- assinado: + crédito (entrada), - débito (saída)
  description   TEXT,
  memo          TEXT,
  source        TEXT NOT NULL DEFAULT 'ofx',-- ofx | csv
  batch         TEXT,                       -- rótulo da importação (arquivo + data)
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | matched | ignored
  matched_type  TEXT,                       -- revenue | expense
  matched_id    UUID,
  reconciled_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Dedup: não reimporta o mesmo lançamento (mesmo fitid).
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_tx_fitid ON public.bank_transactions(fitid) WHERE fitid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_tx_status ON public.bank_transactions(status, posted_at DESC);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_tx_staff_all ON public.bank_transactions;
CREATE POLICY bank_tx_staff_all ON public.bank_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)));

-- Conciliação atômica: marca o lançamento e dá baixa no ledger, na data do extrato.
CREATE OR REPLACE FUNCTION public.reconcile_bank_tx(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_date DATE;
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
  ELSE
    RAISE EXCEPTION 'Tipo inválido para conciliação: %', p_type;
  END IF;

  UPDATE public.bank_transactions
    SET status = 'matched', matched_type = p_type, matched_id = p_target_id, reconciled_at = now()
    WHERE id = p_tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_tx(UUID, TEXT, UUID) TO authenticated;

-- Desfazer conciliação (volta o lançamento a pendente; NÃO reverte a baixa do ledger,
-- pois a baixa pode ter sido feita manualmente — o usuário ajusta no ledger se quiser).
CREATE OR REPLACE FUNCTION public.unreconcile_bank_tx(p_tx_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode alterar conciliações.';
  END IF;
  UPDATE public.bank_transactions
    SET status = 'pending', matched_type = NULL, matched_id = NULL, reconciled_at = NULL
    WHERE id = p_tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.unreconcile_bank_tx(UUID) TO authenticated;

SELECT 'Conciliação bancária pronta: bank_transactions + reconcile_bank_tx/unreconcile_bank_tx.' AS resultado;

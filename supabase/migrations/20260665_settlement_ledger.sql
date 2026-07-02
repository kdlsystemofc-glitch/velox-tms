-- ============================================================
-- VELOX TMS — Projeto 04.1: Razão de liquidação único (baixa única)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Hoje a "baixa" é status-flip espalhado em 3+ caminhos (pay_invoice,
-- reconcile_bank_tx, updates diretos em Revenues/Expenses), sem registro
-- imutável do evento, com cascata de fatura DUPLICADA e estorno assimétrico
-- (unreconcile não revertia a baixa).
--
-- Solução (aditiva): a tabela `settlements` é o RAZÃO imutável de liquidação,
-- SEMPRE no grão da conta (revenue/expense). Uma fatura é uma conveniência que
-- liquida suas receitas-membro (não gera grão próprio) — assim o razão é uniforme
-- e reconcilia exato com os status. Toda baixa passa por settlement_apply e todo
-- estorno por settlement_reverse (ledger E status juntos). As colunas de status
-- seguem como CACHE de leitura (relatórios não mudam).

-- ---------- razão ----------
CREATE TABLE IF NOT EXISTS public.settlements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL CHECK (kind IN ('receive','pay')),
  target_type  TEXT NOT NULL CHECK (target_type IN ('revenue','expense')),
  target_id    UUID NOT NULL,
  amount       NUMERIC NOT NULL,
  settled_date DATE NOT NULL,
  method       TEXT,
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','bank','invoice','backfill')),
  bank_tx_id   UUID,
  actor_id     UUID,
  actor_email  TEXT,
  note         TEXT,
  reversal_of  UUID REFERENCES public.settlements(id),
  reversed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlements_target ON public.settlements(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_settlements_bank   ON public.settlements(bank_tx_id) WHERE bank_tx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settlements_date   ON public.settlements(settled_date);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
-- Leitura: staff. Escrita: só via RPC (SECURITY DEFINER) — sem policy de INSERT.
DROP POLICY IF EXISTS settlements_staff_read ON public.settlements;
CREATE POLICY settlements_staff_read ON public.settlements
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- cascata única de baixa no grão da conta (interna; sem permissão) ----------
-- Idempotente: se a conta já está liquidada, não duplica ledger nem re-vira status.
-- Retorna o id do settlement criado (ou NULL se já estava liquidada).
CREATE OR REPLACE FUNCTION public.settlement_apply(
  p_target_type TEXT, p_target_id UUID, p_amount NUMERIC, p_date DATE,
  p_method TEXT, p_source TEXT, p_bank_tx_id UUID
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date   DATE := COALESCE(p_date, CURRENT_DATE);
  v_amount NUMERIC;
  v_kind   TEXT;
  v_email  TEXT;
  v_id     UUID;
BEGIN
  IF p_target_type = 'revenue' THEN
    -- Só liquida contas em aberto (nunca uma receita cancelada ou já recebida).
    SELECT amount INTO v_amount FROM public.revenues WHERE id = p_target_id AND status IN ('receivable','overdue');
    IF NOT FOUND THEN RETURN NULL; END IF;
    v_kind := 'receive';
    UPDATE public.revenues
      SET status = 'received', received_date = v_date, payment_method = COALESCE(p_method, payment_method)
      WHERE id = p_target_id;

  ELSIF p_target_type = 'expense' THEN
    SELECT amount INTO v_amount FROM public.expenses WHERE id = p_target_id AND status IN ('pending','installment');
    IF NOT FOUND THEN RETURN NULL; END IF;
    v_kind := 'pay';
    UPDATE public.expenses
      SET status = 'paid', paid_date = v_date, payment_method = COALESCE(p_method, payment_method)
      WHERE id = p_target_id;

  ELSE
    RAISE EXCEPTION 'settlement_apply: grão inválido % (use revenue/expense; fatura via pay_invoice).', p_target_type;
  END IF;

  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.settlements (kind, target_type, target_id, amount, settled_date, method, source, bank_tx_id, actor_id, actor_email)
    VALUES (v_kind, p_target_type, p_target_id, COALESCE(p_amount, v_amount), v_date, p_method,
            COALESCE(p_source,'manual'), p_bank_tx_id, auth.uid(), v_email)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

-- ---------- baixa de FATURA = liquida as receitas-membro (interna) ----------
-- Retorna quantas receitas foram liquidadas.
CREATE OR REPLACE FUNCTION public.settlement_apply_invoice(
  p_invoice_id UUID, p_date DATE, p_method TEXT, p_source TEXT, p_bank_tx_id UUID
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date   DATE := COALESCE(p_date, CURRENT_DATE);
  v_orders UUID[];
  r        RECORD;
  v_n      INTEGER := 0;
BEGIN
  PERFORM 1 FROM public.invoices WHERE id = p_invoice_id AND status <> 'paid';
  IF NOT FOUND THEN RETURN 0; END IF;                         -- fatura já paga/inexistente
  UPDATE public.invoices SET status = 'paid', paid_date = v_date WHERE id = p_invoice_id;

  SELECT array_agg((l->>'order_id')::uuid) INTO v_orders
    FROM public.invoices i, jsonb_array_elements(i.lines) l WHERE i.id = p_invoice_id;
  IF v_orders IS NOT NULL THEN
    FOR r IN SELECT id FROM public.revenues
             WHERE order_id = ANY(v_orders) AND status IN ('receivable','overdue')
    LOOP
      PERFORM public.settlement_apply('revenue', r.id, NULL, v_date, p_method, p_source, p_bank_tx_id);
      v_n := v_n + 1;
    END LOOP;
    UPDATE public.orders SET payment_status = 'paid' WHERE id = ANY(v_orders);
  END IF;
  RETURN v_n;
END; $$;

-- ---------- estorno único (interna): ledger + status/cache ----------
CREATE OR REPLACE FUNCTION public.settlement_reverse(p_settlement_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s         public.settlements%ROWTYPE;
  v_order   UUID;
  v_invoice UUID;
  v_email   TEXT;
BEGIN
  SELECT * INTO s FROM public.settlements WHERE id = p_settlement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidação não encontrada.'; END IF;
  IF s.reversed_at IS NOT NULL OR s.reversal_of IS NOT NULL THEN RETURN; END IF;

  IF s.target_type = 'revenue' THEN
    UPDATE public.revenues SET status = 'receivable', received_date = NULL WHERE id = s.target_id;
    -- Se a receita era de um pedido faturado, reabre pedido + fatura (cache).
    SELECT order_id INTO v_order FROM public.revenues WHERE id = s.target_id;
    IF v_order IS NOT NULL THEN
      UPDATE public.orders SET payment_status = 'pending' WHERE id = v_order;
      SELECT invoice_id INTO v_invoice FROM public.orders WHERE id = v_order;
      IF v_invoice IS NOT NULL THEN
        UPDATE public.invoices SET status = 'open', paid_date = NULL WHERE id = v_invoice;
      END IF;
    END IF;
  ELSIF s.target_type = 'expense' THEN
    UPDATE public.expenses SET status = 'pending', paid_date = NULL WHERE id = s.target_id;
  END IF;

  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  UPDATE public.settlements SET reversed_at = now() WHERE id = s.id;
  INSERT INTO public.settlements (kind, target_type, target_id, amount, settled_date, method, source, bank_tx_id, actor_id, actor_email, reversal_of)
    VALUES (s.kind, s.target_type, s.target_id, -s.amount, CURRENT_DATE, s.method, s.source, s.bank_tx_id, auth.uid(), v_email, s.id);
END; $$;

-- Funções INTERNAS (sem checagem de permissão): revoga o EXECUTE que o Postgres
-- concede a PUBLIC por padrão. Só as wrappers (definer, dono postgres) as chamam;
-- clientes NÃO podem invocá-las direto (senão burlariam a segregação de funções).
REVOKE ALL ON FUNCTION public.settlement_apply(TEXT, UUID, NUMERIC, DATE, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settlement_apply_invoice(UUID, DATE, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settlement_reverse(UUID) FROM PUBLIC;

-- ---------- API pública: settle / unsettle ----------
-- SoD pela ORIGEM: bank→'reconcile', invoice→'pay_invoice', manual→staff.
CREATE OR REPLACE FUNCTION public.settle(
  p_target_type TEXT, p_target_id UUID, p_amount NUMERIC DEFAULT NULL, p_date DATE DEFAULT NULL,
  p_method TEXT DEFAULT NULL, p_source TEXT DEFAULT 'manual', p_bank_tx_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode dar baixa.'; END IF;
  IF p_source = 'bank'    AND NOT public.my_permission('reconcile')   THEN RAISE EXCEPTION 'Segregação de funções: seu usuário não pode conciliar.'; END IF;
  IF p_source = 'invoice' AND NOT public.my_permission('pay_invoice') THEN RAISE EXCEPTION 'Segregação de funções: seu usuário não pode pagar faturas.'; END IF;
  v_id := public.settlement_apply(p_target_type, p_target_id, p_amount, p_date, p_method, p_source, p_bank_tx_id);
  IF v_id IS NOT NULL THEN
    PERFORM public.log_action('Baixa ' || p_target_type, p_target_type, p_target_id::text, 'origem ' || COALESCE(p_source,'manual'));
  END IF;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.settle(TEXT, UUID, NUMERIC, DATE, TEXT, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.unsettle(p_settlement_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.settlements%ROWTYPE;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode estornar baixas.'; END IF;
  SELECT * INTO s FROM public.settlements WHERE id = p_settlement_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Liquidação não encontrada.'; END IF;
  IF s.source = 'bank'    AND NOT public.my_permission('reconcile')   THEN RAISE EXCEPTION 'Segregação de funções: seu usuário não pode conciliar.'; END IF;
  IF s.source = 'invoice' AND NOT public.my_permission('pay_invoice') THEN RAISE EXCEPTION 'Segregação de funções: seu usuário não pode pagar faturas.'; END IF;
  PERFORM public.settlement_reverse(p_settlement_id);
  PERFORM public.log_action('Estorno de baixa ' || s.target_type, s.target_type, s.target_id::text, 'settlement ' || s.id::text);
END; $$;
GRANT EXECUTE ON FUNCTION public.unsettle(UUID) TO authenticated;

-- ---------- reescrita: pay_invoice delega ao razão ----------
CREATE OR REPLACE FUNCTION public.pay_invoice(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.my_permission('pay_invoice') THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  PERFORM public.settlement_apply_invoice(p_invoice_id, CURRENT_DATE, NULL, 'invoice', NULL);
  PERFORM public.log_action('Pagou fatura', 'invoice', p_invoice_id::text, NULL);
END; $$;
GRANT EXECUTE ON FUNCTION public.pay_invoice(UUID) TO authenticated;

-- ---------- reescrita: reconcile_bank_tx delega ao razão ----------
CREATE OR REPLACE FUNCTION public.reconcile_bank_tx(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_date DATE;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode conciliar lançamentos.'; END IF;
  IF NOT public.my_permission('reconcile') THEN RAISE EXCEPTION 'Segregação de funções: seu usuário não pode conciliar.'; END IF;
  SELECT posted_at INTO v_date FROM public.bank_transactions WHERE id = p_tx_id;
  IF v_date IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado.'; END IF;

  IF p_type IN ('revenue','expense') THEN
    PERFORM public.settlement_apply(p_type, p_target_id, NULL, v_date, NULL, 'bank', p_tx_id);
  ELSIF p_type = 'invoice' THEN
    PERFORM public.settlement_apply_invoice(p_target_id, v_date, NULL, 'bank', p_tx_id);
  ELSE
    RAISE EXCEPTION 'Tipo inválido para conciliação: %', p_type;
  END IF;

  UPDATE public.bank_transactions
    SET status = 'matched', matched_type = p_type, matched_id = p_target_id, reconciled_at = now()
    WHERE id = p_tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_tx(UUID, TEXT, UUID) TO authenticated;

-- ---------- reescrita: unreconcile ESTORNA a baixa (corrige a assimetria) ----------
CREATE OR REPLACE FUNCTION public.unreconcile_bank_tx(p_tx_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode alterar conciliações.'; END IF;
  -- Estorna as liquidações geradas por este lançamento (ledger + status/cache).
  FOR r IN SELECT id FROM public.settlements
           WHERE bank_tx_id = p_tx_id AND reversal_of IS NULL AND reversed_at IS NULL
  LOOP
    PERFORM public.settlement_reverse(r.id);
  END LOOP;
  UPDATE public.bank_transactions
    SET status = 'pending', matched_type = NULL, matched_id = NULL, reconciled_at = NULL
    WHERE id = p_tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.unreconcile_bank_tx(UUID) TO authenticated;

SELECT 'Projeto 04.1: razão settlements (grão conta) + settle/unsettle; pay_invoice/reconcile/unreconcile unificados.' AS resultado;

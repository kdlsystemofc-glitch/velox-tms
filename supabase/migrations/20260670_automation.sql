-- ============================================================
-- VELOX TMS — Projeto 06: Automação de Processos (P06.1–P06.4)
-- Idempotente. Rode DEPOIS de 20260669.
-- ============================================================
-- Automatiza passos manuais sobre o backbone do P05 (eventos + run_due_jobs) e o
-- razão do P04. Tudo aditivo/idempotente; os fluxos manuais seguem intactos.

-- Corrige bug latente: alerts.type tinha CHECK restritivo e o app já inseria
-- tipos fora da lista (address_changed, incident, …) que falhavam em silêncio.
-- Removê-lo torna `alerts` o repositório geral de avisos in-app (o app controla os tipos).
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_type_check;

-- ============================================================
-- P06.1 — Faturamento por corte
-- ============================================================
-- Montador único de fatura (sem checagem de permissão): usado pelo create_invoice
-- (manual, com auth) e pelo run_billing_cycle (job). Retorna o id, ou NULL se não
-- houver pedido faturável. Emite invoice.created.
CREATE OR REPLACE FUNCTION public.invoice_build(p_client_id UUID, p_order_ids UUID[], p_due_date DATE, p_notes TEXT, p_source TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num TEXT; v_total NUMERIC; v_lines JSONB; v_name TEXT; v_id UUID;
BEGIN
  SELECT company_name INTO v_name FROM public.clients WHERE id = p_client_id;
  SELECT COALESCE(sum(freight_value), 0),
         COALESCE(jsonb_agg(jsonb_build_object('order_id', id, 'protocol', protocol, 'amount', freight_value) ORDER BY protocol), '[]'::jsonb)
    INTO v_total, v_lines
    FROM public.orders
    WHERE id = ANY(p_order_ids) AND client_id = p_client_id AND invoice_id IS NULL;
  IF v_lines = '[]'::jsonb THEN RETURN NULL; END IF;
  v_num := public.next_invoice_number();
  INSERT INTO public.invoices (number, client_id, client_name, status, issue_date, due_date, total, lines, notes)
    VALUES (v_num, p_client_id, v_name, 'open', CURRENT_DATE, p_due_date, v_total, v_lines, NULLIF(btrim(p_notes), ''))
    RETURNING id INTO v_id;
  UPDATE public.orders SET invoice_id = v_id WHERE id = ANY(p_order_ids) AND client_id = p_client_id AND invoice_id IS NULL;
  PERFORM public.domain_event_write('invoice.created', 'invoice', v_id::text,
    jsonb_build_object('number', v_num, 'total', v_total, 'client_id', p_client_id, 'source', COALESCE(p_source,'manual')), auth.uid());
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.invoice_build(UUID, UUID[], DATE, TEXT, TEXT) FROM PUBLIC;

-- create_invoice (manual) passa a delegar ao montador único.
CREATE OR REPLACE FUNCTION public.create_invoice(p_client_id UUID, p_order_ids UUID[], p_due_date DATE, p_notes TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true)) THEN
    RAISE EXCEPTION 'Sem permissão para faturar.';
  END IF;
  v_id := public.invoice_build(p_client_id, p_order_ids, p_due_date, p_notes, 'manual');
  IF v_id IS NULL THEN RAISE EXCEPTION 'Nenhum pedido faturável selecionado.'; END IF;
  RETURN (SELECT number FROM public.invoices WHERE id = v_id);
END; $$;
GRANT EXECUTE ON FUNCTION public.create_invoice(UUID, UUID[], DATE, TEXT) TO authenticated;

-- Faturamento por corte: para clientes 'monthly' no seu dia de corte, fatura os
-- pedidos ENTREGUES ainda não faturados. Idempotente (invoice_id IS NULL). O dia
-- é clampado ao último dia do mês (billing_day 31 em fev → dia 28/29).
CREATE OR REPLACE FUNCTION public.run_billing_cycle()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c        RECORD;
  v_ids    UUID[];
  v_id     UUID;
  v_n      INTEGER := 0;
  v_lastday INTEGER := EXTRACT(day FROM (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day'))::int;
  v_today   INTEGER := EXTRACT(day FROM CURRENT_DATE)::int;
BEGIN
  FOR c IN
    SELECT id, COALESCE(payment_term_days, 30) AS term
    FROM public.clients
    WHERE billing_type = 'monthly'
      AND LEAST(COALESCE(billing_day, 25), v_lastday) = v_today
  LOOP
    SELECT array_agg(id) INTO v_ids FROM public.orders
      WHERE client_id = c.id AND invoice_id IS NULL AND status = 'delivered' AND COALESCE(freight_value, 0) > 0;
    IF v_ids IS NOT NULL THEN
      v_id := public.invoice_build(c.id, v_ids, CURRENT_DATE + c.term, 'Faturamento automático por corte', 'billing_cycle');
      IF v_id IS NOT NULL THEN v_n := v_n + 1; END IF;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.run_billing_cycle() FROM PUBLIC;

-- ============================================================
-- P06.2 — Acerto na entrega (subcontratação)
-- ============================================================
-- Lançador interno do acerto do parceiro (sem auth): idempotente por carrier_expense_id.
CREATE OR REPLACE FUNCTION public.carrier_settle_internal(p_order_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE; v_carrier TEXT; v_exp_id UUID;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RETURN NULL; END IF;
  IF v_order.carrier_id IS NULL OR v_order.carrier_status <> 'accepted' OR COALESCE(v_order.carrier_amount,0) <= 0 THEN RETURN NULL; END IF;
  IF v_order.carrier_expense_id IS NOT NULL THEN RETURN v_order.carrier_expense_id; END IF;

  SELECT company_name INTO v_carrier FROM public.carriers WHERE id = v_order.carrier_id;
  INSERT INTO public.expenses (category, description, amount, date, status)
    VALUES ('other', 'Subcontratação — ' || COALESCE(v_carrier,'parceiro') || ' · ' || COALESCE(v_order.protocol,''),
            v_order.carrier_amount, CURRENT_DATE, 'pending')
    RETURNING id INTO v_exp_id;
  UPDATE public.orders SET carrier_expense_id = v_exp_id WHERE id = p_order_id;
  PERFORM public.domain_event_write('carrier.settled', 'order', p_order_id::text,
    jsonb_build_object('expense_id', v_exp_id, 'amount', v_order.carrier_amount), auth.uid());
  RETURN v_exp_id;
END; $$;
REVOKE ALL ON FUNCTION public.carrier_settle_internal(UUID) FROM PUBLIC;

-- settle_carrier_order (manual) passa a delegar ao interno.
CREATE OR REPLACE FUNCTION public.settle_carrier_order(p_order_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exp UUID;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode lançar pagamento ao parceiro.'; END IF;
  v_exp := public.carrier_settle_internal(p_order_id);
  IF v_exp IS NULL THEN RAISE EXCEPTION 'Pedido sem parceiro com oferta aceita/valor válido.'; END IF;
  RETURN v_exp;
END; $$;
GRANT EXECUTE ON FUNCTION public.settle_carrier_order(UUID) TO authenticated;

-- Regra "acerto na entrega": varre pedidos ENTREGUES com parceiro aceito e sem
-- acerto lançado, e lança (idempotente). Não usa trigger na entrega para não
-- arriscar bloquear a atualização de status do motorista.
CREATE OR REPLACE FUNCTION public.sweep_carrier_settlements()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o RECORD; v_n INTEGER := 0;
BEGIN
  FOR o IN
    SELECT id FROM public.orders
    WHERE status = 'delivered' AND carrier_id IS NOT NULL AND carrier_status = 'accepted'
      AND COALESCE(carrier_amount,0) > 0 AND carrier_expense_id IS NULL
  LOOP
    IF public.carrier_settle_internal(o.id) IS NOT NULL THEN v_n := v_n + 1; END IF;
  END LOOP;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.sweep_carrier_settlements() FROM PUBLIC;

-- ============================================================
-- P06.3 — Conciliação automática de alta confiança
-- ============================================================
-- Baixa interna do extrato (sem checagem de permissão): usada pelo reconcile_bank_tx
-- (manual, com SoD) e pelo auto_reconcile (job).
CREATE OR REPLACE FUNCTION public.reconcile_internal(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_date DATE;
BEGIN
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
REVOKE ALL ON FUNCTION public.reconcile_internal(UUID, TEXT, UUID) FROM PUBLIC;

-- reconcile_bank_tx (manual) passa a delegar ao interno (mantém SoD).
CREATE OR REPLACE FUNCTION public.reconcile_bank_tx(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode conciliar lançamentos.'; END IF;
  IF NOT public.my_permission('reconcile') THEN RAISE EXCEPTION 'Segregação de funções: seu usuário não pode conciliar.'; END IF;
  PERFORM public.reconcile_internal(p_tx_id, p_type, p_target_id);
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_tx(UUID, TEXT, UUID) TO authenticated;

-- Auto-concilia SÓ o que é alta confiança: valor EXATO, ≤5 dias e candidato ÚNICO.
CREATE OR REPLACE FUNCTION public.auto_reconcile()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tx      RECORD;
  v_types TEXT[];
  v_ids   UUID[];
  v_n     INTEGER := 0;
BEGIN
  FOR tx IN SELECT * FROM public.bank_transactions WHERE status = 'pending' LOOP
    IF tx.amount > 0 THEN
      -- crédito: fatura em aberto OU receita a receber
      SELECT array_agg(typ), array_agg(cid) INTO v_types, v_ids FROM (
        SELECT 'invoice'::text typ, i.id cid FROM public.invoices i
          WHERE i.status = 'open' AND abs(i.total - abs(tx.amount)) < 0.005
            AND i.due_date IS NOT NULL AND abs(i.due_date - tx.posted_at) <= 5
        UNION ALL
        SELECT 'revenue', r.id FROM public.revenues r
          WHERE r.status IN ('receivable','overdue') AND abs(r.amount - abs(tx.amount)) < 0.005
            AND r.due_date IS NOT NULL AND abs(r.due_date - tx.posted_at) <= 5
      ) x;
    ELSE
      -- débito: despesa a pagar
      SELECT array_agg(typ), array_agg(cid) INTO v_types, v_ids FROM (
        SELECT 'expense'::text typ, e.id cid FROM public.expenses e
          WHERE e.status IN ('pending','installment') AND abs(e.amount - abs(tx.amount)) < 0.005
            AND COALESCE(e.due_date, e.date) IS NOT NULL AND abs(COALESCE(e.due_date, e.date) - tx.posted_at) <= 5
      ) x;
    END IF;

    IF v_ids IS NOT NULL AND array_length(v_ids, 1) = 1 THEN
      PERFORM public.reconcile_internal(tx.id, v_types[1], v_ids[1]);
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.auto_reconcile() FROM PUBLIC;

-- ============================================================
-- P06.4 — Workflow de exceções: escalação de SLA no servidor
-- ============================================================
CREATE OR REPLACE FUNCTION public.sweep_incident_sla()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cfg     JSONB;
  i         RECORD;
  v_sev     TEXT;
  v_hours   NUMERIC;
  v_n       INTEGER := 0;
BEGIN
  SELECT incident_sla_hours INTO v_cfg FROM public.company_settings LIMIT 1;
  FOR i IN SELECT * FROM public.incidents WHERE status <> 'resolved' LOOP
    v_sev := COALESCE(i.severity, CASE i.type
      WHEN 'roubo' THEN 'critical' WHEN 'acidente' THEN 'critical'
      WHEN 'avaria' THEN 'high' WHEN 'carga_recusada' THEN 'high'
      WHEN 'tentativa_entrega' THEN 'medium' ELSE 'low' END);
    v_hours := COALESCE((v_cfg->>v_sev)::numeric,
      CASE v_sev WHEN 'critical' THEN 4 WHEN 'high' THEN 24 WHEN 'medium' THEN 72 ELSE 168 END);
    -- Idempotente por EVENTO: emite incident.sla_breached uma vez por ocorrência.
    -- A entrega in-app (alerta) fica a cargo do motor de notificações (P06.5).
    IF now() > i.created_at + (v_hours || ' hours')::interval
       AND NOT EXISTS (SELECT 1 FROM public.domain_events e WHERE e.type = 'incident.sla_breached' AND e.entity_id = i.id::text)
    THEN
      PERFORM public.domain_event_write('incident.sla_breached', 'incident', i.id::text,
        jsonb_build_object('type', i.type, 'severity', v_sev,
          'protocol', (SELECT protocol FROM public.orders WHERE id = i.order_id)), NULL);
      v_n := v_n + 1;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.sweep_incident_sla() FROM PUBLIC;

-- ============================================================
-- Despachante: inclui as automações do P06
-- ============================================================
CREATE OR REPLACE FUNCTION public.run_due_jobs()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Apenas a equipe pode executar os jobs.';
  END IF;
  v_result := jsonb_build_object(
    'sweep_overdue',         public.sweep_overdue(),
    'run_billing_cycle',     public.run_billing_cycle(),
    'sweep_carrier',         public.sweep_carrier_settlements(),
    'auto_reconcile',        public.auto_reconcile(),
    'sweep_incident_sla',    public.sweep_incident_sla(),
    'ran_at',                now()
  );
  INSERT INTO public.job_runs (job, result) VALUES ('run_due_jobs', v_result);
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.run_due_jobs() TO authenticated;

SELECT 'Projeto 06 (P06.1–P06.4): faturamento por corte, acerto na entrega, conciliação auto, escalação de SLA.' AS resultado;

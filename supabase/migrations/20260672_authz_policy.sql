-- ============================================================
-- VELOX TMS — Projeto 07.1: Autorização única (policy-as-code) + SoD 100%
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Antes: autorização espalhada (is_staff/is_admin + my_permission + checks inline
-- role IN (...)). SoD parcial no servidor e um FURO: pay_invoice checava só
-- my_permission (que faz default TRUE p/ todos) — sem gate de papel, um usuário
-- não-staff poderia pagar fatura.
--
-- Solução: has_capability(key) é a PORTEIRA ÚNICA — papel-base mínimo da
-- capacidade E deny-overlay (my_permission). Todas as capacidades sensíveis
-- passam por ela. O `can()` do frontend espelha a mesma regra.

-- ---------- porteira única ----------
CREATE OR REPLACE FUNCTION public.has_capability(p_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_base BOOLEAN;
BEGIN
  -- papel-base mínimo por capacidade (política central)
  IF p_key = 'approve_access' THEN
    v_base := public.is_admin();          -- aprovar acesso é só admin
  ELSE
    v_base := public.is_staff();          -- demais: equipe (admin/operador)
  END IF;
  -- deny-overlay: negada só quando explicitamente false em user.permissions
  RETURN COALESCE(v_base, false) AND public.my_permission(p_key);
END; $$;
GRANT EXECUTE ON FUNCTION public.has_capability(TEXT) TO authenticated;

-- ---------- pay_invoice: FECHA o furo (agora exige has_capability) ----------
CREATE OR REPLACE FUNCTION public.pay_invoice(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_capability('pay_invoice') THEN RAISE EXCEPTION 'Sem permissão para pagar faturas.'; END IF;
  PERFORM public.settlement_apply_invoice(p_invoice_id, CURRENT_DATE, NULL, 'invoice', NULL);
  PERFORM public.log_action('Pagou fatura', 'invoice', p_invoice_id::text, NULL);
END; $$;
GRANT EXECUTE ON FUNCTION public.pay_invoice(UUID) TO authenticated;

-- ---------- reconcile_bank_tx: via porteira única ----------
CREATE OR REPLACE FUNCTION public.reconcile_bank_tx(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_capability('reconcile') THEN RAISE EXCEPTION 'Segregação de funções: seu usuário não pode conciliar.'; END IF;
  PERFORM public.reconcile_internal(p_tx_id, p_type, p_target_id);
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_tx(UUID, TEXT, UUID) TO authenticated;

-- ---------- admin_offer_order: via porteira única ----------
CREATE OR REPLACE FUNCTION public.admin_offer_order(p_order_id UUID, p_carrier_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_capability('offer_carrier') THEN RAISE EXCEPTION 'Sem permissão para ofertar a parceiros.'; END IF;
  UPDATE public.orders
    SET carrier_id = p_carrier_id, carrier_amount = p_amount,
        carrier_status = 'offered', carrier_offered_at = now(), carrier_responded_at = NULL
    WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_offer_order(UUID, UUID, NUMERIC) TO authenticated;

-- ---------- cancel_order: fecha SoD (exige capacidade cancel_order) ----------
-- Corpo idêntico ao 20260621 + a checagem de capacidade no topo.
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID, p_reason TEXT, p_fee NUMERIC, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders%ROWTYPE; t trips%ROWTYPE;
BEGIN
  IF NOT public.has_capability('cancel_order') THEN RAISE EXCEPTION 'Sem permissão para cancelar pedidos.'; END IF;

  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido % não encontrado', p_order_id; END IF;

  UPDATE orders SET status='cancelled',
    unproductive_fee = CASE WHEN COALESCE(p_fee,0) > 0 THEN p_fee ELSE unproductive_fee END,
    status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
      'status','cancelled','timestamp',now(),'user',p_user,'note',p_reason)
  WHERE id = p_order_id;

  -- estorna receitas em aberto
  UPDATE revenues SET status='cancelled' WHERE order_id=p_order_id AND status IN ('receivable','overdue');

  -- se está numa viagem ativa: remove a parada do roteiro e recalcula
  IF o.trip_id IS NOT NULL THEN
    SELECT * INTO t FROM trips WHERE id = o.trip_id AND status IN ('planned','in_progress') FOR UPDATE;
    IF FOUND THEN
      UPDATE trips SET
        stops = COALESCE((SELECT jsonb_agg(CASE WHEN (s->>'order_id') = p_order_id::text
                  THEN s || jsonb_build_object('status','skipped','skip_reason','Pedido cancelado','skipped_at',now())
                  ELSE s END) FROM jsonb_array_elements(stops) s), '[]'::jsonb),
        total_revenue = GREATEST(0, COALESCE(total_revenue,0) - COALESCE(o.freight_value,0)),
        order_ids = COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements_text(order_ids) x WHERE x <> p_order_id::text), '[]'::jsonb),
        events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','order_cancelled',
          'description','Pedido '||COALESCE(o.protocol,'')||' cancelado — pule esta parada e continue a rota.','timestamp',now(),'user',p_user)
      WHERE id = t.id;

      INSERT INTO alerts(type, level, message, reference_id, reference_type, read, resolved)
      VALUES ('order_cancelled_in_trip','warning',
        COALESCE(o.protocol,'')||' cancelado durante a viagem '||COALESCE(t.truck_plate,'')||' — motorista avisado',
        p_order_id, 'order', false, false);
    END IF;
  END IF;

  -- taxa de deslocamento improdutivo vira receita a cobrar
  IF COALESCE(p_fee,0) > 0 THEN
    INSERT INTO revenues(order_id, client_id, description, amount, due_date, status)
    VALUES (p_order_id, o.client_id, 'Taxa de deslocamento improdutivo — '||COALESCE(o.protocol,''), p_fee, current_date, 'receivable');
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID,TEXT,NUMERIC,TEXT) TO authenticated;

-- ---------- aprovação de acesso: fecha SoD (capacidade approve_access) + auditoria ----------
CREATE OR REPLACE FUNCTION public.admin_approve_client(p_user_id UUID, p_client_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_capability('approve_access') THEN RAISE EXCEPTION 'Sem permissão para aprovar acessos.'; END IF;
  UPDATE public.user_profiles SET role = 'client', client_id = p_client_id, active = true WHERE id = p_user_id;
  PERFORM public.log_action('Aprovou acesso de cliente', 'user', p_user_id::text, NULL);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_approve_client(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_carrier(p_user_id UUID, p_carrier_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_capability('approve_access') THEN RAISE EXCEPTION 'Sem permissão para aprovar acessos.'; END IF;
  UPDATE public.user_profiles SET role = 'carrier', carrier_id = p_carrier_id, active = true WHERE id = p_user_id;
  PERFORM public.log_action('Aprovou acesso de transportadora', 'user', p_user_id::text, NULL);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_approve_carrier(UUID, UUID) TO authenticated;

SELECT 'Projeto 07.1: has_capability (porteira única) + SoD 100% (pay_invoice/reconcile/offer/cancel/approve).' AS resultado;

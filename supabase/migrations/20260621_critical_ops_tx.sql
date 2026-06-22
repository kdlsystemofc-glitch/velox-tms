-- ============================================================
-- VELOX TMS — Operações críticas ATÔMICAS (transação no servidor)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Move as 4 operações de maior risco para funções transacionais:
-- confirmar pedido, cancelar (com viagem), receber transferência, replanejar.
-- Cada uma: ou grava tudo, ou nada. O app tenta a função e cai no caminho
-- antigo (fallback) se a migration ainda não foi aplicada.

-- ─────────────────────────────────────────────────────────────
-- 1) CONFIRMAR PEDIDO (+ cria receita do frete, sem duplicar)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_order(
  p_order_id UUID, p_amount NUMERIC, p_due_date DATE, p_payment_method TEXT, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido % não encontrado', p_order_id; END IF;

  UPDATE orders SET status='confirmed',
    status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
      'status','confirmed','timestamp',now(),'user',p_user,'note','Status alterado para Confirmado')
  WHERE id = p_order_id;

  IF COALESCE(p_amount,0) > 0
     AND NOT EXISTS (SELECT 1 FROM revenues WHERE order_id=p_order_id AND status <> 'cancelled') THEN
    INSERT INTO revenues(order_id, client_id, description, amount, due_date, status, payment_method)
    VALUES (p_order_id, o.client_id, 'Frete '||COALESCE(o.protocol,'')||' — '||COALESCE(o.client_name,''),
            p_amount, COALESCE(p_due_date, o.collection_date, current_date), 'receivable', p_payment_method);
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ─────────────────────────────────────────────────────────────
-- 2) CANCELAR PEDIDO (estorna receita; se em viagem: pula parada,
--    recalcula receita da viagem, avisa; taxa improdutiva opcional)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id UUID, p_reason TEXT, p_fee NUMERIC, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders%ROWTYPE; t trips%ROWTYPE;
BEGIN
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

-- ─────────────────────────────────────────────────────────────
-- 3) RECEBER TRANSFERÊNCIA (cross-dock: libera pedidos p/ nova rota)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.receive_transfer(
  p_transfer_id UUID, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tr transfers%ROWTYPE; b branches%ROWTYPE;
BEGIN
  SELECT * INTO tr FROM transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência % não encontrada', p_transfer_id; END IF;
  SELECT * INTO b FROM branches WHERE id = tr.to_branch_id;

  UPDATE transfers SET status='received', arrival_date=now(),
    events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','received',
      'description','Recebido em '||COALESCE(b.name,'destino'),'timestamp',now(),'user',p_user)
  WHERE id = p_transfer_id;

  UPDATE orders o SET
    current_branch_id = tr.to_branch_id, status='confirmed',
    trip_id = NULL, scheduled_truck_id = NULL, scheduled_date = NULL,
    origin = CASE WHEN b.address IS NOT NULL AND b.address <> '{}'::jsonb THEN b.address ELSE o.origin END,
    status_history = COALESCE(o.status_history,'[]'::jsonb) || jsonb_build_object(
      'status','confirmed','timestamp',now(),'user',p_user,
      'note','Recebido em '||COALESCE(b.name,'destino')||' — disponível para nova rota (cross-docking)')
  WHERE o.id::text IN (SELECT jsonb_array_elements_text(tr.order_ids));
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ─────────────────────────────────────────────────────────────
-- 4) REPLANEJAR: redistribuir caminhão / reatribuir motorista
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.redistribute_truck(
  p_truck_id UUID, p_plate TEXT, p_order_ids UUID[], p_trip_ids UUID[], p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_order_ids IS NOT NULL THEN
    UPDATE orders SET scheduled_truck_id = p_truck_id,
      status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
        'status', status,'timestamp',now(),'user',p_user,'note','Redistribuído para '||COALESCE(p_plate,'')||' (caminhão anterior indisponível)')
    WHERE id = ANY(p_order_ids);
  END IF;
  IF p_trip_ids IS NOT NULL THEN
    UPDATE trips SET truck_id = p_truck_id, truck_plate = p_plate,
      events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','truck_reassigned',
        'description','Caminhão trocado para '||COALESCE(p_plate,'')||' (anterior em manutenção/inativo)','timestamp',now(),'user',p_user)
    WHERE id = ANY(p_trip_ids);
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.reassign_driver(
  p_driver_id UUID, p_driver_name TEXT, p_trip_ids UUID[], p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE trips SET driver_id = p_driver_id, driver_name = p_driver_name,
    events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','driver_reassigned',
      'description','Motorista trocado para '||COALESCE(p_driver_name,'')||' (anterior ausente)','timestamp',now(),'user',p_user)
  WHERE id = ANY(p_trip_ids);
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.confirm_order(UUID,NUMERIC,DATE,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID,TEXT,NUMERIC,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_transfer(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redistribute_truck(UUID,TEXT,UUID[],UUID[],TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reassign_driver(UUID,TEXT,UUID[],TEXT) TO authenticated;

SELECT 'Funções transacionais (confirmar/cancelar/receber/replanejar) criadas.' AS resultado;

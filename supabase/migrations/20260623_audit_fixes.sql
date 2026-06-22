-- ============================================================
-- VELOX TMS — Correções da auditoria (A2 / M2 / M5)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- ── A2: encerrar viagem NÃO sobrescreve estados de exceção ──
--    (entrega parcial, aguardando carga, falhou) + M2: cast seguro de custos.
CREATE OR REPLACE FUNCTION public.close_trip(
  p_trip_id UUID, p_real_km NUMERIC, p_fuel_liters NUMERIC, p_fuel_cost NUMERIC,
  p_tolls_cost NUMERIC, p_other_costs JSONB, p_total_cost NUMERIC, p_net_profit NUMERIC,
  p_commission_amount NUMERIC, p_commission_rows JSONB, p_truck_ids UUID[], p_order_ids UUID[],
  p_notes TEXT, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trip trips%ROWTYPE; v_plate TEXT; v_now TIMESTAMPTZ := now(); v_today DATE := current_date;
        c JSONB; oc JSONB; v_tid UUID; v_i INT := 0; v_amt NUMERIC;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Viagem % não encontrada', p_trip_id; END IF;
  v_plate := v_trip.truck_plate;

  UPDATE trips SET status='completed', arrival_date=v_now, real_km=p_real_km, fuel_liters=p_fuel_liters,
    fuel_cost=p_fuel_cost, tolls_cost=p_tolls_cost, other_costs=COALESCE(p_other_costs,'[]'::jsonb),
    total_cost=p_total_cost, net_profit=p_net_profit, commission_amount=p_commission_amount,
    notes=COALESCE(p_notes, notes),
    events=COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','completed',
      'description','Viagem encerrada. Km final: '||COALESCE(p_real_km::text,'—'),'timestamp',v_now,'user',p_user)
  WHERE id = p_trip_id;

  IF COALESCE(p_fuel_cost,0) > 0 THEN
    INSERT INTO expenses(category,description,amount,date,status,trip_id)
    VALUES ('fuel','Combustível — '||COALESCE(v_plate,'')||' ('||COALESCE(p_fuel_liters,0)||'L)',p_fuel_cost,v_today,'paid',p_trip_id);
  END IF;
  IF COALESCE(p_tolls_cost,0) > 0 THEN
    INSERT INTO expenses(category,description,amount,date,status,trip_id)
    VALUES ('tolls','Pedágios — '||COALESCE(v_plate,''),p_tolls_cost,v_today,'paid',p_trip_id);
  END IF;
  FOR oc IN SELECT * FROM jsonb_array_elements(COALESCE(p_other_costs,'[]'::jsonb)) LOOP
    v_amt := COALESCE(NULLIF(oc->>'amount','')::numeric, 0);  -- cast seguro (M2)
    IF v_amt > 0 THEN
      INSERT INTO expenses(category,description,amount,date,status,trip_id)
      VALUES ('other',COALESCE(NULLIF(oc->>'description',''),'Gasto extra — '||COALESCE(v_plate,'')),v_amt,v_today,'paid',p_trip_id);
    END IF;
  END LOOP;
  FOR c IN SELECT * FROM jsonb_array_elements(COALESCE(p_commission_rows,'[]'::jsonb)) LOOP
    v_amt := COALESCE(NULLIF(c->>'amount','')::numeric, 0);
    IF v_amt > 0 THEN
      INSERT INTO expenses(category,description,amount,date,status,trip_id,driver_id)
      VALUES ('salaries','Comissão '||COALESCE(c->>'pct','0')||'% — '||COALESCE(c->>'driver_name','motorista')||' (viagem '||COALESCE(c->>'truck_plate',v_plate,'')||')',
        v_amt,v_today,'pending',p_trip_id,NULLIF(c->>'driver_id','')::uuid);
    END IF;
  END LOOP;

  IF p_truck_ids IS NOT NULL THEN
    FOREACH v_tid IN ARRAY p_truck_ids LOOP
      IF v_tid IS NOT NULL THEN
        IF v_i = 0 AND COALESCE(p_real_km,0) > 0 THEN
          UPDATE trucks SET status='available', total_km=p_real_km WHERE id=v_tid;
        ELSE
          UPDATE trucks SET status='available' WHERE id=v_tid;
        END IF;
      END IF;
      v_i := v_i + 1;
    END LOOP;
  END IF;

  -- A2: só conclui quem ainda estava em coleta/trânsito (preserva exceções)
  IF p_order_ids IS NOT NULL THEN
    UPDATE orders SET status='delivered',
      status_history=COALESCE(status_history,'[]'::jsonb) || jsonb_build_object('status','delivered',
        'timestamp',v_now,'user',p_user,'note','Viagem encerrada — '||COALESCE(v_plate,''))
    WHERE id = ANY(p_order_ids) AND status IN ('in_transit','collecting');
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ── M5: confirmar pedido unificado (também grava frete/forma/data de coleta) ──
DROP FUNCTION IF EXISTS public.confirm_order(UUID,NUMERIC,DATE,TEXT,TEXT);
CREATE OR REPLACE FUNCTION public.confirm_order(
  p_order_id UUID, p_amount NUMERIC, p_due_date DATE, p_payment_method TEXT, p_user TEXT,
  p_collection_date DATE DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido % não encontrado', p_order_id; END IF;

  UPDATE orders SET status='confirmed',
    freight_value  = CASE WHEN COALESCE(p_amount,0) > 0 THEN p_amount ELSE freight_value END,
    payment_method = COALESCE(p_payment_method, payment_method),
    collection_date = COALESCE(p_collection_date, collection_date),
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

GRANT EXECUTE ON FUNCTION public.close_trip(UUID,NUMERIC,NUMERIC,NUMERIC,NUMERIC,JSONB,NUMERIC,NUMERIC,NUMERIC,JSONB,UUID[],UUID[],TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order(UUID,NUMERIC,DATE,TEXT,TEXT,DATE) TO authenticated;

SELECT 'Correções A2/M2/M5 aplicadas.' AS resultado;

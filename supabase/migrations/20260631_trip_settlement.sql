-- ============================================================
-- VELOX TMS — Viagens (Vi-3): custos categorizados + acerto por veículo
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- 1) Guarda o rateio de comissão por motorista/veículo do comboio na própria viagem
--    (antes só guardávamos o total). Permite mostrar o acerto de cada veículo.
-- 2) "Outros gastos" do encerramento passam a respeitar a CATEGORIA escolhida
--    (manutenção, pneu, etc.) ao virar despesa — antes caíam tudo em 'other'.

ALTER TABLE trips ADD COLUMN IF NOT EXISTS commission_rows JSONB;  -- [{driver_id, driver_name, truck_plate, pct, amount}]

CREATE OR REPLACE FUNCTION public.close_trip(
  p_trip_id UUID, p_real_km NUMERIC, p_fuel_liters NUMERIC, p_fuel_cost NUMERIC,
  p_tolls_cost NUMERIC, p_other_costs JSONB, p_total_cost NUMERIC, p_net_profit NUMERIC,
  p_commission_amount NUMERIC, p_commission_rows JSONB, p_truck_ids UUID[], p_order_ids UUID[],
  p_notes TEXT, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trip trips%ROWTYPE; v_plate TEXT; v_now TIMESTAMPTZ := now(); v_today DATE := current_date;
        c JSONB; oc JSONB; v_tid UUID; v_i INT := 0; v_amt NUMERIC; v_cat TEXT;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Viagem % não encontrada', p_trip_id; END IF;
  v_plate := v_trip.truck_plate;

  UPDATE trips SET status='completed', arrival_date=v_now, real_km=p_real_km, fuel_liters=p_fuel_liters,
    fuel_cost=p_fuel_cost, tolls_cost=p_tolls_cost, other_costs=COALESCE(p_other_costs,'[]'::jsonb),
    total_cost=p_total_cost, net_profit=p_net_profit, commission_amount=p_commission_amount,
    commission_rows=COALESCE(p_commission_rows,'[]'::jsonb),
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
      -- Vi-3: usa a categoria escolhida se for válida; senão cai em 'other'
      v_cat := COALESCE(NULLIF(oc->>'category',''),'other');
      IF v_cat NOT IN ('fuel','maintenance','tires','tolls','salaries','taxes','insurance','rent','administrative','marketing','other') THEN
        v_cat := 'other';
      END IF;
      INSERT INTO expenses(category,description,amount,date,status,trip_id)
      VALUES (v_cat,COALESCE(NULLIF(oc->>'description',''),'Gasto extra — '||COALESCE(v_plate,'')),v_amt,v_today,'paid',p_trip_id);
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

GRANT EXECUTE ON FUNCTION public.close_trip(UUID,NUMERIC,NUMERIC,NUMERIC,NUMERIC,JSONB,NUMERIC,NUMERIC,NUMERIC,JSONB,UUID[],UUID[],TEXT,TEXT) TO authenticated;

SELECT 'Viagens Vi-3: custos categorizados + acerto por veículo prontos.' AS resultado;

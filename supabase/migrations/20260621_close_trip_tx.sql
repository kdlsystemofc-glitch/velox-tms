-- ============================================================
-- VELOX TMS — Encerramento de viagem ATÔMICO (transação no servidor)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Problema: hoje o "encerrar viagem" faz ~10 gravações no navegador, uma a uma.
-- Se cair no meio, fica estado parcial. Esta função faz TUDO numa transação só:
-- ou grava tudo, ou não grava nada.
--
-- A MATEMÁTICA (custo, lucro, comissão por motorista) continua no app (JS testado):
-- aqui só recebemos os valores já calculados e aplicamos com segurança.

CREATE OR REPLACE FUNCTION public.close_trip(
  p_trip_id          UUID,
  p_real_km          NUMERIC,
  p_fuel_liters      NUMERIC,
  p_fuel_cost        NUMERIC,
  p_tolls_cost       NUMERIC,
  p_other_costs      JSONB,   -- [{description, amount}]
  p_total_cost       NUMERIC,
  p_net_profit       NUMERIC,
  p_commission_amount NUMERIC,
  p_commission_rows  JSONB,   -- [{driver_id, driver_name, truck_plate, pct, amount}]
  p_truck_ids        UUID[],  -- veículos do comboio (líder primeiro)
  p_order_ids        UUID[],
  p_notes            TEXT,
  p_user             TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip   trips%ROWTYPE;
  v_plate  TEXT;
  v_now    TIMESTAMPTZ := now();
  v_today  DATE := current_date;
  c        JSONB;
  oc       JSONB;
  v_tid    UUID;
  v_i      INT := 0;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Viagem % não encontrada', p_trip_id;
  END IF;
  v_plate := v_trip.truck_plate;

  -- 1) Atualiza a viagem
  UPDATE trips SET
    status = 'completed',
    arrival_date = v_now,
    real_km = p_real_km,
    fuel_liters = p_fuel_liters,
    fuel_cost = p_fuel_cost,
    tolls_cost = p_tolls_cost,
    other_costs = COALESCE(p_other_costs, '[]'::jsonb),
    total_cost = p_total_cost,
    net_profit = p_net_profit,
    commission_amount = p_commission_amount,
    notes = COALESCE(p_notes, notes),
    events = COALESCE(events, '[]'::jsonb) || jsonb_build_object(
      'type','completed','description','Viagem encerrada. Km final: '||COALESCE(p_real_km::text,'—'),
      'timestamp', v_now, 'user', p_user)
  WHERE id = p_trip_id;

  -- 2) Despesas: combustível, pedágio, outros, comissões
  IF COALESCE(p_fuel_cost,0) > 0 THEN
    INSERT INTO expenses(category, description, amount, date, status, trip_id)
    VALUES ('fuel', 'Combustível — '||COALESCE(v_plate,'')||' ('||COALESCE(p_fuel_liters,0)||'L)', p_fuel_cost, v_today, 'paid', p_trip_id);
  END IF;
  IF COALESCE(p_tolls_cost,0) > 0 THEN
    INSERT INTO expenses(category, description, amount, date, status, trip_id)
    VALUES ('tolls', 'Pedágios — '||COALESCE(v_plate,''), p_tolls_cost, v_today, 'paid', p_trip_id);
  END IF;
  FOR oc IN SELECT * FROM jsonb_array_elements(COALESCE(p_other_costs,'[]'::jsonb)) LOOP
    IF COALESCE((oc->>'amount')::numeric,0) > 0 THEN
      INSERT INTO expenses(category, description, amount, date, status, trip_id)
      VALUES ('other', COALESCE(NULLIF(oc->>'description',''), 'Gasto extra — '||COALESCE(v_plate,'')), (oc->>'amount')::numeric, v_today, 'paid', p_trip_id);
    END IF;
  END LOOP;
  FOR c IN SELECT * FROM jsonb_array_elements(COALESCE(p_commission_rows,'[]'::jsonb)) LOOP
    IF COALESCE((c->>'amount')::numeric,0) > 0 THEN
      INSERT INTO expenses(category, description, amount, date, status, trip_id, driver_id)
      VALUES ('salaries',
        'Comissão '||COALESCE(c->>'pct','0')||'% — '||COALESCE(c->>'driver_name','motorista')||' (viagem '||COALESCE(c->>'truck_plate', v_plate, '')||')',
        (c->>'amount')::numeric, v_today, 'pending', p_trip_id, NULLIF(c->>'driver_id','')::uuid);
    END IF;
  END LOOP;

  -- 3) Caminhões do comboio voltam a disponível; odômetro só no líder (primeiro)
  IF p_truck_ids IS NOT NULL THEN
    FOREACH v_tid IN ARRAY p_truck_ids LOOP
      IF v_tid IS NOT NULL THEN
        IF v_i = 0 AND COALESCE(p_real_km,0) > 0 THEN
          UPDATE trucks SET status='available', total_km = p_real_km WHERE id = v_tid;
        ELSE
          UPDATE trucks SET status='available' WHERE id = v_tid;
        END IF;
      END IF;
      v_i := v_i + 1;
    END LOOP;
  END IF;

  -- 4) Pedidos da viagem viram entregues (exceto já entregues/cancelados)
  IF p_order_ids IS NOT NULL THEN
    UPDATE orders SET
      status = 'delivered',
      status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
        'status','delivered','timestamp', v_now, 'user', p_user,
        'note','Viagem encerrada — '||COALESCE(v_plate,''))
    WHERE id = ANY(p_order_ids) AND status NOT IN ('delivered','cancelled');
  END IF;

  RETURN jsonb_build_object('ok', true, 'trip_id', p_trip_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_trip(UUID,NUMERIC,NUMERIC,NUMERIC,NUMERIC,JSONB,NUMERIC,NUMERIC,NUMERIC,JSONB,UUID[],UUID[],TEXT,TEXT) TO authenticated;

SELECT 'Função close_trip (transação atômica) criada.' AS resultado;

-- ============================================================
-- VELOX TMS — SIMULAÇÃO DE 30 DIAS DE OPERAÇÃO
-- ============================================================
-- Popula o sistema com dados realistas dos últimos 30 dias:
-- 3 caminhões, 3 motoristas, 6 clientes, ~36 pedidos em todos os
-- status, viagens com custos, e o financeiro (receitas/despesas).
--
-- COMO USAR: cole tudo no SQL Editor do Supabase e rode.
-- É IDEMPOTENTE: rodar de novo apaga a simulação anterior e recria.
-- Tudo é marcado com "[SIM]" (notes) / código "SIM" para limpeza.
--
-- PARA REMOVER A SIMULAÇÃO: rode o bloco "LIMPEZA" no final (comentado).
-- ============================================================

DO $$
DECLARE
  t1 uuid := 'a1000000-0000-4000-8000-000000000001';
  t2 uuid := 'a1000000-0000-4000-8000-000000000002';
  t3 uuid := 'a1000000-0000-4000-8000-000000000003';
  d1 uuid := 'a2000000-0000-4000-8000-000000000001';
  d2 uuid := 'a2000000-0000-4000-8000-000000000002';
  d3 uuid := 'a2000000-0000-4000-8000-000000000003';
  cli uuid[] := ARRAY[
    'a3000000-0000-4000-8000-000000000001'::uuid,
    'a3000000-0000-4000-8000-000000000002'::uuid,
    'a3000000-0000-4000-8000-000000000003'::uuid,
    'a3000000-0000-4000-8000-000000000004'::uuid,
    'a3000000-0000-4000-8000-000000000005'::uuid,
    'a3000000-0000-4000-8000-000000000006'::uuid
  ];
  cliNames text[] := ARRAY['Distribuidora Brasil Ltda','Indústria Têxtil SP','Comércio Atacadista RJ','AgroPeças MG','Eletro Sul Ltda','Alimentos Bom Sabor'];
  cliCnpj  text[] := ARRAY['12.345.678/0001-90','23.456.789/0001-01','34.567.890/0001-12','45.678.901/0001-23','56.789.012/0001-34','67.890.123/0001-45'];
  cliCity  text[] := ARRAY['São Paulo','São Paulo','Rio de Janeiro','Belo Horizonte','Curitiba','Campinas'];
  cliUF    text[] := ARRAY['SP','SP','RJ','MG','PR','SP'];
  destCity text[] := ARRAY['Campinas','Ribeirão Preto','Santos','Sorocaba','Curitiba','Belo Horizonte','Rio de Janeiro','Joinville'];
  destUF   text[] := ARRAY['SP','SP','SP','SP','PR','MG','RJ','SC'];
  drivers_ids uuid[] := ARRAY[d1,d2,d3];
  drivers_nm  text[] := ARRAY['João da Silva','Carlos Pereira','Marcos Antônio'];
  trucks_ids  uuid[] := ARRAY[t1,t2,t3];
  trucks_pl   text[] := ARRAY['RKT-1A23','RKT-2B45','RKT-3C67'];

  yr text := to_char(now(), 'YYYY');
  i int; oid uuid; tripid uuid;
  ci int; di int; ti int;
  st text; pstatus text; wt numeric; vol int; declared numeric; freight numeric;
  coldate date; created timestamptz; protocol text; seq int := 0;
  recp jsonb; hist jsonb; orig jsonb; addr text;
  rev_status text; due date;
BEGIN
  -- ───────── LIMPEZA da simulação anterior ─────────
  DELETE FROM expenses  WHERE notes LIKE '%[SIM]%';
  DELETE FROM revenues  WHERE notes LIKE '%[SIM]%';
  DELETE FROM orders    WHERE general_notes LIKE '%[SIM]%';
  DELETE FROM trips     WHERE notes LIKE '%[SIM]%';
  DELETE FROM trucks    WHERE id = ANY(trucks_ids);
  DELETE FROM drivers   WHERE id = ANY(drivers_ids);
  DELETE FROM clients   WHERE id = ANY(cli);

  -- ───────── FROTA ─────────
  INSERT INTO trucks (id, plate, model, manufacturer, year, truck_type, capacity_kg, status, total_km, crlv_expiry, insurance_expiry, tachograph_next, color) VALUES
    (t1,'RKT-1A23','Actros 2651','Mercedes-Benz',2021,'carreta',27000,'available', 312000, (now()+'80 days'::interval)::date, (now()+'120 days'::interval)::date, (now()+'40 days'::interval)::date,'Branco'),
    (t2,'RKT-2B45','FH 540','Volvo',2020,'carreta',30000,'available', 458000, (now()+'25 days'::interval)::date, (now()+'200 days'::interval)::date, (now()+'15 days'::interval)::date,'Azul'),
    (t3,'RKT-3C67','Constellation 24.280','Volkswagen',2019,'truck',12000,'maintenance', 521000, (now()+'200 days'::interval)::date, (now()+'8 days'::interval)::date, (now()+'90 days'::interval)::date,'Prata');

  -- ───────── MOTORISTAS ─────────
  INSERT INTO drivers (id, name, cpf, phone, cnh_number, cnh_category, cnh_expiry, role, contract_type, base_salary, status, hire_date) VALUES
    (d1,'João da Silva','111.222.333-44','(11) 98888-0001','01234567890','E',(now()+'300 days'::interval)::date,'motorista','clt',3800,'active',(now()-'800 days'::interval)::date),
    (d2,'Carlos Pereira','222.333.444-55','(11) 98888-0002','02345678901','E',(now()+'45 days'::interval)::date,'motorista','clt',3800,'active',(now()-'500 days'::interval)::date),
    (d3,'Marcos Antônio','333.444.555-66','(11) 98888-0003','03456789012','D',(now()+'600 days'::interval)::date,'motorista','pj',4200,'active',(now()-'200 days'::interval)::date);

  -- ───────── CLIENTES ─────────
  FOR ci IN 1..6 LOOP
    INSERT INTO clients (id, code, type, company_name, cpf_cnpj, email, phone, client_type, billing_type, status, address)
    VALUES (
      cli[ci], 'SIM' || lpad(ci::text,3,'0'), 'pj', cliNames[ci], cliCnpj[ci],
      'contato' || ci || '@exemplo.com.br', '(11) 3000-00' || lpad(ci::text,2,'0'),
      CASE WHEN ci <= 3 THEN 'recorrente' ELSE 'eventual' END,
      CASE WHEN ci = 1 THEN 'monthly' ELSE 'per_trip' END, 'active',
      jsonb_build_object('cep','01310-100','street','Av. Paulista','number',(1000+ci)::text,'neighborhood','Bela Vista','city',cliCity[ci],'state',cliUF[ci])
    );
  END LOOP;

  -- ───────── PEDIDOS (30 dias) ─────────
  FOR i IN 0..29 LOOP
    -- 1 a 2 pedidos por dia
    FOR di IN 1..(1 + (i % 2)) LOOP
      seq := seq + 1;
      oid := uuid_generate_v4();
      ci := 1 + ((i + di) % 6);
      ti := 1 + ((i + di) % 3);
      protocol := 'VLX-' || yr || '-' || lpad((90000 + seq)::text, 5, '0');
      created := now() - (i || ' days')::interval - (di || ' hours')::interval;
      coldate := (now() - (i || ' days')::interval)::date;
      wt := 300 + ((i * 137 + di * 53) % 5000);
      vol := 2 + ((i + di) % 12);
      declared := round(wt * (40 + (i % 30)));
      freight := round(wt * 0.55 + 250 + (i % 6) * 45, 2);

      -- status conforme a idade do pedido
      IF (seq % 11) = 0 THEN st := 'cancelled';
      ELSIF i >= 6 THEN st := 'delivered';
      ELSIF i >= 4 THEN st := 'in_transit';
      ELSIF i >= 3 THEN st := 'collecting';
      ELSIF i >= 1 THEN st := 'confirmed';
      ELSE st := 'new';
      END IF;

      pstatus := CASE WHEN st = 'delivered' THEN 'paid' ELSE 'pending' END;
      addr := 'Rua das Indústrias, ' || (100 + seq)::text || ' - ' || destCity[1 + (seq % 8)] || '/' || destUF[1 + (seq % 8)];

      orig := jsonb_build_object('cep','01310-100','street','Av. Paulista','number',(1000+ci)::text,
                'neighborhood','Bela Vista','city',cliCity[ci],'state',cliUF[ci]);

      recp := jsonb_build_array(jsonb_build_object(
        'name', destCity[1 + (seq % 8)] || ' Comércio Ltda',
        'cpf_cnpj','98.765.43' || lpad((seq % 100)::text,2,'0') || '/0001-00',
        'cep','13000-000','street','Rua das Indústrias','number',(100+seq)::text,
        'neighborhood','Centro','city',destCity[1 + (seq % 8)],'state',destUF[1 + (seq % 8)],
        'delivery_status', CASE WHEN st='delivered' THEN 'delivered' ELSE 'pending' END,
        'items', jsonb_build_array(jsonb_build_object(
          'nf_number',(120000 + seq)::text,'description','Mercadorias diversas','package_type','caixa',
          'volumes',vol,'weight_kg',wt,'declared_value',declared))
      ));

      hist := jsonb_build_array(jsonb_build_object('status','new','timestamp',created,'user','Site','note','Solicitação via simulação [SIM]'));
      IF st <> 'new' THEN
        hist := hist || jsonb_build_object('status','confirmed','timestamp',created + '2 hours'::interval,'user','Admin','note','Confirmado');
      END IF;
      IF st IN ('collecting','in_transit','delivered') THEN
        hist := hist || jsonb_build_object('status','collecting','timestamp',created + '1 day'::interval,'user','Sistema','note','Em coleta');
      END IF;
      IF st IN ('in_transit','delivered') THEN
        hist := hist || jsonb_build_object('status','in_transit','timestamp',created + '1 day 4 hours'::interval,'user','Motorista','note','Em trânsito');
      END IF;
      IF st = 'delivered' THEN
        hist := hist || jsonb_build_object('status','delivered','timestamp',created + '2 days'::interval,'user','Motorista','note','Entregue');
      END IF;
      IF st = 'cancelled' THEN
        hist := hist || jsonb_build_object('status','cancelled','timestamp',created + '3 hours'::interval,'user','Admin','note','Cancelado — motivo: cliente desistiu');
      END IF;

      INSERT INTO orders (
        id, protocol, client_id, client_name, client_cpf_cnpj, client_phone, status, freight_type, freight_payer,
        cte_number, origin, collection_date, collection_time, recipients, total_volumes, total_weight_kg,
        total_declared_value, freight_value, payment_method, payment_status,
        driver_id, truck_id, scheduled_truck_id, scheduled_date, general_notes, status_history, created_at
      ) VALUES (
        oid, protocol, cli[ci], cliNames[ci], cliCnpj[ci], '(11) 3000-0000', st,
        CASE WHEN seq % 7 = 0 THEN 'urgent' WHEN seq % 3 = 0 THEN 'dedicated' ELSE 'shared' END, 'cif',
        CASE WHEN st IN ('in_transit','delivered') THEN '3526' || (10000+seq)::text ELSE NULL END,
        orig, coldate, (ARRAY['morning','afternoon','to_arrange'])[1 + (seq % 3)], recp, vol, wt, declared, freight,
        (ARRAY['pix','boleto','transfer'])[1 + (seq % 3)], pstatus,
        CASE WHEN st IN ('collecting','in_transit','delivered') THEN drivers_ids[ti] ELSE NULL END,
        CASE WHEN st IN ('collecting','in_transit','delivered') THEN trucks_ids[ti] ELSE NULL END,
        CASE WHEN st <> 'new' THEN trucks_ids[ti] ELSE NULL END,
        CASE WHEN st <> 'new' THEN coldate ELSE NULL END,
        'Pedido de simulação [SIM]', hist, created
      );

      -- Viagem para pedidos em trânsito / entregues
      IF st IN ('in_transit','delivered') THEN
        tripid := uuid_generate_v4();
        INSERT INTO trips (
          id, status, driver_id, driver_name, truck_id, truck_plate, order_ids, order_protocols,
          departure_date, arrival_date, stops, real_km, fuel_liters, fuel_cost, tolls_cost,
          total_revenue, total_cost, net_profit, notes, created_at
        ) VALUES (
          tripid, CASE WHEN st='delivered' THEN 'completed' ELSE 'in_progress' END,
          drivers_ids[ti], drivers_nm[ti], trucks_ids[ti], trucks_pl[ti],
          jsonb_build_array(oid), jsonb_build_array(protocol),
          created + '1 day'::interval, CASE WHEN st='delivered' THEN created + '2 days'::interval ELSE NULL END,
          jsonb_build_array(
            jsonb_build_object('type','collection','order_id',oid,'address','Av. Paulista, '||(1000+ci)||' - '||cliCity[ci],'city',cliCity[ci],'state',cliUF[ci],'status','completed'),
            jsonb_build_object('type','delivery','order_id',oid,'recipient_name',destCity[1 + (seq % 8)] || ' Comércio Ltda','address',addr,'city',destCity[1+(seq%8)],'state',destUF[1+(seq%8)],'status', CASE WHEN st='delivered' THEN 'completed' ELSE 'pending' END)
          ),
          CASE WHEN st='delivered' THEN 400 + (seq*7 % 600) ELSE NULL END,
          CASE WHEN st='delivered' THEN 180 + (seq*3 % 200) ELSE NULL END,
          CASE WHEN st='delivered' THEN round((180 + (seq*3 % 200)) * 6.0, 2) ELSE NULL END,
          CASE WHEN st='delivered' THEN round((seq % 5) * 35.0, 2) ELSE NULL END,
          freight,
          CASE WHEN st='delivered' THEN round((180 + (seq*3 % 200)) * 6.0 + (seq % 5) * 35.0, 2) ELSE NULL END,
          CASE WHEN st='delivered' THEN round(freight - ((180 + (seq*3 % 200)) * 6.0 + (seq % 5) * 35.0), 2) ELSE NULL END,
          'Viagem de simulação [SIM]', created + '1 day'::interval
        );
        UPDATE orders SET trip_id = tripid WHERE id = oid;

        -- Despesa de combustível da viagem entregue
        IF st = 'delivered' THEN
          INSERT INTO expenses (category, description, amount, date, payment_method, status, paid_date, trip_id, truck_id, notes)
          VALUES ('fuel','Combustível — '||trucks_pl[ti]||' (viagem '||protocol||')', round((180 + (seq*3 % 200)) * 6.0, 2),
                  (created + '2 days'::interval)::date, 'pix', 'paid', (created + '2 days'::interval)::date, tripid, trucks_ids[ti], '[SIM]');
        END IF;
      END IF;

      -- Receita para pedidos confirmados em diante (não cancelados)
      IF st IN ('confirmed','collecting','in_transit','delivered') THEN
        due := coldate + 15;
        IF st = 'delivered' THEN
          rev_status := 'received';
        ELSIF due < now()::date THEN
          rev_status := 'overdue';
        ELSE
          rev_status := 'receivable';
        END IF;
        INSERT INTO revenues (order_id, description, amount, due_date, status, payment_method, received_date, client_id, notes)
        VALUES (oid, 'Frete '||protocol||' — '||cliNames[ci], freight, due, rev_status,
                (ARRAY['pix','boleto','transfer'])[1 + (seq % 3)],
                CASE WHEN rev_status='received' THEN (created + '3 days'::interval)::date ELSE NULL END,
                cli[ci], '[SIM]');
      END IF;
    END LOOP;
  END LOOP;

  -- ───────── DESPESAS FIXAS / RECORRENTES ─────────
  INSERT INTO expenses (category, description, amount, date, payment_method, status, paid_date, notes) VALUES
    ('salaries','Folha de pagamento — motoristas', 11800, (now()-'5 days'::interval)::date, 'transfer','paid',(now()-'5 days'::interval)::date,'[SIM]'),
    ('rent','Aluguel do galpão', 4500, (now()-'10 days'::interval)::date,'boleto','paid',(now()-'10 days'::interval)::date,'[SIM]'),
    ('insurance','Seguro da frota (parcela)', 2800, (now()+'3 days'::interval)::date,'boleto','pending',NULL,'[SIM]'),
    ('taxes','Impostos e encargos', 3200, (now()+'8 days'::interval)::date,'boleto','pending',NULL,'[SIM]'),
    ('maintenance','Revisão preventiva RKT-3C67', 1850, (now()-'2 days'::interval)::date,'pix','pending',NULL,'[SIM]'),
    ('tires','Jogo de pneus RKT-2B45', 6400, (now()+'20 days'::interval)::date,'boleto','pending',NULL,'[SIM]');

  RAISE NOTICE 'Simulação criada: % pedidos em 30 dias.', seq;
END $$;

-- ============================================================
-- LIMPEZA (descomente e rode para remover a simulação):
-- ============================================================
-- DELETE FROM expenses WHERE notes LIKE '%[SIM]%';
-- DELETE FROM revenues WHERE notes LIKE '%[SIM]%';
-- DELETE FROM orders   WHERE general_notes LIKE '%[SIM]%';
-- DELETE FROM trips    WHERE notes LIKE '%[SIM]%';
-- DELETE FROM clients  WHERE code LIKE 'SIM%';
-- DELETE FROM drivers  WHERE id::text LIKE 'a2000000-%';
-- DELETE FROM trucks   WHERE id::text LIKE 'a1000000-%';

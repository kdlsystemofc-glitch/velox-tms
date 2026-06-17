-- ============================================================
-- VELOX TMS — SIMULAÇÃO DE 30 DIAS DE OPERAÇÃO (v3)
-- ============================================================
-- Popula o sistema com dados realistas dos últimos 30 dias:
-- 3 caminhões, 3 motoristas, 6 clientes, 4 fornecedores, ~45 pedidos
-- em todos os status, viagens com custos e o financeiro completo
-- (receitas + despesas vinculadas a fornecedor/veículo).
--
-- PRÉ-REQUISITO: rode antes `migrations/20260616_reconcile_schema.sql`
--   (garante todas as colunas que este seed usa).
--
-- COMO USAR: cole tudo no SQL Editor do Supabase e rode.
-- É IDEMPOTENTE: rodar de novo apaga a simulação anterior e recria.
-- Tudo é marcado com "[SIM]" (notes) / código "SIM" para limpeza.
--
-- AO FINAL há um BLOCO DE VERIFICAÇÕES (SELECTs) que aponta
-- incoerências de fluxo/lógica. Rode-o de novo DEPOIS de mexer no
-- sistema pelo app para ver se o app manteve os dados consistentes.
--
-- PARA REMOVER: rode o bloco "LIMPEZA" no final (comentado).
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
  sup uuid[] := ARRAY[
    'a4000000-0000-4000-8000-000000000001'::uuid,
    'a4000000-0000-4000-8000-000000000002'::uuid,
    'a4000000-0000-4000-8000-000000000003'::uuid,
    'a4000000-0000-4000-8000-000000000004'::uuid
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
  rev_status text; due date; fuel numeric; tolls numeric; tripcost numeric;
BEGIN
  -- ───────── LIMPEZA da simulação anterior ─────────
  DELETE FROM expenses  WHERE notes LIKE '%[SIM]%';
  DELETE FROM revenues  WHERE notes LIKE '%[SIM]%';
  DELETE FROM orders    WHERE general_notes LIKE '%[SIM]%';
  DELETE FROM trips     WHERE notes LIKE '%[SIM]%';
  DELETE FROM trucks    WHERE id = ANY(trucks_ids);
  DELETE FROM drivers   WHERE id = ANY(drivers_ids);
  DELETE FROM clients   WHERE id = ANY(cli);
  DELETE FROM suppliers WHERE id = ANY(sup);

  -- ───────── FROTA (com chassi, dimensões, alertas de km) ─────────
  INSERT INTO trucks (id, plate, model, manufacturer, year, truck_type, capacity_kg, dimensions, renavam, chassis, color, status, total_km, crlv_expiry, insurance_expiry, tachograph_last, tachograph_next, km_alert_oil, km_alert_review, km_alert_tires) VALUES
    (t1,'RKT-1A23','Actros 2651','Mercedes-Benz',2021,'carreta',27000, '{"length_m":14.8,"width_m":2.6,"height_m":2.9}'::jsonb,'01234567890','9BWZZZ377VT004251','Branco','available', 312000, (now()+'80 days'::interval)::date, (now()+'120 days'::interval)::date, (now()-'320 days'::interval)::date, (now()+'40 days'::interval)::date, 20000, 40000, 60000),
    (t2,'RKT-2B45','FH 540','Volvo',2020,'carreta',30000, '{"length_m":15.0,"width_m":2.6,"height_m":3.0}'::jsonb,'02345678901','9BVZZZ377LT112233','Azul','available', 458000, (now()+'25 days'::interval)::date, (now()+'200 days'::interval)::date, (now()-'330 days'::interval)::date, (now()+'15 days'::interval)::date, 20000, 40000, 60000),
    (t3,'RKT-3C67','Constellation 24.280','Volkswagen',2019,'truck',12000, '{"length_m":9.5,"width_m":2.5,"height_m":2.8}'::jsonb,'03456789012','9BWZZZ377KT556677','Prata','maintenance', 521000, (now()+'200 days'::interval)::date, (now()+'8 days'::interval)::date, (now()-'200 days'::interval)::date, (now()+'90 days'::interval)::date, 15000, 30000, 50000);

  -- ───────── MOTORISTAS (com endereço e dados bancários) ─────────
  INSERT INTO drivers (id, name, cpf, phone, email, birth_date, cnh_number, cnh_category, cnh_expiry, role, contract_type, base_salary, status, hire_date, address, bank_info) VALUES
    (d1,'João da Silva','111.222.333-44','(11) 98888-0001','joao@velox.com','1985-04-12','01234567890','E',(now()+'300 days'::interval)::date,'motorista','clt',3800,'active',(now()-'800 days'::interval)::date,
       '{"street":"Rua A","number":"100","neighborhood":"Centro","city":"São Paulo","state":"SP","cep":"01000-000"}'::jsonb,
       '{"bank":"Banco do Brasil","agency":"1234","account":"56789-0","pix_key":"111.222.333-44"}'::jsonb),
    (d2,'Carlos Pereira','222.333.444-55','(11) 98888-0002','carlos@velox.com','1990-09-03','02345678901','E',(now()+'45 days'::interval)::date,'motorista','clt',3800,'active',(now()-'500 days'::interval)::date,
       '{"street":"Rua B","number":"200","neighborhood":"Vila Nova","city":"Guarulhos","state":"SP","cep":"07000-000"}'::jsonb,
       '{"bank":"Itaú","agency":"4321","account":"98765-4","pix_key":"carlos@velox.com"}'::jsonb),
    (d3,'Marcos Antônio','333.444.555-66','(11) 98888-0003','marcos@velox.com','1982-12-20','03456789012','D',(now()+'600 days'::interval)::date,'motorista','pj',4200,'active',(now()-'200 days'::interval)::date,
       '{"street":"Rua C","number":"300","neighborhood":"Industrial","city":"Osasco","state":"SP","cep":"06000-000"}'::jsonb,
       '{"bank":"Nubank","agency":"0001","account":"112233-4","pix_key":"(11) 98888-0003"}'::jsonb);

  -- ───────── FORNECEDORES (com endereço, condições de pagamento, PIX) ─────────
  INSERT INTO suppliers (id, name, code, cnpj_cpf, category, contact_name, phone, whatsapp, email, address, payment_terms, pix_key, active, notes) VALUES
    (sup[1],'Posto Rodoviário Silva','SIM-FOR001','11.111.111/0001-11','fuel','Roberto','(11) 3111-0001','(11) 91111-0001','posto@silva.com','Rod. Anhanguera km 50, Jundiaí - SP','À vista','11.111.111/0001-11', true,'[SIM]'),
    (sup[2],'AutoMecânica Diesel Master','SIM-FOR002','22.222.222/0001-22','maintenance','Sandra','(11) 3222-0002','(11) 92222-0002','contato@dieselmaster.com','Av. das Oficinas, 320, São Paulo - SP','30 dias','22.222.222/0001-22', true,'[SIM]'),
    (sup[3],'PneuCenter Distribuidora','SIM-FOR003','33.333.333/0001-33','tires','Paulo','(11) 3333-0003','(11) 93333-0003','vendas@pneucenter.com','Rua dos Pneus, 87, Osasco - SP','Boleto 15/30','33.333.333/0001-33', true,'[SIM]'),
    (sup[4],'Seguradora Estrada Segura','SIM-FOR004','44.444.444/0001-44','insurance','Marta','(11) 3444-0004','(11) 94444-0004','apolice@estradasegura.com','Av. Paulista, 2000, São Paulo - SP','Mensal','44.444.444/0001-44', true,'[SIM]');

  -- ───────── CLIENTES (com IE, contatos, prazos) ─────────
  FOR ci IN 1..6 LOOP
    INSERT INTO clients (id, code, type, company_name, cpf_cnpj, state_registration, email, phone, client_type, billing_type, billing_day, payment_term_days, status, address, contacts)
    VALUES (
      cli[ci], 'SIM' || lpad(ci::text,3,'0'), 'pj', cliNames[ci], cliCnpj[ci],
      lpad((100000000 + ci)::text, 9, '0'),
      'contato' || ci || '@exemplo.com.br', '(11) 3000-00' || lpad(ci::text,2,'0'),
      CASE WHEN ci <= 3 THEN 'recorrente' ELSE 'eventual' END,
      CASE WHEN ci = 1 THEN 'monthly' ELSE 'per_trip' END,
      CASE WHEN ci = 1 THEN 25 ELSE NULL END,
      CASE WHEN ci = 1 THEN 30 ELSE 15 END, 'active',
      jsonb_build_object('cep','01310-100','street','Av. Paulista','number',(1000+ci)::text,'neighborhood','Bela Vista','city',cliCity[ci],'state',cliUF[ci]),
      jsonb_build_array(jsonb_build_object('name','Comprador '||ci,'role','Logística','phone','(11) 3000-00'||lpad(ci::text,2,'0'),'email','log'||ci||'@exemplo.com.br','is_primary',true))
    );
  END LOOP;

  -- ───────── PEDIDOS (30 dias) ─────────
  FOR i IN 0..29 LOOP
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
        fuel    := round((180 + (seq*3 % 200)) * 6.0, 2);
        tolls   := round((seq % 5) * 35.0, 2);
        tripcost := fuel + tolls;
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
          CASE WHEN st='delivered' THEN fuel ELSE NULL END,
          CASE WHEN st='delivered' THEN tolls ELSE NULL END,
          freight,
          CASE WHEN st='delivered' THEN tripcost ELSE NULL END,
          CASE WHEN st='delivered' THEN round(freight - tripcost, 2) ELSE NULL END,
          'Viagem de simulação [SIM]', created + '1 day'::interval
        );
        UPDATE orders SET trip_id = tripid WHERE id = oid;

        -- Despesa de combustível da viagem entregue (vinculada ao posto)
        IF st = 'delivered' THEN
          INSERT INTO expenses (category, description, amount, date, payment_method, status, paid_date, trip_id, truck_id, driver_id, supplier_id, supplier_name, notes)
          VALUES ('fuel','Combustível — '||trucks_pl[ti]||' (viagem '||protocol||')', fuel,
                  (created + '2 days'::interval)::date, 'pix', 'paid', (created + '2 days'::interval)::date, tripid, trucks_ids[ti], drivers_ids[ti], sup[1], 'Posto Rodoviário Silva', '[SIM]');
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

  -- ───────── DESPESAS FIXAS / RECORRENTES (vinculadas a fornecedores) ─────────
  INSERT INTO expenses (category, description, amount, date, payment_method, status, due_date, paid_date, supplier_id, supplier_name, notes) VALUES
    ('salaries','Folha de pagamento — motoristas', 11800, (now()-'5 days'::interval)::date, 'transfer','paid', NULL, (now()-'5 days'::interval)::date, NULL, NULL, '[SIM]'),
    ('rent','Aluguel do galpão', 4500, (now()-'10 days'::interval)::date,'boleto','paid', NULL, (now()-'10 days'::interval)::date, NULL, NULL, '[SIM]'),
    ('insurance','Seguro da frota (parcela)', 2800, (now()-'12 days'::interval)::date,'boleto','pending', (now()+'3 days'::interval)::date, NULL, sup[4],'Seguradora Estrada Segura','[SIM]'),
    ('taxes','Impostos e encargos', 3200, (now()-'9 days'::interval)::date,'boleto','pending', (now()+'8 days'::interval)::date, NULL, NULL, NULL, '[SIM]'),
    ('maintenance','Revisão preventiva RKT-3C67', 1850, (now()-'2 days'::interval)::date,'pix','pending', (now()+'5 days'::interval)::date, NULL, sup[2],'AutoMecânica Diesel Master','[SIM]'),
    ('tires','Jogo de pneus RKT-2B45', 6400, (now()-'1 days'::interval)::date,'boleto','pending', (now()+'20 days'::interval)::date, NULL, sup[3],'PneuCenter Distribuidora','[SIM]');

  RAISE NOTICE 'Simulação criada: % pedidos em 30 dias.', seq;
END $$;

-- ============================================================
-- Pronto. Para CONFERIR a consistência (agora e depois de operar
-- pelo app), rode o arquivo separado `verificacoes.sql`.
-- NÃO rode este seed de novo só para verificar — ele apaga e recria
-- tudo, desfazendo o que você fez no app.
-- ============================================================

-- ============================================================
-- LIMPEZA (descomente e rode para remover a simulação):
-- ============================================================
-- DELETE FROM expenses  WHERE notes LIKE '%[SIM]%';
-- DELETE FROM revenues  WHERE notes LIKE '%[SIM]%';
-- DELETE FROM orders    WHERE general_notes LIKE '%[SIM]%';
-- DELETE FROM trips     WHERE notes LIKE '%[SIM]%';
-- DELETE FROM suppliers WHERE id::text LIKE 'a4000000-%';
-- DELETE FROM clients   WHERE id::text LIKE 'a3000000-%';
-- DELETE FROM drivers   WHERE id::text LIKE 'a2000000-%';
-- DELETE FROM trucks    WHERE id::text LIKE 'a1000000-%';

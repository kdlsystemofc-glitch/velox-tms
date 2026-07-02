-- ============================================================
-- VELOX TMS — SCHEMA COMPLETO (ARQUIVO GERADO — NÃO EDITAR À MÃO)
-- ============================================================
-- Consolida supabase/schema.sql + 71 migrations em UM único script
-- idempotente, para backup/recriação ágil do banco.
--
-- Regenerar:  node supabase/build-schema-full.mjs   (npm run db:full)
-- Gerado em:  2026-07-02T17:01:04.768Z
--
-- Destino: um projeto Supabase (os schemas auth/storage/extensões são providos
-- pela plataforma). NÃO inclui dados: seed_simulation.sql e verificacoes.sql
-- ficam à parte de propósito. Fonte de verdade permanece: supabase/migrations/*.
-- ============================================================


-- ▼▼▼ BASE: schema.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Schema Completo do Supabase
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABELA: company_settings (configurações da empresa - 1 linha)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL DEFAULT 'Velox Transportadora',
  cnpj TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  logo_url TEXT,
  mission TEXT,
  vision TEXT,
  values TEXT,
  about_text TEXT,
  fleet_photo_url TEXT,
  region TEXT,
  social_instagram TEXT,
  social_linkedin TEXT,
  social_facebook TEXT,
  hero_title TEXT DEFAULT 'Sua carga, no prazo certo.',
  hero_subtitle TEXT DEFAULT 'Transporte de cargas com segurança, tecnologia e pontualidade.',
  google_maps_api_key TEXT,
  pricing JSONB DEFAULT '{"price_per_kg":0.5,"price_per_km":2.0,"fixed_fee":50,"minimum_freight":150,"gris_percent":0,"ad_valorem_percent":0,"tde_per_nf":0,"tda_per_nf":0,"toll_per_kg":0}'::jsonb,
  route_pricing JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  maintenance_km_alerts JSONB DEFAULT '{"oil_change_km":20000,"general_review_km":40000,"tire_change_km":60000}'::jsonb,
  km_per_day INTEGER DEFAULT 600,
  delivery_days_table JSONB DEFAULT '[]'::jsonb,
  alert_days_cnh INTEGER DEFAULT 60,
  alert_days_crlv INTEGER DEFAULT 60,
  alert_days_insurance INTEGER DEFAULT 30,
  tax_rate_percent NUMERIC DEFAULT 5,
  monthly_depreciation NUMERIC DEFAULT 800,
  service_type TEXT DEFAULT 'dedicated_only' CHECK (service_type IN ('dedicated_only','fractional','both')),
  coverage_type TEXT CHECK (coverage_type IN ('states','cities','cep_range')),
  coverage_states JSONB DEFAULT '[]'::jsonb,
  coverage_cities JSONB DEFAULT '[]'::jsonb,
  coverage_cep_ranges JSONB DEFAULT '[]'::jsonb,
  coverage_message TEXT DEFAULT 'Infelizmente não atendemos esta região no momento.',
  min_advance_days INTEGER DEFAULT 2,
  working_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb,
  collection_model TEXT DEFAULT 'both',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: clients
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  type TEXT DEFAULT 'pj' CHECK (type IN ('pj','pf')),
  company_name TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  state_registration TEXT,
  email TEXT,
  phone TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  contacts JSONB DEFAULT '[]'::jsonb,
  additional_addresses JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  client_type TEXT DEFAULT 'eventual' CHECK (client_type IN ('recorrente','eventual')),
  billing_type TEXT DEFAULT 'per_trip' CHECK (billing_type IN ('per_trip','monthly')),
  billing_day INTEGER,
  payment_term_days INTEGER,
  custom_pricing JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: suppliers
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  cnpj_cpf TEXT,
  category TEXT DEFAULT 'maintenance' CHECK (category IN ('fuel','maintenance','tires','insurance','other')),
  contact_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  contacts JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  payment_terms TEXT,
  pix_key TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: drivers (motoristas)
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  cnh_number TEXT,
  cnh_category TEXT CHECK (cnh_category IN ('A','B','C','D','E','AB','AC','AD','AE')),
  cnh_expiry DATE,
  birth_date DATE,
  phone TEXT,
  email TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  photo_url TEXT,
  hire_date DATE,
  role TEXT DEFAULT 'motorista' CHECK (role IN ('motorista','ajudante','administrativo')),
  base_salary NUMERIC,
  commission_percent NUMERIC DEFAULT 0,
  contract_type TEXT CHECK (contract_type IN ('clt','pj','diarista')),
  bank_info JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','away','terminated')),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: trucks (caminhões)
-- ============================================================
CREATE TABLE IF NOT EXISTS trucks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plate TEXT NOT NULL UNIQUE,
  model TEXT,
  manufacturer TEXT,
  year INTEGER,
  truck_type TEXT CHECK (truck_type IN ('truck','carreta','vuc','toco','bitruck','outro')),
  capacity_kg NUMERIC,
  dimensions JSONB DEFAULT '{}'::jsonb,
  renavam TEXT,
  chassis TEXT,
  color TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','on_route','maintenance','inactive')),
  main_driver_id UUID REFERENCES drivers(id),
  photo_url TEXT,
  crlv_url TEXT,
  crlv_expiry DATE,
  insurance_url TEXT,
  insurance_expiry DATE,
  tachograph_last DATE,
  tachograph_next DATE,
  total_km NUMERIC DEFAULT 0,
  km_alert_oil NUMERIC,
  km_alert_review NUMERIC,
  km_alert_tires NUMERIC,
  maintenance_history JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: orders (pedidos/coletas)
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES clients(id),
  client_name TEXT NOT NULL,
  client_cpf_cnpj TEXT,
  client_phone TEXT,
  client_email TEXT,
  requester_name TEXT,
  requester_role TEXT,
  preferred_contact TEXT DEFAULT 'whatsapp' CHECK (preferred_contact IN ('phone','whatsapp','email')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new','confirmed','collecting','in_transit','delivered','cancelled')),
  freight_type TEXT DEFAULT 'shared' CHECK (freight_type IN ('dedicated','shared','urgent')),
  freight_payer TEXT DEFAULT 'cif' CHECK (freight_payer IN ('cif','fob')),
  transport_modal TEXT DEFAULT 'road' CHECK (transport_modal IN ('road','urgent_road','air')),
  payment_terms TEXT DEFAULT 'after_delivery' CHECK (payment_terms IN ('after_delivery','monthly','7_days','15_days','30_days')),
  cte_number TEXT,
  origin JSONB DEFAULT '{}'::jsonb,
  collection_date DATE,
  collection_time TEXT CHECK (collection_time IN ('morning','afternoon','to_arrange')),
  collection_notes TEXT,
  recipients JSONB DEFAULT '[]'::jsonb,
  total_volumes INTEGER,
  total_weight_kg NUMERIC,
  total_declared_value NUMERIC,
  freight_value NUMERIC,
  payment_method TEXT CHECK (payment_method IN ('pix','boleto','transfer','check','cash')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','overdue')),
  driver_id UUID REFERENCES drivers(id),
  truck_id UUID REFERENCES trucks(id),
  trip_id UUID,
  general_notes TEXT,
  status_history JSONB DEFAULT '[]'::jsonb,
  scheduled_truck_id UUID REFERENCES trucks(id),
  scheduled_date DATE,
  scheduled_start_time TEXT,
  scheduled_lunch_start TEXT,
  scheduled_lunch_end TEXT,
  scheduled_end_time TEXT,
  schedule_notes TEXT,
  schedule_status TEXT DEFAULT 'unscheduled' CHECK (schedule_status IN ('unscheduled','scheduled','in_progress','done')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: trips (viagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  driver_name TEXT,
  truck_id UUID NOT NULL REFERENCES trucks(id),
  truck_plate TEXT,
  order_ids JSONB DEFAULT '[]'::jsonb,
  order_protocols JSONB DEFAULT '[]'::jsonb,
  departure_date TIMESTAMPTZ,
  arrival_date TIMESTAMPTZ,
  stops JSONB DEFAULT '[]'::jsonb,
  estimated_km NUMERIC,
  real_km NUMERIC,
  fuel_liters NUMERIC,
  fuel_cost NUMERIC,
  tolls_cost NUMERIC,
  other_costs JSONB DEFAULT '[]'::jsonb,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  net_profit NUMERIC,
  advance_amount NUMERIC DEFAULT 0,
  advance_date DATE,
  commission_amount NUMERIC DEFAULT 0,
  notes TEXT,
  events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar FK de orders → trips depois de criar trips
ALTER TABLE orders ADD CONSTRAINT fk_orders_trip 
  FOREIGN KEY (trip_id) REFERENCES trips(id);

-- ============================================================
-- TABELA: revenues (receitas)
-- ============================================================
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  description TEXT,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'receivable' CHECK (status IN ('receivable','received','overdue','cancelled')),
  payment_method TEXT CHECK (payment_method IN ('pix','boleto','transfer','check','cash')),
  received_date DATE,
  client_id UUID REFERENCES clients(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: expenses (despesas)
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('fuel','maintenance','tires','tolls','salaries','taxes','insurance','rent','administrative','marketing','other')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('pix','boleto','transfer','check','cash','card')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','installment')),
  due_date DATE,
  paid_date DATE,
  trip_id UUID REFERENCES trips(id),
  truck_id UUID REFERENCES trucks(id),
  driver_id UUID REFERENCES drivers(id),
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: alerts (alertas automáticos)
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('cnh_expiring','cnh_expired','crlv_expiring','crlv_expired','insurance_expiring','insurance_expired','tachograph_expiring','maintenance_due','order_no_driver','bill_due','bill_overdue','oil_maintenance_km','review_km')),
  level TEXT DEFAULT 'warning' CHECK (level IN ('info','warning','critical')),
  message TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  read BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: incidents (ocorrências)
-- ============================================================
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  trip_id UUID REFERENCES trips(id),
  type TEXT NOT NULL CHECK (type IN ('avaria','atraso','tentativa_entrega','roubo','acidente','carga_recusada','outro')),
  description TEXT NOT NULL,
  photo_urls JSONB DEFAULT '[]'::jsonb,
  reported_by_name TEXT,
  reported_by_role TEXT CHECK (reported_by_role IN ('motorista','admin','operador')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  notify_client BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: schedule_blocks (bloqueios de agenda)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  truck_id UUID REFERENCES trucks(id),
  block_type TEXT NOT NULL CHECK (block_type IN ('full_block','partial','maintenance','holiday')),
  reason TEXT,
  remaining_kg NUMERIC,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: contact_messages (mensagens do site)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: testimonials (depoimentos)
-- ============================================================
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company TEXT,
  text TEXT NOT NULL,
  rating NUMERIC DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: user_profiles (perfis de usuário vinculados ao auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin','operator','motorista')),
  driver_id UUID REFERENCES drivers(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'company_settings','clients','suppliers','drivers','trucks',
    'orders','trips','revenues','expenses','alerts','incidents',
    'schedule_blocks','contact_messages','testimonials','user_profiles'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at_%s ON %s;
      CREATE TRIGGER trg_updated_at_%s
        BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — segurança por usuário
-- ============================================================
ALTER TABLE company_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips              ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ler e escrever tudo
-- (simplificado para empresa única — pode ser refinado para multi-empresa depois)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'company_settings','clients','suppliers','drivers','trucks',
    'orders','trips','revenues','expenses','alerts','incidents',
    'schedule_blocks','testimonials','user_profiles'
  ])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "authenticated_full_access" ON %s;
      CREATE POLICY "authenticated_full_access" ON %s
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    ', t, t);
  END LOOP;
END;
$$;

-- Contact messages: leitura pública (site envia sem login), admin lê
DROP POLICY IF EXISTS "public_insert_contact" ON contact_messages;
CREATE POLICY "public_insert_contact" ON contact_messages
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_contact" ON contact_messages;
CREATE POLICY "auth_read_contact" ON contact_messages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_contact" ON contact_messages;
CREATE POLICY "auth_update_contact" ON contact_messages
  FOR UPDATE TO authenticated USING (true);

-- Testimonials: leitura pública
DROP POLICY IF EXISTS "public_read_testimonials" ON testimonials;
CREATE POLICY "public_read_testimonials" ON testimonials
  FOR SELECT TO anon USING (active = true);

-- Company settings: leitura pública (site precisa dos dados)
DROP POLICY IF EXISTS "public_read_settings" ON company_settings;
CREATE POLICY "public_read_settings" ON company_settings
  FOR SELECT TO anon USING (true);

-- Orders: SEM leitura pública direta. O rastreamento usa a função
-- SECURITY DEFINER public.track_order() (ver migration 20260615_rls_public_functions.sql),
-- que retorna apenas campos seguros. Geração de protocolo via public.next_protocol().

-- Orders: inserção pública (site de agendamento)
DROP POLICY IF EXISTS "public_insert_order" ON orders;
CREATE POLICY "public_insert_order" ON orders
  FOR INSERT TO anon WITH CHECK (true);

-- Clients: SEM leitura pública direta. A consulta por CNPJ no site usa a função
-- SECURITY DEFINER public.client_by_cnpj() (retorna só campos necessários).

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_protocol   ON orders(protocol);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_client_id  ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_cte        ON orders(cte_number);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj  ON clients(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_code      ON clients(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_code    ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_trucks_plate      ON trucks(plate);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved   ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_revenues_order    ON revenues(order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status   ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_trips_status      ON trips(status);

-- ============================================================
-- DADO INICIAL: inserir linha de company_settings
-- ============================================================
INSERT INTO company_settings (company_name, hero_title, hero_subtitle)
SELECT 'Velox Transportadora', 'Sua carga, no prazo certo.', 'Transporte de cargas com segurança, tecnologia e pontualidade.'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- FIM DO SCHEMA
SELECT 'Schema criado com sucesso!' AS resultado;


-- ▼▼▼ MIGRATION: 20260612_revenue_status_cancelled.sql ▼▼▼

-- Migration: permitir status 'cancelled' em revenues (estorno de pedido cancelado)
-- Aplicar no SQL Editor do Supabase.

ALTER TABLE revenues DROP CONSTRAINT IF EXISTS revenues_status_check;
ALTER TABLE revenues ADD CONSTRAINT revenues_status_check
  CHECK (status IN ('receivable', 'received', 'overdue', 'cancelled'));


-- ▼▼▼ MIGRATION: 20260612_trip_advance.sql ▼▼▼

-- Migration: adiantamento de viagem (vale-frete pago ao motorista antes da saída)
-- Aplicar no SQL Editor do Supabase.

ALTER TABLE trips ADD COLUMN IF NOT EXISTS advance_amount NUMERIC DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS advance_date DATE;


-- ▼▼▼ MIGRATION: 20260615_company_documents.sql ▼▼▼

-- Migration: coluna para documentos da empresa (upload manual em Documentos → Empresa)
-- Aplicar no SQL Editor do Supabase.

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;


-- ▼▼▼ MIGRATION: 20260615_rls_public_functions.sql ▼▼▼

-- Migration: fechar leitura pública de orders/clients e expor só o necessário
-- via funções SECURITY DEFINER. Aplicar no SQL Editor do Supabase.
--
-- PROBLEMA: as policies "public_read_order_by_protocol" e "public_read_clients_limited"
-- permitiam que qualquer um com a chave anon lesse TODOS os pedidos e clientes.
-- SOLUÇÃO: remover o SELECT anon dessas tabelas e dar acesso só por funções
-- que retornam campos seguros (rastreamento por protocolo/CT-e/NF; consulta de
-- cliente por CNPJ; geração de protocolo sequencial).

-- ============================================================
-- 1. Rastreamento público (substitui leitura direta de orders)
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_order(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := upper(trim(p_query));
  o orders%ROWTYPE;
BEGIN
  IF q IS NULL OR q = '' THEN RETURN NULL; END IF;

  SELECT * INTO o FROM orders WHERE upper(protocol) = q LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO o FROM orders WHERE upper(cte_number) = q LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    SELECT * INTO o FROM orders ord
     WHERE EXISTS (
       SELECT 1
         FROM jsonb_array_elements(COALESCE(ord.recipients, '[]'::jsonb)) r,
              jsonb_array_elements(COALESCE(r->'items', '[]'::jsonb)) it
        WHERE upper(it->>'nf_number') = q
     )
     ORDER BY ord.created_at DESC
     LIMIT 1;
  END IF;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'protocol',        o.protocol,
    'status',          o.status,
    'client_name',     o.client_name,
    'cte_number',      o.cte_number,
    'collection_date', o.collection_date,
    'status_history',  o.status_history,
    'recipients', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name',            r->>'name',
        'city',            r->>'city',
        'state',           r->>'state',
        'delivery_status', r->>'delivery_status'
      )), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(o.recipients, '[]'::jsonb)) r
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO anon, authenticated;

-- ============================================================
-- 2. Próximo protocolo sequencial (sem ler orders no cliente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_protocol()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY');
  prefix text := 'VLX-' || yr || '-';
  last_num int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(protocol, '^.*-', ''), '')::int), 0)
    INTO last_num
    FROM orders
   WHERE protocol LIKE prefix || '%';
  RETURN prefix || lpad((last_num + 1)::text, 5, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.next_protocol() TO anon, authenticated;

-- ============================================================
-- 3. Consulta de cliente por CNPJ (substitui leitura de clients)
-- ============================================================
CREATE OR REPLACE FUNCTION public.client_by_cnpj(p_cnpj text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean text := regexp_replace(COALESCE(p_cnpj, ''), '\D', '', 'g');
  c clients%ROWTYPE;
BEGIN
  IF clean = '' THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT * INTO c FROM clients
   WHERE regexp_replace(COALESCE(cpf_cnpj, ''), '\D', '', 'g') = clean
     AND status = 'active'
   LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  RETURN jsonb_build_object(
    'found',        true,
    'company_name', c.company_name,
    'phone',        c.phone,
    'email',        c.email,
    'client_id',    c.id,
    'address',      c.address,
    'primary_contact', (
      SELECT r FROM jsonb_array_elements(COALESCE(c.contacts, '[]'::jsonb)) r
       WHERE (r->>'is_primary')::boolean IS TRUE LIMIT 1
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.client_by_cnpj(text) TO anon, authenticated;

-- ============================================================
-- 4. Remover o SELECT público de orders e clients
-- ============================================================
DROP POLICY IF EXISTS "public_read_order_by_protocol" ON orders;
DROP POLICY IF EXISTS "public_read_clients_limited" ON clients;
-- (mantém: public_insert_order para o site de agendamento;
--  authenticated_full_access para o painel; leitura de testimonials/settings.)


-- ▼▼▼ MIGRATION: 20260616_reconcile_schema.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Reconciliação completa do schema
-- ============================================================
-- Rode este script no SQL Editor do Supabase para garantir que o banco
-- tem TODAS as colunas/constraints/políticas que o app usa hoje.
-- É IDEMPOTENTE: pode rodar quantas vezes quiser, não apaga dados.
--
-- Por que existe: CREATE TABLE IF NOT EXISTS (schema.sql) NÃO adiciona
-- colunas novas a tabelas que já existem. Se o banco foi criado de uma
-- versão anterior, faltam colunas e os saves quebram com 400.
-- ============================================================

-- ---------- company_settings ----------
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS values TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS about_text TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS fleet_photo_url TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS social_instagram TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS social_linkedin TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS social_facebook TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS hero_title TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS hero_subtitle TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS google_maps_api_key TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pricing JSONB DEFAULT '{"price_per_kg":0.5,"price_per_km":2.0,"fixed_fee":50,"minimum_freight":150,"gris_percent":0,"ad_valorem_percent":0,"tde_per_nf":0,"tda_per_nf":0,"toll_per_kg":0}'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS route_pricing JSONB DEFAULT '[]'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS maintenance_km_alerts JSONB DEFAULT '{"oil_change_km":20000,"general_review_km":40000,"tire_change_km":60000}'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS km_per_day INTEGER DEFAULT 600;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS delivery_days_table JSONB DEFAULT '[]'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS alert_days_cnh INTEGER DEFAULT 60;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS alert_days_crlv INTEGER DEFAULT 60;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS alert_days_insurance INTEGER DEFAULT 30;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC DEFAULT 5;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS monthly_depreciation NUMERIC DEFAULT 800;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'dedicated_only';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS coverage_type TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS coverage_states JSONB DEFAULT '[]'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS coverage_cities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS coverage_cep_ranges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS coverage_message TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS min_advance_days INTEGER DEFAULT 2;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS collection_model TEXT DEFAULT 'both';

-- ---------- clients ----------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'pj';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state_registration TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS additional_addresses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'eventual';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'per_trip';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_day INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_term_days INTEGER;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_pricing JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ---------- suppliers ----------
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'maintenance';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb;
-- Se 'address' já existia como TEXT, converte para JSONB preservando o texto em {street}
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='suppliers' AND column_name='address' AND data_type <> 'jsonb') THEN
    ALTER TABLE suppliers ALTER COLUMN address DROP DEFAULT;
    ALTER TABLE suppliers ALTER COLUMN address TYPE JSONB
      USING (CASE WHEN address IS NULL OR btrim(address)='' THEN '{}'::jsonb
                  ELSE jsonb_build_object('street', address) END);
    ALTER TABLE suppliers ALTER COLUMN address SET DEFAULT '{}'::jsonb;
  END IF;
END $$;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- ---------- drivers ----------
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cnh_number TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cnh_category TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cnh_expiry DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'motorista';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS base_salary NUMERIC;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS commission_percent NUMERIC DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS contract_type TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id UUID;

-- ---------- trucks ----------
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS truck_type TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS capacity_kg NUMERIC;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS dimensions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS renavam TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS chassis TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS main_driver_id UUID;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS crlv_url TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS crlv_expiry DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_url TEXT;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS tachograph_last DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS tachograph_next DATE;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS total_km NUMERIC DEFAULT 0;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS km_alert_oil NUMERIC;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS km_alert_review NUMERIC;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS km_alert_tires NUMERIC;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS maintenance_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS notes TEXT;

-- ---------- orders ----------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_cpf_cnpj TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requester_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requester_role TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'whatsapp';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_type TEXT DEFAULT 'shared';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_payer TEXT DEFAULT 'cif';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_modal TEXT DEFAULT 'road';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'after_delivery';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cte_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS origin JSONB DEFAULT '{}'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS collection_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS collection_time TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS collection_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_volumes INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight_kg NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_declared_value NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_value NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS truck_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS trip_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS general_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_truck_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_start_time TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_lunch_start TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_lunch_end TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_end_time TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS schedule_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS schedule_status TEXT DEFAULT 'unscheduled';

-- ---------- trips ----------
ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS truck_plate TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS order_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS order_protocols JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS departure_date TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrival_date TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS stops JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_km NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS real_km NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS fuel_liters NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS fuel_cost NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS tolls_cost NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS other_costs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_revenue NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_cost NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS net_profit NUMERIC;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS advance_amount NUMERIC DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS advance_date DATE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;

-- ---------- revenues ----------
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'receivable';
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS notes TEXT;

-- ---------- expenses ----------
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS trip_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS truck_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS driver_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- CONSTRAINTS de status que cresceram ao longo do tempo.
-- Recriadas para incluir todos os valores que o app usa hoje.
-- ============================================================
ALTER TABLE revenues DROP CONSTRAINT IF EXISTS revenues_status_check;
ALTER TABLE revenues ADD CONSTRAINT revenues_status_check
  CHECK (status IN ('receivable','received','overdue','cancelled'));

-- ============================================================
-- RLS: garante que usuário autenticado pode ler/escrever tudo.
-- (Sem isso, saves voltam 401/403 — diferente do 400 de coluna.)
-- ============================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'company_settings','clients','suppliers','drivers','trucks',
    'orders','trips','revenues','expenses','alerts','incidents',
    'schedule_blocks','testimonials','user_profiles'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %s;', t);
    EXECUTE format('CREATE POLICY "authenticated_full_access" ON %s FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
  END LOOP;
END;
$$;

-- ============================================================
-- DIAGNÓSTICO: confirme que a linha de configurações existe
-- ============================================================
INSERT INTO company_settings (company_name, hero_title, hero_subtitle)
SELECT 'Velox Transportadora', 'Sua carga, no prazo certo.', 'Transporte de cargas com segurança, tecnologia e pontualidade.'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

SELECT 'Reconciliação concluída. Banco alinhado com o app.' AS resultado;


-- ▼▼▼ MIGRATION: 20260617_supplier_address_jsonb.sql ▼▼▼

-- ============================================================
-- Fornecedores: endereço estruturado (TEXT -> JSONB)
-- ============================================================
-- O formulário de fornecedor passou a usar endereço completo com
-- autofill por CEP (objeto {cep,street,number,complement,neighborhood,
-- city,state}). Esta migração converte a coluna address de TEXT para
-- JSONB preservando o texto antigo em {street}. Idempotente.
-- ============================================================

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='suppliers' AND column_name='address' AND data_type <> 'jsonb') THEN
    ALTER TABLE suppliers ALTER COLUMN address DROP DEFAULT;
    ALTER TABLE suppliers ALTER COLUMN address TYPE JSONB
      USING (CASE WHEN address IS NULL OR btrim(address)='' THEN '{}'::jsonb
                  ELSE jsonb_build_object('street', address) END);
    ALTER TABLE suppliers ALTER COLUMN address SET DEFAULT '{}'::jsonb;
  END IF;
END $$;

SELECT 'suppliers.address agora é JSONB.' AS resultado;


-- ▼▼▼ MIGRATION: 20260619_onda1_operacional.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Onda 1: Exceções operacionais (S1,S2,S5,S10,S12,S13)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- ---------- orders ----------
-- Novos status de exceção: carga aguardando liberação (S5) e entrega parcial (S12).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('new','confirmed','collecting','in_transit','delivered','cancelled',
                    'awaiting_cargo','partially_delivered'));

-- Taxa de deslocamento improdutivo (S10 — cancelou com viagem em andamento).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unproductive_fee NUMERIC;

-- ---------- incidents ----------
-- Tipos novos exigidos pelo Bloco 3 (carga não pronta, entrega parcial, ausente).
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_type_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_type_check
  CHECK (type IN ('avaria','atraso','tentativa_entrega','roubo','acidente','carga_recusada','outro',
                  'carga_nao_pronta','entrega_parcial','destinatario_ausente'));

-- Campos de tratativa/acompanhamento (usados já aqui e ampliados na Onda 3).
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS action_plan TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS client_notified BOOLEAN DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS insurance_triggered BOOLEAN DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS stop_index INTEGER;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- ---------- alerts ----------
-- Novos tipos de alerta operacional (caminhão quebrou, motorista ausente,
-- carga retida, tentativa de entrega, cancelamento em viagem, endereço alterado).
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check
  CHECK (type IN ('cnh_expiring','cnh_expired','crlv_expiring','crlv_expired',
                  'insurance_expiring','insurance_expired','tachograph_expiring',
                  'maintenance_due','order_no_driver','bill_due','bill_overdue',
                  'oil_maintenance_km','review_km',
                  'truck_breakdown','driver_absent','cargo_hold','delivery_attempt',
                  'order_cancelled_in_trip','address_changed','recipient_window'));

SELECT 'Onda 1 aplicada. Banco pronto para exceções operacionais.' AS resultado;


-- ▼▼▼ MIGRATION: 20260619_onda2_cubagem_janela.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Onda 2: Cubagem e janela de recebimento (S6,S7,B2)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- Janela de recebimento do cliente (S6 / B2-B).
-- { days:[1,2,3,4,5], start:"08:00", end:"11:00" }  — vazio = sem restrição.
-- (A janela por destinatário fica dentro de orders.recipients — JSONB, sem coluna nova.)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS delivery_window JSONB DEFAULT '{}'::jsonb;

-- Observação: a cubagem (volume físico) usa trucks.dimensions {length_m,width_m,height_m}
-- e as dimensões dos itens (cm) já existentes — não exige coluna nova.

SELECT 'Onda 2 aplicada. Janela de recebimento pronta.' AS resultado;


-- ▼▼▼ MIGRATION: 20260619_onda4_tms.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Onda 4: Recursos TMS (modelos de pedido, cubagem por rota)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- S11 — Modelos de pedido salvos (remessas recorrentes).
CREATE TABLE IF NOT EXISTS order_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  client_name TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON order_templates;
CREATE POLICY "authenticated_full_access" ON order_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_updated_at_order_templates ON order_templates;
CREATE TRIGGER trg_updated_at_order_templates
  BEFORE UPDATE ON order_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5.3 — Fator de cubagem por pedido (opcional; sobrepõe o global e o da rota).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cubage_factor NUMERIC;

-- (Fator de cubagem por corredor fica dentro de company_settings.route_pricing — JSONB.)

SELECT 'Onda 4 aplicada. Modelos de pedido e cubagem por pedido prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260620_onda5_profundidade.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Onda 5: Profundidade (janela c/ pausa, crédito, taxas, SLA, centro de custo)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- ---------- clients ----------
-- Janela de COLETA separada da de entrega; ambas suportam pausa (almoço) dentro do JSONB:
--   { days:[1..6/0], start:"08:00", end:"18:00", pause_start:"12:00", pause_end:"13:00" }
ALTER TABLE clients ADD COLUMN IF NOT EXISTS collection_window JSONB DEFAULT '{}'::jsonb;
-- Limite de crédito e prazo já existente (payment_term_days).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS credit_limit NUMERIC;
-- Nome fantasia e regiões atendidas (cadastro mais completo).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS trade_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS served_regions JSONB DEFAULT '[]'::jsonb;

-- ---------- orders ----------
-- SLA: prazo de entrega previsto e cobranças avulsas (espera/devolução/emergência).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_deadline DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extra_charges JSONB DEFAULT '[]'::jsonb;

-- ---------- expenses ----------
-- Centro de custos.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS cost_center TEXT;

-- ---------- drivers ----------
-- Exames (ASO/toxicológico) para cadastro completo de motorista.
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS exam_aso_expiry DATE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS exam_toxic_expiry DATE;

-- As novas taxas (TRT, taxa de entrega, devolução, espera, emergência) e o fator de
-- cubagem por rota vivem dentro de company_settings.pricing / route_pricing (JSONB) —
-- não exigem coluna nova.

SELECT 'Onda 5 aplicada. Profundidade de cadastros/tabelas pronta.' AS resultado;


-- ▼▼▼ MIGRATION: 20260620_onda6_recipients.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Onda 6: Destinatários como cadastro próprio
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Entidade independente dos clientes. Um destinatário pode ser fixo (recorrente)
-- ou eventual, ter múltiplos endereços e janela de recebimento própria.

CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  trade_name TEXT,
  cpf_cnpj TEXT,
  type TEXT DEFAULT 'eventual' CHECK (type IN ('fixo','eventual')),
  email TEXT,
  phone TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  additional_addresses JSONB DEFAULT '[]'::jsonb,
  delivery_window JSONB DEFAULT '{}'::jsonb,
  contacts JSONB DEFAULT '[]'::jsonb,
  client_id UUID REFERENCES clients(id),
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipients_cpf_cnpj ON recipients(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_recipients_name ON recipients(name);

ALTER TABLE recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_full_access" ON recipients;
CREATE POLICY "authenticated_full_access" ON recipients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_updated_at_recipients ON recipients;
CREATE TRIGGER trg_updated_at_recipients
  BEFORE UPDATE ON recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'Onda 6 aplicada. Cadastro de destinatários pronto.' AS resultado;


-- ▼▼▼ MIGRATION: 20260620_onda7_multiveiculo.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Onda 7: Múltiplos veículos/motoristas por viagem (comboio)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- A viagem mantém um veículo/motorista "líder" (truck_id/driver_id) por
-- compatibilidade, e ganha uma frota adicional em `vehicles`:
--   [{ truck_id, truck_plate, driver_id, driver_name }]
-- As paradas podem indicar `vehicle_index` (qual veículo executa).

ALTER TABLE trips ADD COLUMN IF NOT EXISTS vehicles JSONB DEFAULT '[]'::jsonb;

SELECT 'Onda 7 aplicada. Viagem com comboio (multi-veículo) pronta.' AS resultado;


-- ▼▼▼ MIGRATION: 20260620_onda8_crossdocking.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Onda 8: Transferências e Cross-docking (filiais / CD)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- ---------- branches (filiais / centros de distribuição) ----------
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'filial' CHECK (type IN ('filial','cd','base')),
  code TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- transfers (transferências entre filiais/CD) ----------
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  protocol TEXT,
  from_branch_id UUID REFERENCES branches(id),
  to_branch_id UUID REFERENCES branches(id),
  from_branch_name TEXT,
  to_branch_name TEXT,
  order_ids JSONB DEFAULT '[]'::jsonb,
  truck_id UUID REFERENCES trucks(id),
  truck_plate TEXT,
  driver_id UUID REFERENCES drivers(id),
  driver_name TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned','in_transit','received','cancelled')),
  departure_date TIMESTAMPTZ,
  arrival_date TIMESTAMPTZ,
  notes TEXT,
  events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- orders ----------
-- Onde a carga está agora (filial/CD) e o status "em transferência".
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_branch_id UUID REFERENCES branches(id);
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('new','confirmed','collecting','in_transit','delivered','cancelled',
                    'awaiting_cargo','partially_delivered','in_transfer'));

-- RLS + triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['branches','transfers']) LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %s;', t);
    EXECUTE format('CREATE POLICY "authenticated_full_access" ON %s FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at_%s ON %s;', t, t);
    EXECUTE format('CREATE TRIGGER trg_updated_at_%s BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at();', t, t);
  END LOOP;
END $$;

SELECT 'Onda 8 aplicada. Transferências/cross-docking prontas.' AS resultado;


-- ▼▼▼ MIGRATION: 20260621_close_trip_tx.sql ▼▼▼

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


-- ▼▼▼ MIGRATION: 20260621_critical_ops_tx.sql ▼▼▼

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


-- ▼▼▼ MIGRATION: 20260622_driver_access.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Gestão de acesso do motorista (criar/senha/congelar/excluir)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Cria o login do app do motorista a partir do painel admin, com controle de
-- senha, congelamento e exclusão. Tudo via funções SECURITY DEFINER protegidas
-- (só administradores executam). Não expõe a service_role no front.
--
-- ⚠️ Estas funções tocam o schema `auth` do Supabase. Rode e crie UM motorista
--    de teste para validar na sua versão. Se algum campo do `auth.users` divergir,
--    me avise que ajusto (a estrutura muda pouco, mas pode variar por versão).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Espelho do estado de acesso no cadastro do motorista (para a UI ler sem tocar auth)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS app_access TEXT DEFAULT 'none' CHECK (app_access IN ('none','active','frozen'));
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS app_email TEXT;

-- Quem é admin?
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- ── Criar login do motorista ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_driver_login(
  p_driver_id UUID, p_email TEXT, p_password TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE v_uid UUID; v_name TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_email IS NULL OR length(p_password) < 6 THEN RAISE EXCEPTION 'E-mail e senha (mín. 6) são obrigatórios'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) THEN
    RAISE EXCEPTION 'Já existe um usuário com este e-mail';
  END IF;
  SELECT name INTO v_name FROM drivers WHERE id = p_driver_id;
  v_uid := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    lower(p_email), crypt(p_password, gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', COALESCE(v_name,'')),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now()
  );

  INSERT INTO public.user_profiles (id, email, full_name, role, driver_id, active)
  VALUES (v_uid, lower(p_email), COALESCE(v_name,''), 'motorista', p_driver_id, true)
  ON CONFLICT (id) DO UPDATE SET role='motorista', driver_id=p_driver_id, active=true;

  UPDATE drivers SET user_id = v_uid, app_access = 'active', app_email = lower(p_email) WHERE id = p_driver_id;
  RETURN jsonb_build_object('ok', true, 'user_id', v_uid);
END; $$;

-- ── Redefinir senha ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reset_driver_password(
  p_driver_id UUID, p_password TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE v_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF length(p_password) < 6 THEN RAISE EXCEPTION 'Senha mínima de 6 caracteres'; END IF;
  SELECT user_id INTO v_uid FROM drivers WHERE id = p_driver_id;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Motorista sem login'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() WHERE id = v_uid;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ── Congelar / reativar acesso ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_set_driver_access(
  p_driver_id UUID, p_frozen BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT user_id INTO v_uid FROM drivers WHERE id = p_driver_id;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Motorista sem login'; END IF;
  IF p_frozen THEN
    UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE id = v_uid;
    UPDATE public.user_profiles SET active = false WHERE id = v_uid;
    UPDATE drivers SET app_access = 'frozen' WHERE id = p_driver_id;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = v_uid;
    UPDATE public.user_profiles SET active = true WHERE id = v_uid;
    UPDATE drivers SET app_access = 'active' WHERE id = p_driver_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ── Excluir login ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_delete_driver_login(
  p_driver_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT user_id INTO v_uid FROM drivers WHERE id = p_driver_id;
  UPDATE drivers SET user_id = NULL, app_access = 'none', app_email = NULL WHERE id = p_driver_id;
  IF v_uid IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_uid;  -- cascateia identities e user_profiles
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_driver_login(UUID,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_driver_password(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_driver_access(UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_driver_login(UUID) TO authenticated;

SELECT 'Gestão de acesso do motorista criada.' AS resultado;


-- ▼▼▼ MIGRATION: 20260622_user_roles.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Controle de papéis (quem é admin é definido por você)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Acaba com o "qualquer login vira admin". Agora:
--  • quem se cadastra sem perfil entra como 'pending' (SEM acesso);
--  • um ADMIN define o papel de cada um (admin / operator / motorista) no painel.

-- 1) Permite o papel 'pending' (sem privilégio) além dos existentes.
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operator','motorista','pending'));

-- helper: quem é admin (recriado aqui também por segurança/idempotência)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- 2) Definir o papel de um usuário (não deixa remover o ÚLTIMO admin)
CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id UUID, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old TEXT; v_admins INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_role NOT IN ('admin','operator','motorista','pending') THEN RAISE EXCEPTION 'Papel inválido'; END IF;
  SELECT role INTO v_old FROM public.user_profiles WHERE id = p_user_id;
  IF v_old = 'admin' AND p_role <> 'admin' THEN
    SELECT count(*) INTO v_admins FROM public.user_profiles WHERE role='admin';
    IF v_admins <= 1 THEN RAISE EXCEPTION 'Não é possível remover o último administrador'; END IF;
  END IF;
  UPDATE public.user_profiles SET role = p_role, active = true WHERE id = p_user_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 3) Ativar / desativar um usuário (desativar = bloqueia o login)
CREATE OR REPLACE FUNCTION public.admin_set_user_active(p_user_id UUID, p_active BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_role TEXT; v_admins INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = p_user_id;
  IF NOT p_active AND v_role = 'admin' THEN
    SELECT count(*) INTO v_admins FROM public.user_profiles WHERE role='admin' AND COALESCE(active,true);
    IF v_admins <= 1 THEN RAISE EXCEPTION 'Não é possível desativar o último administrador'; END IF;
  END IF;
  UPDATE public.user_profiles SET active = p_active WHERE id = p_user_id;
  IF p_active THEN
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
  ELSE
    UPDATE auth.users SET banned_until = now() + interval '100 years' WHERE id = p_user_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

-- 4) Excluir um usuário (não exclui o último admin nem você mesmo)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_role TEXT; v_admins INT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Você não pode excluir a si mesmo'; END IF;
  SELECT role INTO v_role FROM public.user_profiles WHERE id = p_user_id;
  IF v_role = 'admin' THEN
    SELECT count(*) INTO v_admins FROM public.user_profiles WHERE role='admin';
    IF v_admins <= 1 THEN RAISE EXCEPTION 'Não é possível excluir o último administrador'; END IF;
  END IF;
  UPDATE drivers SET user_id = NULL, app_access='none', app_email=NULL WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;  -- cascateia user_profiles e identities
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- ============================================================
-- BOOTSTRAP: defina o(s) administrador(es) por e-mail (rode UMA vez).
-- Troque pelo seu e-mail. Garante que você continua admin após a mudança.
-- ============================================================
-- UPDATE user_profiles SET role='admin', active=true
--   WHERE email = 'seu-email-admin@exemplo.com';

SELECT 'Controle de papéis criado. Defina os admins pelo painel (ou pelo UPDATE acima).' AS resultado;


-- ▼▼▼ MIGRATION: 20260623_audit_fixes.sql ▼▼▼

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


-- ▼▼▼ MIGRATION: 20260624_cadastros.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Completar cadastros (veículo e motorista) ao nível profissional
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- ---------- trucks ----------
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS axles INTEGER;                 -- nº de eixos (pedágio ANTT)
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS tare_weight NUMERIC;           -- tara (kg)
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS body_type TEXT;                -- carroceria (baú/sider/graneleiro/frigorífico…)
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS ownership TEXT DEFAULT 'proprio'
  CHECK (ownership IN ('proprio','agregado','terceiro'));                  -- próprio/agregado/terceiro
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS owner_name TEXT;               -- nome do proprietário (agregado)
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS tracker_provider TEXT;         -- rastreador (Sascar/Omnilink…)
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS tracker_id TEXT;               -- identificador do rastreador

-- ---------- drivers ----------
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS default_truck_id UUID REFERENCES trucks(id); -- veículo padrão
-- (exam_aso_expiry / exam_toxic_expiry já criados na Onda 5)

SELECT 'Cadastros completados (veículo/motorista).' AS resultado;


-- ▼▼▼ MIGRATION: 20260625_pedidos.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Módulo de Pedidos (agendamento desejado × confirmado + anexos)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- Data DESEJADA de coleta (pedido pelo cliente). A `collection_date` passa a ser
-- a data CONFIRMADA pela operação (definida na confirmação/despacho).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS collection_date_desired DATE;

-- Anexos gerais do pedido (fotos da carga, documentos): [{url, name, kind}]
ALTER TABLE orders ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

SELECT 'Módulo de Pedidos: agendamento desejado/confirmado + anexos prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260626_multiorigem.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Coleta consolidada (multi-origem): vários remetentes numa OS
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- `origin` continua sendo o ponto de coleta PRINCIPAL (compatibilidade + tabela
-- de rota). `origins` guarda TODOS os pontos de coleta da OS (incluindo o principal
-- como primeiro), cada um com endereço e observação própria:
--   [{cep,street,number,complement,neighborhood,city,state,contact_name,collection_notes}]

ALTER TABLE orders ADD COLUMN IF NOT EXISTS origins JSONB DEFAULT '[]'::jsonb;

SELECT 'Coleta consolidada (multi-origem) pronta.' AS resultado;


-- ▼▼▼ MIGRATION: 20260627_dispatch_tx.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Despacho atômico (programar/separar/devolver em transação)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Antes: o quadro programava pedido a pedido no navegador (laço). Agora cada
-- operação é UMA transação no servidor.

-- Programar vários pedidos numa mesma célula (caminhão + data)
CREATE OR REPLACE FUNCTION public.schedule_orders(
  p_order_ids UUID[], p_truck_id UUID, p_date DATE, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders SET
    scheduled_truck_id = p_truck_id, scheduled_date = p_date,
    status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
      'status', status, 'timestamp', now(), 'user', p_user,
      'note', 'Programado no despacho')
  WHERE id = ANY(p_order_ids);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Devolver vários pedidos para a fila (tira a programação)
CREATE OR REPLACE FUNCTION public.unschedule_orders(p_order_ids UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders SET scheduled_truck_id = NULL, scheduled_date = NULL
  WHERE id = ANY(p_order_ids);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Aplicar a separação automática inteira (várias cargas) numa transação só
-- p_loads: [{ "truck_id": uuid, "date": "yyyy-mm-dd", "order_ids": [uuid,...] }]
CREATE OR REPLACE FUNCTION public.apply_dispatch_plan(p_loads JSONB, p_user TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l JSONB; ids UUID[];
BEGIN
  FOR l IN SELECT * FROM jsonb_array_elements(COALESCE(p_loads,'[]'::jsonb)) LOOP
    SELECT array_agg(x::uuid) INTO ids FROM jsonb_array_elements_text(l->'order_ids') x;
    IF ids IS NOT NULL THEN
      UPDATE orders SET
        scheduled_truck_id = (l->>'truck_id')::uuid,
        scheduled_date = (l->>'date')::date,
        status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
          'status', status, 'timestamp', now(), 'user', p_user, 'note', 'Separação automática aplicada')
      WHERE id = ANY(ids);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.schedule_orders(UUID[],UUID,DATE,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unschedule_orders(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_dispatch_plan(JSONB,TEXT) TO authenticated;

SELECT 'Despacho atômico pronto.' AS resultado;


-- ▼▼▼ MIGRATION: 20260628_replan_comboio.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Replanejamento ciente de comboio (Onda 7)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Recria redistribute_truck para trocar o VEÍCULO CERTO: o líder (truck_id) ou
-- um veículo secundário do comboio (vehicles[].truck_id). Recebe o caminhão
-- antigo (quebrado) e o novo.

DROP FUNCTION IF EXISTS public.redistribute_truck(UUID,TEXT,UUID[],UUID[],TEXT);

CREATE OR REPLACE FUNCTION public.redistribute_truck(
  p_old_truck_id UUID, p_new_truck_id UUID, p_plate TEXT,
  p_order_ids UUID[], p_trip_ids UUID[], p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- pedidos programados → caminhão substituto
  IF p_order_ids IS NOT NULL THEN
    UPDATE orders SET scheduled_truck_id = p_new_truck_id,
      status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
        'status', status,'timestamp',now(),'user',p_user,
        'note','Redistribuído para '||COALESCE(p_plate,'')||' (caminhão anterior indisponível)')
    WHERE id = ANY(p_order_ids);
  END IF;

  -- viagens → troca o caminhão antigo pelo novo (líder e/ou comboio)
  IF p_trip_ids IS NOT NULL THEN
    UPDATE trips SET
      truck_id    = CASE WHEN truck_id = p_old_truck_id THEN p_new_truck_id ELSE truck_id END,
      truck_plate = CASE WHEN truck_id = p_old_truck_id THEN p_plate ELSE truck_plate END,
      vehicles    = COALESCE((SELECT jsonb_agg(
                      CASE WHEN (v->>'truck_id') = p_old_truck_id::text
                           THEN v || jsonb_build_object('truck_id', p_new_truck_id::text, 'truck_plate', p_plate)
                           ELSE v END)
                    FROM jsonb_array_elements(vehicles) v), vehicles),
      events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','truck_reassigned',
        'description','Caminhão trocado para '||COALESCE(p_plate,'')||' (anterior em manutenção/inativo)','timestamp',now(),'user',p_user)
    WHERE id = ANY(p_trip_ids);
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.redistribute_truck(UUID,UUID,TEXT,UUID[],UUID[],TEXT) TO authenticated;

SELECT 'Replanejamento ciente de comboio pronto.' AS resultado;


-- ▼▼▼ MIGRATION: 20260629_incidents_impact.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Ocorrências: impacto financeiro e causa-raiz
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS financial_impact NUMERIC;  -- custo da avaria/roubo (R$)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS root_cause TEXT;           -- causa-raiz / categoria de análise
-- (photo_urls já existe como JSONB — o gestor pode anexar mais fotos/docs)

SELECT 'Ocorrências: impacto financeiro + causa-raiz prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260630_trip_efficiency.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Viagens (Vi-2): eficiência e estimativa
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- Custo estimado da viagem (km estimado já existe em trips.estimated_km).
ALTER TABLE trips  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC;     -- custo previsto (R$) no início
ALTER TABLE trips  ADD COLUMN IF NOT EXISTS km_per_liter   NUMERIC;     -- eficiência apurada no encerramento (km/L)

-- Histórico de consumo por veículo (média móvel km/L viagem a viagem).
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS last_km_per_liter   NUMERIC;          -- último km/L apurado
ALTER TABLE trucks ADD COLUMN IF NOT EXISTS consumption_history JSONB DEFAULT '[]'::jsonb;  -- [{date, km, liters, km_per_liter, trip_id}]

SELECT 'Viagens Vi-2: estimativa de custo + histórico de consumo prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260631_trip_settlement.sql ▼▼▼

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


-- ▼▼▼ MIGRATION: 20260632_transfer_ops.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Transferências (Tr-1): estorno + sincronização de frota
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- 1) cancel_transfer: estorna a transferência (devolve cada pedido ao status
--    anterior) e libera o caminhão — tudo numa transação só.
-- 2) receive_transfer: além de receber, agora LIBERA o caminhão (available).

-- ── Estornar transferência (atômico) ──────────────────────────
CREATE OR REPLACE FUNCTION public.cancel_transfer(
  p_transfer_id UUID,
  p_order_status JSONB,   -- [{id, status}] status para o qual cada pedido volta
  p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tr transfers%ROWTYPE; row JSONB; v_oid UUID; v_st TEXT;
BEGIN
  SELECT * INTO tr FROM transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência % não encontrada', p_transfer_id; END IF;
  IF tr.status = 'received' THEN RAISE EXCEPTION 'Transferência já recebida não pode ser estornada'; END IF;
  IF tr.status = 'cancelled' THEN RETURN jsonb_build_object('ok', true, 'noop', true); END IF;

  UPDATE transfers SET status='cancelled',
    events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','cancelled',
      'description','Transferência estornada','timestamp',now(),'user',p_user)
  WHERE id = p_transfer_id;

  -- Devolve cada pedido ao status anterior informado pelo app
  FOR row IN SELECT * FROM jsonb_array_elements(COALESCE(p_order_status,'[]'::jsonb)) LOOP
    v_oid := (row->>'id')::uuid;
    v_st  := COALESCE(NULLIF(row->>'status',''), 'confirmed');
    UPDATE orders SET status = v_st,
      status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
        'status', v_st,'timestamp',now(),'user',p_user,'note','Transferência estornada — pedido devolvido')
    WHERE id = v_oid AND status = 'in_transfer';
  END LOOP;

  -- Libera o caminhão da transferência
  IF tr.truck_id IS NOT NULL THEN
    UPDATE trucks SET status='available' WHERE id = tr.truck_id AND status='on_route';
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

-- ── Receber no destino (agora também libera o caminhão) ────────
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

  -- Tr-1: libera o caminhão ao receber
  IF tr.truck_id IS NOT NULL THEN
    UPDATE trucks SET status='available' WHERE id = tr.truck_id AND status='on_route';
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.cancel_transfer(UUID,JSONB,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receive_transfer(UUID,TEXT) TO authenticated;

SELECT 'Transferências Tr-1: estorno + sincronização de frota prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260633_transfer_mesh.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Transferências (Tr-3): malha de filiais + custo
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- 1) branch_history no pedido: por onde a carga passou na malha de filiais/CDs.
-- 2) custo e distância da transferência (linha-haul) → base para rateio no Financeiro.

ALTER TABLE orders    ADD COLUMN IF NOT EXISTS branch_history JSONB DEFAULT '[]'::jsonb;  -- [{branch_id, branch_name, at, from_branch_name}]
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS distance_km NUMERIC;  -- km do trecho de transferência
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS cost        NUMERIC;  -- custo lançado no recebimento

SELECT 'Transferências Tr-3: malha de filiais + custo prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260634_fleet_pro.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Frota (Fr-1): campos profissionais do motorista
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ear        BOOLEAN DEFAULT false;  -- CNH com EAR (atividade remunerada)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cnh_points INTEGER;                -- pontos atuais na CNH (0–40)

SELECT 'Frota Fr-1: EAR + pontos na CNH prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260635_document_files.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Documentos (Doc-1): arquivos de frota e motorista
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Permite anexar o ARQUIVO de cada documento (não só a data de vencimento).
-- CRLV/seguro do caminhão já tinham *_url; faltavam tacógrafo e os do motorista.

ALTER TABLE trucks  ADD COLUMN IF NOT EXISTS tachograph_url TEXT;  -- aferição do tacógrafo
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cnh_url   TEXT;        -- CNH digitalizada
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS aso_url   TEXT;        -- ASO (exame ocupacional)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS toxic_url TEXT;        -- exame toxicológico

SELECT 'Documentos Doc-1: arquivos de frota e motorista prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260636_message_pipeline.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Mensagens (Msg-1): funil de leads
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Transforma a caixa de entrada num funil: novo → em_contato → convertido/perdido/arquivado.

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo';  -- novo|em_contato|convertido|perdido|arquivado
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS converted_order_id UUID REFERENCES orders(id);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS converted_order_protocol TEXT;

-- Backfill: leads antigos já lidos viram "em_contato"; os não lidos ficam "novo".
UPDATE contact_messages SET status = 'em_contato' WHERE status IS NULL AND read = true;
UPDATE contact_messages SET status = 'novo'       WHERE status IS NULL;

SELECT 'Mensagens Msg-1: funil de leads pronto.' AS resultado;


-- ▼▼▼ MIGRATION: 20260637_cash_balance.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Financeiro (Fin-1): saldo inicial de caixa
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Sem isto o fluxo de caixa projetava a partir de zero (delta), e o alerta de
-- saldo negativo não valia. Agora a projeção parte do dinheiro real em caixa.

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS opening_cash_balance NUMERIC DEFAULT 0;  -- caixa atual (banco + dinheiro)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS opening_cash_date DATE;                   -- data de referência do saldo

SELECT 'Financeiro Fin-1: saldo inicial de caixa pronto.' AS resultado;


-- ▼▼▼ MIGRATION: 20260638_user_admin.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Usuários (Usr-1): criar usuário e redefinir senha pelo painel
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Espelha o padrão já validado de admin_create_driver_login: cria o login no
-- servidor via SECURITY DEFINER (sem expor a service_role no front). Só admins.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Criar usuário (admin / operator) ──────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT, p_password TEXT, p_full_name TEXT, p_role TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
DECLARE v_uid UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF p_email IS NULL OR length(p_password) < 6 THEN RAISE EXCEPTION 'E-mail e senha (mín. 6) são obrigatórios'; END IF;
  IF p_role NOT IN ('admin','operator','motorista','pending') THEN RAISE EXCEPTION 'Papel inválido'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(p_email)) THEN
    RAISE EXCEPTION 'Já existe um usuário com este e-mail';
  END IF;
  v_uid := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    lower(p_email), crypt(p_password, gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', COALESCE(p_full_name,'')),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now()
  );

  INSERT INTO public.user_profiles (id, email, full_name, role, active)
  VALUES (v_uid, lower(p_email), COALESCE(p_full_name,''), p_role, true)
  ON CONFLICT (id) DO UPDATE SET role = p_role, full_name = COALESCE(p_full_name,''), active = true;

  RETURN jsonb_build_object('ok', true, 'user_id', v_uid);
END; $$;

-- ── Redefinir senha de um usuário ─────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id UUID, p_password TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  IF length(p_password) < 6 THEN RAISE EXCEPTION 'Senha mínima de 6 caracteres'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID,TEXT) TO authenticated;

SELECT 'Usuários Usr-1: criar usuário + redefinir senha prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260639_user_list.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Usuários (Usr-2): listagem com último acesso
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Junta user_profiles com auth.users.last_sign_in_at (que o front não pode ler
-- direto). Só administradores executam.

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, role TEXT, active BOOLEAN,
  driver_id UUID, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.role, p.active, p.driver_id, p.created_at, u.last_sign_in_at
    FROM public.user_profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at ASC;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

SELECT 'Usuários Usr-2: listagem com último acesso pronta.' AS resultado;


-- ▼▼▼ MIGRATION: 20260640_user_audit.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Usuários (Usr-3): log de auditoria das ações de admin
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_email TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_audit" ON user_audit_log;
CREATE POLICY "admins_read_audit" ON user_audit_log FOR SELECT TO authenticated USING (public.is_admin());

-- Registra uma ação (carimba o autor a partir do auth.uid). Só admins.
CREATE OR REPLACE FUNCTION public.admin_log_action(
  p_action TEXT, p_target_email TEXT, p_detail TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.user_audit_log (actor_id, actor_email, action, target_email, detail)
  VALUES (auth.uid(), v_email, p_action, NULLIF(p_target_email,''), NULLIF(p_detail,''));
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_log_action(TEXT,TEXT,TEXT) TO authenticated;

SELECT 'Usuários Usr-3: log de auditoria pronto.' AS resultado;


-- ▼▼▼ MIGRATION: 20260641_settings_security.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Configurações (Cfg-1): para o vazamento de dados sensíveis
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- PROBLEMA: company_settings tinha leitura pública (anon) com SELECT *, e a linha
-- passou a acumular campos sensíveis (chave do Google faturável, saldo de caixa,
-- URLs de documentos, parâmetros internos). Qualquer visitante lia tudo.
--
-- SOLUÇÃO: anon lê apenas um SUBCONJUNTO SEGURO via função SECURITY DEFINER que
-- remove os campos sensíveis. Usuário autenticado (admin/operador) continua lendo
-- a linha completa pela RLS de autenticados.

-- 1) Função pública: devolve a config SEM os campos sensíveis (deny-list).
CREATE OR REPLACE FUNCTION public.public_settings()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT to_jsonb(s)
    - 'google_maps_api_key'
    - 'opening_cash_balance'
    - 'opening_cash_date'
    - 'documents'
    - 'tax_rate_percent'
    - 'monthly_depreciation'
  FROM company_settings s
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.public_settings() TO anon, authenticated;

-- 2) Tira a leitura pública direta da tabela; só autenticados leem a linha completa.
DROP POLICY IF EXISTS "public_read_settings" ON company_settings;
DROP POLICY IF EXISTS "authenticated_read_settings" ON company_settings;
CREATE POLICY "authenticated_read_settings" ON company_settings
  FOR SELECT TO authenticated USING (true);

SELECT 'Configurações Cfg-1: leitura pública restrita ao subconjunto seguro.' AS resultado;


-- ▼▼▼ MIGRATION: 20260642_signup_profile.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Perfil automático no cadastro (corrige "Acesso não liberado")
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- PROBLEMA: quem se cadastra (e-mail ou Google) NÃO ganhava linha em user_profiles,
-- então o app o tratava como 'pending' (sem acesso) e ele nem aparecia em Usuários
-- para um admin liberar. Não havia admin inicial (chicken-and-egg).
--
-- SOLUÇÃO:
--  1) Garante o papel 'pending' no CHECK.
--  2) Trigger cria o perfil no signup. Se AINDA não existe nenhum admin ativo,
--     o novo usuário vira 'admin' (bootstrap do primeiro acesso); senão, 'pending'.
--  3) Backfill: cria perfil para usuários já existentes sem perfil.

-- 1) Permite 'pending'
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operator','motorista','pending'));

-- 2) Função + trigger de criação automática
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_has_admin BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE role = 'admin' AND COALESCE(active, true)) INTO v_has_admin;
  INSERT INTO public.user_profiles (id, email, full_name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE WHEN v_has_admin THEN 'pending' ELSE 'admin' END,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Backfill: cria perfil 'pending' para quem já tem conta mas não tem perfil
INSERT INTO public.user_profiles (id, email, full_name, role, active)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', ''), 'pending', true
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4) Se ainda não há NENHUM admin ativo, promove o usuário mais antigo (desbloqueio inicial)
UPDATE public.user_profiles
SET role = 'admin', active = true
WHERE id = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE role = 'admin' AND COALESCE(active, true));

SELECT 'Perfil automático no cadastro pronto. Primeiro usuário é admin.' AS resultado;


-- ▼▼▼ MIGRATION: 20260643_order_priority.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Prioridade operacional do pedido + índice de fila
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Prioridade OPERACIONAL (normal/high/critical), desacoplada de freight_type
-- (que é precificação). Define a ordem de atendimento na fila de programação.
--   critical = atender primeiro · high = urgente · normal = padrão

ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Garante valores válidos (e backfill de nulos legados para 'normal' antes do CHECK)
UPDATE orders SET priority = 'normal' WHERE priority IS NULL OR priority NOT IN ('normal', 'high', 'critical');

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_priority_check;
ALTER TABLE orders ADD CONSTRAINT orders_priority_check
  CHECK (priority IN ('normal', 'high', 'critical'));

-- Índice para listar/ordenar a fila por prioridade rapidamente.
-- Ordem textual NÃO reflete urgência, então indexamos um rank derivado:
--   critical → 0, high → 1, normal → 2
CREATE INDEX IF NOT EXISTS idx_orders_priority_rank
  ON orders ((CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END));

SELECT 'Coluna priority pronta (normal/high/critical).' AS resultado;


-- ▼▼▼ MIGRATION: 20260644_order_approval.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Fluxo de aprovação de pedido (item 46) — opcional por empresa
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Quando ligado (company_settings.require_order_approval = true), todo pedido
-- novo entra como 'awaiting_approval' e só segue para a fila operacional ('new')
-- depois que um admin OU operador libera. Desligado = fluxo atual intacto.

-- 1) Novo status no CHECK de orders (preserva todos os anteriores)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('awaiting_approval','new','confirmed','collecting','in_transit','delivered','cancelled',
                    'awaiting_cargo','partially_delivered','in_transfer'));

-- 2) Interruptor por empresa (padrão desligado — não muda comportamento atual)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS require_order_approval BOOLEAN DEFAULT false;

-- 3) Limite (dias) para alertar "pedido parado" na Central de Operações (Onda 1).
--    Padrão 3; com 0 sinaliza imediatamente qualquer pedido sem programação.
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS stale_order_days INTEGER DEFAULT 3;

SELECT 'Fluxo de aprovação + limite de pedido parado prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260645_rls_fixes.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Correções de PERMISSÃO (RLS) — BUG-01 e BUG-02 do QA
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Sem isto:
--   • BUG-02: o formulário de Contato do site dá 403 e NENHUM lead é salvo.
--   • BUG-01: enviar foto/NF (POD) no app do motorista e no admin dá 403.
-- São regras de banco/armazenamento — não dá pra corrigir só no código.

-- ──────────────────────────────────────────────────────────
-- BUG-02 — Permitir que o site público (anon) crie leads de contato
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_contact" ON public.contact_messages;
CREATE POLICY "anon_insert_contact" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Garante que a equipe (autenticada) consegue ler/gerir os leads recebidos.
DROP POLICY IF EXISTS "auth_manage_contact" ON public.contact_messages;
CREATE POLICY "auth_manage_contact" ON public.contact_messages
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- BUG-01 — Armazenamento (Storage): upload de comprovantes/NF (bucket 'uploads')
-- ──────────────────────────────────────────────────────────
-- 1) Cria o bucket 'uploads' (leitura pública, p/ abrir o arquivo pelo link).
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) Usuários autenticados (admin, operador, motorista) podem ENVIAR arquivos.
DROP POLICY IF EXISTS "auth_upload_uploads" ON storage.objects;
CREATE POLICY "auth_upload_uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- 3) Podem também atualizar/remover os próprios envios (re-anexar, trocar).
DROP POLICY IF EXISTS "auth_update_uploads" ON storage.objects;
CREATE POLICY "auth_update_uploads" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "auth_delete_uploads" ON storage.objects;
CREATE POLICY "auth_delete_uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'uploads');

-- 4) Leitura pública dos arquivos do bucket (abrir NF assinada / foto pelo link).
DROP POLICY IF EXISTS "public_read_uploads" ON storage.objects;
CREATE POLICY "public_read_uploads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'uploads');

SELECT 'RLS corrigido: leads de contato (anon insert) e uploads (bucket uploads).' AS resultado;


-- ▼▼▼ MIGRATION: 20260646_client_portal.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Portal do Cliente (Onda 1a): papel "client" + auto-cadastro
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Modelo: o cliente se cadastra sozinho (informando a empresa/CNPJ), entra como
-- 'pending' e um admin APROVA, vinculando ao client_id. Depois, o login leva ao
-- Portal do Cliente, que só enxerga os próprios pedidos (via RPC SECURITY DEFINER,
-- sem expor a tabela orders inteira).

-- 1) Permite o papel 'client' e os vínculos no perfil
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operator','motorista','client','pending'));
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS requested_company TEXT;

-- 2) Pedidos do cliente logado (escopo seguro por client_id do próprio perfil)
CREATE OR REPLACE FUNCTION public.my_client_orders()
RETURNS SETOF public.orders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.* FROM public.orders o
  WHERE o.client_id = (
    SELECT up.client_id FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false)
  );
$$;
GRANT EXECUTE ON FUNCTION public.my_client_orders() TO authenticated;

-- 3) Perfil do cliente logado (dados básicos do client vinculado + status)
CREATE OR REPLACE FUNCTION public.my_client_profile()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'role', up.role, 'active', up.active, 'client_id', up.client_id,
    'requested_company', up.requested_company,
    'client_name', c.company_name, 'client_cnpj', c.cpf_cnpj
  )
  FROM public.user_profiles up
  LEFT JOIN public.clients c ON c.id = up.client_id
  WHERE up.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.my_client_profile() TO authenticated;

-- 3.1) O próprio usuário recém-cadastrado registra a empresa que solicitou
CREATE OR REPLACE FUNCTION public.set_my_requested_company(p_company TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles SET requested_company = NULLIF(btrim(p_company), '')
  WHERE id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.set_my_requested_company(TEXT) TO authenticated;

-- 4) ADMIN: lista solicitações de acesso de cliente pendentes
CREATE OR REPLACE FUNCTION public.admin_pending_client_requests()
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, requested_company TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT up.id, up.email, up.full_name, up.requested_company, up.created_at
  FROM public.user_profiles up
  WHERE up.role = 'pending' AND up.requested_company IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_profiles me WHERE me.id = auth.uid() AND me.role = 'admin' AND COALESCE(me.active,true))
  ORDER BY up.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_pending_client_requests() TO authenticated;

-- 5) ADMIN: aprova um cliente, vinculando ao client_id e ativando
CREATE OR REPLACE FUNCTION public.admin_approve_client(p_user_id UUID, p_client_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin' AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar acessos de cliente.';
  END IF;
  UPDATE public.user_profiles
    SET role = 'client', client_id = p_client_id, active = true
    WHERE id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_approve_client(UUID, UUID) TO authenticated;

SELECT 'Portal do Cliente (1a) pronto: papel client + RPCs de pedidos/perfil/aprovação.' AS resultado;


-- ▼▼▼ MIGRATION: 20260647_client_create_order.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Portal do Cliente (1b): criar pedido pelo portal
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- O cliente logado cria um pedido; o client_id e a razão social são FORÇADOS
-- a partir do próprio perfil (não dá para falsificar outra empresa). Respeita
-- o fluxo de aprovação da empresa (awaiting_approval) se estiver ligado.

CREATE OR REPLACE FUNCTION public.create_client_order(p JSONB)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client_id UUID;
  v_company TEXT;
  v_proto TEXT;
  v_require BOOLEAN;
  v_status TEXT;
BEGIN
  SELECT up.client_id, c.company_name INTO v_client_id, v_company
  FROM public.user_profiles up
  LEFT JOIN public.clients c ON c.id = up.client_id
  WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false);

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Acesso de cliente não autorizado.';
  END IF;

  SELECT COALESCE(require_order_approval, false) INTO v_require FROM public.company_settings LIMIT 1;
  v_status := CASE WHEN v_require THEN 'awaiting_approval' ELSE 'new' END;
  v_proto := public.next_protocol();

  INSERT INTO public.orders (
    protocol, client_id, client_name, status,
    origin, collection_date, collection_date_desired,
    recipients, total_volumes, total_weight_kg, general_notes,
    payment_status, status_history
  ) VALUES (
    v_proto, v_client_id, v_company, v_status,
    COALESCE(p->'origin', '{}'::jsonb),
    NULLIF(p->>'collection_date','')::date, NULLIF(p->>'collection_date','')::date,
    COALESCE(p->'recipients', '[]'::jsonb),
    NULLIF(p->>'total_volumes','')::int, NULLIF(p->>'total_weight_kg','')::numeric,
    NULLIF(p->>'general_notes',''),
    'pending',
    jsonb_build_array(jsonb_build_object(
      'status', v_status, 'timestamp', now(), 'user', v_company,
      'note', 'Pedido criado pelo Portal do Cliente'
    ))
  );

  RETURN v_proto;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_client_order(JSONB) TO authenticated;

SELECT 'Portal do Cliente (1b): create_client_order pronto.' AS resultado;


-- ▼▼▼ MIGRATION: 20260648_invoices.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Ciclo de faturamento (Onda 3): Fatura por cliente
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- A Fatura é um DOCUMENTO que agrupa pedidos faturáveis de um cliente em uma
-- cobrança única (número, vencimento, total, linhas). NÃO cria receita nova —
-- as receitas por pedido já existem (na confirmação). "Pagar" a fatura marca as
-- receitas vinculadas como recebidas. Cada pedido só entra em UMA fatura.

CREATE TABLE IF NOT EXISTS public.invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number      TEXT,
  client_id   UUID REFERENCES public.clients(id),
  client_name TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','cancelled')),
  issue_date  DATE DEFAULT CURRENT_DATE,
  due_date    DATE,
  total       NUMERIC DEFAULT 0,
  notes       TEXT,
  lines       JSONB DEFAULT '[]'::jsonb,
  paid_date   DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id);

-- Número sequencial por ano: FAT-2026-0001
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'FAT-' || to_char(now(), 'YYYY') || '-' ||
         lpad((count(*) + 1)::text, 4, '0')
  FROM public.invoices WHERE number LIKE 'FAT-' || to_char(now(), 'YYYY') || '-%';
$$;

-- Cria a fatura a partir de pedidos selecionados (admin/operador). Soma o frete,
-- monta as linhas, gera o número e marca os pedidos como faturados.
CREATE OR REPLACE FUNCTION public.create_invoice(p_client_id UUID, p_order_ids UUID[], p_due_date DATE, p_notes TEXT DEFAULT NULL)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_num TEXT; v_total NUMERIC; v_lines JSONB; v_name TEXT; v_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true)) THEN
    RAISE EXCEPTION 'Sem permissão para faturar.';
  END IF;
  SELECT company_name INTO v_name FROM public.clients WHERE id = p_client_id;
  SELECT COALESCE(sum(freight_value), 0),
         COALESCE(jsonb_agg(jsonb_build_object('order_id', id, 'protocol', protocol, 'amount', freight_value) ORDER BY protocol), '[]'::jsonb)
    INTO v_total, v_lines
    FROM public.orders
    WHERE id = ANY(p_order_ids) AND client_id = p_client_id AND invoice_id IS NULL;
  IF v_lines = '[]'::jsonb THEN RAISE EXCEPTION 'Nenhum pedido faturável selecionado.'; END IF;
  v_num := public.next_invoice_number();
  INSERT INTO public.invoices (number, client_id, client_name, status, issue_date, due_date, total, lines, notes)
    VALUES (v_num, p_client_id, v_name, 'open', CURRENT_DATE, p_due_date, v_total, v_lines, NULLIF(btrim(p_notes), ''))
    RETURNING id INTO v_id;
  UPDATE public.orders SET invoice_id = v_id WHERE id = ANY(p_order_ids) AND client_id = p_client_id AND invoice_id IS NULL;
  RETURN v_num;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_invoice(UUID, UUID[], DATE, TEXT) TO authenticated;

-- Marca a fatura como paga e baixa as receitas dos pedidos vinculados.
CREATE OR REPLACE FUNCTION public.pay_invoice(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_orders UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true)) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  UPDATE public.invoices SET status = 'paid', paid_date = CURRENT_DATE WHERE id = p_invoice_id;
  SELECT array_agg((l->>'order_id')::uuid) INTO v_orders
    FROM public.invoices i, jsonb_array_elements(i.lines) l WHERE i.id = p_invoice_id;
  IF v_orders IS NOT NULL THEN
    UPDATE public.revenues SET status = 'received', received_date = CURRENT_DATE
      WHERE order_id = ANY(v_orders) AND status IN ('receivable','overdue');
    UPDATE public.orders SET payment_status = 'paid' WHERE id = ANY(v_orders);
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.pay_invoice(UUID) TO authenticated;

-- Faturas do cliente logado (Portal do Cliente)
CREATE OR REPLACE FUNCTION public.my_client_invoices()
RETURNS SETOF public.invoices LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT i.* FROM public.invoices i
  WHERE i.client_id = (
    SELECT up.client_id FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false)
  )
  ORDER BY i.issue_date DESC;
$$;
GRANT EXECUTE ON FUNCTION public.my_client_invoices() TO authenticated;

-- RLS: staff (admin/operador) gere as faturas; cliente lê só pela RPC acima.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_invoices" ON public.invoices;
CREATE POLICY "staff_manage_invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active, true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active, true)));

SELECT 'Faturamento (Onda 3) pronto: invoices + create_invoice/pay_invoice/my_client_invoices.' AS resultado;


-- ▼▼▼ MIGRATION: 20260649_rls_hardening.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Blindagem de acesso (RLS) — A4 da auditoria
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- MOTIVO: com o Portal do Cliente, um usuário "client" tem SESSÃO AUTENTICADA.
-- Se orders/clients/revenues estiverem abertos a qualquer autenticado, ele
-- poderia ler dados de OUTROS clientes direto pela tabela, driblando os RPCs.
-- Esta migration define o acesso mínimo e preserva os caminhos atuais.
--
-- ⚠️ TESTAR APÓS APLICAR: (1) agendamento público /agendar, (2) app do motorista,
--    (3) listas do admin, (4) Portal do Cliente. Funções SECURITY DEFINER
--    (confirm_order, my_client_orders, create_invoice, track_order, etc.) NÃO são
--    afetadas — elas rodam como dono e continuam funcionando.

-- Helpers de papel
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true));
$$;
CREATE OR REPLACE FUNCTION public.is_driver() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'motorista' AND COALESCE(active, true));
$$;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver() TO anon, authenticated;

-- ───────────────── orders ─────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Equipe (admin/operador): acesso total
DROP POLICY IF EXISTS "staff_all_orders" ON public.orders;
CREATE POLICY "staff_all_orders" ON public.orders FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
-- Motorista: lê e atualiza (status na entrega). Não cria nem apaga.
DROP POLICY IF EXISTS "driver_read_orders" ON public.orders;
CREATE POLICY "driver_read_orders" ON public.orders FOR SELECT TO authenticated
  USING (public.is_driver());
DROP POLICY IF EXISTS "driver_update_orders" ON public.orders;
CREATE POLICY "driver_update_orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_driver()) WITH CHECK (public.is_driver());
-- Site público (anon): cria pedido pelo /agendar.
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
CREATE POLICY "anon_insert_orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
-- (Cliente do portal NÃO acessa a tabela direto — usa my_client_orders / create_client_order.)

-- ───────────────── clients ─────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all_clients" ON public.clients;
CREATE POLICY "staff_all_clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ───────────────── revenues ─────────────────
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_all_revenues" ON public.revenues;
CREATE POLICY "staff_all_revenues" ON public.revenues FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

SELECT 'RLS blindado: orders (staff+driver+anon-insert), clients/revenues (staff). Clientes só via RPC.' AS resultado;


-- ▼▼▼ MIGRATION: 20260650_incident_sla.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Config de SLA de ocorrências (B3 da auditoria)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Guarda as horas de SLA por gravidade ({critical, high, medium, low}).
-- Lido por incidentSla.js; sem isto, usa os padrões (4/24/72/168h).
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS incident_sla_hours JSONB;

SELECT 'Config de SLA de ocorrência pronta (incident_sla_hours).' AS resultado;


-- ▼▼▼ MIGRATION: 20260651_my_client_order.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Portal: pedido único do cliente (C3 da auditoria)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- A tela de detalhe do portal carregava TODOS os pedidos para exibir 1.
-- Esta RPC retorna só o pedido pedido, e só se for do próprio cliente.
CREATE OR REPLACE FUNCTION public.my_client_order(p_id UUID)
RETURNS SETOF public.orders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.* FROM public.orders o
  WHERE o.id = p_id AND o.client_id = (
    SELECT up.client_id FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false)
  );
$$;
GRANT EXECUTE ON FUNCTION public.my_client_order(UUID) TO authenticated;

SELECT 'RPC my_client_order pronta.' AS resultado;


-- ▼▼▼ MIGRATION: 20260652_live_tracking.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Rastreamento ao vivo (Mega-feature 1)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Modelo: o app do motorista envia a posição (GPS) durante a viagem em andamento
-- via RPC update_trip_location (SECURITY DEFINER, valida que é o motorista da
-- viagem). A última posição fica em trips.current_lat/lng; o histórico (rastro)
-- vai para trip_positions. O admin lê direto (RLS de staff). O cliente do portal
-- vê só a posição da carga dele, via order_live_location (escopo por client_id).

-- 1) Última posição conhecida na própria viagem (leitura rápida no mapa)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS current_lat   DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS current_lng   DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- 2) Histórico de posições (rastro do trajeto)
CREATE TABLE IF NOT EXISTS public.trip_positions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_positions_trip ON public.trip_positions(trip_id, recorded_at DESC);

ALTER TABLE public.trip_positions ENABLE ROW LEVEL SECURITY;
-- Só staff lê o rastro direto; motorista/cliente acessam via RPC (SECURITY DEFINER).
DROP POLICY IF EXISTS trip_positions_staff_select ON public.trip_positions;
CREATE POLICY trip_positions_staff_select ON public.trip_positions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)));

-- 3) Motorista (ou staff) envia a posição da viagem
CREATE OR REPLACE FUNCTION public.update_trip_location(p_trip_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN RETURN; END IF;
  -- Autoriza: staff OU o motorista vinculado à viagem (incl. comboio em trips.vehicles).
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)
  ) OR EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.drivers d ON d.user_id = auth.uid()
    WHERE t.id = p_trip_id
      AND (t.driver_id = d.id
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(t.vehicles,'[]'::jsonb)) v
                      WHERE (v->>'driver_id')::uuid = d.id))
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Sem permissão para atualizar a localização desta viagem.';
  END IF;

  UPDATE public.trips
    SET current_lat = p_lat, current_lng = p_lng, location_updated_at = now()
    WHERE id = p_trip_id;

  INSERT INTO public.trip_positions (trip_id, lat, lng) VALUES (p_trip_id, p_lat, p_lng);
END; $$;
GRANT EXECUTE ON FUNCTION public.update_trip_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- 4) Portal do cliente: posição ao vivo da carga (só dos pedidos do próprio cliente)
CREATE OR REPLACE FUNCTION public.order_live_location(p_order_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'lat', t.current_lat,
    'lng', t.current_lng,
    'updated_at', t.location_updated_at,
    'trip_status', t.status,
    'truck_plate', t.truck_plate,
    'driver_name', t.driver_name
  )
  FROM public.orders o
  JOIN public.trips t ON t.id = o.trip_id
  WHERE o.id = p_order_id
    AND t.current_lat IS NOT NULL
    AND o.client_id = (
      SELECT up.client_id FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false)
    );
$$;
GRANT EXECUTE ON FUNCTION public.order_live_location(UUID) TO authenticated;

SELECT 'Rastreamento ao vivo pronto: trips.current_lat/lng + trip_positions + update_trip_location/order_live_location.' AS resultado;


-- ▼▼▼ MIGRATION: 20260653_carrier_portal.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Portal da Transportadora (Mega-feature 2): subcontratação
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Modelo (espelha o Portal do Cliente):
--   1. A transportadora parceira se cadastra (/parceiro/cadastro), entra como
--      'pending' com requested_role='carrier'. Um admin aprova e vincula ao
--      carrier_id (vira role 'carrier').
--   2. O admin OFERTA um pedido a um parceiro (carrier_status='offered' + valor).
--   3. O parceiro ACEITA/RECUSA (carrier_respond_offer) e, aceitando, passa a
--      atualizar o status da carga (carrier_update_order_status).
--   Tudo via RPC SECURITY DEFINER, com escopo pelo carrier_id do próprio perfil.

-- 1) Papel 'carrier' + vínculos no perfil
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin','operator','motorista','client','carrier','pending'));
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS requested_role TEXT; -- 'client' | 'carrier'

-- 2) Transportadoras parceiras (subcontratadas)
CREATE TABLE IF NOT EXISTS public.carriers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name     TEXT NOT NULL,
  cpf_cnpj         TEXT,
  contact_name     TEXT,
  phone            TEXT,
  email            TEXT,
  status           TEXT NOT NULL DEFAULT 'active',  -- active | inactive
  payment_term_days INTEGER DEFAULT 30,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES public.carriers(id);

ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
-- Só staff acessa a tabela direto; o parceiro vê os próprios dados via RPC.
DROP POLICY IF EXISTS carriers_staff_all ON public.carriers;
CREATE POLICY carriers_staff_all ON public.carriers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)));

-- 3) Subcontratação no pedido
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES public.carriers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_status TEXT;             -- offered | accepted | refused
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_amount NUMERIC;          -- valor combinado com o parceiro
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_offered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_responded_at TIMESTAMPTZ;

-- 4) Cadastro: o parceiro registra a empresa solicitada (separado do cliente)
CREATE OR REPLACE FUNCTION public.set_my_carrier_request(p_company TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles
    SET requested_company = NULLIF(btrim(p_company), ''), requested_role = 'carrier'
    WHERE id = auth.uid();
END; $$;
GRANT EXECUTE ON FUNCTION public.set_my_carrier_request(TEXT) TO authenticated;

-- 4.1) admin_pending_client_requests passa a EXCLUIR quem pediu acesso de parceiro
CREATE OR REPLACE FUNCTION public.admin_pending_client_requests()
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, requested_company TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT up.id, up.email, up.full_name, up.requested_company, up.created_at
  FROM public.user_profiles up
  WHERE up.role = 'pending' AND up.requested_company IS NOT NULL
    AND COALESCE(up.requested_role, 'client') <> 'carrier'
    AND EXISTS (SELECT 1 FROM public.user_profiles me WHERE me.id = auth.uid() AND me.role = 'admin' AND COALESCE(me.active,true))
  ORDER BY up.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_pending_client_requests() TO authenticated;

-- 5) ADMIN: solicitações de acesso de parceiro pendentes
CREATE OR REPLACE FUNCTION public.admin_pending_carrier_requests()
RETURNS TABLE (id UUID, email TEXT, full_name TEXT, requested_company TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT up.id, up.email, up.full_name, up.requested_company, up.created_at
  FROM public.user_profiles up
  WHERE up.role = 'pending' AND up.requested_role = 'carrier'
    AND EXISTS (SELECT 1 FROM public.user_profiles me WHERE me.id = auth.uid() AND me.role = 'admin' AND COALESCE(me.active,true))
  ORDER BY up.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.admin_pending_carrier_requests() TO authenticated;

-- 5.1) ADMIN: aprova o parceiro, vinculando ao carrier_id
CREATE OR REPLACE FUNCTION public.admin_approve_carrier(p_user_id UUID, p_carrier_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin' AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar acessos de transportadora.';
  END IF;
  UPDATE public.user_profiles
    SET role = 'carrier', carrier_id = p_carrier_id, active = true
    WHERE id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_approve_carrier(UUID, UUID) TO authenticated;

-- 5.2) ADMIN: oferta um pedido a um parceiro
CREATE OR REPLACE FUNCTION public.admin_offer_order(p_order_id UUID, p_carrier_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode ofertar pedidos a parceiros.';
  END IF;
  UPDATE public.orders
    SET carrier_id = p_carrier_id, carrier_amount = p_amount,
        carrier_status = 'offered', carrier_offered_at = now(), carrier_responded_at = NULL
    WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_offer_order(UUID, UUID, NUMERIC) TO authenticated;

-- 6) PARCEIRO: perfil, ofertas, cargas aceitas, responder oferta, atualizar status
CREATE OR REPLACE FUNCTION public.my_carrier_profile()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'role', up.role, 'active', up.active, 'carrier_id', up.carrier_id,
    'requested_company', up.requested_company,
    'carrier_name', c.company_name, 'carrier_cnpj', c.cpf_cnpj
  )
  FROM public.user_profiles up
  LEFT JOIN public.carriers c ON c.id = up.carrier_id
  WHERE up.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.my_carrier_profile() TO authenticated;

-- helper: carrier_id do usuário logado (parceiro ativo)
CREATE OR REPLACE FUNCTION public.my_carrier_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT up.carrier_id FROM public.user_profiles up
  WHERE up.id = auth.uid() AND up.role = 'carrier' AND COALESCE(up.active, false);
$$;
GRANT EXECUTE ON FUNCTION public.my_carrier_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_carrier_offers()
RETURNS SETOF public.orders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.* FROM public.orders o
  WHERE o.carrier_status = 'offered' AND o.carrier_id = public.my_carrier_id();
$$;
GRANT EXECUTE ON FUNCTION public.my_carrier_offers() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_carrier_orders()
RETURNS SETOF public.orders LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT o.* FROM public.orders o
  WHERE o.carrier_status = 'accepted' AND o.carrier_id = public.my_carrier_id();
$$;
GRANT EXECUTE ON FUNCTION public.my_carrier_orders() TO authenticated;

CREATE OR REPLACE FUNCTION public.carrier_respond_offer(p_order_id UUID, p_accept BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID;
BEGIN
  v_cid := public.my_carrier_id();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Acesso de transportadora inválido.'; END IF;
  UPDATE public.orders
    SET carrier_status = CASE WHEN p_accept THEN 'accepted' ELSE 'refused' END,
        carrier_responded_at = now()
    WHERE id = p_order_id AND carrier_id = v_cid AND carrier_status = 'offered';
  IF NOT FOUND THEN RAISE EXCEPTION 'Oferta não encontrada ou já respondida.'; END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.carrier_respond_offer(UUID, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.carrier_update_order_status(p_order_id UUID, p_status TEXT, p_note TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid UUID; v_order public.orders%ROWTYPE;
BEGIN
  v_cid := public.my_carrier_id();
  IF v_cid IS NULL THEN RAISE EXCEPTION 'Acesso de transportadora inválido.'; END IF;
  IF p_status NOT IN ('collecting','in_transit','delivered') THEN
    RAISE EXCEPTION 'Status inválido para o parceiro.';
  END IF;
  SELECT * INTO v_order FROM public.orders
    WHERE id = p_order_id AND carrier_id = v_cid AND carrier_status = 'accepted';
  IF NOT FOUND THEN RAISE EXCEPTION 'Carga não encontrada para esta transportadora.'; END IF;
  UPDATE public.orders
    SET status = p_status,
        status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_object(
          'status', p_status, 'timestamp', now(),
          'user', 'Parceiro: ' || COALESCE((SELECT company_name FROM public.carriers WHERE id = v_cid), 'transportadora'),
          'note', NULLIF(btrim(p_note), '')
        )
    WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.carrier_update_order_status(UUID, TEXT, TEXT) TO authenticated;

SELECT 'Portal da Transportadora pronto: carriers + subcontratação no pedido + RPCs de oferta/aceite/status.' AS resultado;


-- ▼▼▼ MIGRATION: 20260654_bank_reconciliation.sql ▼▼▼

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


-- ▼▼▼ MIGRATION: 20260655_carrier_settlement.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Roadmap 1.4: ciclo financeiro do parceiro (acerto/pagamento)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Fecha o laço da subcontratação: quando um pedido foi aceito por um parceiro
-- (carrier_status='accepted') com valor combinado, a equipe lança o PAGAMENTO
-- AO PARCEIRO como despesa "a pagar" (status pending), vinculada ao pedido.
-- Idempotente por pedido: orders.carrier_expense_id evita duplicar o lançamento.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier_expense_id UUID REFERENCES public.expenses(id);

CREATE OR REPLACE FUNCTION public.settle_carrier_order(p_order_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order   public.orders%ROWTYPE;
  v_carrier TEXT;
  v_exp_id  UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode lançar pagamento ao parceiro.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado.'; END IF;
  IF v_order.carrier_id IS NULL OR v_order.carrier_status <> 'accepted' THEN
    RAISE EXCEPTION 'Pedido sem parceiro com oferta aceita.';
  END IF;
  IF COALESCE(v_order.carrier_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Valor combinado com o parceiro inválido.';
  END IF;
  -- já lançado: idempotente
  IF v_order.carrier_expense_id IS NOT NULL THEN
    RETURN v_order.carrier_expense_id;
  END IF;

  SELECT company_name INTO v_carrier FROM public.carriers WHERE id = v_order.carrier_id;

  INSERT INTO public.expenses (category, description, amount, date, status)
    VALUES ('other',
            'Subcontratação — ' || COALESCE(v_carrier, 'parceiro') || ' · ' || COALESCE(v_order.protocol, ''),
            v_order.carrier_amount, CURRENT_DATE, 'pending')
    RETURNING id INTO v_exp_id;

  UPDATE public.orders SET carrier_expense_id = v_exp_id WHERE id = p_order_id;
  RETURN v_exp_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.settle_carrier_order(UUID) TO authenticated;

SELECT 'Acerto do parceiro pronto: orders.carrier_expense_id + settle_carrier_order.' AS resultado;


-- ▼▼▼ MIGRATION: 20260656_reconcile_invoice.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Roadmap 1.8: conciliação ligada à fatura
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Estende reconcile_bank_tx para aceitar p_type='invoice': um CRÉDITO do extrato
-- pode dar baixa numa FATURA em aberto, cascateando como pay_invoice (marca a
-- fatura paga + receitas recebidas + pedidos pagos), porém com a DATA DO EXTRATO.

CREATE OR REPLACE FUNCTION public.reconcile_bank_tx(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date   DATE;
  v_orders UUID[];
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

  ELSIF p_type = 'invoice' THEN
    -- baixa da fatura na data do extrato + cascata (mesma regra do pay_invoice)
    UPDATE public.invoices SET status = 'paid', paid_date = v_date WHERE id = p_target_id;
    SELECT array_agg((l->>'order_id')::uuid) INTO v_orders
      FROM public.invoices i, jsonb_array_elements(i.lines) l WHERE i.id = p_target_id;
    IF v_orders IS NOT NULL THEN
      UPDATE public.revenues SET status = 'received', received_date = v_date
        WHERE order_id = ANY(v_orders) AND status IN ('receivable','overdue');
      UPDATE public.orders SET payment_status = 'paid' WHERE id = ANY(v_orders);
    END IF;

  ELSE
    RAISE EXCEPTION 'Tipo inválido para conciliação: %', p_type;
  END IF;

  UPDATE public.bank_transactions
    SET status = 'matched', matched_type = p_type, matched_id = p_target_id, reconciled_at = now()
    WHERE id = p_tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_tx(UUID, TEXT, UUID) TO authenticated;

SELECT 'Conciliação por fatura pronta: reconcile_bank_tx aceita type=invoice.' AS resultado;


-- ▼▼▼ MIGRATION: 20260657_audit_log.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Roadmap 2.3 (parte 1): audit log central
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Trilha central de ações sensíveis (além do user_audit_log, que é só de admin).
-- Qualquer staff (admin/operator) registra via log_action; leitura só admin.
-- Aditivo: não altera RPCs existentes — a instrumentação chama log_action após
-- a ação. (Endurecimento futuro: gatilhos/logging dentro das RPCs.)

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID,
  actor_email TEXT,
  action      TEXT NOT NULL,        -- ex: "Cancelou pedido", "Pagou fatura"
  entity      TEXT,                 -- ex: "order", "invoice", "trip"
  entity_id   TEXT,                 -- protocolo/número/id de referência
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Leitura: só admin. Inserção: apenas via RPC (SECURITY DEFINER); sem policy de INSERT.
DROP POLICY IF EXISTS audit_log_admin_read ON public.audit_log;
CREATE POLICY audit_log_admin_read ON public.audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role = 'admin' AND COALESCE(up.active,true)));

CREATE OR REPLACE FUNCTION public.log_action(p_action TEXT, p_entity TEXT DEFAULT NULL, p_entity_id TEXT DEFAULT NULL, p_detail TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  -- Só staff registra; se não for staff, ignora em silêncio (não trava a ação).
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)) THEN
    RETURN;
  END IF;
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.audit_log (actor_id, actor_email, action, entity, entity_id, detail)
    VALUES (auth.uid(), v_email, p_action, NULLIF(p_entity,''), NULLIF(p_entity_id,''), NULLIF(p_detail,''));
END; $$;
GRANT EXECUTE ON FUNCTION public.log_action(TEXT, TEXT, TEXT, TEXT) TO authenticated;

SELECT 'Audit log central pronto: audit_log + log_action (staff) + leitura admin.' AS resultado;


-- ▼▼▼ MIGRATION: 20260658_rbac_permissions.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Roadmap 2.3 (parte 2): RBAC granular + segregação de funções
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Modelo SEGURO por padrão (deny-overlay): user_profiles.permissions é um JSONB
-- opcional. AUSENTE/null = herda TUDO do papel (comportamento atual, zero
-- mudança). O admin pode NEGAR capacidades específicas setando a chave = false.
-- Uma capacidade só é negada quando explicitamente false.

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS permissions JSONB;

-- Retorna true a menos que a capacidade esteja explicitamente negada (false).
CREATE OR REPLACE FUNCTION public.my_permission(p_key TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(
    (SELECT (permissions->>p_key)::boolean FROM public.user_profiles WHERE id = auth.uid()),
    true);
$$;
GRANT EXECUTE ON FUNCTION public.my_permission(TEXT) TO authenticated;

-- Admin define as permissões (deny-overlay) de um usuário.
CREATE OR REPLACE FUNCTION public.admin_set_user_permissions(p_user_id UUID, p_permissions JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin' AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar permissões.';
  END IF;
  UPDATE public.user_profiles SET permissions = p_permissions WHERE id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_permissions(UUID, JSONB) TO authenticated;

-- Enforcement de exemplo (segregação de funções real): baixar/pagar fatura.
-- Mantém o comportamento atual; só bloqueia quem foi explicitamente negado.
CREATE OR REPLACE FUNCTION public.pay_invoice(p_invoice_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_orders UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active, true)) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;
  IF NOT public.my_permission('pay_invoice') THEN
    RAISE EXCEPTION 'Segregação de funções: seu usuário não pode baixar faturas.';
  END IF;
  UPDATE public.invoices SET status = 'paid', paid_date = CURRENT_DATE WHERE id = p_invoice_id;
  SELECT array_agg((l->>'order_id')::uuid) INTO v_orders
    FROM public.invoices i, jsonb_array_elements(i.lines) l WHERE i.id = p_invoice_id;
  IF v_orders IS NOT NULL THEN
    UPDATE public.revenues SET status = 'received', received_date = CURRENT_DATE
      WHERE order_id = ANY(v_orders) AND status IN ('receivable','overdue');
    UPDATE public.orders SET payment_status = 'paid' WHERE id = ANY(v_orders);
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.pay_invoice(UUID) TO authenticated;

-- admin_list_users passa a retornar as permissões (para a UI de Usuários).
-- DROP necessário: CREATE OR REPLACE não altera o tipo de retorno (nova coluna).
DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID, email TEXT, full_name TEXT, role TEXT, active BOOLEAN,
  driver_id UUID, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ, permissions JSONB
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores'; END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.role, p.active, p.driver_id, p.created_at, u.last_sign_in_at, p.permissions
    FROM public.user_profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    ORDER BY p.created_at ASC;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

SELECT 'RBAC granular pronto: user_profiles.permissions + my_permission/admin_set_user_permissions; SoD em pay_invoice.' AS resultado;


-- ▼▼▼ MIGRATION: 20260659_sod_enforcement.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Roadmap 2.3 (completar SoD server-side, cost-free)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Estende a segregação de funções (my_permission) para conciliação bancária e
-- oferta a parceiro, além do pay_invoice já feito. Deny-overlay: só bloqueia
-- quem foi explicitamente negado; comportamento padrão inalterado.

-- Conciliação bancária: exige a capacidade 'reconcile'.
CREATE OR REPLACE FUNCTION public.reconcile_bank_tx(p_tx_id UUID, p_type TEXT, p_target_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date   DATE;
  v_orders UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode conciliar lançamentos.';
  END IF;
  IF NOT public.my_permission('reconcile') THEN
    RAISE EXCEPTION 'Segregação de funções: seu usuário não pode conciliar.';
  END IF;
  SELECT posted_at INTO v_date FROM public.bank_transactions WHERE id = p_tx_id;
  IF v_date IS NULL THEN RAISE EXCEPTION 'Lançamento não encontrado.'; END IF;

  IF p_type = 'revenue' THEN
    UPDATE public.revenues SET status = 'received', received_date = v_date WHERE id = p_target_id;
  ELSIF p_type = 'expense' THEN
    UPDATE public.expenses SET status = 'paid', paid_date = v_date WHERE id = p_target_id;
  ELSIF p_type = 'invoice' THEN
    UPDATE public.invoices SET status = 'paid', paid_date = v_date WHERE id = p_target_id;
    SELECT array_agg((l->>'order_id')::uuid) INTO v_orders
      FROM public.invoices i, jsonb_array_elements(i.lines) l WHERE i.id = p_target_id;
    IF v_orders IS NOT NULL THEN
      UPDATE public.revenues SET status = 'received', received_date = v_date
        WHERE order_id = ANY(v_orders) AND status IN ('receivable','overdue');
      UPDATE public.orders SET payment_status = 'paid' WHERE id = ANY(v_orders);
    END IF;
  ELSE
    RAISE EXCEPTION 'Tipo inválido para conciliação: %', p_type;
  END IF;

  UPDATE public.bank_transactions
    SET status = 'matched', matched_type = p_type, matched_id = p_target_id, reconciled_at = now()
    WHERE id = p_tx_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.reconcile_bank_tx(UUID, TEXT, UUID) TO authenticated;

-- Oferta a parceiro: exige a capacidade 'offer_carrier'.
CREATE OR REPLACE FUNCTION public.admin_offer_order(p_order_id UUID, p_carrier_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','operator') AND COALESCE(active,true)) THEN
    RAISE EXCEPTION 'Apenas a equipe pode ofertar pedidos a parceiros.';
  END IF;
  IF NOT public.my_permission('offer_carrier') THEN
    RAISE EXCEPTION 'Segregação de funções: seu usuário não pode ofertar a parceiros.';
  END IF;
  UPDATE public.orders
    SET carrier_id = p_carrier_id, carrier_amount = p_amount,
        carrier_status = 'offered', carrier_offered_at = now(), carrier_responded_at = NULL
    WHERE id = p_order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_offer_order(UUID, UUID, NUMERIC) TO authenticated;

SELECT 'SoD estendida: reconcile_bank_tx (reconcile) e admin_offer_order (offer_carrier).' AS resultado;


-- ▼▼▼ MIGRATION: 20260660_client_errors.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Roadmap 3.7 (base): observabilidade de erros do front (cost-free)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Persiste erros de renderização do front (ErrorBoundary) para o admin ver, sem
-- depender de serviço externo (Sentry continua opcional). Best-effort: nunca
-- deve travar o app. Leitura só admin; inserção via RPC (qualquer autenticado).

CREATE TABLE IF NOT EXISTS public.client_errors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID,
  user_email TEXT,
  message    TEXT,
  stack      TEXT,
  url        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_errors_created ON public.client_errors(created_at DESC);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_errors_admin_read ON public.client_errors;
CREATE POLICY client_errors_admin_read ON public.client_errors FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role = 'admin' AND COALESCE(up.active,true)));

CREATE OR REPLACE FUNCTION public.log_client_error(p_message TEXT, p_stack TEXT DEFAULT NULL, p_url TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.client_errors (user_id, user_email, message, stack, url)
    VALUES (auth.uid(), v_email, LEFT(COALESCE(p_message,''), 1000), LEFT(COALESCE(p_stack,''), 6000), LEFT(COALESCE(p_url,''), 400));
END; $$;
GRANT EXECUTE ON FUNCTION public.log_client_error(TEXT, TEXT, TEXT) TO authenticated;

SELECT 'Observabilidade pronta: client_errors + log_client_error (leitura admin).' AS resultado;


-- ▼▼▼ MIGRATION: 20260661_public_order_authoritative.sql ▼▼▼

-- ============================================================
-- VELOX TMS — P02.2: frete autoritativo no pedido público
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Fecha a brecha: hoje o /agendar faz INSERT anônimo em orders com o
-- freight_value CALCULADO NO NAVEGADOR (forjável). Agora o pedido público entra
-- por uma RPC SECURITY DEFINER que:
--   • gera o protocolo no servidor (next_protocol);
--   • NÃO grava freight_value do cliente — guarda só a ESTIMATIVA em
--     freight_estimate; o freight_value fica NULL até a equipe precificar;
--   • decide o status pelo company_settings (não confia no status do cliente).
-- E a policy de INSERT anônimo direto em orders é REMOVIDA.
-- (A cobrança já é autoritativa em confirm_order — feito pela equipe.)

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS freight_estimate NUMERIC;

CREATE OR REPLACE FUNCTION public.create_public_order(p JSONB)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proto   TEXT;
  v_require BOOLEAN;
  v_status  TEXT;
  v_name    TEXT := NULLIF(p->>'client_name','');
BEGIN
  SELECT COALESCE(require_order_approval, false) INTO v_require FROM public.company_settings LIMIT 1;
  v_status := CASE WHEN v_require THEN 'awaiting_approval' ELSE 'new' END;
  v_proto := public.next_protocol();

  INSERT INTO public.orders (
    protocol, status,
    requester_name, requester_role,
    client_name, client_cpf_cnpj, client_phone, client_email, preferred_contact,
    freight_type, freight_value, freight_estimate,
    origin, collection_date, collection_date_desired, collection_time, collection_notes,
    recipients, total_volumes, total_weight_kg, total_declared_value,
    general_notes, freight_payer, transport_modal, payment_terms,
    payment_status, status_history
  ) VALUES (
    v_proto, v_status,
    NULLIF(p->>'requester_name',''), NULLIF(p->>'requester_role',''),
    v_name, NULLIF(p->>'client_cpf_cnpj',''), NULLIF(p->>'client_phone',''),
    NULLIF(p->>'client_email',''), NULLIF(p->>'preferred_contact',''),
    NULLIF(p->>'freight_type',''),
    NULL,                                             -- freight_value: autoritativo (equipe define)
    NULLIF(p->>'freight_estimate','')::numeric,       -- estimativa informativa do cliente
    COALESCE(p->'origin', '{}'::jsonb),
    NULLIF(p->>'collection_date','')::date, NULLIF(p->>'collection_date','')::date,
    NULLIF(p->>'collection_time',''), NULLIF(p->>'collection_notes',''),
    COALESCE(p->'recipients', '[]'::jsonb),
    NULLIF(p->>'total_volumes','')::int, NULLIF(p->>'total_weight_kg','')::numeric,
    NULLIF(p->>'total_declared_value','')::numeric,
    NULLIF(p->>'general_notes',''),
    COALESCE(NULLIF(p->>'freight_payer',''), 'cif'),
    COALESCE(NULLIF(p->>'transport_modal',''), 'road'),
    COALESCE(NULLIF(p->>'payment_terms',''), 'after_delivery'),
    'pending',
    jsonb_build_array(jsonb_build_object(
      'status', v_status, 'timestamp', now(), 'user', COALESCE(v_name, 'Site'),
      'note', 'Solicitação via site'
    ))
  );

  RETURN v_proto;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_public_order(JSONB) TO anon, authenticated;

-- Blindar: anon não insere mais direto em orders (só via create_public_order).
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "public_insert_order" ON public.orders;

SELECT 'P02.2 pronto: create_public_order (frete autoritativo) + anon sem INSERT direto.' AS resultado;


-- ▼▼▼ MIGRATION: 20260662_order_freight_breakdown.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 03.1: snapshot imutável do frete no pedido
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Problema: orders.freight_value é um único NUMERIC e o breakdown é recalculado
-- ao vivo a partir do JSON de precificação ATUAL. Editar a tabela de preços muda
-- silenciosamente a explicação de pedidos antigos — sem reconstituição/auditoria.
--
-- Solução (aditiva): guardar o breakdown COMPLETO no momento em que a equipe
-- precifica/confirma o pedido. A partir daí o "porquê" do valor fica congelado,
-- independente de mudanças futuras na tabela. Não altera o motor de cálculo.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS freight_breakdown JSONB;

COMMENT ON COLUMN public.orders.freight_breakdown IS
  'Snapshot imutável do cálculo de frete (saída de calculateFreightFull + metadados: fonte da tabela, data efetiva, quando/valor no snapshot). Congelado ao precificar/confirmar. Projeto 03.1.';

SELECT 'Projeto 03.1: orders.freight_breakdown pronto (snapshot de frete).' AS resultado;


-- ▼▼▼ MIGRATION: 20260663_tariff_governed.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 03.2: Tarifação & Contratos Governados
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Problema: preço vive em JSON solto (company_settings.pricing / .route_pricing /
-- clients.custom_pricing), sobrescrito no lugar — sem versão, vigência plena nem
-- auditoria de quem/quando/o-quê mudou.
--
-- Solução (aditiva): tarifa como ENTIDADE VERSIONADA.
--   • tariff_tables    — a tarifa nomeada por escopo (default | route:UF-UF | client:<id>).
--   • tariff_versions  — snapshots IMUTÁVEIS do payload (mesmo formato do JSON atual),
--                        com version_no, vigência, status e autor.
-- Publicar uma nova versão ARQUIVA a anterior (nunca sobrescreve) e registra em audit_log.
-- O motor de cálculo NÃO muda: continua recebendo um objeto `pricing` simples — só
-- que agora vindo de uma versão. Enquanto a migração do legado não cobre tudo, o
-- resolvedor devolve NULL e o chamador cai no JSON legado (fallback read-through).

-- ---------- tabelas ----------
CREATE TABLE IF NOT EXISTS public.tariff_tables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       TEXT NOT NULL CHECK (scope IN ('default','route','client')),
  scope_key   TEXT,                       -- NULL p/ default; 'SP-PR' p/ route; client id p/ client
  name        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Uma tarifa por (escopo, chave). COALESCE resolve o NULL do default.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tariff_tables_scope
  ON public.tariff_tables(scope, COALESCE(scope_key, ''));

CREATE TABLE IF NOT EXISTS public.tariff_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_table_id  UUID NOT NULL REFERENCES public.tariff_tables(id) ON DELETE CASCADE,
  version_no       INTEGER NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,   -- mesmo formato de company_settings.pricing
  valid_from       DATE,
  valid_until      DATE,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
  note             TEXT,
  created_by       UUID,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tariff_table_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_tariff_versions_table  ON public.tariff_versions(tariff_table_id, status);
CREATE INDEX IF NOT EXISTS idx_tariff_versions_valid  ON public.tariff_versions(valid_from, valid_until);

-- ---------- RLS: leitura staff; escrita só via RPC (SECURITY DEFINER) ----------
ALTER TABLE public.tariff_tables   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tariff_tables_staff_read ON public.tariff_tables;
CREATE POLICY tariff_tables_staff_read ON public.tariff_tables
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS tariff_versions_staff_read ON public.tariff_versions;
CREATE POLICY tariff_versions_staff_read ON public.tariff_versions
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- resolvedor: payload da versão vigente para a data (ou NULL → fallback) ----------
CREATE OR REPLACE FUNCTION public.resolve_tariff_payload(p_scope TEXT, p_scope_key TEXT, p_date DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- SECURITY DEFINER burla a RLS: exige staff explicitamente (não vaza tarifa a
  -- usuários do portal/cliente). Não-staff recebe NULL → chamador cai no fallback.
  SELECT v.payload
  FROM public.tariff_versions v
  JOIN public.tariff_tables t ON t.id = v.tariff_table_id
  WHERE public.is_staff()
    AND t.scope = p_scope
    AND COALESCE(t.scope_key, '') = COALESCE(p_scope_key, '')
    AND t.active
    AND v.status = 'active'
    AND (v.valid_from  IS NULL OR v.valid_from  <= COALESCE(p_date, CURRENT_DATE))
    AND (v.valid_until IS NULL OR v.valid_until >= COALESCE(p_date, CURRENT_DATE))
  ORDER BY v.version_no DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_tariff_payload(TEXT, TEXT, DATE) TO authenticated;

-- ---------- publicar nova versão (arquiva a anterior; nunca sobrescreve) ----------
CREATE OR REPLACE FUNCTION public.tariff_publish_version(
  p_scope TEXT, p_scope_key TEXT, p_name TEXT, p_payload JSONB,
  p_valid_from DATE DEFAULT NULL, p_valid_until DATE DEFAULT NULL, p_note TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table_id UUID;
  v_next     INTEGER;
  v_email    TEXT;
  v_version  UUID;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas equipe pode publicar tarifas'; END IF;
  IF p_scope NOT IN ('default','route','client') THEN RAISE EXCEPTION 'Escopo inválido: %', p_scope; END IF;

  -- Upsert da tarifa (escopo + chave)
  SELECT id INTO v_table_id FROM public.tariff_tables
    WHERE scope = p_scope AND COALESCE(scope_key,'') = COALESCE(p_scope_key,'');
  IF v_table_id IS NULL THEN
    INSERT INTO public.tariff_tables (scope, scope_key, name)
      VALUES (p_scope, NULLIF(p_scope_key,''), COALESCE(NULLIF(p_name,''), p_scope))
      RETURNING id INTO v_table_id;
  END IF;

  -- Próximo número de versão
  SELECT COALESCE(MAX(version_no), 0) + 1 INTO v_next
    FROM public.tariff_versions WHERE tariff_table_id = v_table_id;

  -- Arquiva as versões ativas anteriores desta tarifa (a nova passa a ser a vigente)
  UPDATE public.tariff_versions SET status = 'archived'
    WHERE tariff_table_id = v_table_id AND status = 'active';

  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();

  INSERT INTO public.tariff_versions
    (tariff_table_id, version_no, payload, valid_from, valid_until, status, note, created_by, created_by_email)
    VALUES (v_table_id, v_next, COALESCE(p_payload,'{}'::jsonb), p_valid_from, p_valid_until,
            'active', NULLIF(p_note,''), auth.uid(), v_email)
    RETURNING id INTO v_version;

  -- Trilha de auditoria (mudança de tarifa)
  PERFORM public.log_action('Publicou tarifa', 'tariff',
    p_scope || COALESCE(':' || p_scope_key, ''), 'v' || v_next);

  RETURN jsonb_build_object('tariff_table_id', v_table_id, 'version_id', v_version, 'version_no', v_next);
END; $$;
GRANT EXECUTE ON FUNCTION public.tariff_publish_version(TEXT, TEXT, TEXT, JSONB, DATE, DATE, TEXT) TO authenticated;

SELECT 'Projeto 03.2: tariff_tables + tariff_versions + resolve_tariff_payload + tariff_publish_version prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260664_tariff_seed_legacy.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 03.3: migração do JSON legado → tarifas versionadas
-- Idempotente (só semeia o que ainda não existe). Rode DEPOIS de 20260663.
-- ============================================================
-- Semeia tariff_tables/tariff_versions a partir das 3 fontes JSON atuais:
--   • company_settings.pricing            → tarifa 'default'
--   • company_settings.route_pricing[]    → tarifa 'route:<UF>-<UF>' por corredor
--   • clients.custom_pricing (não vazio)  → tarifa 'client:<id>'
-- Os JSONs legados são MANTIDOS (fallback read-through). INSERT direto (não usa
-- tariff_publish_version, que exige is_staff/auth.uid — nulo no SQL editor).

DO $$
DECLARE
  v_settings   company_settings%ROWTYPE;
  v_table_id   UUID;
  v_route      JSONB;
  v_key        TEXT;
  v_client     RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.company_settings LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'Sem company_settings — nada a semear.';
    RETURN;
  END IF;

  -- ---------- default ----------
  IF v_settings.pricing IS NOT NULL AND v_settings.pricing <> '{}'::jsonb THEN
    SELECT id INTO v_table_id FROM public.tariff_tables WHERE scope = 'default';
    IF v_table_id IS NULL THEN
      INSERT INTO public.tariff_tables (scope, scope_key, name)
        VALUES ('default', NULL, 'Tabela padrão') RETURNING id INTO v_table_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tariff_versions WHERE tariff_table_id = v_table_id) THEN
      INSERT INTO public.tariff_versions (tariff_table_id, version_no, payload, status, note)
        VALUES (v_table_id, 1, v_settings.pricing, 'active', 'Migração do JSON legado (default)');
    END IF;
  END IF;

  -- ---------- corredores ----------
  FOR v_route IN SELECT * FROM jsonb_array_elements(COALESCE(v_settings.route_pricing, '[]'::jsonb))
  LOOP
    IF (v_route->>'origin_state') IS NULL OR (v_route->>'dest_state') IS NULL THEN
      CONTINUE;
    END IF;
    v_key := (v_route->>'origin_state') || '-' || (v_route->>'dest_state');

    SELECT id INTO v_table_id FROM public.tariff_tables
      WHERE scope = 'route' AND COALESCE(scope_key,'') = v_key;
    IF v_table_id IS NULL THEN
      INSERT INTO public.tariff_tables (scope, scope_key, name)
        VALUES ('route', v_key, 'Corredor ' || (v_route->>'origin_state') || '→' || (v_route->>'dest_state'))
        RETURNING id INTO v_table_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tariff_versions WHERE tariff_table_id = v_table_id) THEN
      INSERT INTO public.tariff_versions
        (tariff_table_id, version_no, payload, valid_from, valid_until, status, note)
        VALUES (v_table_id, 1, v_route,
                NULLIF(v_route->>'valid_from','')::date, NULLIF(v_route->>'valid_until','')::date,
                'active', 'Migração do JSON legado (corredor)');
    END IF;
  END LOOP;

  -- ---------- clientes com tabela negociada ----------
  FOR v_client IN
    SELECT id, company_name, custom_pricing FROM public.clients
    WHERE custom_pricing IS NOT NULL AND custom_pricing <> '{}'::jsonb
  LOOP
    SELECT id INTO v_table_id FROM public.tariff_tables
      WHERE scope = 'client' AND COALESCE(scope_key,'') = v_client.id::text;
    IF v_table_id IS NULL THEN
      INSERT INTO public.tariff_tables (scope, scope_key, name)
        VALUES ('client', v_client.id::text, 'Contrato ' || COALESCE(v_client.company_name, v_client.id::text))
        RETURNING id INTO v_table_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tariff_versions WHERE tariff_table_id = v_table_id) THEN
      INSERT INTO public.tariff_versions (tariff_table_id, version_no, payload, status, note)
        VALUES (v_table_id, 1, v_client.custom_pricing, 'active', 'Migração do JSON legado (cliente)');
    END IF;
  END LOOP;
END $$;

SELECT 'Projeto 03.3: JSON legado migrado para tarifas versionadas (default/route/client).' AS resultado,
       (SELECT count(*) FROM public.tariff_tables)   AS tarifas,
       (SELECT count(*) FROM public.tariff_versions) AS versoes;


-- ▼▼▼ MIGRATION: 20260665_settlement_ledger.sql ▼▼▼

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


-- ▼▼▼ MIGRATION: 20260666_settlement_backfill.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 04.3: backfill do razão + reconciliação de relatórios
-- Idempotente. Rode DEPOIS de 20260665.
-- ============================================================
-- Gera um evento de liquidação histórico para cada receita/despesa JÁ baixada,
-- para que os relatórios (que somam por status) reconciliem o passado contra o
-- razão. INSERT direto (não usa settle: auth.uid() é nulo no SQL editor).
-- Idempotente: só insere onde ainda não há liquidação ativa para a conta.

INSERT INTO public.settlements (kind, target_type, target_id, amount, settled_date, source, note)
SELECT 'receive', 'revenue', r.id, r.amount,
       COALESCE(r.received_date, r.due_date, CURRENT_DATE), 'backfill', 'Backfill P04.3'
FROM public.revenues r
WHERE r.status = 'received'
  AND NOT EXISTS (
    SELECT 1 FROM public.settlements s
    WHERE s.target_type = 'revenue' AND s.target_id = r.id
      AND s.reversal_of IS NULL AND s.reversed_at IS NULL
  );

INSERT INTO public.settlements (kind, target_type, target_id, amount, settled_date, source, note)
SELECT 'pay', 'expense', e.id, e.amount,
       COALESCE(e.paid_date, e.date, CURRENT_DATE), 'backfill', 'Backfill P04.3'
FROM public.expenses e
WHERE e.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.settlements s
    WHERE s.target_type = 'expense' AND s.target_id = e.id
      AND s.reversal_of IS NULL AND s.reversed_at IS NULL
  );

-- ---------- reconciliação: relatório (status) × razão (settlements) ----------
-- security_invoker: respeita a RLS do chamador (staff). Diferença deve ser 0.
CREATE OR REPLACE VIEW public.v_ledger_reconciliation
WITH (security_invoker = true) AS
  SELECT 'receitas_recebidas'::text AS dimensao,
         (SELECT COALESCE(sum(amount),0) FROM public.revenues   WHERE status = 'received') AS status_total,
         (SELECT COALESCE(sum(amount),0) FROM public.settlements WHERE target_type = 'revenue') AS ledger_total,
         (SELECT COALESCE(sum(amount),0) FROM public.revenues   WHERE status = 'received')
       - (SELECT COALESCE(sum(amount),0) FROM public.settlements WHERE target_type = 'revenue') AS diferenca
  UNION ALL
  SELECT 'despesas_pagas'::text,
         (SELECT COALESCE(sum(amount),0) FROM public.expenses    WHERE status = 'paid'),
         (SELECT COALESCE(sum(amount),0) FROM public.settlements WHERE target_type = 'expense'),
         (SELECT COALESCE(sum(amount),0) FROM public.expenses    WHERE status = 'paid')
       - (SELECT COALESCE(sum(amount),0) FROM public.settlements WHERE target_type = 'expense');

GRANT SELECT ON public.v_ledger_reconciliation TO authenticated;

SELECT 'Projeto 04.3: backfill do razão + view v_ledger_reconciliation prontos.' AS resultado,
       (SELECT count(*) FROM public.settlements WHERE source = 'backfill') AS eventos_backfill;


-- ▼▼▼ MIGRATION: 20260667_domain_events.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 05.1: Outbox / event bus (domain_events)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Hoje as transições-chave são escritas diretas com efeitos colaterais síncronos
-- e inline (alertas espalhados, recálculos no cliente). Não há log de eventos.
--
-- Solução (aditiva): `domain_events` é o OUTBOX append-only. A emissão é feita por
-- TRIGGERS nas tabelas-chave — captura toda transição (via RPC ou update direto)
-- SEM reescrever as RPCs (confirm_order/settle/etc.). Um evento é só um INSERT:
-- zero mudança de comportamento. Consumidores (P05.3) leem processed_at IS NULL.

CREATE TABLE IF NOT EXISTS public.domain_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL,               -- ex: 'order.status_changed', 'settlement.created'
  entity       TEXT NOT NULL,               -- 'order' | 'settlement' | 'incident' | 'transfer'
  entity_id    TEXT,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id     UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ                  -- NULL = ainda não consumido
);
CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed ON public.domain_events(created_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_domain_events_entity      ON public.domain_events(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_domain_events_type        ON public.domain_events(type, created_at DESC);

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
-- Leitura: staff. Escrita: só via trigger/RPC definer — sem policy de INSERT.
DROP POLICY IF EXISTS domain_events_staff_read ON public.domain_events;
CREATE POLICY domain_events_staff_read ON public.domain_events
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- inserter interno (incondicional; usado por triggers e por emit_event) ----------
CREATE OR REPLACE FUNCTION public.domain_event_write(p_type TEXT, p_entity TEXT, p_entity_id TEXT, p_payload JSONB, p_actor UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.domain_events (type, entity, entity_id, payload, actor_id)
    VALUES (p_type, p_entity, p_entity_id, COALESCE(p_payload,'{}'::jsonb), p_actor)
    RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
-- Interno: nunca chamável direto por clientes (triggers rodam como dono).
REVOKE ALL ON FUNCTION public.domain_event_write(TEXT, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;

-- ---------- emissão manual (staff) ----------
CREATE OR REPLACE FUNCTION public.emit_event(p_type TEXT, p_entity TEXT, p_entity_id TEXT DEFAULT NULL, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode emitir eventos.'; END IF;
  RETURN public.domain_event_write(p_type, p_entity, p_entity_id, p_payload, auth.uid());
END; $$;
GRANT EXECUTE ON FUNCTION public.emit_event(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================================
-- TRIGGERS — emissão automática nas transições-chave
-- ============================================================

-- Pedidos: criação + mudança de status
CREATE OR REPLACE FUNCTION public.tg_orders_events() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.domain_event_write('order.created', 'order', NEW.id::text,
      jsonb_build_object('protocol', NEW.protocol, 'status', NEW.status), auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.domain_event_write('order.status_changed', 'order', NEW.id::text,
      jsonb_build_object('protocol', NEW.protocol, 'from', OLD.status, 'to', NEW.status), auth.uid());
  END IF;
  RETURN NULL; -- AFTER trigger
END; $$;
DROP TRIGGER IF EXISTS trg_orders_events ON public.orders;
CREATE TRIGGER trg_orders_events AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_orders_events();

-- Liquidações (P04): criação e estorno
CREATE OR REPLACE FUNCTION public.tg_settlements_events() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.domain_event_write(
    CASE WHEN NEW.reversal_of IS NULL THEN 'settlement.created' ELSE 'settlement.reversed' END,
    'settlement', NEW.id::text,
    jsonb_build_object('target_type', NEW.target_type, 'target_id', NEW.target_id, 'amount', NEW.amount, 'source', NEW.source),
    auth.uid());
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_settlements_events ON public.settlements;
CREATE TRIGGER trg_settlements_events AFTER INSERT ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.tg_settlements_events();

-- Ocorrências: abertura + resolução
CREATE OR REPLACE FUNCTION public.tg_incidents_events() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.domain_event_write('incident.opened', 'incident', NEW.id::text,
      jsonb_build_object('type', NEW.type, 'status', NEW.status), auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'resolved' THEN
    PERFORM public.domain_event_write('incident.resolved', 'incident', NEW.id::text,
      jsonb_build_object('type', NEW.type), auth.uid());
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_incidents_events ON public.incidents;
CREATE TRIGGER trg_incidents_events AFTER INSERT OR UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.tg_incidents_events();

-- Transferências (cross-docking): mudança de status
CREATE OR REPLACE FUNCTION public.tg_transfers_events() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.domain_event_write('transfer.status_changed', 'transfer', NEW.id::text,
      jsonb_build_object('protocol', NEW.protocol, 'from', OLD.status, 'to', NEW.status), auth.uid());
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_transfers_events ON public.transfers;
CREATE TRIGGER trg_transfers_events AFTER UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.tg_transfers_events();

SELECT 'Projeto 05.1: domain_events + emit_event + triggers (orders/settlements/incidents/transfers).' AS resultado;


-- ▼▼▼ MIGRATION: 20260668_realtime_publication.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 05.2: Realtime (substituir polling)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Adiciona as tabelas-chave à publicação `supabase_realtime` para que o frontend
-- assine postgres_changes e invalide o cache (em vez de refetchInterval curto).
-- Tolerante: se a publicação não existir (ex.: CI sem a plataforma), vira no-op;
-- idempotente: não readiciona tabela já publicada. A RLS de cada tabela continua
-- valendo no realtime (cada usuário só recebe o que pode ler).

DO $$
DECLARE t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime ausente — nada a fazer (ambiente sem Realtime).';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['orders','trips','alerts','incidents','domain_events'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

SELECT 'Projeto 05.2: tabelas-chave publicadas no realtime (orders/trips/alerts/incidents/domain_events).' AS resultado;


-- ▼▼▼ MIGRATION: 20260669_jobs_scheduler.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 05.3: Jobs/agendador + consumidor assíncrono
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Primeiro consumidor assíncrono em produção: varredura de vencidos (sweep_overdue)
-- roda fora da requisição do usuário — hoje "vencido" só é inferido ad-hoc no
-- cliente. run_due_jobs() é o despachante (chamado pelo pg_cron OU manualmente).
-- job_runs registra cada execução (observabilidade). Agendamento pg_cron é
-- TOLERANTE: se a extensão não existir (ex.: CI), vira no-op + aviso.

-- ---------- log de execuções (observabilidade) ----------
CREATE TABLE IF NOT EXISTS public.job_runs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job       TEXT NOT NULL,
  ran_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  result    JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_job_runs_ran ON public.job_runs(ran_at DESC);
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_runs_staff_read ON public.job_runs;
CREATE POLICY job_runs_staff_read ON public.job_runs FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- consumidor: varredura de vencidos ----------
-- Marca receitas 'receivable' vencidas como 'overdue' (idempotente; só por data,
-- sem tocar valores) e emite um evento-resumo. Retorna quantas mudaram.
CREATE OR REPLACE FUNCTION public.sweep_overdue()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_n INTEGER;
BEGIN
  UPDATE public.revenues SET status = 'overdue'
    WHERE status = 'receivable' AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n > 0 THEN
    PERFORM public.domain_event_write('maintenance.overdue_swept', 'revenue', NULL,
      jsonb_build_object('marcadas', v_n), NULL);
  END IF;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.sweep_overdue() FROM PUBLIC;

-- ---------- despachante dos jobs agendados ----------
-- Chamado pelo pg_cron (auth.uid() nulo) OU manualmente por staff (RPC).
CREATE OR REPLACE FUNCTION public.run_due_jobs()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_overdue INTEGER; v_result JSONB;
BEGIN
  -- cron roda como postgres (sem auth.uid); staff também pode disparar manualmente.
  IF auth.uid() IS NOT NULL AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Apenas a equipe pode executar os jobs.';
  END IF;
  v_overdue := public.sweep_overdue();
  v_result  := jsonb_build_object('sweep_overdue', v_overdue, 'ran_at', now());
  INSERT INTO public.job_runs (job, result) VALUES ('run_due_jobs', v_result);
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.run_due_jobs() TO authenticated;

-- ---------- agendamento via pg_cron (TOLERANTE) ----------
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- idempotente: remove o agendamento anterior se existir, então reagenda
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'velox-daily-jobs') THEN
      PERFORM cron.unschedule('velox-daily-jobs');
    END IF;
    PERFORM cron.schedule('velox-daily-jobs', '0 6 * * *', 'SELECT public.run_due_jobs();');
    RAISE NOTICE 'pg_cron: job diário "velox-daily-jobs" agendado (06:00 UTC).';
  ELSE
    RAISE NOTICE 'pg_cron ausente — habilite a extensão no painel e reexecute, ou chame run_due_jobs() manualmente.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Não foi possível agendar via pg_cron (%). Use run_due_jobs() manual.', SQLERRM;
END $do$;

SELECT 'Projeto 05.3: jobs (sweep_overdue/run_due_jobs) + job_runs + agendamento pg_cron tolerante.' AS resultado;


-- ▼▼▼ MIGRATION: 20260670_automation.sql ▼▼▼

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


-- ▼▼▼ MIGRATION: 20260671_notifications.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 06.5: Motor de notificações (multicanal)
-- Idempotente. Rode DEPOIS de 20260670.
-- ============================================================
-- Motor guiado por eventos: consome domain_events → aplica regras → enfileira
-- notificações por CANAL → despacha. Canal in-app entregue já (grava um alerta,
-- que o sino lê). Canal externo (e-mail) fica como ADAPTADOR pronto: sem provedor
-- configurado, o dispatch marca 'skipped' (liga-se quando o provedor for escolhido).

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID REFERENCES public.domain_events(id),
  channel    TEXT NOT NULL CHECK (channel IN ('inapp','email','whatsapp')),
  recipient  TEXT,
  subject    TEXT,
  body       TEXT,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','failed')),
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notifications_pending ON public.notifications(created_at) WHERE status = 'pending';

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_staff_read ON public.notifications;
CREATE POLICY notifications_staff_read ON public.notifications
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- regras: eventos → notificações enfileiradas ----------
CREATE OR REPLACE FUNCTION public.notify_from_events()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD; v_email TEXT; v_n INTEGER := 0;
BEGIN
  FOR e IN SELECT * FROM public.domain_events WHERE processed_at IS NULL ORDER BY created_at LOOP
    IF e.type = 'incident.sla_breached' THEN
      INSERT INTO public.notifications (event_id, channel, recipient, subject, body)
        VALUES (e.id, 'inapp', 'staff', 'SLA estourado',
                'Ocorrência ' || COALESCE(e.payload->>'type','?') || ' (pedido ' || COALESCE(e.payload->>'protocol','?') || ') estourou o SLA.');
      v_n := v_n + 1;

    ELSIF e.type = 'invoice.created' THEN
      INSERT INTO public.notifications (event_id, channel, recipient, subject, body)
        VALUES (e.id, 'inapp', 'staff', 'Fatura gerada',
                'Fatura ' || COALESCE(e.payload->>'number','') || ' — R$ ' || COALESCE(e.payload->>'total','0'));
      -- canal externo (e-mail ao cliente): enfileira; dispatch decide o envio.
      SELECT email INTO v_email FROM public.clients WHERE id = (e.payload->>'client_id')::uuid;
      IF v_email IS NOT NULL AND v_email <> '' THEN
        INSERT INTO public.notifications (event_id, channel, recipient, subject, body)
          VALUES (e.id, 'email', v_email, 'Sua fatura Velox',
                  'Fatura ' || COALESCE(e.payload->>'number','') || ' no valor de R$ ' || COALESCE(e.payload->>'total','0') || '.');
      END IF;
      v_n := v_n + 1;
    END IF;

    -- Marca o evento consumido (único consumidor por ora).
    UPDATE public.domain_events SET processed_at = now() WHERE id = e.id;
  END LOOP;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.notify_from_events() FROM PUBLIC;

-- ---------- despachante multicanal ----------
-- in-app → grava alerta (o sino lê). email/whatsapp → sem provedor: 'skipped'
-- (adaptador externo pronto para plugar quando o provedor for definido).
CREATE OR REPLACE FUNCTION public.dispatch_notifications()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n RECORD; v_n INTEGER := 0;
BEGIN
  FOR n IN SELECT * FROM public.notifications WHERE status = 'pending' ORDER BY created_at LOOP
    IF n.channel = 'inapp' THEN
      INSERT INTO public.alerts (type, level, message, reference_type, read, resolved)
        VALUES ('notification', 'warning', COALESCE(n.subject || ' — ', '') || COALESCE(n.body,''), 'notification', false, false);
      UPDATE public.notifications SET status = 'sent', sent_at = now() WHERE id = n.id;
      v_n := v_n + 1;
    ELSE
      -- e-mail/whatsapp: provedor externo ainda não configurado (adiado).
      UPDATE public.notifications SET status = 'skipped', error = 'canal externo pendente de provedor', sent_at = now() WHERE id = n.id;
    END IF;
  END LOOP;
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.dispatch_notifications() FROM PUBLIC;

-- ---------- despachante final: sweeps + notificações ----------
CREATE OR REPLACE FUNCTION public.run_due_jobs()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Apenas a equipe pode executar os jobs.';
  END IF;
  v_result := jsonb_build_object(
    'sweep_overdue',       public.sweep_overdue(),
    'run_billing_cycle',   public.run_billing_cycle(),
    'sweep_carrier',       public.sweep_carrier_settlements(),
    'auto_reconcile',      public.auto_reconcile(),
    'sweep_incident_sla',  public.sweep_incident_sla(),
    'notify_from_events',  public.notify_from_events(),
    'dispatch_notifications', public.dispatch_notifications(),
    'ran_at',              now()
  );
  INSERT INTO public.job_runs (job, result) VALUES ('run_due_jobs', v_result);
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.run_due_jobs() TO authenticated;

SELECT 'Projeto 06.5: motor de notificações (notifications + notify_from_events + dispatch) — in-app ativo, externo pluggable.' AS resultado;


-- ▼▼▼ MIGRATION: 20260672_authz_policy.sql ▼▼▼

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


-- ▼▼▼ MIGRATION: 20260673_mfa_reset.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 07.3: Recuperação de MFA (reset por admin, auditado)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Pré-requisito do projeto: se o usuário perder o app autenticador, um ADMIN
-- redefine o 2FA. O SPA só tem a anon key (sem Admin API), então usamos uma
-- função SECURITY DEFINER (dona = postgres) que apaga os fatores em
-- auth.mfa_factors diretamente — sem service_role/edge function. Auditado.

CREATE OR REPLACE FUNCTION public.admin_reset_mfa(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_n INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores podem redefinir o 2FA.'; END IF;
  DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM public.log_action('Redefiniu 2FA', 'user', p_user_id::text, v_n || ' fator(es) removido(s)');
  RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.admin_reset_mfa(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_mfa(UUID) TO authenticated;

SELECT 'Projeto 07.3: admin_reset_mfa pronto (reset de 2FA por admin, auditado).' AS resultado;


-- ▼▼▼ MIGRATION: 20260674_documents.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 08.1: Serviço de Documentos (registro + storage + fila)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Hoje os PDFs são gerados no cliente (jsPDF) e só baixados — nada é arquivado
-- nem gerado no servidor. Aqui criamos o REGISTRO/fila (documents) + o bucket
-- privado 'documents'. A Edge Function render-documents (P08.3) consome a fila,
-- renderiza no servidor e grava o arquivo, marcando 'ready'. Lote assíncrono.

CREATE TABLE IF NOT EXISTS public.documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type               TEXT NOT NULL CHECK (type IN ('invoice','receipt','shipment','trip_manifest','transfer_manifest','labels')),
  entity_type        TEXT NOT NULL,        -- 'order' | 'invoice' | 'trip' | 'transfer'
  entity_id          UUID NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','error')),
  storage_path       TEXT,                 -- caminho no bucket 'documents' quando pronto
  batch_id           UUID,                 -- agrupa uma geração em lote
  title              TEXT,
  error              TEXT,
  requested_by       UUID,
  requested_by_email TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_documents_pending ON public.documents(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_documents_entity  ON public.documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_batch   ON public.documents(batch_id) WHERE batch_id IS NOT NULL;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_staff_read ON public.documents;
CREATE POLICY documents_staff_read ON public.documents
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- bucket privado + policies (staff) ----------
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_bucket_staff" ON storage.objects;
CREATE POLICY "documents_bucket_staff" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.is_staff())
  WITH CHECK (bucket_id = 'documents' AND public.is_staff());

-- ---------- enfileirar (individual) ----------
CREATE OR REPLACE FUNCTION public.request_document(p_type TEXT, p_entity_type TEXT, p_entity_id UUID, p_title TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_email TEXT;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode gerar documentos.'; END IF;
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.documents (type, entity_type, entity_id, title, requested_by, requested_by_email)
    VALUES (p_type, p_entity_type, p_entity_id, NULLIF(btrim(p_title),''), auth.uid(), v_email)
    RETURNING id INTO v_id;
  PERFORM public.domain_event_write('document.requested', 'document', v_id::text,
    jsonb_build_object('type', p_type, 'entity_type', p_entity_type, 'entity_id', p_entity_id), auth.uid());
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.request_document(TEXT, TEXT, UUID, TEXT) TO authenticated;

-- ---------- enfileirar (lote) ----------
CREATE OR REPLACE FUNCTION public.request_documents_batch(p_type TEXT, p_entity_type TEXT, p_entity_ids UUID[])
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_batch UUID := gen_random_uuid(); v_email TEXT; v_id UUID; v_n INTEGER := 0;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode gerar documentos.'; END IF;
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  FOREACH v_id IN ARRAY p_entity_ids LOOP
    INSERT INTO public.documents (type, entity_type, entity_id, batch_id, requested_by, requested_by_email)
      VALUES (p_type, p_entity_type, v_id, v_batch, auth.uid(), v_email);
    v_n := v_n + 1;
  END LOOP;
  PERFORM public.domain_event_write('document.batch_requested', 'document', v_batch::text,
    jsonb_build_object('type', p_type, 'count', v_n), auth.uid());
  RETURN v_n;
END; $$;
GRANT EXECUTE ON FUNCTION public.request_documents_batch(TEXT, TEXT, UUID[]) TO authenticated;

-- ---------- realtime (status ao vivo da fila) — tolerante ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
  END IF;
END $$;

SELECT 'Projeto 08.1: documents (fila) + bucket privado + request_document/batch + realtime prontos.' AS resultado;


-- ▼▼▼ MIGRATION: 20260675_fiscal.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto 09: Motor Fiscal Eletrônico (CT-e/MDF-e) — arquitetura
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Constrói a ARQUITETURA fiscal provider-pluggable. A autorização REAL na SEFAZ
-- depende de PROVEDOR FISCAL (pago) + CERTIFICADO digital — ainda não decididos.
-- Sem provedor, o documento fica em 'provider_pending' (não autoriza nada).
-- Nada aqui emite documento fiscal de verdade. O campo manual orders.cte_number
-- (número colado à mão) é preservado.

-- ---------- config fiscal da empresa ----------
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS ie TEXT;                 -- inscrição estadual
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS crt TEXT;                -- regime tributário (1/2/3)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS rntrc TEXT;              -- registro ANTT (transportador)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS fiscal_environment TEXT DEFAULT 'homologacao' CHECK (fiscal_environment IN ('homologacao','producao'));
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS fiscal_provider TEXT;    -- nome do provedor (NULL/'' = sem provedor)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS cte_series TEXT DEFAULT '1';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS certificate_ref TEXT;    -- referência ao certificado (NUNCA o certificado em si)

-- ---------- documentos fiscais ----------
CREATE TABLE IF NOT EXISTS public.fiscal_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               TEXT NOT NULL CHECK (kind IN ('cte','mdfe')),
  entity_type        TEXT NOT NULL,        -- 'order' (CT-e) | 'trip' (MDF-e)
  entity_id          UUID NOT NULL,
  environment        TEXT NOT NULL DEFAULT 'homologacao' CHECK (environment IN ('homologacao','producao')),
  -- draft: rascunho · provider_pending: sem provedor · pending: aguardando SEFAZ ·
  -- authorized/rejected: resposta · contingency: emissão offline · cancelled: cancelado
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','provider_pending','pending','authorized','rejected','contingency','cancelled')),
  provider           TEXT,
  series             TEXT,
  number             TEXT,                 -- só após autorização (numeração fiscal é sequencial/sem gaps)
  access_key         TEXT,                 -- chave de 44 dígitos (após autorização)
  protocol           TEXT,                 -- protocolo de autorização SEFAZ
  xml_path           TEXT,                 -- caminho no bucket 'documents'
  dacte_path         TEXT,
  payload            JSONB,                -- snapshot do payload montado
  error              TEXT,
  attempts           INTEGER NOT NULL DEFAULT 0,
  requested_by       UUID,
  requested_by_email TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at      TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fiscal_entity  ON public.fiscal_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_pending ON public.fiscal_documents(created_at) WHERE status IN ('pending','provider_pending');
CREATE INDEX IF NOT EXISTS idx_fiscal_key     ON public.fiscal_documents(access_key) WHERE access_key IS NOT NULL;

ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fiscal_documents_staff_read ON public.fiscal_documents;
CREATE POLICY fiscal_documents_staff_read ON public.fiscal_documents
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- solicitar emissão (enfileira; NÃO autoriza) ----------
-- Sem provedor configurado → 'provider_pending'. Com provedor → 'pending' (a
-- Edge Function/provedor processa). Numeração/chave só existem após autorização.
CREATE OR REPLACE FUNCTION public.fiscal_request(p_kind TEXT, p_entity_type TEXT, p_entity_id UUID, p_payload JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_email TEXT; v_provider TEXT; v_env TEXT; v_series TEXT; v_status TEXT;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode emitir documentos fiscais.'; END IF;
  SELECT NULLIF(btrim(fiscal_provider),''), COALESCE(fiscal_environment,'homologacao'), COALESCE(cte_series,'1')
    INTO v_provider, v_env, v_series FROM public.company_settings LIMIT 1;
  v_status := CASE WHEN v_provider IS NULL THEN 'provider_pending' ELSE 'pending' END;

  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.fiscal_documents (kind, entity_type, entity_id, environment, status, provider, series, payload, requested_by, requested_by_email)
    VALUES (p_kind, p_entity_type, p_entity_id, v_env, v_status, v_provider, v_series, p_payload, auth.uid(), v_email)
    RETURNING id INTO v_id;
  PERFORM public.domain_event_write('fiscal.requested', 'fiscal', v_id::text,
    jsonb_build_object('kind', p_kind, 'status', v_status, 'environment', v_env), auth.uid());
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.fiscal_request(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- ---------- contingência (emissão offline) ----------
CREATE OR REPLACE FUNCTION public.fiscal_mark_contingency(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode acionar contingência.'; END IF;
  UPDATE public.fiscal_documents SET status = 'contingency', updated_at = now()
    WHERE id = p_id AND status IN ('pending','provider_pending','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento não está em estado que permita contingência.'; END IF;
  PERFORM public.domain_event_write('fiscal.contingency', 'fiscal', p_id::text, NULL, auth.uid());
  PERFORM public.log_action('Acionou contingência fiscal', 'fiscal', p_id::text, NULL);
END; $$;
GRANT EXECUTE ON FUNCTION public.fiscal_mark_contingency(UUID) TO authenticated;

-- ---------- cancelar ----------
CREATE OR REPLACE FUNCTION public.fiscal_cancel(p_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode cancelar documentos fiscais.'; END IF;
  -- (Com provedor, aqui entraria a chamada de cancelamento na SEFAZ.)
  UPDATE public.fiscal_documents SET status = 'cancelled', error = NULLIF(btrim(p_reason),''), updated_at = now()
    WHERE id = p_id AND status IN ('authorized','contingency','provider_pending','pending','draft','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento não encontrado ou já cancelado.'; END IF;
  PERFORM public.domain_event_write('fiscal.cancelled', 'fiscal', p_id::text, jsonb_build_object('reason', p_reason), auth.uid());
  PERFORM public.log_action('Cancelou documento fiscal', 'fiscal', p_id::text, p_reason);
END; $$;
GRANT EXECUTE ON FUNCTION public.fiscal_cancel(UUID, TEXT) TO authenticated;

-- ---------- realtime (status ao vivo) — tolerante ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fiscal_documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_documents;
  END IF;
END $$;

SELECT 'Projeto 09: fiscal_documents + config fiscal + fiscal_request/contingency/cancel (provider-pluggable).' AS resultado;


-- ▼▼▼ MIGRATION: 20260676_analytics_views.sql ▼▼▼

-- ============================================================
-- VELOX TMS — Projeto PA-01: agregações analíticas no servidor (views)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Move para o banco as agregações que hoje o cliente calcula varrendo listas de
-- 500–1000 registros (corredor, cliente, financeiro mensal). O front consome
-- estas views com FALLBACK ao cálculo cliente (utils/analytics), então nada
-- quebra antes de aplicar. security_invoker=true → respeita a RLS do chamador
-- (staff). Não inclui KPIs baseados em status_history/SLA (ficam no cliente).

-- Corredor (origem UF → destino UF): frete/peso/R$-por-kg dos pedidos não cancelados.
CREATE OR REPLACE VIEW public.v_lane_analysis WITH (security_invoker = true) AS
  SELECT COALESCE(o.origin->>'state', '?') || ' → ' || COALESCE(o.recipients->0->>'state', '?') AS lane,
         count(*)::int AS orders,
         COALESCE(sum(o.freight_value), 0) AS freight,
         COALESCE(sum(o.total_weight_kg), 0) AS weight_kg,
         CASE WHEN COALESCE(sum(o.total_weight_kg), 0) > 0
              THEN sum(o.freight_value) / sum(o.total_weight_kg) ELSE 0 END AS avg_per_kg
  FROM public.orders o
  WHERE o.status <> 'cancelled'
  GROUP BY 1
  ORDER BY freight DESC;

-- Cliente: pedidos/frete/ticket médio dos pedidos não cancelados.
CREATE OR REPLACE VIEW public.v_client_analysis WITH (security_invoker = true) AS
  SELECT o.client_id,
         COALESCE(o.client_name, '—') AS client_name,
         count(*)::int AS orders,
         COALESCE(sum(o.freight_value), 0) AS freight,
         CASE WHEN count(*) > 0 THEN sum(o.freight_value) / count(*) ELSE 0 END AS avg_ticket
  FROM public.orders o
  WHERE o.status <> 'cancelled'
  GROUP BY o.client_id, o.client_name
  ORDER BY freight DESC;

-- Financeiro por mês (últimos 12): recebido (caixa) × pago (caixa).
CREATE OR REPLACE VIEW public.v_monthly_financials WITH (security_invoker = true) AS
  SELECT to_char(d.month, 'YYYY-MM') AS month,
    COALESCE((SELECT sum(amount) FROM public.revenues r
              WHERE r.status = 'received'
                AND date_trunc('month', COALESCE(r.received_date, r.due_date)) = d.month), 0) AS receita,
    COALESCE((SELECT sum(amount) FROM public.expenses e
              WHERE e.status = 'paid'
                AND date_trunc('month', COALESCE(e.paid_date, e.date)) = d.month), 0) AS despesa
  FROM (
    SELECT generate_series(date_trunc('month', now()) - interval '11 months',
                           date_trunc('month', now()), interval '1 month') AS month
  ) d
  ORDER BY d.month;

GRANT SELECT ON public.v_lane_analysis, public.v_client_analysis, public.v_monthly_financials TO authenticated;

SELECT 'PA-01: views analíticas (v_lane_analysis, v_client_analysis, v_monthly_financials) prontas.' AS resultado;


-- ============================================================
-- FIM — 1 base + 71 migrations.
-- ============================================================

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
  address TEXT,
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

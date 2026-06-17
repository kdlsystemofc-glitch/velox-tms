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
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
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

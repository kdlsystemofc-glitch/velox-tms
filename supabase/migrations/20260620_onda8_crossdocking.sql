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

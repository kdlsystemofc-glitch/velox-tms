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

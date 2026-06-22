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

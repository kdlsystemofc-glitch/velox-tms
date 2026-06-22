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

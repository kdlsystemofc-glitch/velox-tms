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

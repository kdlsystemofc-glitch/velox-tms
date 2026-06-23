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

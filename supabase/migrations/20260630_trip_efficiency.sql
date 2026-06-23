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

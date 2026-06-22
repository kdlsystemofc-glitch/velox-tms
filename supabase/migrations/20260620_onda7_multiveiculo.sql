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

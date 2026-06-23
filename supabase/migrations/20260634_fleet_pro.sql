-- ============================================================
-- VELOX TMS — Frota (Fr-1): campos profissionais do motorista
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS ear        BOOLEAN DEFAULT false;  -- CNH com EAR (atividade remunerada)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cnh_points INTEGER;                -- pontos atuais na CNH (0–40)

SELECT 'Frota Fr-1: EAR + pontos na CNH prontos.' AS resultado;

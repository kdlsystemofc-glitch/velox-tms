-- ============================================================
-- VELOX TMS — Ocorrências: impacto financeiro e causa-raiz
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

ALTER TABLE incidents ADD COLUMN IF NOT EXISTS financial_impact NUMERIC;  -- custo da avaria/roubo (R$)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS root_cause TEXT;           -- causa-raiz / categoria de análise
-- (photo_urls já existe como JSONB — o gestor pode anexar mais fotos/docs)

SELECT 'Ocorrências: impacto financeiro + causa-raiz prontos.' AS resultado;

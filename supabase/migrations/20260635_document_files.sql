-- ============================================================
-- VELOX TMS — Documentos (Doc-1): arquivos de frota e motorista
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Permite anexar o ARQUIVO de cada documento (não só a data de vencimento).
-- CRLV/seguro do caminhão já tinham *_url; faltavam tacógrafo e os do motorista.

ALTER TABLE trucks  ADD COLUMN IF NOT EXISTS tachograph_url TEXT;  -- aferição do tacógrafo
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS cnh_url   TEXT;        -- CNH digitalizada
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS aso_url   TEXT;        -- ASO (exame ocupacional)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS toxic_url TEXT;        -- exame toxicológico

SELECT 'Documentos Doc-1: arquivos de frota e motorista prontos.' AS resultado;

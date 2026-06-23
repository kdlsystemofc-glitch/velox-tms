-- ============================================================
-- VELOX TMS — Coleta consolidada (multi-origem): vários remetentes numa OS
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- `origin` continua sendo o ponto de coleta PRINCIPAL (compatibilidade + tabela
-- de rota). `origins` guarda TODOS os pontos de coleta da OS (incluindo o principal
-- como primeiro), cada um com endereço e observação própria:
--   [{cep,street,number,complement,neighborhood,city,state,contact_name,collection_notes}]

ALTER TABLE orders ADD COLUMN IF NOT EXISTS origins JSONB DEFAULT '[]'::jsonb;

SELECT 'Coleta consolidada (multi-origem) pronta.' AS resultado;

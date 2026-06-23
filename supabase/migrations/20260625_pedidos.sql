-- ============================================================
-- VELOX TMS — Módulo de Pedidos (agendamento desejado × confirmado + anexos)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- Data DESEJADA de coleta (pedido pelo cliente). A `collection_date` passa a ser
-- a data CONFIRMADA pela operação (definida na confirmação/despacho).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS collection_date_desired DATE;

-- Anexos gerais do pedido (fotos da carga, documentos): [{url, name, kind}]
ALTER TABLE orders ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

SELECT 'Módulo de Pedidos: agendamento desejado/confirmado + anexos prontos.' AS resultado;

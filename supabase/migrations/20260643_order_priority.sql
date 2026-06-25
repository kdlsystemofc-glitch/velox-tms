-- ============================================================
-- VELOX TMS — Prioridade operacional do pedido + índice de fila
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Prioridade OPERACIONAL (normal/high/critical), desacoplada de freight_type
-- (que é precificação). Define a ordem de atendimento na fila de programação.
--   critical = atender primeiro · high = urgente · normal = padrão

ALTER TABLE orders ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Garante valores válidos (e backfill de nulos legados para 'normal' antes do CHECK)
UPDATE orders SET priority = 'normal' WHERE priority IS NULL OR priority NOT IN ('normal', 'high', 'critical');

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_priority_check;
ALTER TABLE orders ADD CONSTRAINT orders_priority_check
  CHECK (priority IN ('normal', 'high', 'critical'));

-- Índice para listar/ordenar a fila por prioridade rapidamente.
-- Ordem textual NÃO reflete urgência, então indexamos um rank derivado:
--   critical → 0, high → 1, normal → 2
CREATE INDEX IF NOT EXISTS idx_orders_priority_rank
  ON orders ((CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END));

SELECT 'Coluna priority pronta (normal/high/critical).' AS resultado;

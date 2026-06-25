-- ============================================================
-- VELOX TMS — Fluxo de aprovação de pedido (item 46) — opcional por empresa
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Quando ligado (company_settings.require_order_approval = true), todo pedido
-- novo entra como 'awaiting_approval' e só segue para a fila operacional ('new')
-- depois que um admin OU operador libera. Desligado = fluxo atual intacto.

-- 1) Novo status no CHECK de orders (preserva todos os anteriores)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('awaiting_approval','new','confirmed','collecting','in_transit','delivered','cancelled',
                    'awaiting_cargo','partially_delivered','in_transfer'));

-- 2) Interruptor por empresa (padrão desligado — não muda comportamento atual)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS require_order_approval BOOLEAN DEFAULT false;

SELECT 'Fluxo de aprovação pronto (status awaiting_approval + flag require_order_approval).' AS resultado;

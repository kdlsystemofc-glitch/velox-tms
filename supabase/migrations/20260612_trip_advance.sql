-- Migration: adiantamento de viagem (vale-frete pago ao motorista antes da saída)
-- Aplicar no SQL Editor do Supabase.

ALTER TABLE trips ADD COLUMN IF NOT EXISTS advance_amount NUMERIC DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS advance_date DATE;

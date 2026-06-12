-- Migration: permitir status 'cancelled' em revenues (estorno de pedido cancelado)
-- Aplicar no SQL Editor do Supabase.

ALTER TABLE revenues DROP CONSTRAINT IF EXISTS revenues_status_check;
ALTER TABLE revenues ADD CONSTRAINT revenues_status_check
  CHECK (status IN ('receivable', 'received', 'overdue', 'cancelled'));

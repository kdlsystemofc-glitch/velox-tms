-- ============================================================
-- VELOX TMS — Financeiro (Fin-1): saldo inicial de caixa
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Sem isto o fluxo de caixa projetava a partir de zero (delta), e o alerta de
-- saldo negativo não valia. Agora a projeção parte do dinheiro real em caixa.

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS opening_cash_balance NUMERIC DEFAULT 0;  -- caixa atual (banco + dinheiro)
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS opening_cash_date DATE;                   -- data de referência do saldo

SELECT 'Financeiro Fin-1: saldo inicial de caixa pronto.' AS resultado;

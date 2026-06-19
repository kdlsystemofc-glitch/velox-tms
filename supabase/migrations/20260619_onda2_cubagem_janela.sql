-- ============================================================
-- VELOX TMS — Onda 2: Cubagem e janela de recebimento (S6,S7,B2)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- Janela de recebimento do cliente (S6 / B2-B).
-- { days:[1,2,3,4,5], start:"08:00", end:"11:00" }  — vazio = sem restrição.
-- (A janela por destinatário fica dentro de orders.recipients — JSONB, sem coluna nova.)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS delivery_window JSONB DEFAULT '{}'::jsonb;

-- Observação: a cubagem (volume físico) usa trucks.dimensions {length_m,width_m,height_m}
-- e as dimensões dos itens (cm) já existentes — não exige coluna nova.

SELECT 'Onda 2 aplicada. Janela de recebimento pronta.' AS resultado;

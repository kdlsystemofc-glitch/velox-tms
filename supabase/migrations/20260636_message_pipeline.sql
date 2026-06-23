-- ============================================================
-- VELOX TMS — Mensagens (Msg-1): funil de leads
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Transforma a caixa de entrada num funil: novo → em_contato → convertido/perdido/arquivado.

ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo';  -- novo|em_contato|convertido|perdido|arquivado
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS converted_order_id UUID REFERENCES orders(id);
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS converted_order_protocol TEXT;

-- Backfill: leads antigos já lidos viram "em_contato"; os não lidos ficam "novo".
UPDATE contact_messages SET status = 'em_contato' WHERE status IS NULL AND read = true;
UPDATE contact_messages SET status = 'novo'       WHERE status IS NULL;

SELECT 'Mensagens Msg-1: funil de leads pronto.' AS resultado;

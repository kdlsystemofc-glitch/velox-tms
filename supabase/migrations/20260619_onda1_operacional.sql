-- ============================================================
-- VELOX TMS — Onda 1: Exceções operacionais (S1,S2,S5,S10,S12,S13)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- ---------- orders ----------
-- Novos status de exceção: carga aguardando liberação (S5) e entrega parcial (S12).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('new','confirmed','collecting','in_transit','delivered','cancelled',
                    'awaiting_cargo','partially_delivered'));

-- Taxa de deslocamento improdutivo (S10 — cancelou com viagem em andamento).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unproductive_fee NUMERIC;

-- ---------- incidents ----------
-- Tipos novos exigidos pelo Bloco 3 (carga não pronta, entrega parcial, ausente).
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_type_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_type_check
  CHECK (type IN ('avaria','atraso','tentativa_entrega','roubo','acidente','carga_recusada','outro',
                  'carga_nao_pronta','entrega_parcial','destinatario_ausente'));

-- Campos de tratativa/acompanhamento (usados já aqui e ampliados na Onda 3).
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS action_plan TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS client_notified BOOLEAN DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS client_notified_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS insurance_triggered BOOLEAN DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS stop_index INTEGER;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- ---------- alerts ----------
-- Novos tipos de alerta operacional (caminhão quebrou, motorista ausente,
-- carga retida, tentativa de entrega, cancelamento em viagem, endereço alterado).
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check
  CHECK (type IN ('cnh_expiring','cnh_expired','crlv_expiring','crlv_expired',
                  'insurance_expiring','insurance_expired','tachograph_expiring',
                  'maintenance_due','order_no_driver','bill_due','bill_overdue',
                  'oil_maintenance_km','review_km',
                  'truck_breakdown','driver_absent','cargo_hold','delivery_attempt',
                  'order_cancelled_in_trip','address_changed','recipient_window'));

SELECT 'Onda 1 aplicada. Banco pronto para exceções operacionais.' AS resultado;

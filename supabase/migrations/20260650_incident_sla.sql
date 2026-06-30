-- ============================================================
-- VELOX TMS — Config de SLA de ocorrências (B3 da auditoria)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Guarda as horas de SLA por gravidade ({critical, high, medium, low}).
-- Lido por incidentSla.js; sem isto, usa os padrões (4/24/72/168h).
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS incident_sla_hours JSONB;

SELECT 'Config de SLA de ocorrência pronta (incident_sla_hours).' AS resultado;

-- Migration: coluna para documentos da empresa (upload manual em Documentos → Empresa)
-- Aplicar no SQL Editor do Supabase.

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

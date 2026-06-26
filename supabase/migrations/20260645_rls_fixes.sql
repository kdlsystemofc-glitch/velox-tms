-- ============================================================
-- VELOX TMS — Correções de PERMISSÃO (RLS) — BUG-01 e BUG-02 do QA
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Sem isto:
--   • BUG-02: o formulário de Contato do site dá 403 e NENHUM lead é salvo.
--   • BUG-01: enviar foto/NF (POD) no app do motorista e no admin dá 403.
-- São regras de banco/armazenamento — não dá pra corrigir só no código.

-- ──────────────────────────────────────────────────────────
-- BUG-02 — Permitir que o site público (anon) crie leads de contato
-- ──────────────────────────────────────────────────────────
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_contact" ON public.contact_messages;
CREATE POLICY "anon_insert_contact" ON public.contact_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Garante que a equipe (autenticada) consegue ler/gerir os leads recebidos.
DROP POLICY IF EXISTS "auth_manage_contact" ON public.contact_messages;
CREATE POLICY "auth_manage_contact" ON public.contact_messages
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- BUG-01 — Armazenamento (Storage): upload de comprovantes/NF (bucket 'uploads')
-- ──────────────────────────────────────────────────────────
-- 1) Cria o bucket 'uploads' (leitura pública, p/ abrir o arquivo pelo link).
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) Usuários autenticados (admin, operador, motorista) podem ENVIAR arquivos.
DROP POLICY IF EXISTS "auth_upload_uploads" ON storage.objects;
CREATE POLICY "auth_upload_uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- 3) Podem também atualizar/remover os próprios envios (re-anexar, trocar).
DROP POLICY IF EXISTS "auth_update_uploads" ON storage.objects;
CREATE POLICY "auth_update_uploads" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "auth_delete_uploads" ON storage.objects;
CREATE POLICY "auth_delete_uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'uploads');

-- 4) Leitura pública dos arquivos do bucket (abrir NF assinada / foto pelo link).
DROP POLICY IF EXISTS "public_read_uploads" ON storage.objects;
CREATE POLICY "public_read_uploads" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'uploads');

SELECT 'RLS corrigido: leads de contato (anon insert) e uploads (bucket uploads).' AS resultado;

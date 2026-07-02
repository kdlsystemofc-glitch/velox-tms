-- ============================================================
-- VELOX TMS — Projeto 08.1: Serviço de Documentos (registro + storage + fila)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Hoje os PDFs são gerados no cliente (jsPDF) e só baixados — nada é arquivado
-- nem gerado no servidor. Aqui criamos o REGISTRO/fila (documents) + o bucket
-- privado 'documents'. A Edge Function render-documents (P08.3) consome a fila,
-- renderiza no servidor e grava o arquivo, marcando 'ready'. Lote assíncrono.

CREATE TABLE IF NOT EXISTS public.documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type               TEXT NOT NULL CHECK (type IN ('invoice','receipt','shipment','trip_manifest','transfer_manifest','labels')),
  entity_type        TEXT NOT NULL,        -- 'order' | 'invoice' | 'trip' | 'transfer'
  entity_id          UUID NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready','error')),
  storage_path       TEXT,                 -- caminho no bucket 'documents' quando pronto
  batch_id           UUID,                 -- agrupa uma geração em lote
  title              TEXT,
  error              TEXT,
  requested_by       UUID,
  requested_by_email TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at           TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_documents_pending ON public.documents(created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_documents_entity  ON public.documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_batch   ON public.documents(batch_id) WHERE batch_id IS NOT NULL;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_staff_read ON public.documents;
CREATE POLICY documents_staff_read ON public.documents
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- bucket privado + policies (staff) ----------
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_bucket_staff" ON storage.objects;
CREATE POLICY "documents_bucket_staff" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND public.is_staff())
  WITH CHECK (bucket_id = 'documents' AND public.is_staff());

-- ---------- enfileirar (individual) ----------
CREATE OR REPLACE FUNCTION public.request_document(p_type TEXT, p_entity_type TEXT, p_entity_id UUID, p_title TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_email TEXT;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode gerar documentos.'; END IF;
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.documents (type, entity_type, entity_id, title, requested_by, requested_by_email)
    VALUES (p_type, p_entity_type, p_entity_id, NULLIF(btrim(p_title),''), auth.uid(), v_email)
    RETURNING id INTO v_id;
  PERFORM public.domain_event_write('document.requested', 'document', v_id::text,
    jsonb_build_object('type', p_type, 'entity_type', p_entity_type, 'entity_id', p_entity_id), auth.uid());
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.request_document(TEXT, TEXT, UUID, TEXT) TO authenticated;

-- ---------- enfileirar (lote) ----------
CREATE OR REPLACE FUNCTION public.request_documents_batch(p_type TEXT, p_entity_type TEXT, p_entity_ids UUID[])
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_batch UUID := gen_random_uuid(); v_email TEXT; v_id UUID; v_n INTEGER := 0;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode gerar documentos.'; END IF;
  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  FOREACH v_id IN ARRAY p_entity_ids LOOP
    INSERT INTO public.documents (type, entity_type, entity_id, batch_id, requested_by, requested_by_email)
      VALUES (p_type, p_entity_type, v_id, v_batch, auth.uid(), v_email);
    v_n := v_n + 1;
  END LOOP;
  PERFORM public.domain_event_write('document.batch_requested', 'document', v_batch::text,
    jsonb_build_object('type', p_type, 'count', v_n), auth.uid());
  RETURN v_n;
END; $$;
GRANT EXECUTE ON FUNCTION public.request_documents_batch(TEXT, TEXT, UUID[]) TO authenticated;

-- ---------- realtime (status ao vivo da fila) — tolerante ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
  END IF;
END $$;

SELECT 'Projeto 08.1: documents (fila) + bucket privado + request_document/batch + realtime prontos.' AS resultado;

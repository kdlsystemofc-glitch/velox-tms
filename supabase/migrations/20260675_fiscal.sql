-- ============================================================
-- VELOX TMS — Projeto 09: Motor Fiscal Eletrônico (CT-e/MDF-e) — arquitetura
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Constrói a ARQUITETURA fiscal provider-pluggable. A autorização REAL na SEFAZ
-- depende de PROVEDOR FISCAL (pago) + CERTIFICADO digital — ainda não decididos.
-- Sem provedor, o documento fica em 'provider_pending' (não autoriza nada).
-- Nada aqui emite documento fiscal de verdade. O campo manual orders.cte_number
-- (número colado à mão) é preservado.

-- ---------- config fiscal da empresa ----------
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS ie TEXT;                 -- inscrição estadual
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS crt TEXT;                -- regime tributário (1/2/3)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS rntrc TEXT;              -- registro ANTT (transportador)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS fiscal_environment TEXT DEFAULT 'homologacao' CHECK (fiscal_environment IN ('homologacao','producao'));
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS fiscal_provider TEXT;    -- nome do provedor (NULL/'' = sem provedor)
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS cte_series TEXT DEFAULT '1';
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS certificate_ref TEXT;    -- referência ao certificado (NUNCA o certificado em si)

-- ---------- documentos fiscais ----------
CREATE TABLE IF NOT EXISTS public.fiscal_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind               TEXT NOT NULL CHECK (kind IN ('cte','mdfe')),
  entity_type        TEXT NOT NULL,        -- 'order' (CT-e) | 'trip' (MDF-e)
  entity_id          UUID NOT NULL,
  environment        TEXT NOT NULL DEFAULT 'homologacao' CHECK (environment IN ('homologacao','producao')),
  -- draft: rascunho · provider_pending: sem provedor · pending: aguardando SEFAZ ·
  -- authorized/rejected: resposta · contingency: emissão offline · cancelled: cancelado
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','provider_pending','pending','authorized','rejected','contingency','cancelled')),
  provider           TEXT,
  series             TEXT,
  number             TEXT,                 -- só após autorização (numeração fiscal é sequencial/sem gaps)
  access_key         TEXT,                 -- chave de 44 dígitos (após autorização)
  protocol           TEXT,                 -- protocolo de autorização SEFAZ
  xml_path           TEXT,                 -- caminho no bucket 'documents'
  dacte_path         TEXT,
  payload            JSONB,                -- snapshot do payload montado
  error              TEXT,
  attempts           INTEGER NOT NULL DEFAULT 0,
  requested_by       UUID,
  requested_by_email TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at      TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fiscal_entity  ON public.fiscal_documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_pending ON public.fiscal_documents(created_at) WHERE status IN ('pending','provider_pending');
CREATE INDEX IF NOT EXISTS idx_fiscal_key     ON public.fiscal_documents(access_key) WHERE access_key IS NOT NULL;

ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fiscal_documents_staff_read ON public.fiscal_documents;
CREATE POLICY fiscal_documents_staff_read ON public.fiscal_documents
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- solicitar emissão (enfileira; NÃO autoriza) ----------
-- Sem provedor configurado → 'provider_pending'. Com provedor → 'pending' (a
-- Edge Function/provedor processa). Numeração/chave só existem após autorização.
CREATE OR REPLACE FUNCTION public.fiscal_request(p_kind TEXT, p_entity_type TEXT, p_entity_id UUID, p_payload JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_email TEXT; v_provider TEXT; v_env TEXT; v_series TEXT; v_status TEXT;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode emitir documentos fiscais.'; END IF;
  SELECT NULLIF(btrim(fiscal_provider),''), COALESCE(fiscal_environment,'homologacao'), COALESCE(cte_series,'1')
    INTO v_provider, v_env, v_series FROM public.company_settings LIMIT 1;
  v_status := CASE WHEN v_provider IS NULL THEN 'provider_pending' ELSE 'pending' END;

  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();
  INSERT INTO public.fiscal_documents (kind, entity_type, entity_id, environment, status, provider, series, payload, requested_by, requested_by_email)
    VALUES (p_kind, p_entity_type, p_entity_id, v_env, v_status, v_provider, v_series, p_payload, auth.uid(), v_email)
    RETURNING id INTO v_id;
  PERFORM public.domain_event_write('fiscal.requested', 'fiscal', v_id::text,
    jsonb_build_object('kind', p_kind, 'status', v_status, 'environment', v_env), auth.uid());
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.fiscal_request(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- ---------- contingência (emissão offline) ----------
CREATE OR REPLACE FUNCTION public.fiscal_mark_contingency(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode acionar contingência.'; END IF;
  UPDATE public.fiscal_documents SET status = 'contingency', updated_at = now()
    WHERE id = p_id AND status IN ('pending','provider_pending','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento não está em estado que permita contingência.'; END IF;
  PERFORM public.domain_event_write('fiscal.contingency', 'fiscal', p_id::text, NULL, auth.uid());
  PERFORM public.log_action('Acionou contingência fiscal', 'fiscal', p_id::text, NULL);
END; $$;
GRANT EXECUTE ON FUNCTION public.fiscal_mark_contingency(UUID) TO authenticated;

-- ---------- cancelar ----------
CREATE OR REPLACE FUNCTION public.fiscal_cancel(p_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas a equipe pode cancelar documentos fiscais.'; END IF;
  -- (Com provedor, aqui entraria a chamada de cancelamento na SEFAZ.)
  UPDATE public.fiscal_documents SET status = 'cancelled', error = NULLIF(btrim(p_reason),''), updated_at = now()
    WHERE id = p_id AND status IN ('authorized','contingency','provider_pending','pending','draft','rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'Documento não encontrado ou já cancelado.'; END IF;
  PERFORM public.domain_event_write('fiscal.cancelled', 'fiscal', p_id::text, jsonb_build_object('reason', p_reason), auth.uid());
  PERFORM public.log_action('Cancelou documento fiscal', 'fiscal', p_id::text, p_reason);
END; $$;
GRANT EXECUTE ON FUNCTION public.fiscal_cancel(UUID, TEXT) TO authenticated;

-- ---------- realtime (status ao vivo) — tolerante ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fiscal_documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_documents;
  END IF;
END $$;

SELECT 'Projeto 09: fiscal_documents + config fiscal + fiscal_request/contingency/cancel (provider-pluggable).' AS resultado;

-- ============================================================
-- VELOX TMS — Projeto 03.2: Tarifação & Contratos Governados
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Problema: preço vive em JSON solto (company_settings.pricing / .route_pricing /
-- clients.custom_pricing), sobrescrito no lugar — sem versão, vigência plena nem
-- auditoria de quem/quando/o-quê mudou.
--
-- Solução (aditiva): tarifa como ENTIDADE VERSIONADA.
--   • tariff_tables    — a tarifa nomeada por escopo (default | route:UF-UF | client:<id>).
--   • tariff_versions  — snapshots IMUTÁVEIS do payload (mesmo formato do JSON atual),
--                        com version_no, vigência, status e autor.
-- Publicar uma nova versão ARQUIVA a anterior (nunca sobrescreve) e registra em audit_log.
-- O motor de cálculo NÃO muda: continua recebendo um objeto `pricing` simples — só
-- que agora vindo de uma versão. Enquanto a migração do legado não cobre tudo, o
-- resolvedor devolve NULL e o chamador cai no JSON legado (fallback read-through).

-- ---------- tabelas ----------
CREATE TABLE IF NOT EXISTS public.tariff_tables (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope       TEXT NOT NULL CHECK (scope IN ('default','route','client')),
  scope_key   TEXT,                       -- NULL p/ default; 'SP-PR' p/ route; client id p/ client
  name        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Uma tarifa por (escopo, chave). COALESCE resolve o NULL do default.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tariff_tables_scope
  ON public.tariff_tables(scope, COALESCE(scope_key, ''));

CREATE TABLE IF NOT EXISTS public.tariff_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_table_id  UUID NOT NULL REFERENCES public.tariff_tables(id) ON DELETE CASCADE,
  version_no       INTEGER NOT NULL,
  payload          JSONB NOT NULL DEFAULT '{}'::jsonb,   -- mesmo formato de company_settings.pricing
  valid_from       DATE,
  valid_until      DATE,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','archived')),
  note             TEXT,
  created_by       UUID,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tariff_table_id, version_no)
);
CREATE INDEX IF NOT EXISTS idx_tariff_versions_table  ON public.tariff_versions(tariff_table_id, status);
CREATE INDEX IF NOT EXISTS idx_tariff_versions_valid  ON public.tariff_versions(valid_from, valid_until);

-- ---------- RLS: leitura staff; escrita só via RPC (SECURITY DEFINER) ----------
ALTER TABLE public.tariff_tables   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tariff_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tariff_tables_staff_read ON public.tariff_tables;
CREATE POLICY tariff_tables_staff_read ON public.tariff_tables
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS tariff_versions_staff_read ON public.tariff_versions;
CREATE POLICY tariff_versions_staff_read ON public.tariff_versions
  FOR SELECT TO authenticated USING (public.is_staff());

-- ---------- resolvedor: payload da versão vigente para a data (ou NULL → fallback) ----------
CREATE OR REPLACE FUNCTION public.resolve_tariff_payload(p_scope TEXT, p_scope_key TEXT, p_date DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- SECURITY DEFINER burla a RLS: exige staff explicitamente (não vaza tarifa a
  -- usuários do portal/cliente). Não-staff recebe NULL → chamador cai no fallback.
  SELECT v.payload
  FROM public.tariff_versions v
  JOIN public.tariff_tables t ON t.id = v.tariff_table_id
  WHERE public.is_staff()
    AND t.scope = p_scope
    AND COALESCE(t.scope_key, '') = COALESCE(p_scope_key, '')
    AND t.active
    AND v.status = 'active'
    AND (v.valid_from  IS NULL OR v.valid_from  <= COALESCE(p_date, CURRENT_DATE))
    AND (v.valid_until IS NULL OR v.valid_until >= COALESCE(p_date, CURRENT_DATE))
  ORDER BY v.version_no DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_tariff_payload(TEXT, TEXT, DATE) TO authenticated;

-- ---------- publicar nova versão (arquiva a anterior; nunca sobrescreve) ----------
CREATE OR REPLACE FUNCTION public.tariff_publish_version(
  p_scope TEXT, p_scope_key TEXT, p_name TEXT, p_payload JSONB,
  p_valid_from DATE DEFAULT NULL, p_valid_until DATE DEFAULT NULL, p_note TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_table_id UUID;
  v_next     INTEGER;
  v_email    TEXT;
  v_version  UUID;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'Apenas equipe pode publicar tarifas'; END IF;
  IF p_scope NOT IN ('default','route','client') THEN RAISE EXCEPTION 'Escopo inválido: %', p_scope; END IF;

  -- Upsert da tarifa (escopo + chave)
  SELECT id INTO v_table_id FROM public.tariff_tables
    WHERE scope = p_scope AND COALESCE(scope_key,'') = COALESCE(p_scope_key,'');
  IF v_table_id IS NULL THEN
    INSERT INTO public.tariff_tables (scope, scope_key, name)
      VALUES (p_scope, NULLIF(p_scope_key,''), COALESCE(NULLIF(p_name,''), p_scope))
      RETURNING id INTO v_table_id;
  END IF;

  -- Próximo número de versão
  SELECT COALESCE(MAX(version_no), 0) + 1 INTO v_next
    FROM public.tariff_versions WHERE tariff_table_id = v_table_id;

  -- Arquiva as versões ativas anteriores desta tarifa (a nova passa a ser a vigente)
  UPDATE public.tariff_versions SET status = 'archived'
    WHERE tariff_table_id = v_table_id AND status = 'active';

  SELECT email INTO v_email FROM public.user_profiles WHERE id = auth.uid();

  INSERT INTO public.tariff_versions
    (tariff_table_id, version_no, payload, valid_from, valid_until, status, note, created_by, created_by_email)
    VALUES (v_table_id, v_next, COALESCE(p_payload,'{}'::jsonb), p_valid_from, p_valid_until,
            'active', NULLIF(p_note,''), auth.uid(), v_email)
    RETURNING id INTO v_version;

  -- Trilha de auditoria (mudança de tarifa)
  PERFORM public.log_action('Publicou tarifa', 'tariff',
    p_scope || COALESCE(':' || p_scope_key, ''), 'v' || v_next);

  RETURN jsonb_build_object('tariff_table_id', v_table_id, 'version_id', v_version, 'version_no', v_next);
END; $$;
GRANT EXECUTE ON FUNCTION public.tariff_publish_version(TEXT, TEXT, TEXT, JSONB, DATE, DATE, TEXT) TO authenticated;

SELECT 'Projeto 03.2: tariff_tables + tariff_versions + resolve_tariff_payload + tariff_publish_version prontos.' AS resultado;

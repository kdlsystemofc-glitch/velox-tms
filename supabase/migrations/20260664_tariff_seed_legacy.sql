-- ============================================================
-- VELOX TMS — Projeto 03.3: migração do JSON legado → tarifas versionadas
-- Idempotente (só semeia o que ainda não existe). Rode DEPOIS de 20260663.
-- ============================================================
-- Semeia tariff_tables/tariff_versions a partir das 3 fontes JSON atuais:
--   • company_settings.pricing            → tarifa 'default'
--   • company_settings.route_pricing[]    → tarifa 'route:<UF>-<UF>' por corredor
--   • clients.custom_pricing (não vazio)  → tarifa 'client:<id>'
-- Os JSONs legados são MANTIDOS (fallback read-through). INSERT direto (não usa
-- tariff_publish_version, que exige is_staff/auth.uid — nulo no SQL editor).

DO $$
DECLARE
  v_settings   company_settings%ROWTYPE;
  v_table_id   UUID;
  v_route      JSONB;
  v_key        TEXT;
  v_client     RECORD;
BEGIN
  SELECT * INTO v_settings FROM public.company_settings LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'Sem company_settings — nada a semear.';
    RETURN;
  END IF;

  -- ---------- default ----------
  IF v_settings.pricing IS NOT NULL AND v_settings.pricing <> '{}'::jsonb THEN
    SELECT id INTO v_table_id FROM public.tariff_tables WHERE scope = 'default';
    IF v_table_id IS NULL THEN
      INSERT INTO public.tariff_tables (scope, scope_key, name)
        VALUES ('default', NULL, 'Tabela padrão') RETURNING id INTO v_table_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tariff_versions WHERE tariff_table_id = v_table_id) THEN
      INSERT INTO public.tariff_versions (tariff_table_id, version_no, payload, status, note)
        VALUES (v_table_id, 1, v_settings.pricing, 'active', 'Migração do JSON legado (default)');
    END IF;
  END IF;

  -- ---------- corredores ----------
  FOR v_route IN SELECT * FROM jsonb_array_elements(COALESCE(v_settings.route_pricing, '[]'::jsonb))
  LOOP
    IF (v_route->>'origin_state') IS NULL OR (v_route->>'dest_state') IS NULL THEN
      CONTINUE;
    END IF;
    v_key := (v_route->>'origin_state') || '-' || (v_route->>'dest_state');

    SELECT id INTO v_table_id FROM public.tariff_tables
      WHERE scope = 'route' AND COALESCE(scope_key,'') = v_key;
    IF v_table_id IS NULL THEN
      INSERT INTO public.tariff_tables (scope, scope_key, name)
        VALUES ('route', v_key, 'Corredor ' || (v_route->>'origin_state') || '→' || (v_route->>'dest_state'))
        RETURNING id INTO v_table_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tariff_versions WHERE tariff_table_id = v_table_id) THEN
      INSERT INTO public.tariff_versions
        (tariff_table_id, version_no, payload, valid_from, valid_until, status, note)
        VALUES (v_table_id, 1, v_route,
                NULLIF(v_route->>'valid_from','')::date, NULLIF(v_route->>'valid_until','')::date,
                'active', 'Migração do JSON legado (corredor)');
    END IF;
  END LOOP;

  -- ---------- clientes com tabela negociada ----------
  FOR v_client IN
    SELECT id, company_name, custom_pricing FROM public.clients
    WHERE custom_pricing IS NOT NULL AND custom_pricing <> '{}'::jsonb
  LOOP
    SELECT id INTO v_table_id FROM public.tariff_tables
      WHERE scope = 'client' AND COALESCE(scope_key,'') = v_client.id::text;
    IF v_table_id IS NULL THEN
      INSERT INTO public.tariff_tables (scope, scope_key, name)
        VALUES ('client', v_client.id::text, 'Contrato ' || COALESCE(v_client.company_name, v_client.id::text))
        RETURNING id INTO v_table_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tariff_versions WHERE tariff_table_id = v_table_id) THEN
      INSERT INTO public.tariff_versions (tariff_table_id, version_no, payload, status, note)
        VALUES (v_table_id, 1, v_client.custom_pricing, 'active', 'Migração do JSON legado (cliente)');
    END IF;
  END LOOP;
END $$;

SELECT 'Projeto 03.3: JSON legado migrado para tarifas versionadas (default/route/client).' AS resultado,
       (SELECT count(*) FROM public.tariff_tables)   AS tarifas,
       (SELECT count(*) FROM public.tariff_versions) AS versoes;

-- Migration: fechar leitura pública de orders/clients e expor só o necessário
-- via funções SECURITY DEFINER. Aplicar no SQL Editor do Supabase.
--
-- PROBLEMA: as policies "public_read_order_by_protocol" e "public_read_clients_limited"
-- permitiam que qualquer um com a chave anon lesse TODOS os pedidos e clientes.
-- SOLUÇÃO: remover o SELECT anon dessas tabelas e dar acesso só por funções
-- que retornam campos seguros (rastreamento por protocolo/CT-e/NF; consulta de
-- cliente por CNPJ; geração de protocolo sequencial).

-- ============================================================
-- 1. Rastreamento público (substitui leitura direta de orders)
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_order(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := upper(trim(p_query));
  o orders%ROWTYPE;
BEGIN
  IF q IS NULL OR q = '' THEN RETURN NULL; END IF;

  SELECT * INTO o FROM orders WHERE upper(protocol) = q LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO o FROM orders WHERE upper(cte_number) = q LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    SELECT * INTO o FROM orders ord
     WHERE EXISTS (
       SELECT 1
         FROM jsonb_array_elements(COALESCE(ord.recipients, '[]'::jsonb)) r,
              jsonb_array_elements(COALESCE(r->'items', '[]'::jsonb)) it
        WHERE upper(it->>'nf_number') = q
     )
     ORDER BY ord.created_at DESC
     LIMIT 1;
  END IF;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'protocol',        o.protocol,
    'status',          o.status,
    'client_name',     o.client_name,
    'cte_number',      o.cte_number,
    'collection_date', o.collection_date,
    'status_history',  o.status_history,
    'recipients', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name',            r->>'name',
        'city',            r->>'city',
        'state',           r->>'state',
        'delivery_status', r->>'delivery_status'
      )), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(o.recipients, '[]'::jsonb)) r
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO anon, authenticated;

-- ============================================================
-- 2. Próximo protocolo sequencial (sem ler orders no cliente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_protocol()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY');
  prefix text := 'VLX-' || yr || '-';
  last_num int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(protocol, '^.*-', ''), '')::int), 0)
    INTO last_num
    FROM orders
   WHERE protocol LIKE prefix || '%';
  RETURN prefix || lpad((last_num + 1)::text, 5, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.next_protocol() TO anon, authenticated;

-- ============================================================
-- 3. Consulta de cliente por CNPJ (substitui leitura de clients)
-- ============================================================
CREATE OR REPLACE FUNCTION public.client_by_cnpj(p_cnpj text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean text := regexp_replace(COALESCE(p_cnpj, ''), '\D', '', 'g');
  c clients%ROWTYPE;
BEGIN
  IF clean = '' THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT * INTO c FROM clients
   WHERE regexp_replace(COALESCE(cpf_cnpj, ''), '\D', '', 'g') = clean
     AND status = 'active'
   LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  RETURN jsonb_build_object(
    'found',        true,
    'company_name', c.company_name,
    'phone',        c.phone,
    'email',        c.email,
    'client_id',    c.id,
    'address',      c.address,
    'primary_contact', (
      SELECT r FROM jsonb_array_elements(COALESCE(c.contacts, '[]'::jsonb)) r
       WHERE (r->>'is_primary')::boolean IS TRUE LIMIT 1
    )
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.client_by_cnpj(text) TO anon, authenticated;

-- ============================================================
-- 4. Remover o SELECT público de orders e clients
-- ============================================================
DROP POLICY IF EXISTS "public_read_order_by_protocol" ON orders;
DROP POLICY IF EXISTS "public_read_clients_limited" ON clients;
-- (mantém: public_insert_order para o site de agendamento;
--  authenticated_full_access para o painel; leitura de testimonials/settings.)

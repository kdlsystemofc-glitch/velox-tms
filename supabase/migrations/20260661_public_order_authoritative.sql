-- ============================================================
-- VELOX TMS — P02.2: frete autoritativo no pedido público
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Fecha a brecha: hoje o /agendar faz INSERT anônimo em orders com o
-- freight_value CALCULADO NO NAVEGADOR (forjável). Agora o pedido público entra
-- por uma RPC SECURITY DEFINER que:
--   • gera o protocolo no servidor (next_protocol);
--   • NÃO grava freight_value do cliente — guarda só a ESTIMATIVA em
--     freight_estimate; o freight_value fica NULL até a equipe precificar;
--   • decide o status pelo company_settings (não confia no status do cliente).
-- E a policy de INSERT anônimo direto em orders é REMOVIDA.
-- (A cobrança já é autoritativa em confirm_order — feito pela equipe.)

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS freight_estimate NUMERIC;

CREATE OR REPLACE FUNCTION public.create_public_order(p JSONB)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_proto   TEXT;
  v_require BOOLEAN;
  v_status  TEXT;
  v_name    TEXT := NULLIF(p->>'client_name','');
BEGIN
  SELECT COALESCE(require_order_approval, false) INTO v_require FROM public.company_settings LIMIT 1;
  v_status := CASE WHEN v_require THEN 'awaiting_approval' ELSE 'new' END;
  v_proto := public.next_protocol();

  INSERT INTO public.orders (
    protocol, status,
    requester_name, requester_role,
    client_name, client_cpf_cnpj, client_phone, client_email, preferred_contact,
    freight_type, freight_value, freight_estimate,
    origin, collection_date, collection_date_desired, collection_time, collection_notes,
    recipients, total_volumes, total_weight_kg, total_declared_value,
    general_notes, freight_payer, transport_modal, payment_terms,
    payment_status, status_history
  ) VALUES (
    v_proto, v_status,
    NULLIF(p->>'requester_name',''), NULLIF(p->>'requester_role',''),
    v_name, NULLIF(p->>'client_cpf_cnpj',''), NULLIF(p->>'client_phone',''),
    NULLIF(p->>'client_email',''), NULLIF(p->>'preferred_contact',''),
    NULLIF(p->>'freight_type',''),
    NULL,                                             -- freight_value: autoritativo (equipe define)
    NULLIF(p->>'freight_estimate','')::numeric,       -- estimativa informativa do cliente
    COALESCE(p->'origin', '{}'::jsonb),
    NULLIF(p->>'collection_date','')::date, NULLIF(p->>'collection_date','')::date,
    NULLIF(p->>'collection_time',''), NULLIF(p->>'collection_notes',''),
    COALESCE(p->'recipients', '[]'::jsonb),
    NULLIF(p->>'total_volumes','')::int, NULLIF(p->>'total_weight_kg','')::numeric,
    NULLIF(p->>'total_declared_value','')::numeric,
    NULLIF(p->>'general_notes',''),
    COALESCE(NULLIF(p->>'freight_payer',''), 'cif'),
    COALESCE(NULLIF(p->>'transport_modal',''), 'road'),
    COALESCE(NULLIF(p->>'payment_terms',''), 'after_delivery'),
    'pending',
    jsonb_build_array(jsonb_build_object(
      'status', v_status, 'timestamp', now(), 'user', COALESCE(v_name, 'Site'),
      'note', 'Solicitação via site'
    ))
  );

  RETURN v_proto;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_public_order(JSONB) TO anon, authenticated;

-- Blindar: anon não insere mais direto em orders (só via create_public_order).
DROP POLICY IF EXISTS "anon_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "public_insert_order" ON public.orders;

SELECT 'P02.2 pronto: create_public_order (frete autoritativo) + anon sem INSERT direto.' AS resultado;

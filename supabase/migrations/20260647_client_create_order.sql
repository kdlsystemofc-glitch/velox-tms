-- ============================================================
-- VELOX TMS — Portal do Cliente (1b): criar pedido pelo portal
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- O cliente logado cria um pedido; o client_id e a razão social são FORÇADOS
-- a partir do próprio perfil (não dá para falsificar outra empresa). Respeita
-- o fluxo de aprovação da empresa (awaiting_approval) se estiver ligado.

CREATE OR REPLACE FUNCTION public.create_client_order(p JSONB)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_client_id UUID;
  v_company TEXT;
  v_proto TEXT;
  v_require BOOLEAN;
  v_status TEXT;
BEGIN
  SELECT up.client_id, c.company_name INTO v_client_id, v_company
  FROM public.user_profiles up
  LEFT JOIN public.clients c ON c.id = up.client_id
  WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false);

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Acesso de cliente não autorizado.';
  END IF;

  SELECT COALESCE(require_order_approval, false) INTO v_require FROM public.company_settings LIMIT 1;
  v_status := CASE WHEN v_require THEN 'awaiting_approval' ELSE 'new' END;
  v_proto := public.next_protocol();

  INSERT INTO public.orders (
    protocol, client_id, client_name, status,
    origin, collection_date, collection_date_desired,
    recipients, total_volumes, total_weight_kg, general_notes,
    payment_status, status_history
  ) VALUES (
    v_proto, v_client_id, v_company, v_status,
    COALESCE(p->'origin', '{}'::jsonb),
    NULLIF(p->>'collection_date','')::date, NULLIF(p->>'collection_date','')::date,
    COALESCE(p->'recipients', '[]'::jsonb),
    NULLIF(p->>'total_volumes','')::int, NULLIF(p->>'total_weight_kg','')::numeric,
    NULLIF(p->>'general_notes',''),
    'pending',
    jsonb_build_array(jsonb_build_object(
      'status', v_status, 'timestamp', now(), 'user', v_company,
      'note', 'Pedido criado pelo Portal do Cliente'
    ))
  );

  RETURN v_proto;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_client_order(JSONB) TO authenticated;

SELECT 'Portal do Cliente (1b): create_client_order pronto.' AS resultado;

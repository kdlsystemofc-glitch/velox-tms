-- ============================================================
-- VELOX TMS — Despacho atômico (programar/separar/devolver em transação)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Antes: o quadro programava pedido a pedido no navegador (laço). Agora cada
-- operação é UMA transação no servidor.

-- Programar vários pedidos numa mesma célula (caminhão + data)
CREATE OR REPLACE FUNCTION public.schedule_orders(
  p_order_ids UUID[], p_truck_id UUID, p_date DATE, p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders SET
    scheduled_truck_id = p_truck_id, scheduled_date = p_date,
    status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
      'status', status, 'timestamp', now(), 'user', p_user,
      'note', 'Programado no despacho')
  WHERE id = ANY(p_order_ids);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Devolver vários pedidos para a fila (tira a programação)
CREATE OR REPLACE FUNCTION public.unschedule_orders(p_order_ids UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders SET scheduled_truck_id = NULL, scheduled_date = NULL
  WHERE id = ANY(p_order_ids);
  RETURN jsonb_build_object('ok', true);
END; $$;

-- Aplicar a separação automática inteira (várias cargas) numa transação só
-- p_loads: [{ "truck_id": uuid, "date": "yyyy-mm-dd", "order_ids": [uuid,...] }]
CREATE OR REPLACE FUNCTION public.apply_dispatch_plan(p_loads JSONB, p_user TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l JSONB; ids UUID[];
BEGIN
  FOR l IN SELECT * FROM jsonb_array_elements(COALESCE(p_loads,'[]'::jsonb)) LOOP
    SELECT array_agg(x::uuid) INTO ids FROM jsonb_array_elements_text(l->'order_ids') x;
    IF ids IS NOT NULL THEN
      UPDATE orders SET
        scheduled_truck_id = (l->>'truck_id')::uuid,
        scheduled_date = (l->>'date')::date,
        status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
          'status', status, 'timestamp', now(), 'user', p_user, 'note', 'Separação automática aplicada')
      WHERE id = ANY(ids);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.schedule_orders(UUID[],UUID,DATE,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unschedule_orders(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_dispatch_plan(JSONB,TEXT) TO authenticated;

SELECT 'Despacho atômico pronto.' AS resultado;

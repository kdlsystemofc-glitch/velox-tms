-- ============================================================
-- VELOX TMS — Replanejamento ciente de comboio (Onda 7)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Recria redistribute_truck para trocar o VEÍCULO CERTO: o líder (truck_id) ou
-- um veículo secundário do comboio (vehicles[].truck_id). Recebe o caminhão
-- antigo (quebrado) e o novo.

DROP FUNCTION IF EXISTS public.redistribute_truck(UUID,TEXT,UUID[],UUID[],TEXT);

CREATE OR REPLACE FUNCTION public.redistribute_truck(
  p_old_truck_id UUID, p_new_truck_id UUID, p_plate TEXT,
  p_order_ids UUID[], p_trip_ids UUID[], p_user TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- pedidos programados → caminhão substituto
  IF p_order_ids IS NOT NULL THEN
    UPDATE orders SET scheduled_truck_id = p_new_truck_id,
      status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object(
        'status', status,'timestamp',now(),'user',p_user,
        'note','Redistribuído para '||COALESCE(p_plate,'')||' (caminhão anterior indisponível)')
    WHERE id = ANY(p_order_ids);
  END IF;

  -- viagens → troca o caminhão antigo pelo novo (líder e/ou comboio)
  IF p_trip_ids IS NOT NULL THEN
    UPDATE trips SET
      truck_id    = CASE WHEN truck_id = p_old_truck_id THEN p_new_truck_id ELSE truck_id END,
      truck_plate = CASE WHEN truck_id = p_old_truck_id THEN p_plate ELSE truck_plate END,
      vehicles    = COALESCE((SELECT jsonb_agg(
                      CASE WHEN (v->>'truck_id') = p_old_truck_id::text
                           THEN v || jsonb_build_object('truck_id', p_new_truck_id::text, 'truck_plate', p_plate)
                           ELSE v END)
                    FROM jsonb_array_elements(vehicles) v), vehicles),
      events = COALESCE(events,'[]'::jsonb) || jsonb_build_object('type','truck_reassigned',
        'description','Caminhão trocado para '||COALESCE(p_plate,'')||' (anterior em manutenção/inativo)','timestamp',now(),'user',p_user)
    WHERE id = ANY(p_trip_ids);
  END IF;

  RETURN jsonb_build_object('ok', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.redistribute_truck(UUID,UUID,TEXT,UUID[],UUID[],TEXT) TO authenticated;

SELECT 'Replanejamento ciente de comboio pronto.' AS resultado;

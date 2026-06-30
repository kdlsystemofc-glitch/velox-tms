-- ============================================================
-- VELOX TMS — Rastreamento ao vivo (Mega-feature 1)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Modelo: o app do motorista envia a posição (GPS) durante a viagem em andamento
-- via RPC update_trip_location (SECURITY DEFINER, valida que é o motorista da
-- viagem). A última posição fica em trips.current_lat/lng; o histórico (rastro)
-- vai para trip_positions. O admin lê direto (RLS de staff). O cliente do portal
-- vê só a posição da carga dele, via order_live_location (escopo por client_id).

-- 1) Última posição conhecida na própria viagem (leitura rápida no mapa)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS current_lat   DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS current_lng   DOUBLE PRECISION;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- 2) Histórico de posições (rastro do trajeto)
CREATE TABLE IF NOT EXISTS public.trip_positions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trip_positions_trip ON public.trip_positions(trip_id, recorded_at DESC);

ALTER TABLE public.trip_positions ENABLE ROW LEVEL SECURITY;
-- Só staff lê o rastro direto; motorista/cliente acessam via RPC (SECURITY DEFINER).
DROP POLICY IF EXISTS trip_positions_staff_select ON public.trip_positions;
CREATE POLICY trip_positions_staff_select ON public.trip_positions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_profiles up
                 WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)));

-- 3) Motorista (ou staff) envia a posição da viagem
CREATE OR REPLACE FUNCTION public.update_trip_location(p_trip_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN RETURN; END IF;
  -- Autoriza: staff OU o motorista vinculado à viagem (incl. comboio em trips.vehicles).
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin','operator') AND COALESCE(up.active,true)
  ) OR EXISTS (
    SELECT 1 FROM public.trips t
    JOIN public.drivers d ON d.user_id = auth.uid()
    WHERE t.id = p_trip_id
      AND (t.driver_id = d.id
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(t.vehicles,'[]'::jsonb)) v
                      WHERE (v->>'driver_id')::uuid = d.id))
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Sem permissão para atualizar a localização desta viagem.';
  END IF;

  UPDATE public.trips
    SET current_lat = p_lat, current_lng = p_lng, location_updated_at = now()
    WHERE id = p_trip_id;

  INSERT INTO public.trip_positions (trip_id, lat, lng) VALUES (p_trip_id, p_lat, p_lng);
END; $$;
GRANT EXECUTE ON FUNCTION public.update_trip_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

-- 4) Portal do cliente: posição ao vivo da carga (só dos pedidos do próprio cliente)
CREATE OR REPLACE FUNCTION public.order_live_location(p_order_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT jsonb_build_object(
    'lat', t.current_lat,
    'lng', t.current_lng,
    'updated_at', t.location_updated_at,
    'trip_status', t.status,
    'truck_plate', t.truck_plate,
    'driver_name', t.driver_name
  )
  FROM public.orders o
  JOIN public.trips t ON t.id = o.trip_id
  WHERE o.id = p_order_id
    AND t.current_lat IS NOT NULL
    AND o.client_id = (
      SELECT up.client_id FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'client' AND COALESCE(up.active, false)
    );
$$;
GRANT EXECUTE ON FUNCTION public.order_live_location(UUID) TO authenticated;

SELECT 'Rastreamento ao vivo pronto: trips.current_lat/lng + trip_positions + update_trip_location/order_live_location.' AS resultado;

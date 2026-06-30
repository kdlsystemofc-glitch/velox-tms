import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";

const SEND_INTERVAL_MS = 20_000; // envia no máx. 1x a cada 20s (bateria/dados)

/**
 * Compartilha a posição do motorista enquanto a viagem está em andamento.
 * Usa navigator.geolocation.watchPosition e faz throttle dos envios via RPC
 * update_trip_location. Degrada com elegância (sem suporte / permissão negada /
 * RPC ainda não migrada).
 *
 * @param {string} tripId
 * @param {boolean} active  liga o rastreio (ex.: trip.status === "in_progress")
 */
export function useTripGeolocation(tripId, active) {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [enabled, setEnabled] = useState(true); // o motorista pode pausar
  const [error, setError] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const lastSendRef = useRef(0);
  const watchRef = useRef(null);

  const send = useCallback(async (lat, lng) => {
    try {
      const { error: rpcError } = await supabase.rpc("update_trip_location", {
        p_trip_id: tripId, p_lat: lat, p_lng: lng,
      });
      if (rpcError) throw rpcError;
      setLastSentAt(new Date());
      setError(null);
    } catch (e) {
      // RPC ausente (migration pendente) ou sem permissão — não trava o app.
      setError(e?.message || "Falha ao enviar localização");
    }
  }, [tripId]);

  const on = active && enabled && supported && !!tripId;

  useEffect(() => {
    if (!on) return;
    setError(null);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSendRef.current < SEND_INTERVAL_MS) return;
        lastSendRef.current = now;
        send(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => setError(err.code === 1 ? "Permissão de localização negada" : "Não foi possível obter a localização"),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
    );
    watchRef.current = watchId;
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [on, send]);

  return { sharing: on, supported, error, lastSentAt, enabled, toggle: () => setEnabled(v => !v) };
}

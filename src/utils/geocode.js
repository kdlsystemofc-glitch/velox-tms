/**
 * VELOX — Geocodificação (Google Maps Platform) + distância real.
 *
 * Usa a chave já existente em Configurações (`google_maps_api_key`). Se não houver
 * chave, tudo degrada graciosamente (retorna null) e o sistema cai na heurística
 * por CEP — então NÃO há custo a menos que você ative a chave, e em volume baixo
 * fica dentro da faixa gratuita do Google.
 */

const _cache = new Map(); // cep → {lat,lng} (cache em memória da sessão)

/** Geocodifica um CEP brasileiro para {lat,lng}. Retorna null se falhar/sem chave. */
export async function geocodeCep(cep, apiKey) {
  const clean = (cep || "").replace(/\D/g, "");
  if (!clean || clean.length < 8 || !apiKey) return null;
  if (_cache.has(clean)) return _cache.get(clean);
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?components=postal_code:${clean}|country:BR&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    const out = loc ? { lat: loc.lat, lng: loc.lng } : null;
    _cache.set(clean, out);
    return out;
  } catch {
    return null;
  }
}

/** Geocodifica vários CEPs e devolve um mapa cep(8díg) → {lat,lng}. */
export async function geocodeCeps(ceps = [], apiKey) {
  const uniq = [...new Set(ceps.map((c) => (c || "").replace(/\D/g, "")).filter((c) => c.length === 8))];
  const out = {};
  for (const cep of uniq) {
    out[cep] = await geocodeCep(cep, apiKey);
  }
  return out;
}

/** Distância em km entre dois pontos {lat,lng} (fórmula de Haversine). */
export function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Monta um link do Google Maps com a sequência de paradas (rota visual, custo zero). */
export function googleMapsRouteUrl(stops = []) {
  const addrs = stops.map((s) => (s.address || s.cep || "").trim()).filter(Boolean).map(encodeURIComponent);
  if (addrs.length === 0) return null;
  if (addrs.length === 1) return `https://www.google.com/maps/search/?api=1&query=${addrs[0]}`;
  const origin = addrs[0];
  const destination = addrs[addrs.length - 1];
  const waypoints = addrs.slice(1, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}` + (waypoints ? `&waypoints=${waypoints}` : "");
}

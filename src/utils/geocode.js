/**
 * VELOX — Geocodificação (Google Maps Platform) + distância real.
 *
 * Usa a chave já existente em Configurações (`google_maps_api_key`). Se não houver
 * chave, tudo degrada graciosamente (retorna null) e o sistema cai na heurística
 * por CEP — então NÃO há custo a menos que você ative a chave, e em volume baixo
 * fica dentro da faixa gratuita do Google.
 */

const _cache = new Map(); // cep → {lat,lng} (cache em memória da sessão)

// Carrega o Maps JavaScript API uma única vez (client-side; funciona com chave
// restrita por referenciador HTTP — diferente do web service, que dá CORS).
let _mapsPromise = null;
function loadGoogleMaps(apiKey) {
  if (typeof window === "undefined" || !apiKey) return Promise.resolve(null);
  if (window.google?.maps?.Geocoder) return Promise.resolve(window.google);
  if (_mapsPromise) return _mapsPromise;
  _mapsPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding&loading=async`;
    s.async = true;
    s.onload = () => resolve(window.google || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return _mapsPromise;
}

/** Geocodifica um CEP brasileiro para {lat,lng}. Retorna null se falhar/sem chave. */
export async function geocodeCep(cep, apiKey) {
  const clean = (cep || "").replace(/\D/g, "");
  if (!clean || clean.length < 8 || !apiKey) return null;
  if (_cache.has(clean)) return _cache.get(clean);
  try {
    const g = await loadGoogleMaps(apiKey);
    if (!g?.maps?.Geocoder) { _cache.set(clean, null); return null; }
    const geocoder = new g.maps.Geocoder();
    const out = await new Promise((resolve) => {
      geocoder.geocode(
        { componentRestrictions: { postalCode: clean, country: "BR" } },
        (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const l = results[0].geometry.location;
            resolve({ lat: l.lat(), lng: l.lng() });
          } else resolve(null);
        }
      );
    });
    _cache.set(clean, out);
    return out;
  } catch {
    _cache.set(clean, null);
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

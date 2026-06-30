import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Pin colorido por tipo (divIcon evita o problema clássico de ícone quebrado
// do Leaflet com bundlers — não dependemos dos PNGs do pacote).
const PIN_COLORS = {
  truck: "#2563eb",       // azul — caminhão
  collection: "#d97706",  // âmbar — coleta
  delivery: "#16a34a",    // verde — entrega
  origin: "#6366f1",      // índigo — origem
  default: "#64748b",
};

function pin(kind, pulse) {
  const color = PIN_COLORS[kind] || PIN_COLORS.default;
  const ring = pulse ? `<span style="position:absolute;inset:-6px;border-radius:9999px;border:2px solid ${color};opacity:.5;animation:lm-pulse 1.6s ease-out infinite"></span>` : "";
  return L.divIcon({
    className: "lm-pin",
    html: `<div style="position:relative;width:18px;height:18px">${ring}<span style="position:absolute;inset:0;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// Ajusta o zoom para enquadrar todos os pontos sempre que eles mudam.
function FitBounds({ points }) {
  const map = useMap();
  useMemo(() => {
    if (!points.length) return;
    if (points.length === 1) { map.setView(points[0], 13); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
  }, [points, map]);
  return null;
}

/**
 * Mapa Leaflet/OpenStreetMap reutilizável (admin + portal).
 * markers: [{ lat, lng, label, kind, pulse }] · trail: [[lat,lng], ...]
 */
export default function LiveMap({ markers = [], trail = [], height = 360, className = "" }) {
  const valid = markers.filter(m => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  const points = useMemo(() => valid.map(m => [m.lat, m.lng]), [valid]);
  const center = points[0] || [-15.78, -47.93]; // Brasília como fallback

  if (valid.length === 0) {
    return (
      <div className={`flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-xl ${className}`} style={{ height }}>
        Sem posição disponível ainda.
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-border ${className}`} style={{ height }}>
      <style>{`@keyframes lm-pulse{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.4);opacity:0}}`}</style>
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.6 }} />}
        {valid.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]} icon={pin(m.kind, m.pulse)}>
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}

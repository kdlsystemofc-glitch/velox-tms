/**
 * VELOX — Cubagem física (volume em m³).
 * Peso é uma restrição; espaço físico é outra. Um caminhão pode "encher" de
 * volume muito antes de atingir o peso (caixas grandes e leves) — S7 / B2-A.
 */

/** Volume interno útil do caminhão em m³ (comp × larg × alt, em metros). */
export function truckVolumeM3(truck) {
  const d = truck?.dimensions || {};
  const l = Number(d.length_m) || 0;
  const w = Number(d.width_m) || 0;
  const h = Number(d.height_m) || 0;
  const v = l * w * h;
  return v > 0 ? v : 0;
}

/** Volume de um item em m³: (A×L×C em cm) ÷ 1.000.000 × volumes. */
export function itemVolumeM3(item) {
  const h = Number(item.height_cm) || 0;
  const w = Number(item.width_cm) || 0;
  const l = Number(item.length_cm) || 0;
  const vols = Number(item.volumes) || 1;
  if (!h || !w || !l) return 0;
  return ((h * w * l) / 1_000_000) * vols;
}

/** Volume total de um pedido (somando os itens de todos os destinatários). */
export function orderVolumeM3(order) {
  return (order.recipients || [])
    .flatMap((r) => r.items || [])
    .reduce((s, it) => s + itemVolumeM3(it), 0);
}

/** Formata m³ com 2 casas. */
export const fmtM3 = (v) => `${(Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m³`;

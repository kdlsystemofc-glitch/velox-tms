/**
 * VELOX — Roteirização heurística (sem API).
 *
 * Ordena as paradas de uma viagem por **proximidade de CEP** (o CEP brasileiro
 * é quase sequencial geograficamente), respeitando a regra: **a coleta de um
 * pedido vem antes das entregas desse mesmo pedido** (não dá para entregar o
 * que ainda não foi coletado).
 *
 * É um nearest-neighbor 1D sobre o CEP (8 dígitos). Aproximado, custo zero.
 * No futuro, basta trocar `distance()` por uma matriz real (Google/ORS) e
 * usar lat/lng — a assinatura continua a mesma.
 *
 * Cada parada deve ter: { type: 'collection'|'delivery', order_id, cep, ... }
 */

const cepNum = (cep) => {
  const d = (cep || "").replace(/\D/g, "").slice(0, 8);
  return d ? parseInt(d, 10) : null;
};

// "distância" entre dois CEPs (proxy 1D). Sem CEP → penalidade alta.
function distance(cepA, cepB) {
  const a = cepNum(cepA);
  const b = cepNum(cepB);
  if (a == null || b == null) return 1e12;
  return Math.abs(a - b);
}

/**
 * @param {Array} stops  paradas (com cep, type, order_id)
 * @param {string} [originCep]  CEP da base/cross-dock para iniciar a rota
 * @returns {Array} mesmas paradas reordenadas + campo stop_order (1..n)
 */
/**
 * Versão com COORDENADAS REAIS (Google geocoding): nearest-neighbor por distância
 * geográfica (Haversine), respeitando coleta-antes-da-entrega.
 *
 * @param {Array} stops    paradas (com cep, type, order_id)
 * @param {Object} coords  mapa cep(8díg) → {lat,lng}
 * @param {Function} hav   função de distância (a,b)=>km (injetada p/ testabilidade)
 */
export function optimizeStopsByCoords(stops = [], coords = {}, hav) {
  if (!Array.isArray(stops) || stops.length <= 1) {
    return stops.map((s, i) => ({ ...s, stop_order: i + 1 }));
  }
  const coordOf = (s) => coords[(s.cep || "").replace(/\D/g, "")];
  const dist = (a, b) => {
    const ca = coordOf(a), cb = coordOf(b);
    if (!ca || !cb) return 1e12;
    return hav(ca, cb);
  };
  const remaining = [...stops];
  const ordered = [];
  const collected = new Set();
  let current = stops.find((s) => s.type === "collection") || stops[0];

  while (remaining.length) {
    let candidates = remaining.filter((s) => s.type === "collection" || collected.has(s.order_id));
    if (candidates.length === 0) candidates = remaining;
    let best = candidates[0];
    let bestDist = dist(current, best);
    for (const c of candidates) {
      const d = dist(current, c);
      if (d < bestDist) { best = c; bestDist = d; }
    }
    ordered.push(best);
    remaining.splice(remaining.indexOf(best), 1);
    if (best.type === "collection") collected.add(best.order_id);
    current = best;
  }
  return ordered.map((s, i) => ({ ...s, stop_order: i + 1 }));
}

export function optimizeStops(stops = [], originCep = "") {
  if (!Array.isArray(stops) || stops.length <= 1) {
    return stops.map((s, i) => ({ ...s, stop_order: i + 1 }));
  }

  const remaining = [...stops];
  const ordered = [];
  const collected = new Set(); // order_ids já coletados
  let currentCep = originCep || stops.find((s) => s.type === "collection")?.cep || stops[0].cep || "";

  while (remaining.length) {
    // candidatos válidos: coletas sempre; entregas só se a coleta do pedido já saiu
    let candidates = remaining.filter(
      (s) => s.type === "collection" || collected.has(s.order_id)
    );
    if (candidates.length === 0) candidates = remaining; // segurança (dados incompletos)

    // escolhe o mais próximo do ponto atual
    let best = candidates[0];
    let bestDist = distance(currentCep, best.cep);
    for (const c of candidates) {
      const d = distance(currentCep, c.cep);
      if (d < bestDist) { best = c; bestDist = d; }
    }

    ordered.push(best);
    remaining.splice(remaining.indexOf(best), 1);
    if (best.type === "collection") collected.add(best.order_id);
    currentCep = best.cep || currentCep;
  }

  return ordered.map((s, i) => ({ ...s, stop_order: i + 1 }));
}

export default optimizeStops;

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

// Precedência: toda entrega vem DEPOIS da coleta do mesmo pedido.
function precedenceOk(route) {
  const collected = new Set();
  for (const s of route) {
    if (s.type === "delivery" && !collected.has(s.order_id)) return false;
    if (s.type === "collection") collected.add(s.order_id);
  }
  return true;
}

// Comprimento do caminho aberto (origem → paradas), somando distOf consecutivos.
function pathLength(route, distOf, start) {
  let total = 0;
  let prev = start;
  for (const s of route) { total += distOf(prev, s); prev = s; }
  return total;
}

// 2-opt: melhora a rota do nearest-neighbor revertendo segmentos, aceitando só
// movimentos que REDUZEM a distância E mantêm a precedência. Parte de uma rota
// já válida, então o resultado é sempre válido (no pior caso, igual à entrada).
function twoOpt(route, distOf, start) {
  let best = route;
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 60) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const cand = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        if (precedenceOk(cand) && pathLength(cand, distOf, start) < pathLength(best, distOf, start) - 1e-9) {
          best = cand;
          improved = true;
        }
      }
    }
  }
  return best;
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
  const startStop = stops.find((s) => s.type === "collection") || stops[0];
  const remaining = [...stops];
  const ordered = [];
  const collected = new Set();
  let current = startStop;

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
  // Refino 2-opt (mantém precedência; só melhora).
  const optimized = twoOpt(ordered, dist, startStop);
  return optimized.map((s, i) => ({ ...s, stop_order: i + 1 }));
}

export function optimizeStops(stops = [], originCep = "") {
  if (!Array.isArray(stops) || stops.length <= 1) {
    return stops.map((s, i) => ({ ...s, stop_order: i + 1 }));
  }

  const startCep = originCep || stops.find((s) => s.type === "collection")?.cep || stops[0].cep || "";
  const remaining = [...stops];
  const ordered = [];
  const collected = new Set(); // order_ids já coletados
  let currentCep = startCep;

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

  // Refino 2-opt (mantém precedência; só melhora). Distância por CEP (proxy 1D).
  const optimized = twoOpt(ordered, (a, b) => distance(a.cep, b.cep), { cep: startCep });
  return optimized.map((s, i) => ({ ...s, stop_order: i + 1 }));
}

export default optimizeStops;

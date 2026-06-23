/**
 * VELOX — Empacotamento 3D do baú (heurística shelf / first-fit decreasing).
 * Não é um solver industrial: é uma aproximação determinística e rápida para
 * VISUALIZAR a ocupação e estimar aproveitamento (peso e volume). S/ rotação 3D
 * completa — só gira o pé da caixa quando isso a faz caber na largura.
 *
 * Eixos (metros): x = comprimento (L), y = altura (H), z = largura (W).
 *
 * @param {{length_m:number,width_m:number,height_m:number}} truck  dimensões internas
 * @param {Array<{volumes,length_cm,width_cm,height_cm,weight_kg,color,orderId,protocol}>} items
 * @returns {{boxes:Array, placed:number, total:number, unplaced:number, usedVolumeM3:number}}
 */
export function packLoad(truck, items) {
  const L = Number(truck?.length_m) || 0;
  const W = Number(truck?.width_m) || 0;
  const H = Number(truck?.height_m) || 0;

  // Explode cada linha em caixas unitárias (peso rateado por volume).
  const units = [];
  for (const it of items || []) {
    const n = Math.max(1, Math.round(Number(it.volumes) || 1));
    const l = (Number(it.length_cm) || 60) / 100;
    const w = (Number(it.width_cm) || 40) / 100;
    const h = (Number(it.height_cm) || 40) / 100;
    const kg = (Number(it.weight_kg) || 0) / n;
    for (let i = 0; i < n; i++) units.push({ l, w, h, kg, color: it.color, orderId: it.orderId, protocol: it.protocol });
  }
  // Maiores primeiro (volume) — melhora o preenchimento.
  units.sort((a, b) => (b.l * b.w * b.h) - (a.l * a.w * a.h));

  const placed = [];
  let unplaced = 0;
  if (L > 0 && W > 0 && H > 0) {
    let x = 0, z = 0, y = 0, rowDepth = 0, layerHeight = 0;
    const EPS = 1e-9;
    for (const b of units) {
      // Orienta o pé da caixa para caber na largura, se necessário.
      let bl = b.l, bw = b.w;
      if (bw > W && bl <= W) { const t = bl; bl = bw; bw = t; }
      // Nova fileira (avança na largura) quando estoura o comprimento.
      if (x + bl > L + EPS) { x = 0; z += rowDepth; rowDepth = 0; }
      // Nova camada (sobe na altura) quando estoura a largura.
      if (z + bw > W + EPS) { z = 0; x = 0; y += layerHeight; layerHeight = 0; }
      // Não cabe de jeito nenhum.
      if (y + b.h > H + EPS || bl > L + EPS || bw > W + EPS) { unplaced++; continue; }
      placed.push({ x, y, z, l: bl, w: bw, h: b.h, kg: b.kg, color: b.color, orderId: b.orderId, protocol: b.protocol });
      x += bl;
      if (bw > rowDepth) rowDepth = bw;
      if (b.h > layerHeight) layerHeight = b.h;
    }
  } else {
    unplaced = units.length;
  }

  const usedVolumeM3 = placed.reduce((s, b) => s + b.l * b.w * b.h, 0);
  return { boxes: placed, placed: placed.length, total: units.length, unplaced, usedVolumeM3 };
}

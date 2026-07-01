import { slaStatus } from "./sla";

// Analytics / BI (2.7) — métricas de nível de serviço e gasto de frete.

/**
 * OTIF (On-Time In-Full) sobre pedidos entregues.
 * On-Time: slaStatus === 'on_time'. In-Full: status 'delivered' (não parcial).
 * OTIF: entregue no prazo E completo.
 */
export function computeOTIF(orders = [], settings) {
  const delivered = orders.filter(o => o.status === "delivered" || o.status === "partially_delivered");
  const total = delivered.length;
  let onTime = 0, inFull = 0, otif = 0;
  for (const o of delivered) {
    const ot = slaStatus(o, settings) === "on_time";
    const inf = o.status === "delivered";
    if (ot) onTime++;
    if (inf) inFull++;
    if (ot && inf) otif++;
  }
  const pct = (n) => total > 0 ? Math.round((n / total) * 1000) / 10 : null;
  return { total, onTime, inFull, otif, onTimePct: pct(onTime), inFullPct: pct(inFull), otifPct: pct(otif) };
}

// Gasto/receita de frete por corredor (origem UF → destino UF).
export function laneAnalysis(orders = []) {
  const map = {};
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const from = o.origin?.state || "?";
    const to = (o.recipients || [])[0]?.state || "?";
    const key = `${from} → ${to}`;
    const m = map[key] || (map[key] = { lane: key, orders: 0, freight: 0, weightKg: 0 });
    m.orders++;
    m.freight += Number(o.freight_value) || 0;
    m.weightKg += Number(o.total_weight_kg) || 0;
  }
  return Object.values(map)
    .map(m => ({ ...m, avgPerKg: m.weightKg > 0 ? m.freight / m.weightKg : 0 }))
    .sort((a, b) => b.freight - a.freight);
}

// Receita de frete por cliente.
export function clientAnalysis(orders = []) {
  const map = {};
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const key = o.client_id || o.client_name || "?";
    const m = map[key] || (map[key] = { client_id: o.client_id, client_name: o.client_name || "—", orders: 0, freight: 0 });
    m.orders++;
    m.freight += Number(o.freight_value) || 0;
  }
  return Object.values(map)
    .map(m => ({ ...m, avgTicket: m.orders > 0 ? m.freight / m.orders : 0 }))
    .sort((a, b) => b.freight - a.freight);
}

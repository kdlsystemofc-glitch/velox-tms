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

// ============================================================
// Indicadores operacionais/financeiros (PA-01) — agregações puras e testáveis.
// Antes viviam inline em Indicators.jsx; centralizadas aqui (fonte única).
// ============================================================

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Intervalo [start, end) para uma chave de período, a partir de `now`. */
export function periodRange(key, now = new Date()) {
  const y = now.getFullYear(), m = now.getMonth();
  const end = new Date(y, m + 1, 1);
  switch (key) {
    case "last_month": return [new Date(y, m - 1, 1), new Date(y, m, 1)];
    case "3m": return [new Date(y, m - 2, 1), end];
    case "6m": return [new Date(y, m - 5, 1), end];
    case "12m": return [new Date(y, m - 11, 1), end];
    case "ytd": return [new Date(y, 0, 1), end];
    default: return [new Date(y, m, 1), end]; // this_month
  }
}

const inRange = (ts, s, e) => { if (!ts) return false; const d = new Date(ts); return d >= s && d < e; };
const histIn = (o, st, s, e) => (o.status_history || []).some(h => h.status === st && inRange(h.timestamp, s, e));

/** KPIs de um período [s, e): entregas, OTD, faturamento/despesa (caixa), margem, ocorrências. */
export function computePeriodKpis({ orders = [], revenues = [], expenses = [], incidents = [] }, settings, s, e) {
  const deliveredOrders = orders.filter(o => histIn(o, "delivered", s, e));
  const delivered = deliveredOrders.length;
  const onTime = deliveredOrders.filter(o => slaStatus(o, settings) === "on_time").length;
  const late = deliveredOrders.filter(o => slaStatus(o, settings) === "late").length;
  const collected = orders.filter(o => histIn(o, "in_transit", s, e) || histIn(o, "collecting", s, e)).length;
  const faturamento = revenues.filter(r => r.status === "received" && inRange(r.received_date || r.due_date, s, e)).reduce((a, r) => a + (r.amount || 0), 0);
  const despesa = expenses.filter(x => x.status === "paid" && inRange(x.paid_date || x.date, s, e)).reduce((a, x) => a + (x.amount || 0), 0);
  const resultado = faturamento - despesa;
  const margin = faturamento > 0 ? (resultado / faturamento) * 100 : 0;
  const otd = delivered > 0 ? (onTime / delivered) * 100 : 0;
  const incidentsCreated = incidents.filter(i => inRange(i.created_date, s, e)).length;
  return { collected, delivered, onTime, late, otd, faturamento, despesa, resultado, margin, incidentsCreated };
}

/** Série dos últimos N meses (tendências). */
export function buildMonthlySeries(data, settings, now = new Date(), months = 12) {
  return Array.from({ length: months }, (_, idx) => {
    const i = months - 1 - idx;
    const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const k = computePeriodKpis(data, settings, s, e);
    return { name: MONTHS_SHORT[s.getMonth()], entregas: k.delivered, otd: Number(k.otd.toFixed(0)), receita: k.faturamento, despesa: k.despesa, resultado: k.resultado, ocorrencias: k.incidentsCreated };
  });
}

/** Pedidos entregues (por status_history) dentro do intervalo. */
export function deliveredInRange(orders = [], s, e) {
  return orders.filter(o => (o.status_history || []).some(h => h.status === "delivered" && inRange(h.timestamp, s, e)));
}

/** Viagens concluídas dentro do intervalo. */
export function completedTripsInRange(trips = [], s, e) {
  return trips.filter(t => t.status === "completed" && inRange(t.arrival_date || t.departure_date, s, e));
}

/** Ranking de clientes por receita (a partir de pedidos entregues). */
export function rankClientsByRevenue(deliveredOrders = [], limit = 5) {
  const map = {};
  deliveredOrders.forEach(o => { const k = o.client_name || "—"; (map[k] ||= { name: k, entregas: 0, receita: 0 }); map[k].entregas++; map[k].receita += o.freight_value || 0; });
  return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, limit);
}

/** Ranking de destinos (cidades) por nº de entregas. */
export function rankDestinations(deliveredOrders = [], limit = 5) {
  const map = {};
  deliveredOrders.forEach(o => (o.recipients || []).forEach(r => { const c = r.city || "—"; (map[c] ||= { city: c, entregas: 0 }); map[c].entregas++; }));
  return Object.values(map).sort((a, b) => b.entregas - a.entregas).slice(0, limit);
}

/** Ranking de motoristas por receita (a partir de viagens concluídas). */
export function rankDriversByRevenue(completedTrips = [], limit = 5) {
  const map = {};
  completedTrips.forEach(t => { const k = t.driver_name || "—"; (map[k] ||= { name: k, viagens: 0, receita: 0 }); map[k].viagens++; map[k].receita += Number(t.total_revenue) || 0; });
  return Object.values(map).sort((a, b) => b.receita - a.receita).slice(0, limit);
}

/** Economia de viagem: km, custo, receita e custo/receita por km. */
export function tripEconomics(completedTrips = []) {
  const km = completedTrips.reduce((s, t) => s + (Number(t.real_km) || 0), 0);
  const cost = completedTrips.reduce((s, t) => s + (Number(t.total_cost) || 0), 0);
  const rev = completedTrips.reduce((s, t) => s + (Number(t.total_revenue) || 0), 0);
  return { km, cost, rev, custoKm: km > 0 ? cost / km : 0, receitaKm: km > 0 ? rev / km : 0 };
}

/** Lead time médio (dias) entre coleta/trânsito e entrega. */
export function leadTimeAvgDays(deliveredOrders = []) {
  const times = deliveredOrders.map(o => {
    const h = o.status_history || [];
    const startEv = h.find(x => x.status === "collecting" || x.status === "in_transit");
    const delEv = [...h].reverse().find(x => x.status === "delivered");
    if (!startEv || !delEv) return null;
    const v = (new Date(delEv.timestamp) - new Date(startEv.timestamp)) / 86400000;
    return v >= 0 ? v : null;
  }).filter(v => v != null);
  return times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
}

/**
 * Agregado completo do painel de Indicadores para um período — ponto único.
 * @returns { cur, prev, series, topClientes, topDestinos, topMotoristas, econ, ticket, leadAvg, freightDelivered }
 */
export function computeIndicators(data, settings, period = "this_month", now = new Date()) {
  const [start, end] = periodRange(period, now);
  const prevStart = new Date(start.getTime() - (end - start));
  const cur = computePeriodKpis(data, settings, start, end);
  const prev = computePeriodKpis(data, settings, prevStart, start);
  const series = buildMonthlySeries(data, settings, now, 12);
  const deliveredOrders = deliveredInRange(data.orders, start, end);
  const completedTrips = completedTripsInRange(data.trips, start, end);
  const econ = tripEconomics(completedTrips);
  const freightDelivered = deliveredOrders.reduce((s, o) => s + (o.freight_value || 0), 0);
  const ticket = deliveredOrders.length > 0 ? freightDelivered / deliveredOrders.length : 0;
  return {
    cur, prev, series,
    topClientes: rankClientsByRevenue(deliveredOrders),
    topDestinos: rankDestinations(deliveredOrders),
    topMotoristas: rankDriversByRevenue(completedTrips),
    econ, ticket, freightDelivered, leadAvg: leadTimeAvgDays(deliveredOrders),
  };
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

/**
 * VELOX — SLA de entrega (prazo combinado × realizado).
 *
 * O prazo previsto é a data de coleta + dias úteis do destino (tabela de prazos
 * por estado/corredor). O realizado vem do status_history (evento 'delivered').
 */
import { getDeliveryDaysByState } from "./freightCalculator";

function addBusinessDays(dateStr, days) {
  if (!dateStr || !days) return null;
  const d = new Date(dateStr + "T12:00:00");
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

/** Data-limite de entrega prevista (Date) — usa o destino mais distante. */
export function slaDeadline(order, settings) {
  if (order.delivery_deadline) return new Date(order.delivery_deadline + "T12:00:00");
  const base = order.scheduled_date || order.collection_date;
  if (!base) return null;
  const states = [...new Set((order.recipients || []).map(r => r.state).filter(Boolean))];
  const days = states.length
    ? Math.max(...states.map(s => getDeliveryDaysByState(s, settings, order.origin?.state) || 0))
    : 0;
  if (!days) return null;
  return addBusinessDays(base, days);
}

/** Data em que o pedido foi efetivamente entregue (Date) ou null. */
export function deliveredDate(order) {
  const entry = (order.status_history || []).filter(h => h.status === "delivered" && h.timestamp).pop();
  return entry ? new Date(entry.timestamp) : null;
}

/** 'on_time' | 'late' | 'at_risk' | 'pending' */
export function slaStatus(order, settings) {
  const deadline = slaDeadline(order, settings);
  const done = deliveredDate(order);
  if (done) {
    if (!deadline) return "on_time";
    return done <= new Date(deadline.getTime() + 86400000 - 1) ? "on_time" : "late";
  }
  if (order.status === "cancelled") return "pending";
  if (deadline && new Date() > deadline) return "late";       // já passou e não entregou
  if (deadline) {
    const hrsLeft = (deadline - new Date()) / 3600000;
    if (hrsLeft <= 24) return "at_risk";
  }
  return "pending";
}

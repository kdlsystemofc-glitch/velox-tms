/**
 * VELOX — Detecção de "pedido parado" (item 42 / L-004 do relatório de QA).
 *
 * Um pedido que entra no sistema e fica sem avançar — nunca programado, nunca
 * cancelado, nunca executado — é um risco operacional clássico. O sistema deve
 * sinalizar isso ativamente em vez de deixar a carga esquecida.
 *
 * Regra: um pedido está "parado" quando há mais de N dias (limite configurável)
 * que ele foi criado E ele continua em um status inicial sem programação:
 *   - status `new` (nunca confirmado), ou
 *   - status `confirmed` mas SEM caminhão/data programados e sem viagem.
 *
 * Pedidos entregues, em trânsito, em coleta, cancelados ou já programados não
 * contam como parados.
 */

export const DEFAULT_STALE_DAYS = 3;

const STUCK_STATUSES = new Set(["new", "confirmed"]);

/** Dias inteiros decorridos entre `since` e `now` (>= 0; inválido → 0). */
export function daysSince(since, now = new Date()) {
  if (!since) return 0;
  const t = since instanceof Date ? since.getTime() : new Date(since).getTime();
  if (isNaN(t)) return 0;
  const diffMs = now.getTime() - t;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 86_400_000);
}

/** Um pedido está programado quando tem caminhão+data ou já entrou numa viagem. */
export function isScheduled(order) {
  return !!(order?.trip_id || (order?.scheduled_truck_id && order?.scheduled_date));
}

/**
 * true se o pedido está "parado" há `limitDays` dias OU MAIS.
 * Usamos ">=" (e não ">") para que a regra seja configurável e testável:
 * com o limite em 0, qualquer pedido sem programação já conta como parado
 * (útil para validar o alerta sem esperar dias reais). `now` é injetável.
 */
export function isStaleOrder(order, limitDays = DEFAULT_STALE_DAYS, now = new Date()) {
  if (!order || !STUCK_STATUSES.has(order.status)) return false;
  if (isScheduled(order)) return false;
  return daysSince(order.created_date || order.created_at, now) >= limitDays;
}

/**
 * Filtra os pedidos parados de uma lista, anexando `stale_days` a cada um,
 * ordenados do mais antigo para o mais recente.
 */
export function findStaleOrders(orders = [], limitDays = DEFAULT_STALE_DAYS, now = new Date()) {
  return orders
    .filter(o => isStaleOrder(o, limitDays, now))
    .map(o => ({ ...o, stale_days: daysSince(o.created_date || o.created_at, now) }))
    .sort((a, b) => b.stale_days - a.stale_days);
}

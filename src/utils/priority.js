/**
 * VELOX — Prioridade OPERACIONAL do pedido.
 *
 * Diferente de `freight_type` (shared/urgent/dedicated), que é um atributo de
 * PRECIFICAÇÃO. A prioridade aqui é puramente operacional: define a ordem em
 * que a operação deve programar/atender os pedidos na fila, independentemente
 * de quanto o cliente pagou. Um cliente com acordo de prioridade contratual
 * (item 45) pode ser "crítico" pagando frete normal.
 */

// Ordem do mais urgente para o menos urgente. `rank` é usado para ordenar a fila.
export const PRIORITIES = [
  { value: "critical", label: "Crítica", short: "Crítica", rank: 0, color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  { value: "high",     label: "Urgente", short: "Urgente", rank: 1, color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { value: "normal",   label: "Normal",  short: "Normal",  rank: 2, color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
];

export const DEFAULT_PRIORITY = "normal";

const BY_VALUE = Object.fromEntries(PRIORITIES.map(p => [p.value, p]));

/** Normaliza qualquer valor para uma prioridade válida (fallback = normal). */
export function normalizePriority(value) {
  return BY_VALUE[value] ? value : DEFAULT_PRIORITY;
}

/** Metadados (label/cor/rank) de uma prioridade, à prova de valor inválido. */
export function priorityMeta(value) {
  return BY_VALUE[normalizePriority(value)];
}

/** Rank numérico (0 = mais urgente). Valor inválido cai em normal. */
export function priorityRank(value) {
  return priorityMeta(value).rank;
}

/** true quando a prioridade exige destaque visual (urgente ou crítica). */
export function isElevatedPriority(value) {
  return priorityRank(value) < priorityRank(DEFAULT_PRIORITY);
}

/**
 * Comparador para ordenar uma lista de pedidos: críticos primeiro, depois
 * urgentes, depois normais. Empate é resolvido por um critério secundário
 * opcional (ex.: data de coleta mais próxima).
 */
export function comparePriority(a, b, tiebreak) {
  const d = priorityRank(a?.priority) - priorityRank(b?.priority);
  if (d !== 0) return d;
  return typeof tiebreak === "function" ? tiebreak(a, b) : 0;
}

/** Retorna uma nova lista ordenada por prioridade (não muta a original). */
export function sortByPriority(orders = [], tiebreak) {
  return [...orders].sort((a, b) => comparePriority(a, b, tiebreak));
}

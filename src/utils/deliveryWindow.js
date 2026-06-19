/**
 * VELOX — Janela de recebimento do destinatário (S6 / B2-B).
 *
 * Estrutura do campo `delivery_window` (no cliente e/ou no destinatário):
 *   { days: [1,2,3,4,5], start: "08:00", end: "11:00" }
 *   days = dias da semana (0=domingo … 6=sábado). Vazio/ausente = sem restrição.
 */

export const WEEKDAYS = [
  { v: 1, label: "Seg" }, { v: 2, label: "Ter" }, { v: 3, label: "Qua" },
  { v: 4, label: "Qui" }, { v: 5, label: "Sex" }, { v: 6, label: "Sáb" }, { v: 0, label: "Dom" },
];

export function hasWindow(win) {
  return !!win && Array.isArray(win.days) && win.days.length > 0;
}

/** Uma data (yyyy-mm-dd) cai num dia da semana aceito pela janela? */
export function dateAllowedByWindow(win, dateStr) {
  if (!hasWindow(win)) return true; // sem janela = aceita sempre
  if (!dateStr) return true;
  const d = new Date(dateStr + "T12:00:00");
  return win.days.includes(d.getDay());
}

/** Texto curto para exibir a janela. */
export function windowLabel(win) {
  if (!hasWindow(win)) return "Sem restrição";
  const days = win.days
    .map((v) => WEEKDAYS.find((w) => w.v === v)?.label)
    .filter(Boolean)
    .join(", ");
  const hours = win.start && win.end ? ` ${win.start}–${win.end}` : "";
  return `${days}${hours}`;
}

/**
 * Para um pedido, retorna a janela mais restritiva entre os destinatários
 * (usa a do destinatário; se não houver, a do cliente é passada à parte).
 */
export function orderWindowConflicts(order, dateStr, clientWindow) {
  const conflicts = [];
  for (const r of order.recipients || []) {
    const win = hasWindow(r.delivery_window) ? r.delivery_window : clientWindow;
    if (hasWindow(win) && !dateAllowedByWindow(win, dateStr)) {
      conflicts.push({ recipient: r.name || "destinatário", window: windowLabel(win) });
    }
  }
  return conflicts;
}

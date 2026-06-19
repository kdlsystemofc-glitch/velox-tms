/**
 * VELOX — Janela de recebimento/coleta (S6 / B2-B).
 *
 * Estrutura do campo (no cliente e/ou no destinatário):
 *   { days:[1,2,3,4,5], start:"08:00", end:"18:00", pause_start:"12:00", pause_end:"13:00" }
 *   days = dias da semana (0=domingo … 6=sábado). Vazio/ausente = sem restrição.
 *   pause_* = intervalo (almoço) em que NÃO recebe, dentro do horário.
 */

const toMin = (t) => {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

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

/** Um horário ("HH:MM") cai dentro da janela, respeitando a pausa (almoço)? */
export function timeAllowedByWindow(win, timeStr) {
  if (!hasWindow(win)) return true;
  const t = toMin(timeStr);
  if (t == null) return true;
  const s = toMin(win.start), e = toMin(win.end);
  if (s != null && t < s) return false;
  if (e != null && t > e) return false;
  const ps = toMin(win.pause_start), pe = toMin(win.pause_end);
  if (ps != null && pe != null && t >= ps && t < pe) return false; // dentro do almoço
  return true;
}

/** Texto curto para exibir a janela. */
export function windowLabel(win) {
  if (!hasWindow(win)) return "Sem restrição";
  const days = win.days
    .map((v) => WEEKDAYS.find((w) => w.v === v)?.label)
    .filter(Boolean)
    .join(", ");
  const hours = win.start && win.end ? ` ${win.start}–${win.end}` : "";
  const pause = win.pause_start && win.pause_end ? ` (pausa ${win.pause_start}–${win.pause_end})` : "";
  return `${days}${hours}${pause}`;
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

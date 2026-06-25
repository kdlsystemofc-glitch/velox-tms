/**
 * VELOX — Utilitários de data timezone-safe.
 *
 * Problema que resolve:
 *  - `new Date().toISOString().split("T")[0]` retorna a data em UTC.
 *    No Brasil (UTC-3), após ~21h isso vira o DIA SEGUINTE.
 *  - `new Date("2026-06-12")` é interpretado como meia-noite UTC,
 *    que no Brasil é 21h do dia ANTERIOR — datas exibidas com -1 dia.
 *
 * Regra do projeto: datas de negócio (coleta, vencimento, programação)
 * são strings "YYYY-MM-DD" no fuso LOCAL. Use sempre estas funções.
 */

/** Data de hoje no fuso local como "YYYY-MM-DD". */
export function todayLocalISO() {
  return toLocalISO(new Date());
}

/** Converte um Date para "YYYY-MM-DD" usando o fuso local (não UTC). */
export function toLocalISO(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Faz o parse de "YYYY-MM-DD" como data LOCAL (meio-dia, para ser imune
 * a qualquer deslocamento de fuso em exibição/comparação).
 * Retorna null para entrada inválida.
 */
export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
}

/** Formata "YYYY-MM-DD" como "dd/mm/aaaa" sem risco de shift de fuso. */
export function formatDateBR(dateStr) {
  const d = parseLocalDate(dateStr);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}

/**
 * Formata um timestamp (ISO, Date ou epoch) como "dd/MM HH:mm" de forma
 * À PROVA DE CRASH: uma data inválida retorna o fallback em vez de lançar
 * `RangeError: Invalid time value` (que derrubaria a tela inteira via
 * ErrorBoundary). Use sempre isto para timestamps de eventos/paradas que
 * podem ter vindo de seeds/integrações com valores malformados.
 */
export function formatDateTimeBR(value, fallback = "") {
  if (value == null || value === "") return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return fallback;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

/** Formata só a hora ("HH:mm") de um timestamp, à prova de crash. */
export function formatTimeBR(value, fallback = "") {
  if (value == null || value === "") return fallback;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Formata qualquer valor de data (ISO completo, "YYYY-MM-DD", Date ou epoch)
 * como "dd/MM/aaaa" SEM lançar exceção em datas inválidas. Substituto seguro
 * para `format(parseISO(x), "dd/MM/yyyy")`, que derruba a tela com
 * "Invalid time value" quando `x` está malformado.
 */
export function safeDateBR(value, fallback = "—") {
  if (value == null || value === "") return fallback;
  // "YYYY-MM-DD" puro: usa o parser local (imune a shift de fuso).
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDateBR(value);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString("pt-BR");
}

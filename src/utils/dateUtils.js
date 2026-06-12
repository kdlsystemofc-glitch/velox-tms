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

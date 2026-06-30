/**
 * VELOX — parse de número no formato brasileiro ("28.500,00" → 28500.00).
 * `Number()` puro retorna NaN nesses casos (ponto de milhar + vírgula decimal).
 * Centraliza a lógica que estava repetida em vários formulários (C2 da auditoria).
 */
export function parseBRNumber(value) {
  if (typeof value === "number") return value;
  if (value == null || value === "") return 0;
  const n = parseFloat(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

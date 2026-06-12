/**
 * VELOX — Utilitários de NF-e.
 */

/**
 * Valida a chave de acesso da NF-e (44 dígitos).
 * Verifica comprimento, formato numérico e o dígito verificador (módulo 11).
 *
 * @param {string} key - chave com ou sem espaços/pontuação
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateNFeKey(key) {
  const digits = String(key || "").replace(/\D/g, "");
  if (digits.length === 0) return { valid: false, reason: "vazia" };
  if (digits.length !== 44) return { valid: false, reason: `deve ter 44 dígitos (tem ${digits.length})` };

  // Dígito verificador: módulo 11 com pesos 2..9 da direita para a esquerda (43 primeiros dígitos)
  const weights = [];
  let w = 2;
  for (let i = 42; i >= 0; i--) {
    weights[i] = w;
    w = w === 9 ? 2 : w + 1;
  }
  let sum = 0;
  for (let i = 0; i < 43; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  if (dv !== Number(digits[43])) return { valid: false, reason: "dígito verificador inválido" };

  return { valid: true };
}

/** Extrai o número da NF (posições 26-34 da chave) — útil para preencher nf_number. */
export function nfNumberFromKey(key) {
  const digits = String(key || "").replace(/\D/g, "");
  if (digits.length !== 44) return null;
  return String(Number(digits.slice(25, 34)));
}

/** Formata a chave em grupos de 4 para exibição. */
export function formatNFeKey(key) {
  const digits = String(key || "").replace(/\D/g, "").slice(0, 44);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

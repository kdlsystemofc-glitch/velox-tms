/**
 * VELOX — Validação e máscara de documentos (placa, CPF).
 * Funções puras, testáveis. Usadas nos cadastros de Frota.
 */

// ── Placa (Brasil) ────────────────────────────────────────────
// Aceita o padrão antigo (ABC-1234) e o Mercosul (ABC1D23).
const PLATE_OLD = /^[A-Z]{3}[0-9]{4}$/;       // ABC1234
const PLATE_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/; // ABC1D23

/** Normaliza: maiúsculas, só letras/números, sem hífen, máx 7. */
export function normalizePlate(value) {
  return (value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

/** Formata para exibição: ABC-1234 (antigo) ou ABC1D23 (Mercosul, sem hífen). */
export function formatPlate(value) {
  const p = normalizePlate(value);
  if (PLATE_OLD.test(p)) return `${p.slice(0, 3)}-${p.slice(3)}`;
  return p;
}

/** true se a placa (normalizada) é válida em algum dos dois padrões. */
export function isValidPlate(value) {
  const p = normalizePlate(value);
  return PLATE_OLD.test(p) || PLATE_MERCOSUL.test(p);
}

// ── CPF ───────────────────────────────────────────────────────
/** Mantém só dígitos, máx 11. */
export function onlyDigits(value, max = Infinity) {
  return (value || "").replace(/\D/g, "").slice(0, max);
}

/** Aplica a máscara 000.000.000-00 conforme digita. */
export function formatCPF(value) {
  const d = onlyDigits(value, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Validação completa de CPF (dígitos verificadores). */
export function isValidCPF(value) {
  const cpf = onlyDigits(value, 11);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos iguais
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

// ── CNPJ ──────────────────────────────────────────────────────
/** Aplica a máscara 00.000.000/0000-00 conforme digita. */
export function formatCNPJ(value) {
  const d = onlyDigits(value, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Validação completa de CNPJ (dígitos verificadores). */
export function isValidCNPJ(value) {
  const cnpj = onlyDigits(value, 14);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

// ── CPF/CNPJ combinado (detecta pelo tamanho) ─────────────────
/** Máscara automática: ≤11 dígitos vira CPF, acima vira CNPJ. */
export function formatCpfCnpj(value) {
  const d = onlyDigits(value, 14);
  return d.length <= 11 ? formatCPF(d) : formatCNPJ(d);
}

/** Válido se for um CPF (11) OU um CNPJ (14) com dígitos corretos. */
export function isValidCpfCnpj(value) {
  const d = onlyDigits(value, 14);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

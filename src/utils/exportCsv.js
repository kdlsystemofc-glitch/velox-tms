/**
 * VELOX — Exportação CSV (abre direto no Excel pt-BR).
 * Separador ';' (padrão do Excel Brasil) e BOM UTF-8 para acentuação correta.
 *
 * columns: [{ key, label, format?(value, row) }]
 */
function csvCell(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[";\n\r]/.test(s) ? `"${s}"` : s;
}

export function toCsv(rows = [], columns = []) {
  const header = columns.map((c) => csvCell(c.label)).join(";");
  const lines = rows.map((r) =>
    columns.map((c) => csvCell(c.format ? c.format(r[c.key], r) : r[c.key])).join(";")
  );
  return [header, ...lines].join("\r\n");
}

export function downloadCsv(filename, rows = [], columns = []) {
  const csv = "﻿" + toCsv(rows, columns); // BOM p/ Excel reconhecer UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Helpers de formatação comuns. */
export const csvMoney = (v) => (v == null ? "" : Number(v).toFixed(2).replace(".", ","));
export const csvDate = (v) => {
  if (!v) return "";
  const d = new Date(typeof v === "string" && v.length === 10 ? v + "T12:00:00" : v);
  return isNaN(d) ? "" : d.toLocaleDateString("pt-BR");
};

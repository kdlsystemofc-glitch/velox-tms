// Parser de extrato bancário: OFX (padrão de bancos BR) e CSV.
// Saída normalizada: { fitid, posted_at: "YYYY-MM-DD", amount: Number(assinado),
// description, memo, source }. amount > 0 = crédito (entrada); < 0 = débito (saída).

// Converte valor monetário (US "1234.56" ou BR "1.234,56", com sinal) em Number.
export function parseAmount(raw) {
  if (raw == null) return NaN;
  let s = String(raw).trim().replace(/\s/g, "");
  const neg = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "").replace(/[^0-9.,-]/g, "").replace(/-/g, "");
  if (s.includes(",") && s.includes(".")) {
    // o último separador é o decimal
    s = s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")   // BR: 1.234,56
      : s.replace(/,/g, "");                       // US: 1,234.56
  } else if (s.includes(",")) {
    s = s.replace(",", ".");                        // 1234,56
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return NaN;
  return neg ? -n : n;
}

// "20240115..." ou "2024-01-15" ou "15/01/2024" → "2024-01-15"
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);          // YYYYMMDD / YYYY-MM-DD
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);              // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
  return m ? m[1].trim() : "";
}

export function parseOFX(text) {
  const out = [];
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi)
    || text.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>)/gi)
    || [];
  for (const b of blocks) {
    const posted_at = normalizeDate(tag(b, "DTPOSTED"));
    const amount = parseAmount(tag(b, "TRNAMT"));
    if (!posted_at || Number.isNaN(amount)) continue;
    const name = tag(b, "NAME");
    const memo = tag(b, "MEMO");
    const fitid = tag(b, "FITID") || `ofx:${posted_at}:${amount}:${(name || memo).slice(0, 24)}`;
    out.push({ fitid, posted_at, amount, description: name || memo || "Lançamento", memo, source: "ofx" });
  }
  return out;
}

// Detecta delimitador e colunas (data / valor / descrição) de forma tolerante.
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  const delim = (lines[0].match(/;/g)?.length || 0) >= (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
  const split = (l) => l.split(delim).map(c => c.trim().replace(/^"|"$/g, ""));

  // Header?
  const header = split(lines[0]).map(h => h.toLowerCase());
  const hasHeader = header.some(h => /data|date|valor|amount|hist|descri|memo/.test(h));
  const idx = (re, def) => { const i = header.findIndex(h => re.test(h)); return i >= 0 ? i : def; };
  const di = hasHeader ? idx(/data|date/, 0) : 0;
  const ai = hasHeader ? idx(/valor|amount|montante/, 1) : 1;
  const ci = hasHeader ? idx(/hist|descri|memo|lan|name/, 2) : 2;

  const out = [];
  for (let i = hasHeader ? 1 : 0; i < lines.length; i++) {
    const cols = split(lines[i]);
    const posted_at = normalizeDate(cols[di]);
    const amount = parseAmount(cols[ai]);
    if (!posted_at || Number.isNaN(amount)) continue;
    const description = (cols[ci] || cols.filter((_, k) => k !== di && k !== ai).join(" ") || "Lançamento").trim();
    out.push({
      fitid: `csv:${posted_at}:${amount}:${description.slice(0, 24)}`,
      posted_at, amount, description, memo: "", source: "csv",
    });
  }
  return out;
}

export function parseBankStatement(filename, text) {
  const isOfx = /\.ofx$/i.test(filename || "") || /<OFX>|<STMTTRN>/i.test(text);
  const rows = isOfx ? parseOFX(text) : parseCSV(text);
  // dedup por fitid dentro do próprio arquivo
  const seen = new Set();
  return rows.filter(r => (seen.has(r.fitid) ? false : (seen.add(r.fitid), true)));
}

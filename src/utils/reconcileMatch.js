// Sugere a baixa de um lançamento do extrato no ledger.
// CRÉDITO (amount > 0) ↔ Fatura em aberto (invoices) OU Receita a receber (revenues).
// DÉBITO  (amount < 0) ↔ Despesa a pagar (expenses, status 'pending').
// Casa por valor exato e ranqueia pela proximidade de data (vencimento/competência).

const DAY = 86400000;
function dayGap(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DAY;
}
const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

// confiança: alta = valor exato e ≤5 dias; média = ≤30 dias; baixa = resto
function confidenceFor(gap) {
  if (gap <= 5) return "high";
  if (gap <= 30) return "medium";
  return "low";
}

// Normaliza os lados em um pool comum { type, id, amount, ref(data), label }.
function buildPool(isCredit, revenues, expenses, invoices) {
  if (!isCredit) {
    return expenses.map(e => ({
      type: "expense", id: e.id, amount: Number(e.amount || 0),
      ref: e.due_date || e.date, label: `${e.description || "—"} · R$ ${fmt(e.amount)}`,
    }));
  }
  return [
    ...invoices.map(i => ({
      type: "invoice", id: i.id, amount: Number(i.total || 0),
      ref: i.due_date || i.issue_date, label: `Fatura ${i.number || ""} · R$ ${fmt(i.total)}`,
    })),
    ...revenues.map(r => ({
      type: "revenue", id: r.id, amount: Number(r.amount || 0),
      ref: r.due_date || r.created_date, label: `${r.description || "—"} · R$ ${fmt(r.amount)}`,
    })),
  ];
}

/**
 * @returns { type, candidate: {id, description, amount}, confidence } | null
 */
export function suggestMatch(tx, revenues = [], expenses = [], invoices = []) {
  const isCredit = tx.amount > 0;
  const target = Math.abs(Number(tx.amount) || 0);
  if (!(target > 0)) return null;

  const pool = buildPool(isCredit, revenues, expenses, invoices);
  const exact = pool.filter(e => Math.abs(e.amount - target) < 0.005);
  if (exact.length === 0) return null;

  exact.sort((a, b) => dayGap(a.ref, tx.posted_at) - dayGap(b.ref, tx.posted_at));
  const best = exact[0];
  return {
    type: best.type,
    candidate: { id: best.id, description: best.label, amount: best.amount },
    confidence: confidenceFor(dayGap(best.ref, tx.posted_at)),
  };
}

// Candidatos para casamento manual (lado certo), ordenados por proximidade de data.
export function matchCandidates(tx, revenues = [], expenses = [], invoices = []) {
  const isCredit = tx.amount > 0;
  return buildPool(isCredit, revenues, expenses, invoices)
    .sort((a, b) => dayGap(a.ref, tx.posted_at) - dayGap(b.ref, tx.posted_at))
    .map(x => ({ type: x.type, id: x.id, label: x.label }));
}

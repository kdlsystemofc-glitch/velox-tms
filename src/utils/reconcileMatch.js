// Sugere a baixa de um lançamento do extrato no ledger.
// CRÉDITO (amount > 0) ↔ Receita a receber (revenues, status 'receivable').
// DÉBITO  (amount < 0) ↔ Despesa a pagar   (expenses, status 'pending').
// Casa por valor exato e ranqueia pela proximidade de data (vencimento/competência).

const DAY = 86400000;
function dayGap(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / DAY;
}

// confiança: alta = valor exato e ≤5 dias; média = valor exato ≤30 dias; baixa = resto
function confidenceFor(gap) {
  if (gap <= 5) return "high";
  if (gap <= 30) return "medium";
  return "low";
}

/**
 * @param tx        { amount, posted_at }
 * @param revenues  receitas em aberto (status 'receivable')
 * @param expenses  despesas em aberto (status 'pending')
 * @returns { type, candidate, confidence } | null
 */
export function suggestMatch(tx, revenues = [], expenses = []) {
  const isCredit = tx.amount > 0;
  const target = Math.abs(Number(tx.amount) || 0);
  if (!(target > 0)) return null;

  const pool = isCredit ? revenues : expenses;
  const type = isCredit ? "revenue" : "expense";
  const refDate = (e) => isCredit ? (e.due_date || e.created_date) : (e.due_date || e.date);

  const exact = pool.filter(e => Math.abs(Number(e.amount || 0) - target) < 0.005);
  if (exact.length === 0) return null;

  exact.sort((a, b) => dayGap(refDate(a), tx.posted_at) - dayGap(refDate(b), tx.posted_at));
  const best = exact[0];
  return { type, candidate: best, confidence: confidenceFor(dayGap(refDate(best), tx.posted_at)) };
}

// Candidatos para casamento manual: mesmos valores em aberto do lado certo,
// já ordenados por proximidade de data (melhores primeiro).
export function matchCandidates(tx, revenues = [], expenses = []) {
  const isCredit = tx.amount > 0;
  const pool = isCredit ? revenues : expenses;
  const type = isCredit ? "revenue" : "expense";
  const refDate = (e) => isCredit ? (e.due_date || e.created_date) : (e.due_date || e.date);
  return [...pool]
    .sort((a, b) => dayGap(refDate(a), tx.posted_at) - dayGap(refDate(b), tx.posted_at))
    .map(e => ({ type, id: e.id, label: `${e.description || "—"} · R$ ${Number(e.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` }));
}

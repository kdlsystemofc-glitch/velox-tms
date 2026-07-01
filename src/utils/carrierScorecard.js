// Scorecard de transportadoras parceiras (2.5) — métricas de desempenho a
// partir dos pedidos subcontratados (carrier_id / carrier_status).

/**
 * @param {Array} orders  pedidos (com carrier_id, carrier_status, status, carrier_amount)
 * @param {string} carrierId
 * @returns {{ offered, accepted, refused, delivered, acceptanceRate, deliveryRate, paid }}
 *   acceptanceRate/deliveryRate: 0–100 (null quando não há base).
 */
export function carrierScorecard(orders = [], carrierId) {
  const mine = orders.filter(o => o.carrier_id === carrierId && o.carrier_status);
  const accepted = mine.filter(o => o.carrier_status === "accepted");
  const refused = mine.filter(o => o.carrier_status === "refused");
  const responded = accepted.length + refused.length;
  const delivered = accepted.filter(o => o.status === "delivered");
  const paid = accepted.reduce((s, o) => s + (Number(o.carrier_amount) || 0), 0);

  return {
    offered: mine.length,
    accepted: accepted.length,
    refused: refused.length,
    delivered: delivered.length,
    acceptanceRate: responded > 0 ? Math.round((accepted.length / responded) * 100) : null,
    deliveryRate: accepted.length > 0 ? Math.round((delivered.length / accepted.length) * 100) : null,
    paid: Number(paid.toFixed(2)),
  };
}

// Ranking de todas as transportadoras (melhores primeiro: aceite, depois volume).
export function rankCarriers(carriers = [], orders = []) {
  return carriers
    .map(c => ({ carrier: c, score: carrierScorecard(orders, c.id) }))
    .sort((a, b) =>
      (b.score.acceptanceRate ?? -1) - (a.score.acceptanceRate ?? -1) ||
      b.score.delivered - a.score.delivered ||
      b.score.offered - a.score.offered);
}

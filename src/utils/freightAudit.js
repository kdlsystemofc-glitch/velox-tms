import { quoteFreight, resolveClientPricing } from "@/services/pricing";

// Re-export para compatibilidade (a regra agora mora no serviço de precificação).
export { resolveClientPricing };

// Conta NFs do pedido (fallback 1).
function nfCountOf(order) {
  const n = (order?.recipients || []).reduce(
    (s, r) => s + ((r.items || []).filter(it => it.nf_number).length), 0);
  return n > 0 ? n : 1;
}

/**
 * Auditoria de frete (2.2 — 3-way match simplificado).
 * Compara o COBRADO (order.freight_value) com o CONTRATADO (recalculado pela
 * tabela/rating engine para o peso/rota/valor do pedido).
 *
 * @returns { charged, expected, diff, diffPct, status }
 *   status: 'ok' | 'under' (cobrado a menos) | 'over' (cobrado a mais) | 'na'
 */
export function auditOrderFreight(order, { client, settings, tolerancePct = 5 } = {}) {
  const charged = Number(order?.freight_value) || 0;
  const weight = Number(order?.total_weight_kg) || 0;
  const declared = Number(order?.total_declared_value) || 0;
  const originState = order?.origin?.state || null;
  const destState = (order?.recipients || [])[0]?.state || null;

  const calc = quoteFreight({
    items: [{ weight_kg: weight, declared_value: declared }],
    nfCount: nfCountOf(order),
    client,
    settings,
    originState, destState,
    freightType: order?.freight_type || "shared",
  });
  const expected = calc ? calc.total : 0;
  const diff = charged - expected;
  const diffPct = expected > 0 ? (diff / expected) * 100 : (charged > 0 ? 100 : 0);

  let status;
  if (expected <= 0 && charged <= 0) status = "na";
  else if (Math.abs(diffPct) <= tolerancePct) status = "ok";
  else if (diff < 0) status = "under";
  else status = "over";

  return {
    charged: Number(charged.toFixed(2)),
    expected: Number(expected.toFixed(2)),
    diff: Number(diff.toFixed(2)),
    diffPct: Number(diffPct.toFixed(1)),
    status,
  };
}

import { auditOrderFreight } from "@/utils/freightAudit";

/**
 * Auditoria 3-way do frete (Projeto 04.2): contratado × executado × cobrado.
 *
 *  • Contratado — preço CONGELADO no snapshot do pedido (P03: freight_breakdown).
 *    É o que foi acordado na cotação/precificação.
 *  • Executado  — preço RECALCULADO agora com os dados reais do pedido (peso/rota/
 *    NFs efetivos), via o mesmo motor (auditOrderFreight). É o que deveria custar
 *    pela execução real.
 *  • Cobrado    — valor efetivamente lançado (receita/fatura, ou order.freight_value).
 *
 * As três divergências permitem separar causas: cotação↔execução (peso mudou),
 * acordo↔cobrança (cobrança fora do contrato) e execução↔cobrança.
 */

function compare(actual, base, tolerancePct) {
  const diff = actual - base;
  const diffPct = base > 0 ? (diff / base) * 100 : (actual > 0 ? 100 : 0);
  let status;
  if (base <= 0 && actual <= 0) status = "na";
  else if (Math.abs(diffPct) <= tolerancePct) status = "ok";
  else if (diff < 0) status = "under"; // abaixo da base
  else status = "over";               // acima da base
  return { diff: Number(diff.toFixed(2)), diffPct: Number(diffPct.toFixed(1)), status };
}

export function auditThreeWay(order, { client, settings, revenue, tolerancePct = 5 } = {}) {
  const charged = Number(revenue?.amount ?? order?.freight_value) || 0;

  const bd = order?.freight_breakdown;
  const contracted = Number(bd?.snapshot_freight_value ?? bd?.total) || 0;

  // Reaproveita o recálculo canônico (mesmo motor/tarifa) como "executado".
  const executed = auditOrderFreight(order, { client, settings, tolerancePct }).expected;

  const contractedVsCharged = compare(charged, contracted, tolerancePct);
  const executedVsCharged   = compare(charged, executed, tolerancePct);
  const contractedVsExecuted = compare(executed, contracted, tolerancePct);

  // Sinaliza se QUALQUER par diverge além da tolerância.
  const pairs = [contractedVsCharged, executedVsCharged, contractedVsExecuted];
  const flagged = pairs.some((p) => p.status === "under" || p.status === "over");
  const allNa = pairs.every((p) => p.status === "na");

  return {
    contracted: Number(contracted.toFixed(2)),
    executed: Number(executed.toFixed(2)),
    charged: Number(charged.toFixed(2)),
    contractedVsCharged,
    executedVsCharged,
    contractedVsExecuted,
    status: allNa ? "na" : flagged ? "diverge" : "ok",
  };
}

import { calculateFreightFull } from "@/utils/freightCalculator";
import { getTariffIndex, resolveTariffPayload } from "@/services/tariff";

/**
 * Resolve a tabela do cliente: mescla `custom_pricing` sobre o padrão quando há
 * algum valor definido; senão retorna null (usa a tabela padrão/corredor).
 * Lar canônico desta regra (antes vivia em freightAudit).
 */
export function resolveClientPricing(client, settings, refDate) {
  // Prioridade: tarifa do cliente VERSIONADA (contrato governado, P03.3) por data
  // > custom_pricing legado (fallback read-through). O motor não muda — recebe o
  // mesmo objeto de preço mesclado sobre a tabela padrão.
  const versioned = client?.id
    ? resolveTariffPayload(getTariffIndex(), "client", client.id, refDate, null)
    : null;
  const map = versioned || client?.custom_pricing;
  const has = map && Object.keys(map).some((k) => map[k] != null && map[k] !== "");
  return has ? { ...(settings?.pricing || {}), ...map } : null;
}

/**
 * Serviço ÚNICO de precificação (Projeto 02.1).
 *
 * Ponto único que resolve a tabela do cliente (custom_pricing) e delega ao motor
 * de frete `calculateFreightFull` (prioridade cliente > corredor > padrão, com
 * faixas de peso, fuel surcharge, GRIS/ad valorem/TDE/TDA/pedágio, taxas etc.).
 * Todas as telas e a auditoria passam por aqui — sem duplicar a montagem.
 *
 * Aceita `client` (resolve custom_pricing internamente) OU `clientPricing` já
 * resolvido — o que preserva exatamente o comportamento de cada chamador.
 *
 * @returns {object|null} breakdown do frete (mesmo formato de calculateFreightFull)
 */
export function quoteFreight({
  items = [],
  originState = null,
  destState = null,
  client = null,
  clientPricing,
  settings = null,
  freightType = "shared",
  nfCount = 1,
  distanceKm = null,
  refDate,
  cubageFactor,
  extraCharges = [],
} = {}) {
  const cp = clientPricing !== undefined ? clientPricing : resolveClientPricing(client, settings, refDate);
  return calculateFreightFull({
    items,
    distanceKm,
    nfCount,
    pricing: settings?.pricing,
    clientPricing: cp,
    originState,
    destState,
    settings,
    freightType,
    refDate,
    cubageFactor,
    extraCharges,
  });
}

/**
 * Congela o cálculo do frete num snapshot imutável (Projeto 03.1).
 *
 * Preserva a saída de `calculateFreightFull` (total, componentes, fonte da tabela,
 * data efetiva) e anexa metadados de captura. Gravado em `orders.freight_breakdown`
 * ao precificar/confirmar — a explicação do valor fica congelada, independente de
 * mudanças futuras na tabela de preços.
 *
 * @param breakdown  saída de quoteFreight / calculateFreightFull (pode ser null)
 * @param opts.freightValue  valor de frete efetivamente gravado (pode diferir do total sugerido)
 * @param opts.capturedBy    origem da captura: "manual" (equipe) | "confirm" | "quote"
 * @returns {object|null} snapshot serializável, ou null se não há breakdown
 */
export function buildFreightSnapshot(breakdown, { freightValue, capturedBy = "manual" } = {}) {
  if (!breakdown) return null;
  return {
    ...breakdown,
    snapshot_at: new Date().toISOString(),
    snapshot_freight_value: freightValue != null && freightValue !== "" ? Number(freightValue) : null,
    captured_by: capturedBy,
  };
}

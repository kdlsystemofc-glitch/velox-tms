import { calculateFreightFull } from "@/utils/freightCalculator";

/**
 * Resolve a tabela do cliente: mescla `custom_pricing` sobre o padrão quando há
 * algum valor definido; senão retorna null (usa a tabela padrão/corredor).
 * Lar canônico desta regra (antes vivia em freightAudit).
 */
export function resolveClientPricing(client, settings) {
  const cp = client?.custom_pricing;
  const has = cp && Object.keys(cp).some((k) => cp[k] != null && cp[k] !== "");
  return has ? { ...(settings?.pricing || {}), ...cp } : null;
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
  const cp = clientPricing !== undefined ? clientPricing : resolveClientPricing(client, settings);
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

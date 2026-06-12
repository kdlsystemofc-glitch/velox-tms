/**
 * VELOX — Motor de cálculo de frete profissional
 * Baseado no modelo real de transportadoras brasileiras
 */

/**
 * Calcula o peso cubado de um item.
 * Fórmula padrão rodoviária: (A × L × C) / 6000
 */
export function calcCubicWeight(heightCm, widthCm, lengthCm, volumes = 1) {
  if (!heightCm || !widthCm || !lengthCm) return 0;
  return ((heightCm * widthCm * lengthCm) / 6000) * volumes;
}

/**
 * Para um item, retorna o peso taxável (maior entre real e cubado)
 */
export function getTaxableWeight(item) {
  const real = Number(item.weight_kg) || 0;
  const volumes = Number(item.volumes) || 1;
  const cubic = calcCubicWeight(Number(item.height_cm), Number(item.width_cm), Number(item.length_cm), volumes);
  return cubic > real ? cubic : real;
}

/**
 * Resolve a tabela de preços para um corredor, respeitando prioridade:
 * clientPricing > route_pricing (por corredor) > pricing padrão
 */
function resolvePricing(basePricing, clientPricing, originState, destState, settings) {
  if (clientPricing) return clientPricing;

  if (originState && destState && settings?.route_pricing?.length > 0) {
    const routeMatch = settings.route_pricing.find(r =>
      r.active !== false &&
      r.origin_state === originState &&
      r.dest_state === destState
    );
    if (routeMatch) {
      // Mescla: campos definidos na rota sobrescrevem o padrão
      return {
        ...(basePricing || {}),
        ...(routeMatch.price_per_kg     != null && routeMatch.price_per_kg     !== "" ? { price_per_kg:         Number(routeMatch.price_per_kg) }         : {}),
        ...(routeMatch.price_per_km     != null && routeMatch.price_per_km     !== "" ? { price_per_km:         Number(routeMatch.price_per_km) }         : {}),
        ...(routeMatch.fixed_fee        != null && routeMatch.fixed_fee        !== "" ? { fixed_fee:            Number(routeMatch.fixed_fee) }            : {}),
        ...(routeMatch.minimum_freight  != null && routeMatch.minimum_freight  !== "" ? { minimum_freight:      Number(routeMatch.minimum_freight) }      : {}),
        ...(routeMatch.gris_percent     != null && routeMatch.gris_percent     !== "" ? { gris_percent:         Number(routeMatch.gris_percent) }         : {}),
        ...(routeMatch.ad_valorem_percent != null && routeMatch.ad_valorem_percent !== "" ? { ad_valorem_percent: Number(routeMatch.ad_valorem_percent) } : {}),
        ...(routeMatch.tde_per_nf       != null && routeMatch.tde_per_nf       !== "" ? { tde_per_nf:           Number(routeMatch.tde_per_nf) }           : {}),
        ...(routeMatch.tda_per_nf       != null && routeMatch.tda_per_nf       !== "" ? { tda_per_nf:           Number(routeMatch.tda_per_nf) }           : {}),
        ...(routeMatch.toll_per_kg      != null && routeMatch.toll_per_kg      !== "" ? { toll_per_kg:          Number(routeMatch.toll_per_kg) }          : {}),
      };
    }
  }

  return basePricing;
}

/**
 * Calcula o frete completo com todos os componentes.
 *
 * Params:
 *   items        - array de itens com weight_kg, volumes, height_cm, width_cm, length_cm, declared_value
 *   distanceKm   - distância em km (opcional)
 *   nfCount      - quantidade de NFs
 *   pricing      - tabela padrão (settings.pricing)
 *   clientPricing - tabela personalizada do cliente (prioridade máxima)
 *   originState  - UF de origem (ex: "SP") — para lookup de route_pricing
 *   destState    - UF de destino (ex: "PR") — para lookup de route_pricing
 *   settings     - CompanySettings completo (para acessar route_pricing)
 */
export function calculateFreightFull(params) {
  const {
    items = [], distanceKm = null, nfCount = 1,
    pricing: p, clientPricing, originState, destState, settings
  } = params;

  const pricing = resolvePricing(p, clientPricing, originState, destState, settings);
  if (!pricing) return null;

  let totalRealKg = 0;
  let totalCubicKg = 0;
  let totalDeclaredValue = 0;
  const cubicDetails = [];

  items.forEach(item => {
    const real = Number(item.weight_kg) || 0;
    const vols = Number(item.volumes) || 1;
    const h = Number(item.height_cm) || 0;
    const w = Number(item.width_cm)  || 0;
    const l = Number(item.length_cm) || 0;

    let cubic = 0;
    let formula = null;

    if (h && w && l) {
      const perUnit = (h * w * l) / 6000;
      cubic = perUnit * vols;
      formula = `${vols} × (${h}×${w}×${l}÷6.000) = ${vols}×${perUnit.toFixed(2)} = ${cubic.toFixed(2)} kg`;
    }

    totalRealKg += real;
    totalCubicKg += cubic;
    totalDeclaredValue += Number(item.declared_value) || 0;

    if (h && w && l) {
      cubicDetails.push({
        description: item.description || "Item",
        volumes: vols,
        realKg: real,
        cubicKg: Number(cubic.toFixed(3)),
        taxableKg: Math.max(real, cubic),
        formula,
        usedCubic: cubic > real,
      });
    }
  });

  const taxableKg = totalCubicKg > totalRealKg ? totalCubicKg : totalRealKg;
  const usedCubic = totalCubicKg > totalRealKg;

  const freightByWeight = taxableKg * (pricing.price_per_kg || 0);
  const freightByDistance = (distanceKm || 0) * (pricing.price_per_km || 0);
  const grisRate = pricing.gris_percent || 0;
  const grisValue = totalDeclaredValue * (grisRate / 100);
  const adValoremRate = pricing.ad_valorem_percent || 0;
  const adValoremValue = totalDeclaredValue * (adValoremRate / 100);
  const tdeValue = (pricing.tde_per_nf || 0) * nfCount;
  const tdaValue = (pricing.tda_per_nf || 0) * nfCount;
  const tollPerKg = pricing.toll_per_kg || 0;
  const tollValue = taxableKg * tollPerKg;
  const fixedFee = pricing.fixed_fee || 0;

  const subtotal = freightByWeight + freightByDistance + grisValue +
                   adValoremValue + tdeValue + tdaValue + tollValue + fixedFee;
  const total = Math.max(subtotal, pricing.minimum_freight || 0);

  return {
    totalRealKg:       Number(totalRealKg.toFixed(3)),
    totalCubicKg:      Number(totalCubicKg.toFixed(3)),
    taxableKg:         Number(taxableKg.toFixed(3)),
    usedCubic,
    totalDeclaredValue,
    freightByWeight:   Number(freightByWeight.toFixed(2)),
    freightByDistance: Number(freightByDistance.toFixed(2)),
    grisValue:         Number(grisValue.toFixed(2)),
    adValoremValue:    Number(adValoremValue.toFixed(2)),
    tdeValue:          Number(tdeValue.toFixed(2)),
    tdaValue:          Number(tdaValue.toFixed(2)),
    tollValue:         Number(tollValue.toFixed(2)),
    fixedFee:          Number(fixedFee.toFixed(2)),
    subtotal:          Number(subtotal.toFixed(2)),
    total:             Number(total.toFixed(2)),
    nfCount,
    distanceKm,
    grisRate,
    adValoremRate,
    cubicDetails,
    // metadados de rota (para debug/display)
    originState,
    destState,
  };
}

/**
 * Versão simplificada — compatibilidade com código existente.
 */
export function calculateFreight(totalWeightKg, distanceKm, settings, clientPricing = null) {
  const pricing = clientPricing || settings?.pricing;
  if (!pricing) return null;
  const byWeight = (totalWeightKg || 0) * (pricing.price_per_kg || 0);
  const byDistance = (distanceKm || 0) * (pricing.price_per_km || 0);
  const total = byWeight + byDistance + (pricing.fixed_fee || 0);
  return Math.max(total, pricing.minimum_freight || 0);
}

/**
 * Calcula o prazo de entrega estimado em dias úteis.
 */
export function calcDeliveryDays(distanceKm, settings) {
  if (!distanceKm || distanceKm <= 0) return null;
  const table = settings?.delivery_days_table || [];
  if (table.length > 0) {
    const match = [...table].sort((a, b) => a.max_km - b.max_km).find(row => distanceKm <= row.max_km);
    if (match) return match.days;
  }
  const kmPerDay = settings?.km_per_day || 600;
  return Math.max(Math.ceil(distanceKm / kmPerDay), 1);
}

/**
 * Retorna prazo estimado por estado de destino.
 * Prioridade: route_pricing.delivery_days > delivery_days_table
 */
export function getDeliveryDaysByState(state, settings, originState = null) {
  // Verificar route_pricing primeiro se tiver originState
  if (originState && settings?.route_pricing?.length > 0) {
    const routeMatch = settings.route_pricing.find(r =>
      r.active !== false &&
      r.origin_state === originState &&
      r.dest_state === state &&
      r.delivery_days
    );
    if (routeMatch) return routeMatch.delivery_days;
  }
  // Fallback para delivery_days_table
  const table = settings?.delivery_days_table || [];
  const match = table.find(row => row.state === state);
  return match ? match.days : null;
}
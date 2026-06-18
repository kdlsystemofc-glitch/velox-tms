/**
 * VELOX — Motor de separação automática de carga (load planning).
 *
 * Agrupa pedidos CONFIRMADOS e SEM viagem em cargas sugeridas por caminhão,
 * ponderando, na ordem:
 *  1. Data de coleta  — só agrupa o que coleta no mesmo dia.
 *  2. Mesmo local de coleta (CEP de origem) — esses pedidos NÃO se separam
 *     entre caminhões (evita mandar 2 veículos ao mesmo ponto no mesmo dia).
 *  3. Região de destino (UF + prefixo de CEP) — junta o que é próximo.
 *  4. Peso × capacidade do veículo (bin-packing first-fit).
 *  5. Disponibilidade do veículo (só status "available", capacidade > 0).
 *
 * Retorna { loads, unassigned } onde cada load = { truck, date, orders, weight, regions }.
 */

const onlyDigits = (s) => (s || "").replace(/\D/g, "");

function destOf(order) {
  const r = (order.recipients && order.recipients[0]) || {};
  return {
    uf: r.state || order.origin?.state || "??",
    cep3: onlyDigits(r.cep).slice(0, 3) || "000",
    city: r.city || order.origin?.city || "—",
  };
}

export function regionKey(order) {
  const d = destOf(order);
  return `${d.uf}-${d.cep3}`;
}

export function regionLabel(order) {
  const d = destOf(order);
  return `${d.city}/${d.uf}`;
}

export function planLoads(orders = [], trucks = []) {
  const pool = orders.filter((o) => o.status === "confirmed" && !o.trip_id);
  const fleet = trucks
    .filter((t) => t.status === "available" && (t.capacity_kg || 0) > 0)
    .sort((a, b) => (b.capacity_kg || 0) - (a.capacity_kg || 0));

  if (!pool.length) return { loads: [], unassigned: [], reason: pool.length ? null : "Nenhum pedido confirmado na fila." };
  if (!fleet.length) return { loads: [], unassigned: pool, reason: "Nenhum caminhão disponível (verifique status/capacidade na Frota)." };

  // 1) agrupa por data de coleta
  const byDate = {};
  pool.forEach((o) => {
    const d = o.collection_date || "sem-data";
    (byDate[d] = byDate[d] || []).push(o);
  });

  const loads = [];
  const unassigned = [];

  Object.keys(byDate).sort().forEach((date) => {
    const dayOrders = byDate[date];

    // 2) "unidades" = pedidos do mesmo CEP de origem ficam juntos
    const pickup = {};
    dayOrders.forEach((o) => {
      const k = onlyDigits(o.origin?.cep) || `sem-cep-${o.id}`;
      (pickup[k] = pickup[k] || []).push(o);
    });
    let units = Object.values(pickup).map((group) => ({
      orders: group,
      weight: group.reduce((s, o) => s + (o.total_weight_kg || 0), 0),
      region: regionKey(group[0]),
    }));

    // 3) ordena por região (clusteriza) e peso desc
    units.sort((a, b) => a.region.localeCompare(b.region) || b.weight - a.weight);

    // 4) bin-packing: 1 carga por caminhão por data
    const truckLoads = fleet.map((t) => ({ truck: t, date, orders: [], weight: 0, regions: new Set() }));
    units.forEach((u) => {
      const target = truckLoads
        .filter((tl) => tl.weight + u.weight <= tl.truck.capacity_kg)
        .sort((a, b) => {
          // prefere caminhão que já leva a mesma região; depois o menos carregado
          const aHas = a.regions.has(u.region) ? 0 : 1;
          const bHas = b.regions.has(u.region) ? 0 : 1;
          return aHas - bHas || a.weight - b.weight;
        })[0];
      if (!target) {
        unassigned.push(...u.orders);
        return;
      }
      target.orders.push(...u.orders);
      target.weight += u.weight;
      target.regions.add(u.region);
    });

    truckLoads
      .filter((tl) => tl.orders.length)
      .forEach((tl) => loads.push({ ...tl, regions: [...tl.regions] }));
  });

  return { loads, unassigned, reason: null };
}

export default planLoads;

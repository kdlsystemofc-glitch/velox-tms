/**
 * VELOX — Motor de separação automática de carga (load planning).
 *
 * Agrupa pedidos CONFIRMADOS e SEM viagem em cargas sugeridas por caminhão,
 * ponderando, na ordem:
 *  1. Data de coleta  — só agrupa o que coleta no mesmo dia.
 *  2. Prioridade — pedidos URGENTES são alocados primeiro (B2-C).
 *  3. Mesmo local de coleta (CEP de origem) — não se separam entre caminhões.
 *  4. Região de destino (UF + prefixo de CEP) — junta o que é próximo.
 *  5. Peso × capacidade E volume × cubagem interna do veículo (B2-A / S7).
 *  6. Disponibilidade do veículo (só status "available").
 *
 * Cada sugestão vem com uma EXPLICAÇÃO (B2-D) e os não-alocados vêm com o
 * MOTIVO específico (B2-E).
 *
 * Retorna { loads, unassigned, reason } onde:
 *   load = { truck, date, orders, weight, volume, regions, why }
 *   unassigned = [{ order, reason }]
 */

import { truckVolumeM3, orderVolumeM3 } from "./cargoVolume";
import { slaStatus } from "./sla";

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

/** Chave de "mesma região" mais fina: cidade + bairro (S8). */
export function localityKey(order) {
  const r = (order.recipients && order.recipients[0]) || {};
  const city = (r.city || "").toLowerCase().trim();
  const hood = (r.neighborhood || "").toLowerCase().trim();
  return `${city}|${hood}`;
}

export function planLoads(orders = [], trucks = [], settings = null) {
  const pool = orders.filter((o) => o.status === "confirmed" && !o.trip_id);
  const fleet = trucks
    .filter((t) => t.status === "available" && (t.capacity_kg || 0) > 0)
    .sort((a, b) => (b.capacity_kg || 0) - (a.capacity_kg || 0));

  if (!pool.length) return { loads: [], unassigned: [], reason: "Nenhum pedido confirmado na fila." };
  if (!fleet.length) return { loads: [], unassigned: pool.map((o) => ({ order: o, reason: "Nenhum caminhão disponível (verifique status/capacidade na Frota)." })), reason: null };

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
      volume: group.reduce((s, o) => s + orderVolumeM3(o), 0),
      region: regionKey(group[0]),
      regionName: regionLabel(group[0]),
      urgent: group.some((o) => o.freight_type === "urgent"),
      // SLA: pedido atrasado ou em risco de prazo entra junto com os urgentes (B2-C / Des-3)
      critical: group.some((o) => ["late", "at_risk"].includes(slaStatus(o, settings))),
    }));

    // 3) prioridade (urgente OU SLA crítico) primeiro; depois região e peso desc
    units.sort((a, b) =>
      (Number(b.urgent || b.critical) - Number(a.urgent || a.critical)) ||
      a.region.localeCompare(b.region) ||
      b.weight - a.weight
    );

    // 4) bin-packing: 1 carga por caminhão por data, respeitando peso E volume
    const truckLoads = fleet.map((t) => ({
      truck: t, date, orders: [], weight: 0, volume: 0,
      capVol: truckVolumeM3(t), regions: new Set(), reasons: [],
    }));

    units.forEach((u) => {
      const candidates = truckLoads.filter((tl) => {
        const fitsWeight = tl.weight + u.weight <= (tl.truck.capacity_kg || 0);
        const fitsVolume = tl.capVol <= 0 || tl.volume + u.volume <= tl.capVol; // sem dimensões = só peso
        return fitsWeight && fitsVolume;
      }).sort((a, b) => {
        // prefere caminhão que já leva a mesma região; depois o menos carregado
        const aHas = a.regions.has(u.region) ? 0 : 1;
        const bHas = b.regions.has(u.region) ? 0 : 1;
        return aHas - bHas || a.weight - b.weight;
      });

      const target = candidates[0];
      if (!target) {
        // motivo específico (B2-E)
        const maxCap = Math.max(...fleet.map((t) => t.capacity_kg || 0));
        const reason = u.weight > maxCap
          ? `Nenhum caminhão tem capacidade para ${u.weight.toLocaleString("pt-BR")} kg na coleta de ${date}.`
          : `Sem espaço (peso/volume) restante nos caminhões disponíveis na data ${date}.`;
        u.orders.forEach((o) => unassigned.push({ order: o, reason }));
        return;
      }
      const sameRegion = target.regions.has(u.region);
      target.orders.push(...u.orders);
      target.weight += u.weight;
      target.volume += u.volume;
      target.regions.add(u.region);
      u.orders.forEach((o) => target.reasons.push({
        protocol: o.protocol,
        why: `${u.urgent ? "Urgente — alocado primeiro. " : u.critical ? "Prazo crítico (SLA) — priorizado. " : ""}${sameRegion ? `Mesma região (${u.regionName}) já neste caminhão.` : `Caminhão com mais espaço para ${u.regionName}.`}`,
      }));
    });

    truckLoads
      .filter((tl) => tl.orders.length)
      .forEach((tl) => loads.push({
        ...tl,
        regions: [...tl.regions],
        why: `${tl.orders.length} pedido(s) · ${tl.weight.toLocaleString("pt-BR")} kg${tl.capVol > 0 ? ` · ${tl.volume.toFixed(2)}/${tl.capVol.toFixed(2)} m³` : ""}`,
      }));
  });

  return { loads, unassigned, reason: null };
}

export default planLoads;

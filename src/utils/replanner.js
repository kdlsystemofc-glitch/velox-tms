/**
 * VELOX — Replanejamento operacional (sem API).
 *
 * Quando um caminhão vai para manutenção/inativo (S1/B4-A) ou um motorista
 * fica ausente/afastado (S2/B4-B), estas funções identificam o que ficou
 * "órfão" e sugerem para onde redistribuir, ponderando capacidade livre e
 * disponibilidade.
 */

const TRIP_LIVE = ["planned", "in_progress"];
// Categorias de CNH que habilitam a dirigir caminhão (C/D/E e combinações).
const TRUCK_CNH = ["C", "D", "E", "AC", "AD", "AE"];

/** O caminhão participa da viagem? (como líder OU veículo do comboio — Onda 7) */
export function truckInTrip(trip, truckId) {
  if (trip.truck_id === truckId) return true;
  return (trip.vehicles || []).some((v) => v.truck_id === truckId);
}

/** Pedidos programados (no despacho, sem viagem) e viagens vinculadas a um caminhão. */
export function affectedByTruck(truckId, orders = [], trips = []) {
  const affectedOrders = orders.filter(
    (o) => o.scheduled_truck_id === truckId && !o.trip_id &&
      ["confirmed", "collecting"].includes(o.status)
  );
  const affectedTrips = trips.filter((t) => TRIP_LIVE.includes(t.status) && truckInTrip(t, truckId));
  return { orders: affectedOrders, trips: affectedTrips };
}

/** CNH do motorista é válida para caminhão? (categoria habilitada + não vencida) */
export function driverCnhOk(driver) {
  const today = new Date().toISOString().slice(0, 10);
  if (driver.cnh_expiry && driver.cnh_expiry < today) return false;
  if (driver.cnh_category && !TRUCK_CNH.includes(driver.cnh_category)) return false;
  return true;
}

/** Viagens planejadas/em andamento de um motorista. */
export function affectedByDriver(driverId, trips = []) {
  return trips.filter((t) => t.driver_id === driverId && TRIP_LIVE.includes(t.status));
}

/** Peso já programado para um caminhão numa data (pedidos do despacho). */
export function scheduledWeight(truckId, dateStr, orders = []) {
  return orders
    .filter((o) => o.scheduled_truck_id === truckId && (!dateStr || o.scheduled_date === dateStr) && !o.trip_id)
    .reduce((s, o) => s + (o.total_weight_kg || 0), 0);
}

/** Caminhões disponíveis com capacidade livre, ordenados por mais espaço. */
export function suggestTrucks(trucks = [], orders = [], excludeTruckId, dateStr) {
  return trucks
    .filter((t) => t.id !== excludeTruckId && t.status === "available" && (t.capacity_kg || 0) > 0)
    .map((t) => {
      const used = scheduledWeight(t.id, dateStr, orders);
      return { truck: t, used, free: Math.max((t.capacity_kg || 0) - used, 0) };
    })
    .sort((a, b) => b.free - a.free);
}

/** Motoristas ativos; marca ocupado (já em viagem) e CNH válida para caminhão. */
export function suggestDrivers(drivers = [], trips = [], excludeDriverId) {
  const busy = new Set(trips.filter((t) => TRIP_LIVE.includes(t.status)).map((t) => t.driver_id));
  return drivers
    .filter((d) => d.id !== excludeDriverId && d.status === "active" && d.role !== "administrativo")
    .map((d) => ({ driver: d, busy: busy.has(d.id), cnhOk: driverCnhOk(d) }))
    // livres e com CNH ok primeiro
    .sort((a, b) => Number(a.busy) - Number(b.busy) || Number(b.cnhOk) - Number(a.cnhOk));
}

/** Lista os caminhões que precisam de replanejamento (indisponíveis com carga). */
export function trucksNeedingReplan(trucks = [], orders = [], trips = []) {
  return trucks
    .filter((t) => ["maintenance", "inactive"].includes(t.status))
    .map((t) => ({ truck: t, ...affectedByTruck(t.id, orders, trips) }))
    .filter((x) => x.orders.length || x.trips.length);
}

/** Lista os motoristas que precisam de replanejamento (indisponíveis com viagem). */
export function driversNeedingReplan(drivers = [], trips = []) {
  return drivers
    .filter((d) => ["away", "terminated"].includes(d.status))
    .map((d) => ({ driver: d, trips: affectedByDriver(d.id, trips) }))
    .filter((x) => x.trips.length);
}

/** Células do despacho (caminhão+data) com peso acima da capacidade (excesso de carga). */
export function overloadedCells(orders = [], trucks = []) {
  const byCell = {};
  orders
    .filter((o) => o.scheduled_truck_id && o.scheduled_date && !o.trip_id && o.status !== "cancelled")
    .forEach((o) => { const k = `${o.scheduled_truck_id}|${o.scheduled_date}`; (byCell[k] = byCell[k] || []).push(o); });
  const out = [];
  Object.entries(byCell).forEach(([k, list]) => {
    const [truckId, date] = k.split("|");
    const truck = trucks.find((t) => t.id === truckId);
    if (!truck || !(truck.capacity_kg > 0)) return;
    const kg = list.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    if (kg > truck.capacity_kg) out.push({ truck, date, orders: list, kg, over: kg - truck.capacity_kg });
  });
  return out;
}

/** Viagens planejadas/em andamento sem motorista ou sem caminhão (recurso faltando). */
export function tripsMissingResource(trips = []) {
  return trips.filter((t) => TRIP_LIVE.includes(t.status) && (!t.driver_id || !t.truck_id));
}

/** Pedidos urgentes confirmados sem viagem e sem programação (sem recurso). */
export function urgentWithoutResource(orders = []) {
  return orders.filter((o) => o.freight_type === "urgent" && o.status === "confirmed" && !o.trip_id && (!o.scheduled_truck_id || !o.scheduled_date));
}

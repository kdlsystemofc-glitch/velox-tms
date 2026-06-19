/**
 * VELOX — Replanejamento operacional (sem API).
 *
 * Quando um caminhão vai para manutenção/inativo (S1/B4-A) ou um motorista
 * fica ausente/afastado (S2/B4-B), estas funções identificam o que ficou
 * "órfão" e sugerem para onde redistribuir, ponderando capacidade livre e
 * disponibilidade.
 */

const TRIP_LIVE = ["planned", "in_progress"];

/** Pedidos programados (no despacho, sem viagem) e viagens vinculadas a um caminhão. */
export function affectedByTruck(truckId, orders = [], trips = []) {
  const affectedOrders = orders.filter(
    (o) => o.scheduled_truck_id === truckId && !o.trip_id &&
      ["confirmed", "collecting"].includes(o.status)
  );
  const affectedTrips = trips.filter((t) => t.truck_id === truckId && TRIP_LIVE.includes(t.status));
  return { orders: affectedOrders, trips: affectedTrips };
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

/** Motoristas ativos; marca quem já está numa viagem ativa (ocupado). */
export function suggestDrivers(drivers = [], trips = [], excludeDriverId) {
  const busy = new Set(trips.filter((t) => TRIP_LIVE.includes(t.status)).map((t) => t.driver_id));
  return drivers
    .filter((d) => d.id !== excludeDriverId && d.status === "active" && d.role !== "administrativo")
    .map((d) => ({ driver: d, busy: busy.has(d.id) }))
    .sort((a, b) => Number(a.busy) - Number(b.busy));
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

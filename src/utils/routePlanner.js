/**
 * VELOX — Planejador de rotas inteligente
 * Bin packing + agrupamento por região + janelas de tempo
 */

/**
 * Agrupa pedidos por estado/região de destino.
 */
export function groupOrdersByRegion(orders) {
  const groups = {};
  orders.forEach(order => {
    const destStates = [...new Set(
      (order.recipients || []).map(r => r.state).filter(Boolean)
    )].sort().join("+");
    const key = destStates || "indefinido";
    if (!groups[key]) groups[key] = { key, states: destStates.split("+"), orders: [] };
    groups[key].orders.push(order);
  });
  return Object.values(groups);
}

/**
 * Algoritmo de bin packing (First Fit Decreasing):
 * distribui pedidos entre carretas maximizando o uso de cada uma.
 */
export function planLoadDistribution(orders, trucks, date, existingOrders = []) {
  // Calcular espaço já utilizado em cada carreta nesta data
  const truckUsed = {};
  trucks.forEach(t => {
    truckUsed[t.id] = existingOrders
      .filter(o => o.scheduled_truck_id === t.id && o.scheduled_date === date && o.status !== "cancelled")
      .reduce((sum, o) => sum + (Number(o.total_weight_kg) || 0), 0);
  });

  // First Fit Decreasing — ordenar por peso decrescente
  const sortedOrders = [...orders].sort(
    (a, b) => (Number(b.total_weight_kg) || 0) - (Number(a.total_weight_kg) || 0)
  );

  const sortedTrucks = [...trucks]
    .filter(t => t.status === "available" || t.status === "on_route")
    .sort((a, b) => {
      const aFree = (a.capacity_kg || 0) - (truckUsed[a.id] || 0);
      const bFree = (b.capacity_kg || 0) - (truckUsed[b.id] || 0);
      return bFree - aFree;
    });

  const plan = sortedTrucks.map(truck => ({
    truck,
    orders: [],
    totalKg: truckUsed[truck.id] || 0,
    capacity: truck.capacity_kg || 0,
  }));
  const unscheduled = [];

  sortedOrders.forEach(order => {
    const kg = Number(order.total_weight_kg) || 0;
    const slot = plan.find(p => (p.capacity - p.totalKg) >= kg);
    if (slot) {
      slot.orders.push(order);
      slot.totalKg += kg;
    } else {
      unscheduled.push(order);
    }
  });

  return {
    plan: plan
      .filter(p => p.orders.length > 0)
      .map(p => ({
        ...p,
        utilizationPct: p.capacity > 0 ? Math.round((p.totalKg / p.capacity) * 100) : 0,
      })),
    unscheduled,
  };
}

/**
 * Verifica se um pedido respeita as janelas de tempo de coleta.
 */
export function checkTimeWindows(order, collectionDate) {
  const warnings = [];
  if (order.collection_date && order.collection_date !== collectionDate) {
    const requested = new Date(order.collection_date + "T12:00:00");
    const scheduled = new Date(collectionDate + "T12:00:00");
    const diffDays = Math.round((scheduled - requested) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) warnings.push(`Coleta ${diffDays} dia(s) após data solicitada`);
  }
  if (order.freight_type === "urgent" && collectionDate !== order.collection_date) {
    warnings.push("⚡ Pedido URGENTE — priorizar coleta na data solicitada");
  }
  return warnings;
}
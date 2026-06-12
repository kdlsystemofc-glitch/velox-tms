/**
 * availabilityChecker.js
 * Calcula a disponibilidade de frota por data, levando em conta:
 *  - Capacidade das carretas
 *  - Pedidos já programados (schedule_status = "scheduled")
 *  - Bloqueios (ScheduleBlock)
 *  - Dias não operacionais (fins de semana por padrão)
 */

/**
 * Retorna o status de disponibilidade para uma data específica.
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {Array} trucks - lista de Truck
 * @param {Array} orders - lista de Order
 * @param {Array} blocks - lista de ScheduleBlock
 * @param {Array} workingDays - [0-6], default [1,2,3,4,5]
 * @returns {object} availability info
 */
export function getAvailabilityForDate(dateStr, trucks, orders, blocks, workingDays = [1, 2, 3, 4, 5]) {
  // Parsing defensivo: garante que workingDays é array de números inteiros
  const parsedWorkingDays = (workingDays || [1, 2, 3, 4, 5]).map(d => parseInt(d, 10));

  const date = new Date(dateStr + "T12:00:00");
  const dayOfWeek = date.getDay();

  // Fim de semana / dia não operacional → bloqueado
  if (!parsedWorkingDays.includes(dayOfWeek)) {
    return {
      date: dateStr,
      totalCapacityKg: 0,
      usedKg: 0,
      availableKg: 0,
      availabilityPercent: 0,
      status: "blocked",
      reason: "Dia não operacional",
      trucksDetail: [],
    };
  }

  const activeTrucks = trucks.filter(t => t.status !== "inactive");

  // Bloqueios para esta data
  const dateBlocks = blocks.filter(b => b.date === dateStr);

  // Verificar bloqueio total (sem truck_id = todas as carretas)
  const fullGlobalBlock = dateBlocks.find(b => !b.truck_id && b.block_type === "full_block");
  if (fullGlobalBlock) {
    return {
      date: dateStr,
      totalCapacityKg: 0,
      usedKg: 0,
      availableKg: 0,
      availabilityPercent: 0,
      status: "blocked",
      reason: fullGlobalBlock.reason || "Bloqueado",
      trucksDetail: [],
    };
  }

  // Pedidos programados para esta data
  const scheduledOrders = orders.filter(o =>
    o.scheduled_date === dateStr && o.schedule_status === "scheduled"
  );

  let totalCapacityKg = 0;
  let totalUsedKg = 0;

  const trucksDetail = activeTrucks.map(truck => {
    const truckBlock = dateBlocks.find(b => b.truck_id === truck.id);
    const blocked = truckBlock?.block_type === "full_block";

    const truckOrders = scheduledOrders.filter(o => o.scheduled_truck_id === truck.id);
    const usedKg = truckOrders.reduce((sum, o) => sum + (o.total_weight_kg || 0), 0);

    let capacityKg = truck.capacity_kg || 0;
    // Bloqueio parcial: reduz capacidade disponível
    if (truckBlock?.block_type === "partial" && truckBlock.remaining_kg != null) {
      capacityKg = Math.min(capacityKg, truckBlock.remaining_kg);
    }

    const availableKg = blocked ? 0 : Math.max(0, capacityKg - usedKg);

    if (!blocked) {
      totalCapacityKg += capacityKg;
      totalUsedKg += usedKg;
    }

    return {
      truckId: truck.id,
      plate: truck.plate,
      model: truck.model,
      capacityKg,
      usedKg,
      availableKg,
      blocked,
    };
  });

  const availableKg = Math.max(0, totalCapacityKg - totalUsedKg);
  const availabilityPercent = totalCapacityKg > 0
    ? Math.round((availableKg / totalCapacityKg) * 100)
    : 0;

  let status;
  if (availableKg < 500) {
    status = "full";
  } else if (availabilityPercent < 40) {
    status = "limited";
  } else {
    status = "available";
  }

  return {
    date: dateStr,
    totalCapacityKg,
    usedKg: totalUsedKg,
    availableKg,
    availabilityPercent,
    status,
    trucksDetail,
  };
}

/**
 * Retorna disponibilidade para os próximos N dias a partir de hoje.
 */
export function getAvailabilityRange(days, trucks, orders, blocks, workingDays = [1, 2, 3, 4, 5]) {
  const result = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    result.push(getAvailabilityForDate(dateStr, trucks, orders, blocks, workingDays));
  }
  return result;
}

/**
 * Calcula o próximo dia útil após N dias úteis a partir de hoje.
 */
export function addWorkingDays(startDate, daysToAdd, workingDays = [1, 2, 3, 4, 5]) {
  // Parsing defensivo
  const parsedDays = (workingDays || [1, 2, 3, 4, 5]).map(d => parseInt(d, 10));
  // Normaliza para meia-noite local evitando problemas de fuso
  const date = new Date(startDate);
  date.setHours(12, 0, 0, 0);
  let added = 0;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    if (parsedDays.includes(date.getDay())) added++;
  }
  return date.toISOString().split("T")[0];
}

export function statusColor(status) {
  switch (status) {
    case "available": return "green";
    case "limited": return "amber";
    case "full": return "red";
    case "blocked": return "gray";
    default: return "gray";
  }
}
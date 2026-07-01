import { describe, it, expect } from "vitest";
import { groupOrdersByRegion, planLoadDistribution, checkTimeWindows } from "./routePlanner";

describe("groupOrdersByRegion", () => {
  it("agrupa por UFs de destino (únicas e ordenadas)", () => {
    const orders = [
      { id: "1", recipients: [{ state: "SP" }] },
      { id: "2", recipients: [{ state: "SP" }] },
      { id: "3", recipients: [{ state: "PR" }, { state: "SP" }] },
      { id: "4", recipients: [] },
    ];
    const g = groupOrdersByRegion(orders);
    const byKey = Object.fromEntries(g.map(x => [x.key, x]));
    expect(byKey["SP"].orders).toHaveLength(2);
    expect(byKey["PR+SP"].orders).toHaveLength(1); // ordenado
    expect(byKey["indefinido"].orders).toHaveLength(1);
  });
});

describe("planLoadDistribution (First Fit Decreasing)", () => {
  const trucks = [
    { id: "t1", capacity_kg: 1000, status: "available" },
    { id: "t2", capacity_kg: 500, status: "available" },
  ];
  it("empacota por peso decrescente e calcula utilização", () => {
    const orders = [{ total_weight_kg: 600 }, { total_weight_kg: 400 }, { total_weight_kg: 300 }];
    const { plan, unscheduled } = planLoadDistribution(orders, trucks, "2024-01-15");
    expect(unscheduled).toHaveLength(0);
    const t1 = plan.find(p => p.truck.id === "t1");
    const t2 = plan.find(p => p.truck.id === "t2");
    expect(t1.totalKg).toBe(1000);
    expect(t1.utilizationPct).toBe(100);
    expect(t2.totalKg).toBe(300);
    expect(t2.utilizationPct).toBe(60);
  });

  it("respeita o espaço já usado por pedidos existentes na data", () => {
    const existing = [{ scheduled_truck_id: "t1", scheduled_date: "2024-01-15", total_weight_kg: 800, status: "confirmed" }];
    const { plan } = planLoadDistribution([{ total_weight_kg: 300 }], trucks, "2024-01-15", existing);
    // t1 já tem 800/1000 (livre 200 < 300) → vai para t2
    const t2 = plan.find(p => p.truck.id === "t2");
    expect(t2.totalKg).toBe(300);
  });

  it("pedido maior que qualquer carreta fica sem agendamento", () => {
    const { unscheduled } = planLoadDistribution([{ total_weight_kg: 2000 }], trucks, "2024-01-15");
    expect(unscheduled).toHaveLength(1);
  });

  it("ignora carretas indisponíveis", () => {
    const t = [{ id: "x", capacity_kg: 5000, status: "inactive" }];
    const { unscheduled } = planLoadDistribution([{ total_weight_kg: 100 }], t, "2024-01-15");
    expect(unscheduled).toHaveLength(1); // nenhuma carreta elegível
  });
});

describe("checkTimeWindows", () => {
  it("avisa quando a coleta é depois da data solicitada", () => {
    const w = checkTimeWindows({ collection_date: "2024-01-10" }, "2024-01-12");
    expect(w.some(m => m.includes("2 dia"))).toBe(true);
  });
  it("sem aviso quando a data bate", () => {
    expect(checkTimeWindows({ collection_date: "2024-01-12" }, "2024-01-12")).toHaveLength(0);
  });
  it("marca urgência quando muda a data de um pedido urgente", () => {
    const w = checkTimeWindows({ collection_date: "2024-01-10", freight_type: "urgent" }, "2024-01-12");
    expect(w.some(m => m.toUpperCase().includes("URGENTE"))).toBe(true);
  });
});

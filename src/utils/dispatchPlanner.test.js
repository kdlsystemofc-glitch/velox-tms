import { describe, it, expect } from "vitest";
import { planLoads, regionKey } from "./dispatchPlanner";

const truck = (id, cap, dims) => ({ id, plate: id, status: "available", capacity_kg: cap, dimensions: dims || {} });
const order = (id, kg, extra = {}) => ({ id, protocol: id, status: "confirmed", total_weight_kg: kg, collection_date: "2026-06-22", origin: { cep: "01000000", state: "SP", city: "São Paulo" }, recipients: [{ state: "PR", cep: "80000000", city: "Curitiba", items: [] }], ...extra });

describe("planLoads (separação automática)", () => {
  it("aloca pedido confirmado num caminhão disponível", () => {
    const r = planLoads([order("A", 1000)], [truck("T1", 5000)]);
    expect(r.loads.length).toBe(1);
    expect(r.loads[0].orders.map(o => o.id)).toContain("A");
    expect(r.unassigned.length).toBe(0);
  });

  it("não aloca quando não há caminhão disponível, com motivo", () => {
    const r = planLoads([order("A", 1000)], []);
    expect(r.loads.length).toBe(0);
    expect(r.unassigned.length).toBe(1);
    expect(r.unassigned[0].reason).toMatch(/caminhão/i);
  });

  it("explica o motivo quando o peso excede toda a frota", () => {
    const r = planLoads([order("A", 12000)], [truck("T1", 5000)]);
    expect(r.unassigned.length).toBe(1);
    expect(r.unassigned[0].reason).toMatch(/capacidade/i);
  });

  it("prioriza pedido urgente na alocação", () => {
    // origens diferentes (unidades separadas); o caminhão só cabe um → o urgente entra
    const t = truck("T1", 1500);
    const r = planLoads([
      order("N", 1000, { origin: { cep: "02000000", state: "SP", city: "São Paulo" } }),
      order("U", 1000, { freight_type: "urgent" }),
    ], [t]);
    const placed = r.loads.flatMap(l => l.orders.map(o => o.id));
    expect(placed).toContain("U");
    expect(r.unassigned.map(u => u.order.id)).toContain("N");
  });

  it("regionKey combina UF + prefixo de CEP do destino", () => {
    expect(regionKey(order("A", 1))).toBe("PR-800");
  });
});

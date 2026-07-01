import { describe, it, expect } from "vitest";
import { computeOTIF, laneAnalysis, clientAnalysis } from "./analytics";

// SLA: sem deadline calculável, slaStatus retorna "on_time" para entregues.
const delivered = (extra = {}) => ({ status: "delivered", status_history: [{ status: "delivered", timestamp: "2024-01-10T10:00:00Z" }], ...extra });

describe("computeOTIF", () => {
  it("conta on-time, in-full e OTIF", () => {
    const orders = [
      delivered({ id: "1", origin: { state: "SP" }, recipients: [{ state: "SP" }] }),
      delivered({ id: "2", origin: { state: "SP" }, recipients: [{ state: "SP" }] }),
      { id: "3", status: "partially_delivered", status_history: [{ status: "delivered", timestamp: "2024-01-10T10:00:00Z" }] },
      { id: "4", status: "in_transit" }, // não conta
    ];
    const r = computeOTIF(orders, {});
    expect(r.total).toBe(3);           // 2 delivered + 1 partial
    expect(r.inFull).toBe(2);          // só os 2 delivered
    expect(r.otifPct).toBeCloseTo(66.7, 1);
  });
  it("sem entregas retorna null nas taxas", () => {
    expect(computeOTIF([{ status: "new" }], {}).otifPct).toBeNull();
  });
});

describe("laneAnalysis", () => {
  it("agrupa por corredor UF→UF e ordena por frete", () => {
    const orders = [
      { status: "delivered", freight_value: 100, total_weight_kg: 50, origin: { state: "SP" }, recipients: [{ state: "PR" }] },
      { status: "delivered", freight_value: 300, total_weight_kg: 100, origin: { state: "SP" }, recipients: [{ state: "RJ" }] },
      { status: "delivered", freight_value: 50, total_weight_kg: 25, origin: { state: "SP" }, recipients: [{ state: "PR" }] },
      { status: "cancelled", freight_value: 999, origin: { state: "SP" }, recipients: [{ state: "PR" }] }, // ignorado
    ];
    const r = laneAnalysis(orders);
    expect(r[0].lane).toBe("SP → RJ");
    expect(r[0].freight).toBe(300);
    const pr = r.find(l => l.lane === "SP → PR");
    expect(pr.orders).toBe(2);
    expect(pr.freight).toBe(150);
    expect(pr.avgPerKg).toBeCloseTo(2, 2); // 150 / 75kg
  });
});

describe("clientAnalysis", () => {
  it("agrupa por cliente com ticket médio", () => {
    const orders = [
      { status: "delivered", client_id: "c1", client_name: "ACME", freight_value: 100 },
      { status: "delivered", client_id: "c1", client_name: "ACME", freight_value: 300 },
      { status: "delivered", client_id: "c2", client_name: "Beta", freight_value: 50 },
    ];
    const r = clientAnalysis(orders);
    expect(r[0].client_name).toBe("ACME");
    expect(r[0].freight).toBe(400);
    expect(r[0].avgTicket).toBe(200);
  });
});

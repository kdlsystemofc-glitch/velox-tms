import { describe, it, expect } from "vitest";
import { auditThreeWay } from "./freightThreeWay";

// Tabela simples: R$ 1/kg, sem mínimo. Facilita conferir os totais.
const settings = { pricing: { price_per_kg: 1, minimum_freight: 0 } };

// Pedido com 100 kg reais → executado (recalc) = 100.
const baseOrder = {
  freight_value: 100,
  total_weight_kg: 100,
  total_declared_value: 0,
  recipients: [{ state: "PR", items: [{ weight_kg: 100 }] }],
  origin: { state: "SP" },
};

describe("auditThreeWay (contratado × executado × cobrado)", () => {
  it("tudo alinhado → status ok", () => {
    const order = { ...baseOrder, freight_breakdown: { snapshot_freight_value: 100, total: 100 } };
    const r = auditThreeWay(order, { settings });
    expect(r.contracted).toBe(100);
    expect(r.executed).toBeCloseTo(100, 2);
    expect(r.charged).toBe(100);
    expect(r.status).toBe("ok");
  });

  it("cobrado acima do contratado → diverge (over em contractedVsCharged)", () => {
    const order = { ...baseOrder, freight_value: 150, freight_breakdown: { snapshot_freight_value: 100, total: 100 } };
    const r = auditThreeWay(order, { settings });
    expect(r.charged).toBe(150);
    expect(r.contractedVsCharged.status).toBe("over");
    expect(r.status).toBe("diverge");
  });

  it("peso real maior que o contratado → executado > contratado (diverge)", () => {
    // snapshot congelou 100, mas o pedido foi entregue com 140 kg
    const order = {
      ...baseOrder, freight_value: 100,
      total_weight_kg: 140,
      recipients: [{ state: "PR", items: [{ weight_kg: 140 }] }],
      freight_breakdown: { snapshot_freight_value: 100, total: 100 },
    };
    const r = auditThreeWay(order, { settings });
    expect(r.executed).toBeCloseTo(140, 2);
    expect(r.contractedVsExecuted.status).toBe("over");
    expect(r.status).toBe("diverge");
  });

  it("usa revenue.amount como cobrado quando presente", () => {
    const order = { ...baseOrder, freight_value: 100, freight_breakdown: { snapshot_freight_value: 100 } };
    const r = auditThreeWay(order, { settings, revenue: { amount: 200 } });
    expect(r.charged).toBe(200);
    expect(r.status).toBe("diverge");
  });

  it("sem snapshot: contratado cai em 0 (na se nada cobrado)", () => {
    const order = { freight_value: 0, total_weight_kg: 0, recipients: [], origin: {} };
    const r = auditThreeWay(order, { settings });
    expect(r.contracted).toBe(0);
    expect(r.status).toBe("na");
  });
});

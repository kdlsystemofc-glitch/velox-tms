import { describe, it, expect } from "vitest";
import { auditOrderFreight, resolveClientPricing } from "./freightAudit";

const settings = { pricing: { price_per_kg: 1, minimum_freight: 0 } };
const order = (freight, weight = 100) => ({
  freight_value: freight, total_weight_kg: weight, total_declared_value: 0,
  origin: { state: "SP" }, recipients: [{ state: "SP", items: [{ nf_number: "1" }] }],
});

describe("auditOrderFreight", () => {
  it("dentro da tolerância = ok", () => {
    const r = auditOrderFreight(order(102), { settings }); // esperado 100, cobrado 102 (+2%)
    expect(r.expected).toBeCloseTo(100, 2);
    expect(r.status).toBe("ok");
  });
  it("cobrado a menos = under (perda de receita)", () => {
    const r = auditOrderFreight(order(80), { settings }); // -20%
    expect(r.status).toBe("under");
    expect(r.diff).toBeCloseTo(-20, 2);
  });
  it("cobrado a mais = over", () => {
    const r = auditOrderFreight(order(130), { settings }); // +30%
    expect(r.status).toBe("over");
    expect(r.diffPct).toBeCloseTo(30, 1);
  });
  it("sem frete e sem esperado = na", () => {
    const r = auditOrderFreight(order(0, 0), { settings });
    expect(r.status).toBe("na");
  });
  it("usa a tabela do cliente quando houver custom_pricing", () => {
    const client = { custom_pricing: { price_per_kg: 2 } };
    const r = auditOrderFreight(order(200), { client, settings }); // esperado 100×2=200
    expect(r.expected).toBeCloseTo(200, 2);
    expect(r.status).toBe("ok");
  });
});

describe("resolveClientPricing", () => {
  it("null quando custom_pricing vazio", () => {
    expect(resolveClientPricing({ custom_pricing: {} }, settings)).toBeNull();
    expect(resolveClientPricing({}, settings)).toBeNull();
  });
  it("mescla custom_pricing sobre o padrão", () => {
    const p = resolveClientPricing({ custom_pricing: { price_per_kg: 3 } }, settings);
    expect(p.price_per_kg).toBe(3);
    expect(p.minimum_freight).toBe(0);
  });
});

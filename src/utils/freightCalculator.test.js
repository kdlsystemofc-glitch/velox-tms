import { describe, it, expect } from "vitest";
import { calcCubicWeight, getTaxableWeight, calculateFreightFull } from "./freightCalculator";

describe("cubagem", () => {
  it("peso cubado = (A×L×C)/6000 × volumes", () => {
    expect(calcCubicWeight(100, 100, 100, 1)).toBeCloseTo(166.666, 2);
    expect(calcCubicWeight(100, 100, 100, 2)).toBeCloseTo(333.333, 2);
    expect(calcCubicWeight(0, 100, 100, 1)).toBe(0);
  });
  it("peso taxável = maior entre real e cubado", () => {
    expect(getTaxableWeight({ weight_kg: 10, volumes: 1, height_cm: 100, width_cm: 100, length_cm: 100 })).toBeCloseTo(166.666, 2);
    expect(getTaxableWeight({ weight_kg: 500, volumes: 1, height_cm: 10, width_cm: 10, length_cm: 10 })).toBe(500);
  });
});

describe("calculateFreightFull", () => {
  const pricing = { price_per_kg: 1, fixed_fee: 0, minimum_freight: 0 };

  it("usa o peso cubado quando maior que o real", () => {
    const r = calculateFreightFull({ items: [{ weight_kg: 10, volumes: 1, height_cm: 100, width_cm: 100, length_cm: 100 }], pricing });
    expect(r.usedCubic).toBe(true);
    expect(r.taxableKg).toBeCloseTo(166.666, 2);
    expect(r.total).toBeCloseTo(166.666, 2);
  });

  it("aplica frete mínimo", () => {
    const r = calculateFreightFull({ items: [{ weight_kg: 1 }], pricing: { ...pricing, minimum_freight: 150 } });
    expect(r.total).toBe(150);
  });

  it("aplica adicional de urgência", () => {
    const r = calculateFreightFull({ items: [{ weight_kg: 100 }], pricing: { ...pricing, urgent_percent: 50 }, freightType: "urgent" });
    expect(r.total).toBeCloseTo(150, 2); // 100 + 50%
  });

  it("soma taxa de entrega e TRT por NF", () => {
    const r = calculateFreightFull({ items: [{ weight_kg: 100 }], nfCount: 2, pricing: { ...pricing, delivery_fee: 12, trt_per_nf: 5 } });
    expect(r.deliveryFee).toBe(12);
    expect(r.trtValue).toBe(10); // 5 × 2 NFs
    expect(r.total).toBeCloseTo(122, 2);
  });

  it("soma cobranças avulsas do pedido (espera/devolução)", () => {
    const r = calculateFreightFull({ items: [{ weight_kg: 100 }], pricing, extraCharges: [{ amount: 60 }, { amount: 80 }] });
    expect(r.extraTotal).toBe(140);
    expect(r.total).toBeCloseTo(240, 2);
  });

  it("respeita o fator de cubagem por pedido", () => {
    const r = calculateFreightFull({ items: [{ weight_kg: 1, volumes: 1, height_cm: 100, width_cm: 100, length_cm: 100 }], pricing, cubageFactor: 5000 });
    expect(r.cubageDivisor).toBe(5000);
    expect(r.taxableKg).toBeCloseTo(200, 2);
  });

  it("vigência do corredor: ignora a tabela fora do período", () => {
    const settings = { route_pricing: [{ origin_state: "SP", dest_state: "PR", price_per_kg: 5, valid_from: "2026-01-01", valid_until: "2026-03-31" }] };
    const dentro = calculateFreightFull({ items: [{ weight_kg: 10 }], pricing, settings, originState: "SP", destState: "PR", refDate: "2026-02-15" });
    const fora = calculateFreightFull({ items: [{ weight_kg: 10 }], pricing, settings, originState: "SP", destState: "PR", refDate: "2026-06-15" });
    expect(dentro.total).toBeCloseTo(50, 2); // usa 5/kg
    expect(fora.total).toBeCloseTo(10, 2);   // volta ao padrão 1/kg
  });
});

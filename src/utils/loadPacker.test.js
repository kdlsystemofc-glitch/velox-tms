import { describe, it, expect } from "vitest";
import { packLoad } from "./loadPacker";

const truck = { length_m: 13.6, width_m: 2.4, height_m: 2.7 };

describe("packLoad", () => {
  it("retorna vazio sem dimensões de baú", () => {
    const r = packLoad({}, [{ volumes: 2, length_cm: 60, width_cm: 40, height_cm: 40 }]);
    expect(r.placed).toBe(0);
    expect(r.unplaced).toBe(2);
  });

  it("explode volumes em caixas unitárias e posiciona dentro do baú", () => {
    const r = packLoad(truck, [{ volumes: 3, length_cm: 100, width_cm: 100, height_cm: 100, weight_kg: 300, orderId: "o1" }]);
    expect(r.total).toBe(3);
    expect(r.placed).toBe(3);
    expect(r.unplaced).toBe(0);
    // todas as caixas dentro dos limites
    for (const b of r.boxes) {
      expect(b.x + b.l).toBeLessThanOrEqual(truck.length_m + 1e-6);
      expect(b.z + b.w).toBeLessThanOrEqual(truck.width_m + 1e-6);
      expect(b.y + b.h).toBeLessThanOrEqual(truck.height_m + 1e-6);
    }
    // peso rateado por volume
    expect(r.boxes[0].kg).toBeCloseTo(100, 5);
  });

  it("marca como não posicionada a caixa maior que o baú", () => {
    const r = packLoad(truck, [{ volumes: 1, length_cm: 500, width_cm: 300, height_cm: 300 }]);
    expect(r.placed).toBe(0);
    expect(r.unplaced).toBe(1);
  });

  it("acumula o volume usado", () => {
    const r = packLoad(truck, [{ volumes: 2, length_cm: 100, width_cm: 100, height_cm: 100 }]);
    expect(r.usedVolumeM3).toBeCloseTo(2, 5); // 2 caixas de 1 m³
  });
});

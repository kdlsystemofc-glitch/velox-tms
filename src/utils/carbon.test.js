import { describe, it, expect } from "vitest";
import { tripCO2, fleetCO2 } from "./carbon";

describe("tripCO2", () => {
  it("usa litros de combustível quando disponível", () => {
    expect(tripCO2({ fuel_liters: 100 }).kg).toBeCloseTo(268, 1); // 100 × 2,68
    expect(tripCO2({ fuel_liters: 100 }).basis).toBe("fuel");
  });
  it("cai para distância sem litros", () => {
    const r = tripCO2({ real_km: 200 });
    expect(r.kg).toBeCloseTo(180, 1); // 200 × 0,9
    expect(r.basis).toBe("distance");
  });
  it("zero quando não há dados", () => {
    expect(tripCO2({}).basis).toBe("none");
    expect(tripCO2({}).kg).toBe(0);
  });
});

describe("fleetCO2", () => {
  it("soma só viagens concluídas e calcula intensidade", () => {
    const trips = [
      { status: "completed", fuel_liters: 100, real_km: 500 }, // 268 kg
      { status: "completed", real_km: 100 },                    // 90 kg (distância)
      { status: "in_progress", fuel_liters: 999 },              // ignorado
    ];
    const r = fleetCO2(trips);
    expect(r.trips).toBe(2);
    expect(r.kg).toBeCloseTo(358, 1);            // 268 + 90
    expect(r.perKm).toBeCloseTo(0.6, 2);          // 358 / 600 km
  });
});

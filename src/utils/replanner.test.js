import { describe, it, expect } from "vitest";
import { affectedByTruck, affectedByDriver, suggestTrucks, truckInTrip, driverCnhOk } from "./replanner";

describe("replanejamento", () => {
  it("detecta pedidos e viagens de um caminhão indisponível", () => {
    const orders = [
      { id: "O1", status: "confirmed", scheduled_truck_id: "T1", trip_id: null },
      { id: "O2", status: "confirmed", scheduled_truck_id: "T2", trip_id: null },
    ];
    const trips = [{ id: "V1", truck_id: "T1", status: "planned" }];
    const r = affectedByTruck("T1", orders, trips);
    expect(r.orders.map(o => o.id)).toEqual(["O1"]);
    expect(r.trips.map(t => t.id)).toEqual(["V1"]);
  });

  it("detecta viagens de um motorista ausente", () => {
    const trips = [{ id: "V1", driver_id: "D1", status: "in_progress" }, { id: "V2", driver_id: "D2", status: "planned" }];
    expect(affectedByDriver("D1", trips).map(t => t.id)).toEqual(["V1"]);
  });

  it("detecta caminhão como líder OU veículo do comboio (Onda 7)", () => {
    const trips = [
      { id: "V1", truck_id: "T1", status: "in_progress", vehicles: [{ truck_id: "T1" }, { truck_id: "T2" }] },
      { id: "V2", truck_id: "T3", status: "planned" },
    ];
    expect(truckInTrip(trips[0], "T2")).toBe(true);  // secundário
    expect(affectedByTruck("T2", [], trips).trips.map(t => t.id)).toEqual(["V1"]);
    expect(affectedByTruck("T3", [], trips).trips.map(t => t.id)).toEqual(["V2"]);
  });

  it("valida CNH do motorista para caminhão (categoria + validade)", () => {
    expect(driverCnhOk({ cnh_category: "E", cnh_expiry: "2099-01-01" })).toBe(true);
    expect(driverCnhOk({ cnh_category: "B", cnh_expiry: "2099-01-01" })).toBe(false); // categoria não habilita
    expect(driverCnhOk({ cnh_category: "E", cnh_expiry: "2000-01-01" })).toBe(false); // vencida
  });

  it("sugere caminhões com mais espaço livre primeiro", () => {
    const trucks = [
      { id: "T1", status: "available", capacity_kg: 5000 },
      { id: "T2", status: "available", capacity_kg: 10000 },
      { id: "T3", status: "maintenance", capacity_kg: 20000 },
    ];
    const orders = [{ scheduled_truck_id: "T1", scheduled_date: "2026-06-22", total_weight_kg: 1000 }];
    const sug = suggestTrucks(trucks, orders, "X", "2026-06-22");
    expect(sug[0].truck.id).toBe("T2");          // mais espaço livre
    expect(sug.find(s => s.truck.id === "T3")).toBeUndefined(); // em manutenção sai
    expect(sug.find(s => s.truck.id === "T1").free).toBe(4000); // 5000 - 1000 já agendado
  });
});

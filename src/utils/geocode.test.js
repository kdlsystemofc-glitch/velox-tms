import { describe, it, expect } from "vitest";
import { haversineKm, googleMapsRouteUrl } from "./geocode";
import { optimizeStopsByCoords } from "./routeOptimizer";

describe("geocode / distância", () => {
  it("Haversine: SP↔RJ ~ 360 km", () => {
    const sp = { lat: -23.55, lng: -46.63 };
    const rj = { lat: -22.91, lng: -43.17 };
    const d = haversineKm(sp, rj);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(380);
  });
  it("retorna null sem coordenadas", () => {
    expect(haversineKm(null, { lat: 1, lng: 1 })).toBeNull();
  });
  it("monta URL de rota do Google Maps com waypoints", () => {
    const url = googleMapsRouteUrl([{ address: "A" }, { address: "B" }, { address: "C" }]);
    expect(url).toContain("origin=A");
    expect(url).toContain("destination=C");
    expect(url).toContain("waypoints=B");
  });
});

describe("optimizeStopsByCoords", () => {
  it("ordena por proximidade real e mantém coleta antes da entrega", () => {
    const coords = {
      "01000000": { lat: 0, lng: 0 },   // origem
      "02000000": { lat: 0, lng: 1 },   // perto
      "09000000": { lat: 0, lng: 9 },   // longe
    };
    const stops = [
      { type: "collection", order_id: "X", cep: "01000000" },
      { type: "delivery", order_id: "X", cep: "09000000" },
      { type: "delivery", order_id: "X", cep: "02000000" },
    ];
    const out = optimizeStopsByCoords(stops, coords, haversineKm);
    expect(out[0].type).toBe("collection");        // coleta primeiro
    expect(out[1].cep).toBe("02000000");           // entrega mais próxima antes
    expect(out[2].cep).toBe("09000000");
    expect(out.map(s => s.stop_order)).toEqual([1, 2, 3]);
  });
});

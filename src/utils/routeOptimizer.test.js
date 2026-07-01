import { describe, it, expect } from "vitest";
import { optimizeStops, optimizeStopsByCoords } from "./routeOptimizer";

describe("optimizeStops (heurística por CEP)", () => {
  it("lista vazia/única apenas numera stop_order", () => {
    expect(optimizeStops([])).toEqual([]);
    const one = optimizeStops([{ type: "collection", order_id: "A", cep: "01000000" }]);
    expect(one[0].stop_order).toBe(1);
  });

  it("coleta vem antes da entrega do mesmo pedido", () => {
    const stops = [
      { type: "delivery", order_id: "A", cep: "01000000" },
      { type: "collection", order_id: "A", cep: "05000000" },
    ];
    const r = optimizeStops(stops);
    const col = r.findIndex(s => s.type === "collection" && s.order_id === "A");
    const del = r.findIndex(s => s.type === "delivery" && s.order_id === "A");
    expect(col).toBeLessThan(del);
    expect(r.map(s => s.stop_order)).toEqual([1, 2]);
  });

  it("ordena coletas pelo CEP mais próximo (nearest-neighbor)", () => {
    const stops = [
      { type: "collection", order_id: "A", cep: "01000000" },
      { type: "collection", order_id: "B", cep: "09000000" },
      { type: "collection", order_id: "C", cep: "02000000" },
    ];
    const r = optimizeStops(stops, "01000000");
    expect(r.map(s => s.order_id)).toEqual(["A", "C", "B"]);
  });
});

describe("refino 2-opt", () => {
  const hav = (a, b) => Math.hypot(a.lat - b.lat, a.lng - b.lng);
  it("melhora uma rota subótima do nearest-neighbor", () => {
    // NN gera A,B,D,C; o 2-opt corrige para A,D,B,C (mais curto).
    const coords = {
      "00000000": { lat: 0, lng: 0 }, "00000001": { lat: 0, lng: 1 },
      "00000002": { lat: 0, lng: 2 }, "00000003": { lat: 0.5, lng: 0.9 },
    };
    const stops = [
      { type: "collection", order_id: "A", cep: "00000000" },
      { type: "collection", order_id: "B", cep: "00000001" },
      { type: "collection", order_id: "C", cep: "00000002" },
      { type: "collection", order_id: "D", cep: "00000003" },
    ];
    const r = optimizeStopsByCoords(stops, coords, hav);
    expect(r.map(s => s.order_id)).toEqual(["A", "D", "B", "C"]);
  });
  it("nunca viola precedência ao refinar", () => {
    const coords = { "1": { lat: 0, lng: 0 }, "2": { lat: 0, lng: 9 } };
    const stops = [
      { type: "delivery", order_id: "X", cep: "2" },
      { type: "collection", order_id: "X", cep: "1" },
    ];
    const r = optimizeStopsByCoords(stops, coords, hav);
    const col = r.findIndex(s => s.type === "collection");
    const del = r.findIndex(s => s.type === "delivery");
    expect(col).toBeLessThan(del);
  });
});

describe("optimizeStopsByCoords (distância injetada)", () => {
  const hav = (a, b) => Math.abs(a.lat - b.lat); // distância 1D para teste determinístico
  it("ordena por distância geográfica respeitando coleta-antes-da-entrega", () => {
    const coords = {
      "01000000": { lat: 0 }, "02000000": { lat: 1 }, "09000000": { lat: 8 },
    };
    const stops = [
      { type: "collection", order_id: "A", cep: "01000000" },
      { type: "collection", order_id: "B", cep: "09000000" },
      { type: "collection", order_id: "C", cep: "02000000" },
    ];
    const r = optimizeStopsByCoords(stops, coords, hav);
    expect(r.map(s => s.order_id)).toEqual(["A", "C", "B"]);
    expect(r.map(s => s.stop_order)).toEqual([1, 2, 3]);
  });
});

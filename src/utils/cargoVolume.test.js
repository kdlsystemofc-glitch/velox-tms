import { describe, it, expect } from "vitest";
import { truckVolumeM3, itemVolumeM3, orderVolumeM3 } from "./cargoVolume";

describe("cargoVolume", () => {
  it("volume interno do caminhão = C×L×A (m)", () => {
    expect(truckVolumeM3({ dimensions: { length_m: 2, width_m: 2, height_m: 2 } })).toBe(8);
    expect(truckVolumeM3({ dimensions: {} })).toBe(0);
    expect(truckVolumeM3({})).toBe(0);
  });

  it("volume do item em m³ a partir de cm", () => {
    expect(itemVolumeM3({ height_cm: 100, width_cm: 100, length_cm: 100, volumes: 1 })).toBeCloseTo(1, 5);
    expect(itemVolumeM3({ height_cm: 100, width_cm: 100, length_cm: 100, volumes: 3 })).toBeCloseTo(3, 5);
    expect(itemVolumeM3({ height_cm: 0, width_cm: 100, length_cm: 100 })).toBe(0);
  });

  it("volume total do pedido soma os itens dos destinatários", () => {
    const order = { recipients: [{ items: [{ height_cm: 100, width_cm: 100, length_cm: 100, volumes: 1 }] }, { items: [{ height_cm: 100, width_cm: 100, length_cm: 100, volumes: 2 }] }] };
    expect(orderVolumeM3(order)).toBeCloseTo(3, 5);
  });
});

import { describe, it, expect } from "vitest";
import { carrierScorecard, rankCarriers } from "./carrierScorecard";

const orders = [
  { carrier_id: "c1", carrier_status: "accepted", status: "delivered", carrier_amount: 100 },
  { carrier_id: "c1", carrier_status: "accepted", status: "in_transit", carrier_amount: 200 },
  { carrier_id: "c1", carrier_status: "refused" },
  { carrier_id: "c1", carrier_status: "offered" },
  { carrier_id: "c2", carrier_status: "accepted", status: "delivered", carrier_amount: 50 },
  { carrier_id: "c3" }, // nunca ofertado (sem carrier_status) — ignorado
];

describe("carrierScorecard", () => {
  it("agrega ofertas/aceites/recusas/entregas e valores", () => {
    const s = carrierScorecard(orders, "c1");
    expect(s.offered).toBe(4);        // offered + refused + 2 accepted
    expect(s.accepted).toBe(2);
    expect(s.refused).toBe(1);
    expect(s.delivered).toBe(1);
    expect(s.paid).toBeCloseTo(300, 2);
  });
  it("taxa de aceite = aceitas / (aceitas + recusadas)", () => {
    expect(carrierScorecard(orders, "c1").acceptanceRate).toBe(67); // 2/3
  });
  it("taxa de entrega = entregues / aceitas", () => {
    expect(carrierScorecard(orders, "c1").deliveryRate).toBe(50); // 1/2
  });
  it("sem base retorna null nas taxas", () => {
    const s = carrierScorecard(orders, "cX");
    expect(s.acceptanceRate).toBeNull();
    expect(s.deliveryRate).toBeNull();
  });
});

describe("rankCarriers", () => {
  it("ordena por taxa de aceite depois volume", () => {
    const carriers = [{ id: "c1" }, { id: "c2" }];
    const r = rankCarriers(carriers, orders);
    // c2 tem 100% de aceite; c1 tem 67% → c2 primeiro
    expect(r[0].carrier.id).toBe("c2");
    expect(r[1].carrier.id).toBe("c1");
  });
});

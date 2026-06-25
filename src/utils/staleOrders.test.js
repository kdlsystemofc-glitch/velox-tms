import { describe, it, expect } from "vitest";
import { isStaleOrder, findStaleOrders, daysSince, isScheduled } from "./staleOrders";

const NOW = new Date("2026-06-25T12:00:00");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe("staleOrders", () => {
  it("daysSince calcula dias inteiros e nunca negativo", () => {
    expect(daysSince(daysAgo(5), NOW)).toBe(5);
    expect(daysSince(NOW.toISOString(), NOW)).toBe(0);
    expect(daysSince("futuro inválido", NOW)).toBe(0);
    expect(daysSince(null, NOW)).toBe(0);
  });

  it("isScheduled reconhece caminhão+data ou viagem", () => {
    expect(isScheduled({ trip_id: "t1" })).toBe(true);
    expect(isScheduled({ scheduled_truck_id: "x", scheduled_date: "2026-06-26" })).toBe(true);
    expect(isScheduled({ scheduled_truck_id: "x" })).toBe(false);
    expect(isScheduled({})).toBe(false);
  });

  it("pedido 'new' parado há mais que o limite é stale", () => {
    expect(isStaleOrder({ status: "new", created_date: daysAgo(4) }, 3, NOW)).toBe(true);
    expect(isStaleOrder({ status: "new", created_date: daysAgo(2) }, 3, NOW)).toBe(false);
  });

  it("'confirmed' sem programação conta; com programação não conta", () => {
    expect(isStaleOrder({ status: "confirmed", created_date: daysAgo(5) }, 3, NOW)).toBe(true);
    expect(isStaleOrder({ status: "confirmed", created_date: daysAgo(5), trip_id: "t" }, 3, NOW)).toBe(false);
    expect(isStaleOrder({ status: "confirmed", created_date: daysAgo(5), scheduled_truck_id: "x", scheduled_date: "2026-06-26" }, 3, NOW)).toBe(false);
  });

  it("status avançados ou cancelado nunca são stale", () => {
    for (const status of ["collecting", "in_transit", "delivered", "cancelled"]) {
      expect(isStaleOrder({ status, created_date: daysAgo(30) }, 3, NOW)).toBe(false);
    }
  });

  it("findStaleOrders ordena do mais antigo para o mais novo e anexa stale_days", () => {
    const orders = [
      { id: "a", status: "new", created_date: daysAgo(4) },
      { id: "b", status: "new", created_date: daysAgo(10) },
      { id: "c", status: "delivered", created_date: daysAgo(20) },
      { id: "d", status: "confirmed", created_date: daysAgo(1) },
    ];
    const stale = findStaleOrders(orders, 3, NOW);
    expect(stale.map(o => o.id)).toEqual(["b", "a"]);
    expect(stale[0].stale_days).toBe(10);
  });
});

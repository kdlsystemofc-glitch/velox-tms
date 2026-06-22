import { describe, it, expect } from "vitest";
import { slaDeadline, deliveredDate, slaStatus } from "./sla";

const settings = { delivery_days_table: [{ state: "SP", days: 2 }] };

describe("SLA", () => {
  it("prazo previsto = coleta + dias úteis do destino", () => {
    const order = { scheduled_date: "2026-06-01", recipients: [{ state: "SP" }] }; // 01/06 = segunda
    const dl = slaDeadline(order, settings);
    expect(dl).not.toBeNull();
    // +2 dias úteis = quarta 03/06
    expect(dl.getDate()).toBe(3);
    expect(dl.getMonth()).toBe(5); // junho (0-based)
  });

  it("entregue dentro do prazo = on_time", () => {
    const order = { scheduled_date: "2026-06-01", recipients: [{ state: "SP" }], status: "delivered", status_history: [{ status: "delivered", timestamp: "2026-06-02T10:00:00" }] };
    expect(slaStatus(order, settings)).toBe("on_time");
  });

  it("entregue após o prazo = late", () => {
    const order = { scheduled_date: "2026-06-01", recipients: [{ state: "SP" }], status: "delivered", status_history: [{ status: "delivered", timestamp: "2026-06-10T10:00:00" }] };
    expect(slaStatus(order, settings)).toBe("late");
  });

  it("deliveredDate pega o último evento delivered", () => {
    const order = { status_history: [{ status: "delivered", timestamp: "2026-06-02T10:00:00" }] };
    expect(deliveredDate(order)?.getDate()).toBe(2);
  });
});

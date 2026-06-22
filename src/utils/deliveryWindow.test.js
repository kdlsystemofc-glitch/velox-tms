import { describe, it, expect } from "vitest";
import { hasWindow, dateAllowedByWindow, timeAllowedByWindow, windowLabel, orderWindowConflicts } from "./deliveryWindow";

describe("janela de recebimento", () => {
  const seg = "2026-06-22"; // segunda-feira
  const dom = "2026-06-21"; // domingo

  it("sem janela = aceita sempre", () => {
    expect(hasWindow({})).toBe(false);
    expect(dateAllowedByWindow({}, dom)).toBe(true);
  });

  it("respeita os dias da semana", () => {
    const w = { days: [1, 2, 3, 4, 5] };
    expect(dateAllowedByWindow(w, seg)).toBe(true);
    expect(dateAllowedByWindow(w, dom)).toBe(false);
  });

  it("respeita o horário e a pausa (almoço)", () => {
    const w = { days: [1], start: "08:00", end: "18:00", pause_start: "12:00", pause_end: "13:00" };
    expect(timeAllowedByWindow(w, "09:00")).toBe(true);
    expect(timeAllowedByWindow(w, "12:30")).toBe(false); // dentro do almoço
    expect(timeAllowedByWindow(w, "19:00")).toBe(false); // após o fim
    expect(timeAllowedByWindow(w, "07:00")).toBe(false); // antes do início
  });

  it("rótulo mostra dias, horário e pausa", () => {
    expect(windowLabel({ days: [1], start: "08:00", end: "11:00", pause_start: "12:00", pause_end: "13:00" }))
      .toContain("pausa 12:00–13:00");
    expect(windowLabel({})).toBe("Sem restrição");
  });

  it("conflitos do pedido por destinatário", () => {
    const order = { recipients: [{ name: "Cliente A", delivery_window: { days: [2, 4] } }] };
    expect(orderWindowConflicts(order, "2026-06-22").length).toBe(1); // segunda, só recebe ter/qui
    expect(orderWindowConflicts(order, "2026-06-23").length).toBe(0); // terça
  });
});

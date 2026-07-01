import { describe, it, expect } from "vitest";
import { getAvailabilityForDate, addWorkingDays, statusColor } from "./availabilityChecker";

const MON = "2024-01-15"; // segunda-feira
const SAT = "2024-01-13"; // sábado
const truck = (id, cap, extra = {}) => ({ id, capacity_kg: cap, status: "active", plate: id, ...extra });
const order = (truckId, kg) => ({ scheduled_date: MON, schedule_status: "scheduled", scheduled_truck_id: truckId, total_weight_kg: kg });

describe("getAvailabilityForDate", () => {
  it("dia não operacional (fim de semana) → blocked", () => {
    const r = getAvailabilityForDate(SAT, [truck("t1", 1000)], [], []);
    expect(r.status).toBe("blocked");
    expect(r.reason).toBe("Dia não operacional");
  });

  it("bloqueio global total → blocked", () => {
    const blocks = [{ date: MON, block_type: "full_block", reason: "Feriado" }];
    const r = getAvailabilityForDate(MON, [truck("t1", 1000)], [], blocks);
    expect(r.status).toBe("blocked");
    expect(r.reason).toBe("Feriado");
  });

  it("calcula capacidade/uso e status 'available'", () => {
    const r = getAvailabilityForDate(MON, [truck("t1", 1000)], [order("t1", 300)], []);
    expect(r.totalCapacityKg).toBe(1000);
    expect(r.usedKg).toBe(300);
    expect(r.availableKg).toBe(700);
    expect(r.availabilityPercent).toBe(70);
    expect(r.status).toBe("available");
  });

  it("status 'limited' abaixo de 40% (mas ≥500kg)", () => {
    // capacidade 2000, usado 1300 → livre 700 (35%) → limited
    const r = getAvailabilityForDate(MON, [truck("t1", 2000)], [order("t1", 1300)], []);
    expect(r.availabilityPercent).toBe(35);
    expect(r.status).toBe("limited");
  });

  it("status 'full' quando livre < 500kg", () => {
    const r = getAvailabilityForDate(MON, [truck("t1", 1000)], [order("t1", 600)], []);
    expect(r.availableKg).toBe(400);
    expect(r.status).toBe("full");
  });

  it("bloqueio parcial reduz a capacidade disponível", () => {
    const blocks = [{ date: MON, truck_id: "t1", block_type: "partial", remaining_kg: 400 }];
    const r = getAvailabilityForDate(MON, [truck("t1", 1000)], [], blocks);
    expect(r.totalCapacityKg).toBe(400);
    expect(r.status).toBe("full"); // 400 < 500
  });

  it("ignora carretas inativas", () => {
    const trucks = [truck("t1", 1000), truck("t2", 5000, { status: "inactive" })];
    const r = getAvailabilityForDate(MON, trucks, [], []);
    expect(r.totalCapacityKg).toBe(1000); // só a ativa
  });
});

describe("addWorkingDays", () => {
  it("pula fim de semana (sexta + 1 dia útil = segunda)", () => {
    // Usa Date local (new Date(ano, mês0, dia)) para não depender de fuso —
    // o util faz new Date(string)+setHours, que é sensível a timezone para
    // strings só-data (fragilidade a tratar no Projeto 02).
    expect(addWorkingDays(new Date(2024, 0, 12), 1)).toBe("2024-01-15");
  });
  it("acumula 3 dias úteis atravessando o fim de semana", () => {
    // quinta 2024-01-11 + 3 dias úteis = terça 2024-01-16 (pula sáb/dom)
    expect(addWorkingDays(new Date(2024, 0, 11), 3)).toBe("2024-01-16");
  });
});

describe("statusColor", () => {
  it("mapeia status → cor", () => {
    expect(statusColor("available")).toBe("green");
    expect(statusColor("limited")).toBe("amber");
    expect(statusColor("full")).toBe("red");
    expect(statusColor("blocked")).toBe("gray");
    expect(statusColor("desconhecido")).toBe("gray");
  });
});

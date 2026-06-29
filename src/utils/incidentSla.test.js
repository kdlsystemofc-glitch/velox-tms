import { describe, it, expect } from "vitest";
import { slaDeadline, incidentSlaStatus, slaHoursFor, DEFAULT_SLA_HOURS } from "./incidentSla";

const NOW = new Date("2026-06-29T12:00:00Z");
const hoursAgo = (n) => new Date(NOW.getTime() - n * 3600_000).toISOString();

describe("incidentSla", () => {
  it("usa as horas-padrão por gravidade e aceita override do settings", () => {
    expect(slaHoursFor("critical")).toBe(DEFAULT_SLA_HOURS.critical);
    expect(slaHoursFor("high", { incident_sla_hours: { high: 8 } })).toBe(8);
    expect(slaHoursFor("xpto")).toBe(DEFAULT_SLA_HOURS.low);
  });

  it("deadline = abertura + horas da gravidade", () => {
    const inc = { type: "avaria", created_date: NOW.toISOString() }; // high = 24h
    const d = slaDeadline(inc, null);
    expect(d.getTime()).toBe(NOW.getTime() + 24 * 3600_000);
  });

  it("em aberto: on_time / at_risk / late", () => {
    // high = 24h. aberto há 1h → no prazo
    expect(incidentSlaStatus({ type: "avaria", status: "open", created_date: hoursAgo(1) }, null, NOW)).toBe("on_time");
    // aberto há 20h → faltam 4h (<=20% de 24h) → em risco
    expect(incidentSlaStatus({ type: "avaria", status: "open", created_date: hoursAgo(20) }, null, NOW)).toBe("at_risk");
    // aberto há 30h → estourado
    expect(incidentSlaStatus({ type: "avaria", status: "open", created_date: hoursAgo(30) }, null, NOW)).toBe("late");
  });

  it("resolvida: met se dentro do prazo, breached se depois", () => {
    const base = { type: "atraso", status: "resolved", created_date: hoursAgo(200) }; // low = 168h
    expect(incidentSlaStatus({ ...base, resolved_at: hoursAgo(40) }, null, NOW)).toBe("met"); // resolvida 160h após abertura
    expect(incidentSlaStatus({ ...base, resolved_at: hoursAgo(10) }, null, NOW)).toBe("breached"); // 190h após abertura
  });

  it("retorna null sem data de abertura", () => {
    expect(incidentSlaStatus({ type: "avaria", status: "open" }, null, NOW)).toBe(null);
  });
});

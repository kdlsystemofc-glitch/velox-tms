import { describe, it, expect } from "vitest";
import { incidentSeverity, sortByGravity, resolutionHours, incidentTypeLabel } from "./incidents";

describe("ocorrências", () => {
  it("gravidade por tipo", () => {
    expect(incidentSeverity({ type: "roubo" })).toBe("critical");
    expect(incidentSeverity({ type: "acidente" })).toBe("critical");
    expect(incidentSeverity({ type: "atraso" })).toBe("low");
    expect(incidentSeverity({ type: "avaria" })).toBe("high");
  });

  it("severity explícito sobrepõe o tipo", () => {
    expect(incidentSeverity({ type: "atraso", severity: "critical" })).toBe("critical");
  });

  it("ordena por gravidade (roubo/acidente no topo)", () => {
    const list = [{ type: "atraso" }, { type: "roubo" }, { type: "avaria" }];
    const sorted = sortByGravity(list);
    expect(sorted[0].type).toBe("roubo");
    expect(sorted[2].type).toBe("atraso");
  });

  it("tempo de resolução em horas", () => {
    const inc = { created_date: "2026-06-01T08:00:00", resolved_at: "2026-06-01T13:00:00" };
    expect(resolutionHours(inc)).toBe(5);
    expect(resolutionHours({ created_date: "2026-06-01T08:00:00" })).toBeNull();
  });

  it("rótulo legível do tipo", () => {
    expect(incidentTypeLabel("carga_nao_pronta")).toBe("Carga não estava pronta");
  });
});

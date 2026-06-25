import { describe, it, expect } from "vitest";
import { formatDateTimeBR, safeDateBR, formatDateBR, formatTimeBR } from "./dateUtils";

describe("formatDateTimeBR — à prova de crash", () => {
  it("formata um ISO válido como dd/MM HH:mm", () => {
    expect(formatDateTimeBR("2026-06-24T16:08:00")).toMatch(/^24\/06 \d{2}:\d{2}$/);
  });
  it("não lança e retorna fallback em data inválida", () => {
    expect(() => formatDateTimeBR("não-é-data")).not.toThrow();
    expect(formatDateTimeBR("não-é-data")).toBe("");
    expect(formatDateTimeBR("não-é-data", "—")).toBe("—");
  });
  it("retorna fallback para null/undefined/vazio", () => {
    expect(formatDateTimeBR(null)).toBe("");
    expect(formatDateTimeBR(undefined)).toBe("");
    expect(formatDateTimeBR("")).toBe("");
  });
  it("aceita um objeto Date", () => {
    expect(formatDateTimeBR(new Date("2026-01-02T03:04:00"))).toBe("02/01 03:04");
  });
});

describe("formatTimeBR — à prova de crash", () => {
  it("formata só a hora", () => {
    expect(formatTimeBR("2026-06-24T16:08:00")).toBe("16:08");
  });
  it("retorna fallback em valor inválido/vazio", () => {
    expect(() => formatTimeBR("lixo")).not.toThrow();
    expect(formatTimeBR("lixo")).toBe("");
    expect(formatTimeBR(null, "—")).toBe("—");
  });
});

describe("safeDateBR — à prova de crash", () => {
  it("formata YYYY-MM-DD sem shift de fuso", () => {
    expect(safeDateBR("2026-06-24")).toBe(formatDateBR("2026-06-24"));
    expect(safeDateBR("2026-06-24")).toBe("24/06/2026");
  });
  it("formata ISO completo", () => {
    expect(safeDateBR("2026-06-24T10:00:00Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
  it("não lança e retorna fallback em data inválida", () => {
    expect(() => safeDateBR("lixo")).not.toThrow();
    expect(safeDateBR("lixo")).toBe("—");
    expect(safeDateBR(null)).toBe("—");
    expect(safeDateBR("", "vazio")).toBe("vazio");
  });
});

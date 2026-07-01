import { describe, it, expect } from "vitest";
import { isAddressInCoverage } from "./coverageChecker";

describe("isAddressInCoverage", () => {
  it("sem configuração de cobertura → atende tudo", () => {
    expect(isAddressInCoverage("01000000", "SP", "São Paulo", null)).toBe(true);
    expect(isAddressInCoverage("01000000", "SP", "São Paulo", {})).toBe(true);
  });

  it("por estados: só UFs listadas", () => {
    const s = { coverage_type: "states", coverage_states: ["SP", "PR"] };
    expect(isAddressInCoverage("", "SP", "", s)).toBe(true);
    expect(isAddressInCoverage("", "RJ", "", s)).toBe(false);
  });

  it("por cidades: casa cidade (case-insensitive) + UF", () => {
    const s = { coverage_type: "cities", coverage_cities: [{ city: "Curitiba", state: "PR" }] };
    expect(isAddressInCoverage("", "PR", "curitiba", s)).toBe(true);
    expect(isAddressInCoverage("", "SP", "Curitiba", s)).toBe(false); // UF diferente
    expect(isAddressInCoverage("", "PR", "Londrina", s)).toBe(false);
  });

  it("por faixa de CEP: dentro/fora do intervalo", () => {
    const s = { coverage_type: "cep_range", coverage_cep_ranges: [{ from: "01000-000", to: "05999-999" }] };
    expect(isAddressInCoverage("03000000", "SP", "", s)).toBe(true);
    expect(isAddressInCoverage("09000000", "SP", "", s)).toBe(false);
  });

  it("tipo desconhecido → atende (não bloqueia por engano)", () => {
    expect(isAddressInCoverage("01000000", "SP", "", { coverage_type: "outro" })).toBe(true);
  });
});

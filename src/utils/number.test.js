import { describe, it, expect } from "vitest";
import { parseBRNumber } from "./number";

describe("parseBRNumber", () => {
  it("formato BR com milhar e decimal", () => {
    expect(parseBRNumber("28.500,00")).toBe(28500);
    expect(parseBRNumber("1.234,56")).toBeCloseTo(1234.56);
  });
  it("inteiros e decimais simples", () => {
    expect(parseBRNumber("480")).toBe(480);
    expect(parseBRNumber("12,5")).toBeCloseTo(12.5);
  });
  it("número já numérico passa direto", () => {
    expect(parseBRNumber(42)).toBe(42);
  });
  it("vazio/inválido → 0", () => {
    expect(parseBRNumber("")).toBe(0);
    expect(parseBRNumber(null)).toBe(0);
    expect(parseBRNumber("abc")).toBe(0);
  });
});

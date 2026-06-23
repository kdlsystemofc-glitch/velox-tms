import { describe, it, expect } from "vitest";
import { normalizePlate, formatPlate, isValidPlate, formatCPF, isValidCPF } from "./validators";

describe("placa", () => {
  it("normaliza removendo hífen e caixa", () => {
    expect(normalizePlate("abc-1234")).toBe("ABC1234");
    expect(normalizePlate("abc1d23")).toBe("ABC1D23");
  });
  it("formata placa antiga com hífen", () => {
    expect(formatPlate("abc1234")).toBe("ABC-1234");
  });
  it("formata Mercosul sem hífen", () => {
    expect(formatPlate("abc1d23")).toBe("ABC1D23");
  });
  it("valida ambos os padrões", () => {
    expect(isValidPlate("ABC-1234")).toBe(true);
    expect(isValidPlate("ABC1D23")).toBe(true);
    expect(isValidPlate("AB1234")).toBe(false);
    expect(isValidPlate("ABCD123")).toBe(false);
  });
});

describe("cpf", () => {
  it("aplica a máscara progressiva", () => {
    expect(formatCPF("390")).toBe("390");
    expect(formatCPF("39053344705")).toBe("390.533.447-05");
  });
  it("valida dígitos verificadores", () => {
    expect(isValidCPF("390.533.447-05")).toBe(true);
    expect(isValidCPF("111.111.111-11")).toBe(false);
    expect(isValidCPF("123.456.789-00")).toBe(false);
    expect(isValidCPF("390.533.447-04")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { normalizePlate, formatPlate, isValidPlate, formatCPF, isValidCPF, formatCNPJ, isValidCNPJ, formatCpfCnpj, isValidCpfCnpj } from "./validators";

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

describe("cnpj", () => {
  it("aplica a máscara progressiva", () => {
    expect(formatCNPJ("11222333")).toBe("11.222.333");
    expect(formatCNPJ("11222333000181")).toBe("11.222.333/0001-81");
  });
  it("valida dígitos verificadores", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
    expect(isValidCNPJ("00.000.000/0000-00")).toBe(false);
  });
});

describe("cpf/cnpj combinado", () => {
  it("formata conforme o tamanho", () => {
    expect(formatCpfCnpj("39053344705")).toBe("390.533.447-05");
    expect(formatCpfCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });
  it("valida CPF ou CNPJ", () => {
    expect(isValidCpfCnpj("390.533.447-05")).toBe(true);
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCpfCnpj("123")).toBe(false);
  });
});

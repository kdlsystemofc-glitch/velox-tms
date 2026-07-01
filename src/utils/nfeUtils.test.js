import { describe, it, expect } from "vitest";
import { validateNFeKey, nfNumberFromKey, formatNFeKey } from "./nfeUtils";

// Calcula o DV (módulo 11, pesos 2..9 da direita p/ esquerda) de forma
// independente, para gerar uma chave válida sem depender da função sob teste.
function withDV(base43) {
  let sum = 0, w = 2;
  for (let i = 42; i >= 0; i--) { sum += Number(base43[i]) * w; w = w === 9 ? 2 : w + 1; }
  const rest = sum % 11;
  const dv = rest < 2 ? 0 : 11 - rest;
  return base43 + dv;
}

// cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) = 43
const base43 = "35" + "2401" + "14200166000187" + "55" + "001" + "000000015" + "1" + "12345678";
const validKey = withDV(base43);

describe("validateNFeKey", () => {
  it("aceita chave de 44 dígitos com DV correto", () => {
    expect(validKey).toHaveLength(44);
    expect(validateNFeKey(validKey).valid).toBe(true);
  });
  it("rejeita DV incorreto", () => {
    const wrongDv = base43 + ((Number(validKey[43]) + 1) % 10);
    expect(validateNFeKey(wrongDv).valid).toBe(false);
  });
  it("rejeita comprimento inválido e vazio", () => {
    expect(validateNFeKey("").valid).toBe(false);
    expect(validateNFeKey("123").valid).toBe(false);
    expect(validateNFeKey("123").reason).toMatch(/44 díg/);
  });
  it("ignora pontuação/espaços", () => {
    const spaced = formatNFeKey(validKey); // grupos de 4
    expect(validateNFeKey(spaced).valid).toBe(true);
  });
});

describe("nfNumberFromKey", () => {
  it("extrai o nNF (posições 26-34) sem zeros à esquerda", () => {
    expect(nfNumberFromKey(validKey)).toBe("15");
  });
  it("null para chave de tamanho inválido", () => {
    expect(nfNumberFromKey("123")).toBeNull();
  });
});

describe("formatNFeKey", () => {
  it("formata em grupos de 4", () => {
    expect(formatNFeKey("1234567890")).toBe("1234 5678 90");
  });
});

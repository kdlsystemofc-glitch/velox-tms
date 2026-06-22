import { describe, it, expect } from "vitest";
import { toCsv, csvMoney, csvDate } from "./exportCsv";

describe("exportCsv", () => {
  const cols = [
    { key: "protocol", label: "Protocolo" },
    { key: "client", label: "Cliente" },
    { key: "freight", label: "Frete", format: csvMoney },
  ];

  it("gera cabeçalho + linhas com separador ;", () => {
    const csv = toCsv([{ protocol: "VLX-1", client: "ACME", freight: 1250.5 }], cols);
    const [header, line] = csv.split("\r\n");
    expect(header).toBe("Protocolo;Cliente;Frete");
    expect(line).toBe("VLX-1;ACME;1250,50");
  });

  it("escapa células com ; aspas e quebra de linha", () => {
    const csv = toCsv([{ protocol: 'A;B', client: 'diz "oi"', freight: 0 }], cols);
    expect(csv.split("\r\n")[1]).toBe('"A;B";"diz ""oi""";0,00');
  });

  it("csvDate formata pt-BR", () => {
    expect(csvDate("2026-06-15")).toBe("15/06/2026");
    expect(csvDate("")).toBe("");
  });
});

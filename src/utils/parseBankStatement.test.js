import { describe, it, expect } from "vitest";
import { parseAmount, parseOFX, parseCSV, parseBankStatement } from "./parseBankStatement";

describe("parseAmount", () => {
  it("US e BR", () => {
    expect(parseAmount("1234.56")).toBe(1234.56);
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("1200,00")).toBe(1200);
  });
  it("sinais", () => {
    expect(parseAmount("-123.45")).toBe(-123.45);
    expect(parseAmount("(123,45)")).toBe(-123.45);
    expect(parseAmount("R$ 500,00")).toBe(500);
  });
  it("inválido", () => {
    expect(Number.isNaN(parseAmount(""))).toBe(true);
    expect(Number.isNaN(parseAmount(null))).toBe(true);
  });
});

const OFX = `
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20240115120000<TRNAMT>1200.00<FITID>A1<NAME>RECEBIMENTO CLIENTE</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20240116<TRNAMT>-350.50<FITID>A2<MEMO>POSTO COMBUSTIVEL</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

describe("parseOFX", () => {
  it("extrai crédito e débito", () => {
    const r = parseOFX(OFX);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ fitid: "A1", posted_at: "2024-01-15", amount: 1200, source: "ofx" });
    expect(r[0].description).toBe("RECEBIMENTO CLIENTE");
    expect(r[1]).toMatchObject({ fitid: "A2", posted_at: "2024-01-16", amount: -350.5 });
  });
});

describe("parseCSV", () => {
  it("com cabeçalho e ; BR", () => {
    const csv = "Data;Valor;Historico\n15/01/2024;1.200,00;Recebimento\n16/01/2024;-350,50;Posto";
    const r = parseCSV(csv);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ posted_at: "2024-01-15", amount: 1200, description: "Recebimento", source: "csv" });
    expect(r[1].amount).toBe(-350.5);
  });
  it("sem cabeçalho, vírgula US", () => {
    const csv = "2024-01-15,1200.00,Recebimento";
    const r = parseCSV(csv);
    expect(r[0]).toMatchObject({ posted_at: "2024-01-15", amount: 1200 });
  });
});

describe("parseBankStatement", () => {
  it("detecta OFX por conteúdo e deduplica fitid", () => {
    const dup = OFX + "\n<STMTTRN><DTPOSTED>20240115<TRNAMT>1200.00<FITID>A1<NAME>DUP</STMTTRN>";
    const r = parseBankStatement("extrato.ofx", dup);
    expect(r.filter(x => x.fitid === "A1")).toHaveLength(1);
  });
  it("usa CSV para .csv", () => {
    const r = parseBankStatement("e.csv", "Data;Valor;Hist\n10/02/2024;99,90;Tarifa");
    expect(r[0]).toMatchObject({ posted_at: "2024-02-10", amount: 99.9 });
  });
});

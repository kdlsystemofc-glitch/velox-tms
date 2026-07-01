import { describe, it, expect, beforeAll } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { parseNFeXML } from "./nfeXml";

// O app usa o DOMParser nativo do browser em runtime; no teste (ambiente node)
// injetamos um DOMParser puro-JS equivalente.
beforeAll(() => { globalThis.DOMParser = DOMParser; });

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe><infNFe Id="NFe35240114200166000187550010000000151123456780">
    <ide><nNF>15</nNF></ide>
    <dest>
      <CNPJ>99999999000191</CNPJ>
      <xNome>Cliente Exemplo Ltda</xNome>
      <enderDest>
        <xLgr>Rua das Flores</xLgr><nro>100</nro><xBairro>Centro</xBairro>
        <xMun>Curitiba</xMun><UF>PR</UF><CEP>80010000</CEP>
      </enderDest>
    </dest>
    <det><prod><xProd>Caixa de Parafusos</xProd><NCM>73181500</NCM></prod></det>
    <det><prod><xProd>Arruelas</xProd><NCM>73182100</NCM></prod></det>
    <total><ICMSTot><vNF>1234.56</vNF></ICMSTot></total>
    <transp><vol><qVol>3</qVol><esp>Palete</esp><pesoB>150.5</pesoB></vol></transp>
  </infNFe></NFe>
</nfeProc>`;

describe("parseNFeXML", () => {
  it("extrai chave, número, destinatário, itens e totais", () => {
    const r = parseNFeXML(XML);
    expect(r).not.toBeNull();
    expect(r.nf_key).toHaveLength(44);
    expect(r.nf_number).toBe("15");
    expect(r.recipient).toMatchObject({ name: "Cliente Exemplo Ltda", city: "Curitiba", state: "PR", cep: "80010000", cnpj_cpf: "99999999000191" });
    expect(r.totals.volumes).toBe(3);
    expect(r.totals.weight_kg).toBeCloseTo(150.5, 2);
    expect(r.totals.declared_value).toBeCloseTo(1234.56, 2);
    expect(r.totals.items).toBe(2);
    expect(r.item.package_type).toBe("palete"); // espécie "Palete"
    expect(r.item.description).toContain("e mais 1 item");
  });

  it("retorna null para XML que não é NF-e", () => {
    expect(parseNFeXML("<html><body>oi</body></html>")).toBeNull();
    expect(parseNFeXML("lixo")).toBeNull();
  });
});

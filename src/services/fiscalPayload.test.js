import { describe, it, expect } from "vitest";
import { buildFiscalPayload, buildCTePayload, buildMDFePayload } from "./fiscalPayload";

const company = { company_name: "Velox", cnpj: "11.222.333/0001-44", ie: "123", crt: "3", rntrc: "9999999" };
const nfKey = "3".repeat(44);

const order = {
  id: "o1", protocol: "VLX1", client_name: "ACME", client_cpf_cnpj: "22.333.444/0001-55",
  freight_payer: "cif", freight_value: 250, total_weight_kg: 120, total_declared_value: 5000, total_volumes: 4,
  origin: { city: "São Paulo", state: "SP", cep: "01000-000" },
  recipients: [{ name: "Loja 1", cnpj_cpf: "33.444.555/0001-66", city: "Curitiba", state: "PR",
    items: [{ description: "Peças", nf_key: nfKey, volumes: 4 }] }],
};

describe("buildCTePayload (P09.2)", () => {
  it("monta emitente, remetente/destinatário e valores", () => {
    const p = buildCTePayload({ order, company });
    expect(p.kind).toBe("cte");
    expect(p.emitente.cnpj).toBe("11222333000144"); // só dígitos
    expect(p.remetente.name).toBe("ACME");
    expect(p.destinatario.name).toBe("Loja 1");
    expect(p.valores.total).toBe(250);
    expect(p.carga.pesoKg).toBe(120);
  });

  it("tomador CIF = remetente; FOB = destinatário", () => {
    expect(buildCTePayload({ order, company }).tomador).toBe("remetente");
    expect(buildCTePayload({ order: { ...order, freight_payer: "fob" }, company }).tomador).toBe("destinatario");
  });

  it("prioriza o snapshot congelado (P03) sobre freight_value", () => {
    const p = buildCTePayload({ order: { ...order, freight_breakdown: { snapshot_freight_value: 300 } }, company });
    expect(p.valores.total).toBe(300);
  });

  it("coleta chaves de NF-e de 44 dígitos", () => {
    expect(buildCTePayload({ order, company }).refNFe).toEqual([nfKey]);
    const semChave = { ...order, recipients: [{ ...order.recipients[0], items: [{ nf_key: "123" }] }] };
    expect(buildCTePayload({ order: semChave, company }).refNFe).toEqual([]);
  });
});

describe("buildMDFePayload (P09.2)", () => {
  it("agrega peso/valor e documentos por pedido", () => {
    const p = buildMDFePayload({ trip: { truck_plate: "ABC1D23", driver_name: "João" }, orders: [order], company });
    expect(p.kind).toBe("mdfe");
    expect(p.totais.pesoKg).toBe(120);
    expect(p.totais.qDoc).toBe(1);
    expect(p.ufIni).toBe("SP");
    expect(p.ufFim).toBe("PR");
    expect(p.documentos[0].nfeKeys).toEqual([nfKey]);
  });
});

describe("buildFiscalPayload dispatcher", () => {
  it("despacha por tipo e rejeita desconhecido", () => {
    expect(buildFiscalPayload("cte", { order, company }).kind).toBe("cte");
    expect(() => buildFiscalPayload("xpto", {})).toThrow();
  });
});

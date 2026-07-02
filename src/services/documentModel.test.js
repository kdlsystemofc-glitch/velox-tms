import { describe, it, expect } from "vitest";
import { buildDocumentModel, DOCUMENT_TYPES } from "./documentModel";

const company = { company_name: "Velox", cnpj: "00.000.000/0001-00" };

describe("buildDocumentModel (modelo isomórfico — P08.2)", () => {
  it("expõe os 6 tipos", () => {
    expect(DOCUMENT_TYPES).toEqual(["invoice", "receipt", "shipment", "trip_manifest", "transfer_manifest", "labels"]);
  });

  it("tipo desconhecido lança", () => {
    expect(() => buildDocumentModel("xpto", {})).toThrow();
  });

  it("fatura: número, total e linhas", () => {
    const m = buildDocumentModel("invoice", {
      invoice: { number: "FAT-2026-0001", total: 300, status: "open", lines: [{ protocol: "VLX1", amount: 100 }, { protocol: "VLX2", amount: 200 }] },
      company,
    });
    expect(m.type).toBe("invoice");
    expect(m.docNumber).toBe("FAT-2026-0001");
    const table = m.blocks.find((b) => b.kind === "table");
    expect(table.rows).toHaveLength(2);
    const total = m.blocks.find((b) => b.kind === "total");
    expect(total.value).toContain("300");
    expect(m.company.name).toBe("Velox");
  });

  it("shipment: banner sem valor fiscal + total de frete", () => {
    const m = buildDocumentModel("shipment", {
      order: { protocol: "VLX9", freight_value: 150, freight_payer: "cif",
        recipients: [{ name: "ACME", city: "Curitiba", items: [{ nf_number: "1", volumes: 2, weight_kg: 10, declared_value: 500 }] }] },
      company,
    });
    expect(m.banner).toMatch(/SEM VALOR FISCAL/);
    expect(m.blocks.some((b) => b.kind === "total" && b.value.includes("150"))).toBe(true);
  });

  it("labels: gera uma etiqueta por volume", () => {
    const m = buildDocumentModel("labels", {
      order: { protocol: "VLX7", client_name: "ACME",
        recipients: [{ name: "Loja 1", city: "SP", items: [{ volumes: 3 }] }] },
      company,
    });
    const labels = m.blocks.find((b) => b.kind === "labels");
    expect(labels.items).toHaveLength(3);
    expect(labels.items[0].badge).toBe("1/3");
  });

  it("trip_manifest: agrega NFs/volumes/peso por pedido", () => {
    const m = buildDocumentModel("trip_manifest", {
      trip: { truck_plate: "ABC1D23", driver_name: "João", order_ids: ["a", "b"] },
      orders: [{ protocol: "VLX1", recipients: [{ city: "SP", items: [{ nf_number: "1", volumes: 2, weight_kg: 5 }] }] }],
      company,
    });
    const table = m.blocks.find((b) => b.kind === "table");
    expect(table.rows[0][0]).toBe("VLX1");
    expect(table.rows[0][3]).toBe("2");   // volumes
  });

  it("receipt e transfer_manifest retornam modelo válido", () => {
    const r = buildDocumentModel("receipt", { order: { protocol: "P1", recipients: [] }, trip: { driver_name: "X" }, company });
    expect(r.type).toBe("receipt");
    const t = buildDocumentModel("transfer_manifest", { transfer: { protocol: "T1", from_branch_name: "A", to_branch_name: "B" }, orders: [], company });
    expect(t.meta.find((x) => x.label === "Origem").value).toBe("A");
  });
});

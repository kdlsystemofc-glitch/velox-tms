import { describe, it, expect } from "vitest";
import { tariffKey, buildTariffIndex, resolveTariffVersion, resolveTariffPayload } from "./tariff";

const V = (over) => ({ scope: "default", scope_key: null, status: "active", version_no: 1, payload: {}, ...over });

describe("tariffKey", () => {
  it("normaliza chave nula do default", () => {
    expect(tariffKey("default", null)).toBe("default:");
    expect(tariffKey("route", "SP-PR")).toBe("route:SP-PR");
    expect(tariffKey("client", "abc")).toBe("client:abc");
  });
});

describe("buildTariffIndex", () => {
  it("agrupa versões por escopo+chave", () => {
    const idx = buildTariffIndex([
      V({ version_no: 1 }), V({ version_no: 2 }),
      V({ scope: "route", scope_key: "SP-PR", version_no: 1 }),
    ]);
    expect(idx["default:"]).toHaveLength(2);
    expect(idx["route:SP-PR"]).toHaveLength(1);
  });
  it("tolera entrada nula", () => {
    expect(buildTariffIndex(null)).toEqual({});
  });
});

describe("resolveTariffVersion", () => {
  it("escolhe a maior version_no entre as ativas", () => {
    const v = resolveTariffVersion([V({ version_no: 1 }), V({ version_no: 3 }), V({ version_no: 2 })], "2026-06-01");
    expect(v.version_no).toBe(3);
  });
  it("ignora versões arquivadas/rascunho", () => {
    const v = resolveTariffVersion([V({ version_no: 5, status: "archived" }), V({ version_no: 2 })], "2026-06-01");
    expect(v.version_no).toBe(2);
  });
  it("respeita a janela de vigência", () => {
    const versions = [V({ version_no: 1, valid_from: "2026-01-01", valid_until: "2026-03-31" })];
    expect(resolveTariffVersion(versions, "2026-02-15").version_no).toBe(1);
    expect(resolveTariffVersion(versions, "2026-05-01")).toBeNull();
  });
  it("retorna null para lista vazia", () => {
    expect(resolveTariffVersion([], "2026-06-01")).toBeNull();
  });
});

describe("resolveTariffPayload (com fallback legado)", () => {
  const idx = buildTariffIndex([V({ version_no: 1, payload: { price_per_kg: 9 } })]);
  it("devolve o payload da versão vigente", () => {
    expect(resolveTariffPayload(idx, "default", null, "2026-06-01", { price_per_kg: 1 })).toEqual({ price_per_kg: 9 });
  });
  it("cai no fallback quando não há versão para o escopo", () => {
    expect(resolveTariffPayload(idx, "client", "xyz", "2026-06-01", { price_per_kg: 2 })).toEqual({ price_per_kg: 2 });
  });
  it("cai no fallback quando índice é nulo", () => {
    expect(resolveTariffPayload(null, "default", null, "2026-06-01", { price_per_kg: 3 })).toEqual({ price_per_kg: 3 });
  });
});

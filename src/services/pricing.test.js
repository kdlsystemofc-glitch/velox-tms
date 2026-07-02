import { describe, it, expect, afterEach } from "vitest";
import { quoteFreight, buildFreightSnapshot, resolveClientPricing } from "./pricing";
import { calculateFreightFull } from "@/utils/freightCalculator";
import { setTariffIndex, buildTariffIndex } from "@/services/tariff";

const settings = { pricing: { price_per_kg: 1, minimum_freight: 0 } };
const items = [{ weight_kg: 100 }];

describe("quoteFreight (serviço único de precificação)", () => {
  it("sem cliente: idêntico a calculateFreightFull com a tabela padrão", () => {
    const via = quoteFreight({ items, settings });
    const direct = calculateFreightFull({ items, nfCount: 1, pricing: settings.pricing, clientPricing: null, settings, freightType: "shared" });
    expect(via.total).toBe(direct.total);
    expect(via.total).toBeCloseTo(100, 2);
  });

  it("resolve a tabela do cliente (custom_pricing) internamente", () => {
    const client = { custom_pricing: { price_per_kg: 2 } };
    const r = quoteFreight({ items, client, settings });
    expect(r.total).toBeCloseTo(200, 2); // 100 × 2
  });

  it("clientPricing explícito tem prioridade sobre client", () => {
    const client = { custom_pricing: { price_per_kg: 2 } };
    const r = quoteFreight({ items, client, clientPricing: { price_per_kg: 5 }, settings });
    expect(r.total).toBeCloseTo(500, 2); // usa o explícito
  });

  it("clientPricing = null (explícito) ignora o custom_pricing do cliente", () => {
    const client = { custom_pricing: { price_per_kg: 9 } };
    const r = quoteFreight({ items, client, clientPricing: null, settings });
    expect(r.total).toBeCloseTo(100, 2); // volta ao padrão
  });

  it("repassa freightType, nfCount e extraCharges ao motor", () => {
    const r = quoteFreight({
      items, settings: { pricing: { price_per_kg: 1, urgent_percent: 50 } },
      freightType: "urgent", nfCount: 2, extraCharges: [{ amount: 30 }],
    });
    // 100 (peso) + 30 (extra) = 130; +50% urgência = 195
    expect(r.total).toBeCloseTo(195, 2);
  });
});

describe("pricingSource (fonte da tabela — auditoria P03.1)", () => {
  it("marca 'default' quando usa a tabela padrão", () => {
    const r = quoteFreight({ items, settings });
    expect(r.pricingSource).toBe("default");
  });

  it("marca 'client' quando há custom_pricing", () => {
    const r = quoteFreight({ items, client: { custom_pricing: { price_per_kg: 2 } }, settings });
    expect(r.pricingSource).toBe("client");
  });

  it("marca 'route:UF-UF' quando um corredor vigente casa", () => {
    const s = {
      pricing: { price_per_kg: 1 },
      route_pricing: [{ origin_state: "SP", dest_state: "PR", price_per_kg: 3 }],
    };
    const r = quoteFreight({ items, settings: s, originState: "SP", destState: "PR" });
    expect(r.pricingSource).toBe("route:SP-PR");
    expect(r.total).toBeCloseTo(300, 2); // 100 × 3 (corredor sobrescreve)
  });
});

describe("buildFreightSnapshot (snapshot imutável — P03.1)", () => {
  it("preserva o cálculo (snapshot == recálculo) e anexa metadados", () => {
    const breakdown = quoteFreight({ items, settings });
    const snap = buildFreightSnapshot(breakdown, { freightValue: 123.45, capturedBy: "manual" });
    expect(snap.total).toBe(breakdown.total);
    expect(snap.pricingSource).toBe(breakdown.pricingSource);
    expect(snap.snapshot_freight_value).toBe(123.45);
    expect(snap.captured_by).toBe("manual");
    expect(typeof snap.snapshot_at).toBe("string");
  });

  it("retorna null quando não há breakdown", () => {
    expect(buildFreightSnapshot(null, { freightValue: 10 })).toBeNull();
  });

  it("snapshot_freight_value é null quando o valor é vazio", () => {
    const breakdown = quoteFreight({ items, settings });
    expect(buildFreightSnapshot(breakdown, { freightValue: "" }).snapshot_freight_value).toBeNull();
  });
});

describe("tarifa VERSIONADA do cliente com fallback (P03.3)", () => {
  afterEach(() => setTariffIndex(null)); // não vaza índice entre testes

  const client = { id: "cli-1", custom_pricing: { price_per_kg: 2 } };

  it("sem índice: usa o custom_pricing legado (fallback)", () => {
    setTariffIndex(null);
    expect(quoteFreight({ items, client, settings }).total).toBeCloseTo(200, 2); // 100 × 2 (legado)
  });

  it("com versão vigente: a tarifa versionada tem prioridade sobre o legado", () => {
    setTariffIndex(buildTariffIndex([
      { scope: "client", scope_key: "cli-1", status: "active", version_no: 1, payload: { price_per_kg: 4 } },
    ]));
    expect(quoteFreight({ items, client, settings }).total).toBeCloseTo(400, 2); // 100 × 4 (versão)
  });

  it("versão de OUTRO cliente não afeta este (cai no legado)", () => {
    setTariffIndex(buildTariffIndex([
      { scope: "client", scope_key: "outro", status: "active", version_no: 1, payload: { price_per_kg: 9 } },
    ]));
    expect(quoteFreight({ items, client, settings }).total).toBeCloseTo(200, 2); // 100 × 2 (legado)
  });

  it("resolveClientPricing devolve null quando não há versão nem custom_pricing", () => {
    setTariffIndex(null);
    expect(resolveClientPricing({ id: "x" }, settings)).toBeNull();
  });
});

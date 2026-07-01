import { describe, it, expect } from "vitest";
import { quoteFreight } from "./pricing";
import { calculateFreightFull } from "@/utils/freightCalculator";

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

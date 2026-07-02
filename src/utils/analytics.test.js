import { describe, it, expect } from "vitest";
import { computeOTIF, laneAnalysis, clientAnalysis,
  periodRange, computePeriodKpis, buildMonthlySeries, rankClientsByRevenue,
  rankDestinations, rankDriversByRevenue, tripEconomics, leadTimeAvgDays, computeIndicators } from "./analytics";

// SLA: sem deadline calculável, slaStatus retorna "on_time" para entregues.
const delivered = (extra = {}) => ({ status: "delivered", status_history: [{ status: "delivered", timestamp: "2024-01-10T10:00:00Z" }], ...extra });

describe("computeOTIF", () => {
  it("conta on-time, in-full e OTIF", () => {
    const orders = [
      delivered({ id: "1", origin: { state: "SP" }, recipients: [{ state: "SP" }] }),
      delivered({ id: "2", origin: { state: "SP" }, recipients: [{ state: "SP" }] }),
      { id: "3", status: "partially_delivered", status_history: [{ status: "delivered", timestamp: "2024-01-10T10:00:00Z" }] },
      { id: "4", status: "in_transit" }, // não conta
    ];
    const r = computeOTIF(orders, {});
    expect(r.total).toBe(3);           // 2 delivered + 1 partial
    expect(r.inFull).toBe(2);          // só os 2 delivered
    expect(r.otifPct).toBeCloseTo(66.7, 1);
  });
  it("sem entregas retorna null nas taxas", () => {
    expect(computeOTIF([{ status: "new" }], {}).otifPct).toBeNull();
  });
});

describe("laneAnalysis", () => {
  it("agrupa por corredor UF→UF e ordena por frete", () => {
    const orders = [
      { status: "delivered", freight_value: 100, total_weight_kg: 50, origin: { state: "SP" }, recipients: [{ state: "PR" }] },
      { status: "delivered", freight_value: 300, total_weight_kg: 100, origin: { state: "SP" }, recipients: [{ state: "RJ" }] },
      { status: "delivered", freight_value: 50, total_weight_kg: 25, origin: { state: "SP" }, recipients: [{ state: "PR" }] },
      { status: "cancelled", freight_value: 999, origin: { state: "SP" }, recipients: [{ state: "PR" }] }, // ignorado
    ];
    const r = laneAnalysis(orders);
    expect(r[0].lane).toBe("SP → RJ");
    expect(r[0].freight).toBe(300);
    const pr = r.find(l => l.lane === "SP → PR");
    expect(pr.orders).toBe(2);
    expect(pr.freight).toBe(150);
    expect(pr.avgPerKg).toBeCloseTo(2, 2); // 150 / 75kg
  });
});

describe("clientAnalysis", () => {
  it("agrupa por cliente com ticket médio", () => {
    const orders = [
      { status: "delivered", client_id: "c1", client_name: "ACME", freight_value: 100 },
      { status: "delivered", client_id: "c1", client_name: "ACME", freight_value: 300 },
      { status: "delivered", client_id: "c2", client_name: "Beta", freight_value: 50 },
    ];
    const r = clientAnalysis(orders);
    expect(r[0].client_name).toBe("ACME");
    expect(r[0].freight).toBe(400);
    expect(r[0].avgTicket).toBe(200);
  });
});

// ============================================================
// Indicadores (PA-01) — agregações extraídas de Indicators.jsx
// ============================================================
const NOW = new Date(2026, 5, 15); // 15/jun/2026

describe("periodRange", () => {
  it("mês atual = [1º do mês, 1º do mês seguinte)", () => {
    const [s, e] = periodRange("this_month", NOW);
    expect(s).toEqual(new Date(2026, 5, 1));
    expect(e).toEqual(new Date(2026, 6, 1));
  });
  it("mês anterior e 3m", () => {
    expect(periodRange("last_month", NOW)[0]).toEqual(new Date(2026, 4, 1));
    expect(periodRange("3m", NOW)[0]).toEqual(new Date(2026, 3, 1));
    expect(periodRange("ytd", NOW)[0]).toEqual(new Date(2026, 0, 1));
  });
});

describe("computePeriodKpis", () => {
  const s = new Date(2026, 5, 1), e = new Date(2026, 6, 1);
  const data = {
    orders: [
      { status_history: [{ status: "delivered", timestamp: new Date(2026, 5, 10).toISOString() }] },
      { status_history: [{ status: "collecting", timestamp: new Date(2026, 5, 5).toISOString() }] },
      { status_history: [{ status: "delivered", timestamp: new Date(2026, 4, 20).toISOString() }] }, // fora do período
    ],
    revenues: [{ status: "received", received_date: new Date(2026, 5, 8).toISOString(), amount: 1000 }],
    expenses: [{ status: "paid", paid_date: new Date(2026, 5, 9).toISOString(), amount: 400 }],
    incidents: [{ created_date: new Date(2026, 5, 3).toISOString() }],
  };
  it("conta entregas/coletas/financeiro do período", () => {
    const k = computePeriodKpis(data, {}, s, e);
    expect(k.delivered).toBe(1);           // só a de junho
    expect(k.collected).toBe(1);
    expect(k.faturamento).toBe(1000);
    expect(k.despesa).toBe(400);
    expect(k.resultado).toBe(600);
    expect(k.margin).toBeCloseTo(60, 1);
    expect(k.incidentsCreated).toBe(1);
  });
});

describe("rankings e economia", () => {
  const delivered = [
    { client_name: "ACME", freight_value: 300, recipients: [{ city: "Curitiba" }] },
    { client_name: "ACME", freight_value: 100, recipients: [{ city: "Curitiba" }] },
    { client_name: "Beta", freight_value: 200, recipients: [{ city: "SP" }] },
  ];
  it("rankClientsByRevenue ordena por receita", () => {
    const r = rankClientsByRevenue(delivered);
    expect(r[0]).toMatchObject({ name: "ACME", entregas: 2, receita: 400 });
  });
  it("rankDestinations conta por cidade", () => {
    expect(rankDestinations(delivered)[0]).toMatchObject({ city: "Curitiba", entregas: 2 });
  });
  it("rankDriversByRevenue soma receita de viagens", () => {
    const trips = [{ driver_name: "João", total_revenue: 500 }, { driver_name: "João", total_revenue: 300 }];
    expect(rankDriversByRevenue(trips)[0]).toMatchObject({ name: "João", viagens: 2, receita: 800 });
  });
  it("tripEconomics calcula custo/receita por km", () => {
    const econ = tripEconomics([{ real_km: 100, total_cost: 500, total_revenue: 900 }]);
    expect(econ.custoKm).toBe(5);
    expect(econ.receitaKm).toBe(9);
  });
  it("leadTimeAvgDays entre coleta e entrega", () => {
    const orders = [{ status_history: [
      { status: "collecting", timestamp: new Date(2026, 5, 1).toISOString() },
      { status: "delivered", timestamp: new Date(2026, 5, 4).toISOString() },
    ] }];
    expect(leadTimeAvgDays(orders)).toBeCloseTo(3, 1);
  });
});

describe("computeIndicators (agregado)", () => {
  it("retorna cur/prev/series + rankings num único ponto", () => {
    const r = computeIndicators({ orders: [], trips: [], revenues: [], expenses: [], incidents: [] }, {}, "this_month", NOW);
    expect(r.series).toHaveLength(12);
    expect(r).toHaveProperty("cur");
    expect(r).toHaveProperty("econ");
    expect(Array.isArray(r.topClientes)).toBe(true);
  });
});

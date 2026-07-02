# Camada Analítica (Indicadores / Análises)

> Introduzida no **PA-01 · Núcleo Analítico Server-side** (2026-07-02).

## Onde vive a agregação
- **`src/utils/analytics.js`** — fonte única das agregações **puras e testadas**
  (`analytics.test.js`): OTIF (`computeOTIF`), corredor (`laneAnalysis`), cliente
  (`clientAnalysis`), e os indicadores do painel (`computeIndicators`,
  `computePeriodKpis`, `buildMonthlySeries`, `rankClientsByRevenue`,
  `rankDestinations`, `rankDriversByRevenue`, `tripEconomics`, `leadTimeAvgDays`,
  `periodRange`). As telas **não** recalculam inline.
- **Consumidores:** `Indicators.jsx` (via `computeIndicators`, memoizado) e
  `Analytics.jsx` (via `computeOTIF`/`laneAnalysis`/`clientAnalysis`).

## Agregação no servidor (views) — com fallback
Migration **`20260676_analytics_views.sql`** cria views `security_invoker` (staff):
| View | Conteúdo |
|---|---|
| `v_lane_analysis` | frete/peso/R$-por-kg por corredor (UF→UF), pedidos não cancelados |
| `v_client_analysis` | pedidos/frete/ticket por cliente |
| `v_monthly_financials` | recebido × pago por mês (últimos 12) |

`Analytics.jsx` consome `v_lane_analysis`/`v_client_analysis` via `useServerView`
e **cai no cálculo cliente** (`utils/analytics`) se a view estiver ausente/erro —
seguro antes da migração e resiliente. KPIs baseados em `status_history`/SLA
(OTD, lead time) permanecem no cliente (não replicados em SQL).

## Fonte de verdade
- Regra de negócio das agregações: **`utils/analytics.js`** (testada). As views
  espelham as agregações simples para escala; o servidor não recalcula SLA.
- Migração progressiva das demais telas para views: **PA-02** (com busca/paginação).

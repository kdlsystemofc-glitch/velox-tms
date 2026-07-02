-- ============================================================
-- VELOX TMS — Projeto PA-01: agregações analíticas no servidor (views)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Move para o banco as agregações que hoje o cliente calcula varrendo listas de
-- 500–1000 registros (corredor, cliente, financeiro mensal). O front consome
-- estas views com FALLBACK ao cálculo cliente (utils/analytics), então nada
-- quebra antes de aplicar. security_invoker=true → respeita a RLS do chamador
-- (staff). Não inclui KPIs baseados em status_history/SLA (ficam no cliente).

-- Corredor (origem UF → destino UF): frete/peso/R$-por-kg dos pedidos não cancelados.
CREATE OR REPLACE VIEW public.v_lane_analysis WITH (security_invoker = true) AS
  SELECT COALESCE(o.origin->>'state', '?') || ' → ' || COALESCE(o.recipients->0->>'state', '?') AS lane,
         count(*)::int AS orders,
         COALESCE(sum(o.freight_value), 0) AS freight,
         COALESCE(sum(o.total_weight_kg), 0) AS weight_kg,
         CASE WHEN COALESCE(sum(o.total_weight_kg), 0) > 0
              THEN sum(o.freight_value) / sum(o.total_weight_kg) ELSE 0 END AS avg_per_kg
  FROM public.orders o
  WHERE o.status <> 'cancelled'
  GROUP BY 1
  ORDER BY freight DESC;

-- Cliente: pedidos/frete/ticket médio dos pedidos não cancelados.
CREATE OR REPLACE VIEW public.v_client_analysis WITH (security_invoker = true) AS
  SELECT o.client_id,
         COALESCE(o.client_name, '—') AS client_name,
         count(*)::int AS orders,
         COALESCE(sum(o.freight_value), 0) AS freight,
         CASE WHEN count(*) > 0 THEN sum(o.freight_value) / count(*) ELSE 0 END AS avg_ticket
  FROM public.orders o
  WHERE o.status <> 'cancelled'
  GROUP BY o.client_id, o.client_name
  ORDER BY freight DESC;

-- Financeiro por mês (últimos 12): recebido (caixa) × pago (caixa).
CREATE OR REPLACE VIEW public.v_monthly_financials WITH (security_invoker = true) AS
  SELECT to_char(d.month, 'YYYY-MM') AS month,
    COALESCE((SELECT sum(amount) FROM public.revenues r
              WHERE r.status = 'received'
                AND date_trunc('month', COALESCE(r.received_date, r.due_date)) = d.month), 0) AS receita,
    COALESCE((SELECT sum(amount) FROM public.expenses e
              WHERE e.status = 'paid'
                AND date_trunc('month', COALESCE(e.paid_date, e.date)) = d.month), 0) AS despesa
  FROM (
    SELECT generate_series(date_trunc('month', now()) - interval '11 months',
                           date_trunc('month', now()), interval '1 month') AS month
  ) d
  ORDER BY d.month;

GRANT SELECT ON public.v_lane_analysis, public.v_client_analysis, public.v_monthly_financials TO authenticated;

SELECT 'PA-01: views analíticas (v_lane_analysis, v_client_analysis, v_monthly_financials) prontas.' AS resultado;

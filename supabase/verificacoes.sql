-- ============================================================
-- VELOX TMS — VERIFICAÇÕES DA SIMULAÇÃO
-- ============================================================
-- Só LÊ os dados (SELECT) — não altera nada. Pode rodar quantas
-- vezes quiser: logo após o seed (baseline) e DEPOIS de operar
-- pelo app, para flagrar quebras de fluxo/lógica.
--
-- COMO LER: na coluna "problemas", 0 = ok; > 0 = investigar.
-- O SQL Editor mostra um resultado por vez — rode os 3 blocos
-- (selecione cada SELECT e dê Run, ou rode tudo e veja as abas
-- de resultado).
-- ============================================================

-- ░░ BLOCO 1 — INTEGRIDADE E FLUXO (todas as linhas devem dar 0) ░░
SELECT verificacao, problemas FROM (
  SELECT '01 · pedido com client_id inexistente' AS verificacao, count(*) AS problemas, 1 AS ord
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.client_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = o.client_id)
  UNION ALL
  SELECT '02 · pedido com trip_id inexistente', count(*), 2
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.trip_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.id = o.trip_id)
  UNION ALL
  SELECT '03 · receita órfã (order_id inexistente)', count(*), 3
    FROM revenues r WHERE r.notes LIKE '%[SIM]%' AND r.order_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = r.order_id)
  UNION ALL
  SELECT '04 · entregue/trânsito SEM viagem (trip_id nulo)', count(*), 4
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.status IN ('in_transit','delivered') AND o.trip_id IS NULL
  UNION ALL
  SELECT '05 · com viagem mas status não é trânsito/entregue', count(*), 5
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.trip_id IS NOT NULL AND o.status NOT IN ('in_transit','delivered')
  UNION ALL
  SELECT '06 · coleta+ SEM motorista ou veículo', count(*), 6
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.status IN ('collecting','in_transit','delivered')
      AND (o.driver_id IS NULL OR o.truck_id IS NULL)
  UNION ALL
  SELECT '07 · entregue SEM receita ativa', count(*), 7
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.status = 'delivered'
      AND NOT EXISTS (SELECT 1 FROM revenues r WHERE r.order_id = o.id AND r.status <> 'cancelled')
  UNION ALL
  SELECT '08 · CANCELADO com receita ativa (vazamento)', count(*), 8
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.status = 'cancelled'
      AND EXISTS (SELECT 1 FROM revenues r WHERE r.order_id = o.id AND r.status <> 'cancelled')
  UNION ALL
  SELECT '09 · viagem concluída sem chegada/lucro', count(*), 9
    FROM trips t WHERE t.notes LIKE '%[SIM]%' AND t.status = 'completed'
      AND (t.arrival_date IS NULL OR t.net_profit IS NULL)
  UNION ALL
  SELECT '10 · receita ''received'' sem data de recebimento', count(*), 10
    FROM revenues r WHERE r.notes LIKE '%[SIM]%' AND r.status = 'received' AND r.received_date IS NULL
  UNION ALL
  SELECT '11 · despesa ''paid'' sem data de pagamento', count(*), 11
    FROM expenses e WHERE e.notes LIKE '%[SIM]%' AND e.status = 'paid' AND e.paid_date IS NULL
  UNION ALL
  SELECT '12 · despesa ''pending'' sem vencimento', count(*), 12
    FROM expenses e WHERE e.notes LIKE '%[SIM]%' AND e.status = 'pending' AND e.due_date IS NULL
  UNION ALL
  SELECT '13 · lucro da viagem ≠ receita − custo', count(*), 13
    FROM trips t WHERE t.notes LIKE '%[SIM]%' AND t.status = 'completed'
      AND round(coalesce(t.net_profit,0),2) <> round(coalesce(t.total_revenue,0) - coalesce(t.total_cost,0),2)
) q ORDER BY ord;

-- ░░ BLOCO 2 — RESUMO FINANCEIRO (compare com o Financeiro/DRE do app) ░░
SELECT
  (SELECT count(*) FROM orders WHERE general_notes LIKE '%[SIM]%')                                   AS pedidos_total,
  (SELECT count(*) FROM orders WHERE general_notes LIKE '%[SIM]%' AND status='cancelled')            AS pedidos_cancelados,
  (SELECT round(sum(amount),2) FROM revenues WHERE notes LIKE '%[SIM]%' AND status='received')       AS receita_recebida,
  (SELECT round(sum(amount),2) FROM revenues WHERE notes LIKE '%[SIM]%' AND status='receivable')     AS receita_a_receber,
  (SELECT round(sum(amount),2) FROM revenues WHERE notes LIKE '%[SIM]%' AND status='overdue')        AS receita_vencida,
  (SELECT round(sum(amount),2) FROM expenses WHERE notes LIKE '%[SIM]%' AND status='paid')           AS despesa_paga,
  (SELECT round(sum(amount),2) FROM expenses WHERE notes LIKE '%[SIM]%' AND status<>'paid')          AS despesa_a_pagar,
  (SELECT round(sum(amount),2) FROM revenues WHERE notes LIKE '%[SIM]%' AND status<>'cancelled')
   - (SELECT round(sum(amount),2) FROM expenses WHERE notes LIKE '%[SIM]%')                          AS resultado_competencia;

-- ░░ BLOCO 3 — CONFERÊNCIA: fretes ativos × receitas ativas (devem ser IGUAIS) ░░
SELECT
  (SELECT round(sum(freight_value),2) FROM orders
     WHERE general_notes LIKE '%[SIM]%' AND status IN ('confirmed','collecting','in_transit','delivered')) AS soma_fretes_ativos,
  (SELECT round(sum(amount),2) FROM revenues WHERE notes LIKE '%[SIM]%' AND status <> 'cancelled')         AS soma_receitas_ativas;

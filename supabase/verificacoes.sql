-- ============================================================
-- VELOX TMS — VERIFICAÇÕES DA SIMULAÇÃO (consulta única)
-- ============================================================
-- Só LÊ os dados — não altera nada. Cole tudo, dê Run UMA vez e
-- leia a tabela. Rode de novo após operar pelo app para flagrar
-- quebras de fluxo/lógica.
--
-- COLUNAS:
--   secao     → FLUXO / FINANCEIRO / CONFERENCIA
--   indicador → o que está sendo medido
--   valor     → contagem de problemas (FLUXO) ou valor em R$ (FINANCEIRO)
--   situacao  → OK / ⚠ PROBLEMA / (informativo)
--
-- LEITURA RÁPIDA: procure qualquer linha com "⚠ PROBLEMA".
-- ============================================================

SELECT secao, indicador, valor, situacao FROM (

  -- ░░ FLUXO E INTEGRIDADE (valor = nº de registros incoerentes; alvo: 0) ░░
  SELECT 1 AS ord, 'FLUXO' AS secao, '01 · pedido com client_id inexistente' AS indicador,
         count(*)::numeric AS valor, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END AS situacao
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.client_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.id = o.client_id)
  UNION ALL
  SELECT 2,'FLUXO','02 · pedido com trip_id inexistente', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.trip_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.id = o.trip_id)
  UNION ALL
  SELECT 3,'FLUXO','03 · receita órfã (order_id inexistente)', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM revenues r WHERE r.notes LIKE '%[SIM]%' AND r.order_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = r.order_id)
  UNION ALL
  SELECT 4,'FLUXO','04 · entregue/trânsito SEM viagem', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.status IN ('in_transit','delivered') AND o.trip_id IS NULL
  UNION ALL
  SELECT 5,'FLUXO','05 · com viagem mas status ≠ trânsito/entregue', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.trip_id IS NOT NULL AND o.status NOT IN ('in_transit','delivered')
  UNION ALL
  SELECT 6,'FLUXO','06 · coleta+ SEM motorista ou veículo', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.status IN ('collecting','in_transit','delivered')
      AND (o.driver_id IS NULL OR o.truck_id IS NULL)
  UNION ALL
  SELECT 7,'FLUXO','07 · entregue SEM receita ativa', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.status = 'delivered'
      AND NOT EXISTS (SELECT 1 FROM revenues r WHERE r.order_id = o.id AND r.status <> 'cancelled')
  UNION ALL
  SELECT 8,'FLUXO','08 · CANCELADO com receita ativa (vazamento)', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM orders o WHERE o.general_notes LIKE '%[SIM]%' AND o.status = 'cancelled'
      AND EXISTS (SELECT 1 FROM revenues r WHERE r.order_id = o.id AND r.status <> 'cancelled')
  UNION ALL
  SELECT 9,'FLUXO','09 · viagem concluída sem chegada/lucro', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM trips t WHERE t.notes LIKE '%[SIM]%' AND t.status = 'completed'
      AND (t.arrival_date IS NULL OR t.net_profit IS NULL)
  UNION ALL
  SELECT 10,'FLUXO','10 · receita ''received'' sem data de recebimento', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM revenues r WHERE r.notes LIKE '%[SIM]%' AND r.status = 'received' AND r.received_date IS NULL
  UNION ALL
  SELECT 11,'FLUXO','11 · despesa ''paid'' sem data de pagamento', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM expenses e WHERE e.notes LIKE '%[SIM]%' AND e.status = 'paid' AND e.paid_date IS NULL
  UNION ALL
  SELECT 12,'FLUXO','12 · despesa ''pending'' sem vencimento', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM expenses e WHERE e.notes LIKE '%[SIM]%' AND e.status = 'pending' AND e.due_date IS NULL
  UNION ALL
  SELECT 13,'FLUXO','13 · lucro da viagem ≠ receita − custo', count(*)::numeric, CASE WHEN count(*)=0 THEN 'OK' ELSE '⚠ PROBLEMA' END
    FROM trips t WHERE t.notes LIKE '%[SIM]%' AND t.status = 'completed'
      AND round(coalesce(t.net_profit,0),2) <> round(coalesce(t.total_revenue,0) - coalesce(t.total_cost,0),2)

  -- ░░ FINANCEIRO (informativo — compare com o Financeiro/DRE do app) ░░
  UNION ALL
  SELECT 20,'FINANCEIRO','Pedidos (total)',
    (SELECT count(*) FROM orders WHERE general_notes LIKE '%[SIM]%')::numeric, '—'
  UNION ALL
  SELECT 21,'FINANCEIRO','Pedidos cancelados',
    (SELECT count(*) FROM orders WHERE general_notes LIKE '%[SIM]%' AND status='cancelled')::numeric, '—'
  UNION ALL
  SELECT 22,'FINANCEIRO','Receita recebida (R$)',
    coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status='received'),0), '—'
  UNION ALL
  SELECT 23,'FINANCEIRO','Receita a receber (R$)',
    coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status='receivable'),0), '—'
  UNION ALL
  SELECT 24,'FINANCEIRO','Receita vencida (R$)',
    coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status='overdue'),0), '—'
  UNION ALL
  SELECT 25,'FINANCEIRO','Despesa paga (R$)',
    coalesce((SELECT sum(amount) FROM expenses WHERE notes LIKE '%[SIM]%' AND status='paid'),0), '—'
  UNION ALL
  SELECT 26,'FINANCEIRO','Despesa a pagar (R$)',
    coalesce((SELECT sum(amount) FROM expenses WHERE notes LIKE '%[SIM]%' AND status<>'paid'),0), '—'
  UNION ALL
  SELECT 27,'FINANCEIRO','Resultado por competência (R$)',
    coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status<>'cancelled'),0)
    - coalesce((SELECT sum(amount) FROM expenses WHERE notes LIKE '%[SIM]%'),0), '—'

  -- ░░ CONFERÊNCIA: fretes ativos × receitas ativas (diferença deve ser 0) ░░
  UNION ALL
  SELECT 30,'CONFERENCIA','Soma fretes ativos (R$)',
    coalesce((SELECT sum(freight_value) FROM orders WHERE general_notes LIKE '%[SIM]%' AND status IN ('confirmed','collecting','in_transit','delivered')),0), '—'
  UNION ALL
  SELECT 31,'CONFERENCIA','Soma receitas ativas (R$)',
    coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status<>'cancelled'),0), '—'
  UNION ALL
  SELECT 32,'CONFERENCIA','Diferença (deve ser 0)',
    round(coalesce((SELECT sum(freight_value) FROM orders WHERE general_notes LIKE '%[SIM]%' AND status IN ('confirmed','collecting','in_transit','delivered')),0)
        - coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status<>'cancelled'),0), 2),
    CASE WHEN round(coalesce((SELECT sum(freight_value) FROM orders WHERE general_notes LIKE '%[SIM]%' AND status IN ('confirmed','collecting','in_transit','delivered')),0)
        - coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status<>'cancelled'),0), 2) = 0
      THEN 'OK' ELSE '⚠ PROBLEMA' END

  -- ░░ RAZÃO (P04): baixas × razão de liquidação (diferença deve ser 0) ░░
  -- Requer o backfill (20260666) aplicado; antes disso a diferença acusa o gap.
  UNION ALL
  SELECT 40,'RAZAO','Receitas recebidas × razão (deve ser 0)',
    round(
      coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status='received'),0)
      - coalesce((SELECT sum(s.amount) FROM settlements s
                    JOIN revenues r ON r.id = s.target_id
                   WHERE s.target_type='revenue' AND r.notes LIKE '%[SIM]%'),0), 2),
    CASE WHEN round(
      coalesce((SELECT sum(amount) FROM revenues WHERE notes LIKE '%[SIM]%' AND status='received'),0)
      - coalesce((SELECT sum(s.amount) FROM settlements s
                    JOIN revenues r ON r.id = s.target_id
                   WHERE s.target_type='revenue' AND r.notes LIKE '%[SIM]%'),0), 2) = 0
      THEN 'OK' ELSE '⚠ PROBLEMA' END
  UNION ALL
  SELECT 41,'RAZAO','Despesas pagas × razão (deve ser 0)',
    round(
      coalesce((SELECT sum(amount) FROM expenses WHERE notes LIKE '%[SIM]%' AND status='paid'),0)
      - coalesce((SELECT sum(s.amount) FROM settlements s
                    JOIN expenses e ON e.id = s.target_id
                   WHERE s.target_type='expense' AND e.notes LIKE '%[SIM]%'),0), 2),
    CASE WHEN round(
      coalesce((SELECT sum(amount) FROM expenses WHERE notes LIKE '%[SIM]%' AND status='paid'),0)
      - coalesce((SELECT sum(s.amount) FROM settlements s
                    JOIN expenses e ON e.id = s.target_id
                   WHERE s.target_type='expense' AND e.notes LIKE '%[SIM]%'),0), 2) = 0
      THEN 'OK' ELSE '⚠ PROBLEMA' END

) q ORDER BY ord;

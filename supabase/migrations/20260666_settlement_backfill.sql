-- ============================================================
-- VELOX TMS — Projeto 04.3: backfill do razão + reconciliação de relatórios
-- Idempotente. Rode DEPOIS de 20260665.
-- ============================================================
-- Gera um evento de liquidação histórico para cada receita/despesa JÁ baixada,
-- para que os relatórios (que somam por status) reconciliem o passado contra o
-- razão. INSERT direto (não usa settle: auth.uid() é nulo no SQL editor).
-- Idempotente: só insere onde ainda não há liquidação ativa para a conta.

INSERT INTO public.settlements (kind, target_type, target_id, amount, settled_date, source, note)
SELECT 'receive', 'revenue', r.id, r.amount,
       COALESCE(r.received_date, r.due_date, CURRENT_DATE), 'backfill', 'Backfill P04.3'
FROM public.revenues r
WHERE r.status = 'received'
  AND NOT EXISTS (
    SELECT 1 FROM public.settlements s
    WHERE s.target_type = 'revenue' AND s.target_id = r.id
      AND s.reversal_of IS NULL AND s.reversed_at IS NULL
  );

INSERT INTO public.settlements (kind, target_type, target_id, amount, settled_date, source, note)
SELECT 'pay', 'expense', e.id, e.amount,
       COALESCE(e.paid_date, e.date, CURRENT_DATE), 'backfill', 'Backfill P04.3'
FROM public.expenses e
WHERE e.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.settlements s
    WHERE s.target_type = 'expense' AND s.target_id = e.id
      AND s.reversal_of IS NULL AND s.reversed_at IS NULL
  );

-- ---------- reconciliação: relatório (status) × razão (settlements) ----------
-- security_invoker: respeita a RLS do chamador (staff). Diferença deve ser 0.
CREATE OR REPLACE VIEW public.v_ledger_reconciliation
WITH (security_invoker = true) AS
  SELECT 'receitas_recebidas'::text AS dimensao,
         (SELECT COALESCE(sum(amount),0) FROM public.revenues   WHERE status = 'received') AS status_total,
         (SELECT COALESCE(sum(amount),0) FROM public.settlements WHERE target_type = 'revenue') AS ledger_total,
         (SELECT COALESCE(sum(amount),0) FROM public.revenues   WHERE status = 'received')
       - (SELECT COALESCE(sum(amount),0) FROM public.settlements WHERE target_type = 'revenue') AS diferenca
  UNION ALL
  SELECT 'despesas_pagas'::text,
         (SELECT COALESCE(sum(amount),0) FROM public.expenses    WHERE status = 'paid'),
         (SELECT COALESCE(sum(amount),0) FROM public.settlements WHERE target_type = 'expense'),
         (SELECT COALESCE(sum(amount),0) FROM public.expenses    WHERE status = 'paid')
       - (SELECT COALESCE(sum(amount),0) FROM public.settlements WHERE target_type = 'expense');

GRANT SELECT ON public.v_ledger_reconciliation TO authenticated;

SELECT 'Projeto 04.3: backfill do razão + view v_ledger_reconciliation prontos.' AS resultado,
       (SELECT count(*) FROM public.settlements WHERE source = 'backfill') AS eventos_backfill;

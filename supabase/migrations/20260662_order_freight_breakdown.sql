-- ============================================================
-- VELOX TMS — Projeto 03.1: snapshot imutável do frete no pedido
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Problema: orders.freight_value é um único NUMERIC e o breakdown é recalculado
-- ao vivo a partir do JSON de precificação ATUAL. Editar a tabela de preços muda
-- silenciosamente a explicação de pedidos antigos — sem reconstituição/auditoria.
--
-- Solução (aditiva): guardar o breakdown COMPLETO no momento em que a equipe
-- precifica/confirma o pedido. A partir daí o "porquê" do valor fica congelado,
-- independente de mudanças futuras na tabela. Não altera o motor de cálculo.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS freight_breakdown JSONB;

COMMENT ON COLUMN public.orders.freight_breakdown IS
  'Snapshot imutável do cálculo de frete (saída de calculateFreightFull + metadados: fonte da tabela, data efetiva, quando/valor no snapshot). Congelado ao precificar/confirmar. Projeto 03.1.';

SELECT 'Projeto 03.1: orders.freight_breakdown pronto (snapshot de frete).' AS resultado;

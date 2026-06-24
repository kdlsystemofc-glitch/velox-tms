-- ============================================================
-- VELOX TMS — Configurações (Cfg-1): para o vazamento de dados sensíveis
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- PROBLEMA: company_settings tinha leitura pública (anon) com SELECT *, e a linha
-- passou a acumular campos sensíveis (chave do Google faturável, saldo de caixa,
-- URLs de documentos, parâmetros internos). Qualquer visitante lia tudo.
--
-- SOLUÇÃO: anon lê apenas um SUBCONJUNTO SEGURO via função SECURITY DEFINER que
-- remove os campos sensíveis. Usuário autenticado (admin/operador) continua lendo
-- a linha completa pela RLS de autenticados.

-- 1) Função pública: devolve a config SEM os campos sensíveis (deny-list).
CREATE OR REPLACE FUNCTION public.public_settings()
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT to_jsonb(s)
    - 'google_maps_api_key'
    - 'opening_cash_balance'
    - 'opening_cash_date'
    - 'documents'
    - 'tax_rate_percent'
    - 'monthly_depreciation'
  FROM company_settings s
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.public_settings() TO anon, authenticated;

-- 2) Tira a leitura pública direta da tabela; só autenticados leem a linha completa.
DROP POLICY IF EXISTS "public_read_settings" ON company_settings;
DROP POLICY IF EXISTS "authenticated_read_settings" ON company_settings;
CREATE POLICY "authenticated_read_settings" ON company_settings
  FOR SELECT TO authenticated USING (true);

SELECT 'Configurações Cfg-1: leitura pública restrita ao subconjunto seguro.' AS resultado;

-- ============================================================
-- VELOX TMS — RESET de dados para a simulação de QA
-- ⚠️ DESTRUTIVO. Rode no SQL Editor do Supabase ANTES da simulação.
-- ============================================================
-- O que FAZ: apaga TODOS os dados operacionais/de negócio (pedidos, viagens,
-- transferências, ocorrências, financeiro, cadastros, frota, motoristas,
-- mensagens, alertas, auditoria) para a simulação começar do zero.
--
-- O que PRESERVA:
--   • auth.users + public.user_profiles  → seus LOGINS continuam funcionando
--   • public.company_settings            → preços, cobertura, chave do Maps
--   • public.testimonials (se existir)    → conteúdo do site público
--
-- Idempotente e seguro contra tabela inexistente (checa antes de truncar).
-- NÃO mexe em usuários: o agente da simulação cria operador e motorista durante
-- o pré-voo. (Para zerar logins de motorista antigos, veja o bloco OPCIONAL no fim.)

DO $$
DECLARE
  t text;
  wipe text[] := ARRAY[
    'orders', 'order_templates', 'trips', 'transfers', 'incidents',
    'revenues', 'expenses', 'alerts', 'contact_messages',
    'clients', 'recipients', 'suppliers', 'branches',
    'trucks', 'drivers', 'user_audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY wipe LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
      RAISE NOTICE 'limpa: %', t;
    END IF;
  END LOOP;
END $$;

SELECT 'Reset concluído. Logins, configurações e depoimentos preservados.' AS resultado;

-- ------------------------------------------------------------
-- OPCIONAL — remover LOGINS DE MOTORISTA antigos (serão recriados na simulação).
-- Mantém admins e operadores. Descomente as 2 linhas se quiser uma lista de
-- usuários enxuta (só humanos). Cuidado: apaga contas de app de motorista.
-- ------------------------------------------------------------
-- DELETE FROM auth.users
--   WHERE id IN (SELECT id FROM public.user_profiles WHERE role = 'motorista');
-- DELETE FROM public.user_profiles WHERE role = 'motorista';

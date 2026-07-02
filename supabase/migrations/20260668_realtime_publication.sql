-- ============================================================
-- VELOX TMS — Projeto 05.2: Realtime (substituir polling)
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================
-- Adiciona as tabelas-chave à publicação `supabase_realtime` para que o frontend
-- assine postgres_changes e invalide o cache (em vez de refetchInterval curto).
-- Tolerante: se a publicação não existir (ex.: CI sem a plataforma), vira no-op;
-- idempotente: não readiciona tabela já publicada. A RLS de cada tabela continua
-- valendo no realtime (cada usuário só recebe o que pode ler).

DO $$
DECLARE t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publicação supabase_realtime ausente — nada a fazer (ambiente sem Realtime).';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['orders','trips','alerts','incidents','domain_events'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

SELECT 'Projeto 05.2: tabelas-chave publicadas no realtime (orders/trips/alerts/incidents/domain_events).' AS resultado;

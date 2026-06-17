-- ============================================================
-- Fornecedores: endereço estruturado (TEXT -> JSONB)
-- ============================================================
-- O formulário de fornecedor passou a usar endereço completo com
-- autofill por CEP (objeto {cep,street,number,complement,neighborhood,
-- city,state}). Esta migração converte a coluna address de TEXT para
-- JSONB preservando o texto antigo em {street}. Idempotente.
-- ============================================================

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='suppliers' AND column_name='address' AND data_type <> 'jsonb') THEN
    ALTER TABLE suppliers ALTER COLUMN address DROP DEFAULT;
    ALTER TABLE suppliers ALTER COLUMN address TYPE JSONB
      USING (CASE WHEN address IS NULL OR btrim(address)='' THEN '{}'::jsonb
                  ELSE jsonb_build_object('street', address) END);
    ALTER TABLE suppliers ALTER COLUMN address SET DEFAULT '{}'::jsonb;
  END IF;
END $$;

SELECT 'suppliers.address agora é JSONB.' AS resultado;

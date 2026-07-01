-- ============================================================
-- CI — Stubs dos objetos gerenciados pela plataforma Supabase
-- Cria o mínimo (roles, auth, storage, extensões) para validar
-- schema.sql + migrations em um Postgres LIMPO no CI.
-- NÃO é produção; serve só para o gate de migrations do CI.
-- ============================================================

-- Roles usados em GRANT / RLS (TO authenticated | anon | service_role)
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extensões usadas nos defaults (gen_random_uuid / uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Auth ──
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  last_sign_in_at    timestamptz,
  created_at         timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth.identities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  provider   text,
  created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT current_setting('request.jwt.claim.role', true)
$$;

-- ── Storage ──
CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets ( id text PRIMARY KEY, name text );
CREATE TABLE IF NOT EXISTS storage.objects (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id  text,
  name       text,
  owner      uuid,
  created_at timestamptz DEFAULT now()
);

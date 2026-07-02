// ============================================================
// VELOX TMS — Gerador do schema completo (backup/rebuild)
// ============================================================
// Concatena supabase/schema.sql + todas as migrations (em ordem de nome) num
// único arquivo idempotente: supabase/schema_full.sql. É um ARTEFATO DERIVADO
// (não editar à mão) — a fonte de verdade continua sendo as migrations.
//
// Uso:  node supabase/build-schema-full.mjs   (ou: npm run db:full)
// Regenerar sempre que adicionar/alterar migrations.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));      // .../supabase
const migDir = join(root, "migrations");
const outPath = join(root, "schema_full.sql");

const migrations = readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();

const parts = [];
parts.push(`-- ============================================================
-- VELOX TMS — SCHEMA COMPLETO (ARQUIVO GERADO — NÃO EDITAR À MÃO)
-- ============================================================
-- Consolida supabase/schema.sql + ${migrations.length} migrations em UM único script
-- idempotente, para backup/recriação ágil do banco.
--
-- Regenerar:  node supabase/build-schema-full.mjs   (npm run db:full)
-- Gerado em:  ${new Date().toISOString()}
--
-- Destino: um projeto Supabase (os schemas auth/storage/extensões são providos
-- pela plataforma). NÃO inclui dados: seed_simulation.sql e verificacoes.sql
-- ficam à parte de propósito. Fonte de verdade permanece: supabase/migrations/*.
-- ============================================================\n`);

parts.push(`\n-- ▼▼▼ BASE: schema.sql ▼▼▼\n`);
parts.push(readFileSync(join(root, "schema.sql"), "utf8").trimEnd());

for (const f of migrations) {
  parts.push(`\n\n-- ▼▼▼ MIGRATION: ${f} ▼▼▼\n`);
  parts.push(readFileSync(join(migDir, f), "utf8").trimEnd());
}

parts.push(`\n\n-- ============================================================
-- FIM — 1 base + ${migrations.length} migrations.
-- ============================================================\n`);

writeFileSync(outPath, parts.join("\n"), "utf8");
console.log(`OK: supabase/schema_full.sql gerado (1 base + ${migrations.length} migrations).`);

import { createEntityLayer, TABLE_MAP } from "@/api/supabaseClient";

/**
 * Camada de repositórios de domínio (Projeto 02.3).
 *
 * Substitui o acesso via fachada `base44.entities.*` por um ponto de acesso a
 * dados nomeado por domínio. Mesma implementação (Supabase + RLS) — só troca a
 * fachada legada `base44` por um `db` explícito. Migração feita em lotes; ao
 * final, a fachada `base44.entities` deixa de ser usada.
 *
 * Uso: `import { db } from "@/repositories"; db.Order.list(...)`.
 * As chaves são as mesmas entidades do TABLE_MAP (Order, Client, Trip, …).
 */
export const db = new Proxy({}, {
  get(_, entity) {
    if (typeof entity !== "string") return undefined;
    const table = TABLE_MAP[entity];
    if (!table) {
      throw new Error(`db.${entity}: entidade não registrada. Adicione em TABLE_MAP (src/api/supabaseClient.js).`);
    }
    return createEntityLayer(table);
  },
});

export default db;

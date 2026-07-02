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

/**
 * Mapa de domínios (Projeto 02.5) — agrupa as entidades por domínio de negócio.
 *
 * Torna os limites de domínio explícitos no seam de dados SEM mover fisicamente
 * 66 arquivos (reorganização de pastas = churn de imports e risco, sem valor
 * funcional — deliberadamente adiada). Combinado com `ARQUITETURA-FUNCIONAL.md`,
 * documenta a fronteira de cada domínio de forma verificável.
 */
export const domains = {
  operacao:   ["Order", "Trip", "Incident", "Transfer", "Alert", "OrderTemplate", "ScheduleBlock"],
  frota:      ["Truck", "Driver"],
  masterData: ["Client", "Recipient", "Supplier", "Branch", "Carrier"],
  financeiro: ["Revenue", "Expense", "Invoice", "BankTransaction", "Settlement"],
  tarifacao:  ["TariffTable", "TariffVersion"],
  eventos:    ["DomainEvent", "JobRun", "Notification"],
  documentos: ["Document"],
  sistema:    ["CompanySettings", "AuditLog", "ClientError"],
  comercial:  ["ContactMessage", "Testimonial"],
};

/**
 * Subdomínios financeiros (Projeto 04.3) — separa o financeiro amalgamado em
 * fronteiras claras, sem reorg física. O razão (`settlements`) é transversal:
 * é onde AR e Payables registram a liquidação; Treasury concilia o extrato
 * contra ele; Auditoria cruza contratado×executado×cobrado.
 */
export const financeSubdomains = {
  receivables: ["Revenue", "Invoice"],        // AR — a receber + faturamento
  payables:    ["Expense"],                    // AP — a pagar (inclui acerto de parceiro)
  treasury:    ["BankTransaction", "Settlement"], // Tesouraria — extrato + razão de liquidação
  audit:       ["Settlement", "AuditLog"],     // Auditoria — razão + trilha
};

export default db;

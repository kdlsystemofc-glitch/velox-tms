// RBAC granular / segregação de funções (2.3).
// Modelo deny-overlay: uma capacidade só é NEGADA quando explicitamente false
// em user.permissions. Ausente/null = permitida (herda do papel).

// Capacidades sensíveis configuráveis por usuário (admin em Usuários).
export const CAPABILITIES = [
  { key: "pay_invoice", label: "Baixar / pagar faturas" },
  { key: "cancel_order", label: "Cancelar pedidos" },
  { key: "approve_access", label: "Aprovar acessos (cliente/parceiro)" },
  { key: "offer_carrier", label: "Ofertar a parceiros" },
  { key: "reconcile", label: "Conciliar banco" },
];

/**
 * Espelha a porteira única do servidor `has_capability` (Projeto 07.1):
 * papel-base mínimo da capacidade E deny-overlay (negada só se explicitamente
 * false em user.permissions). O servidor é sempre a autoridade; isto é só a UI.
 *
 * @param {object} user  objeto do AuthContext (com .permissions e .role)
 * @param {string} key   capacidade (ver CAPABILITIES)
 * @returns {boolean} permitido?
 */
export function can(user, key) {
  if (!user) return false;
  const base = key === "approve_access"
    ? user.role === "admin"                              // aprovar acesso: só admin
    : user.role === "admin" || user.role === "operator"; // demais: equipe
  return base && user.permissions?.[key] !== false;
}

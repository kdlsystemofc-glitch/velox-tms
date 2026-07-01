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
 * @param {object} user  objeto do AuthContext (com .permissions e .role)
 * @param {string} key   capacidade (ver CAPABILITIES)
 * @returns {boolean} permitido? (default true; false só se negado explicitamente)
 */
export function can(user, key) {
  if (!user) return false;
  return user.permissions?.[key] !== false;
}

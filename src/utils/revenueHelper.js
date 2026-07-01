import { db } from "@/repositories";
import { todayLocalISO } from "@/utils/dateUtils";

/**
 * Cria a receita do frete de um pedido SOMENTE se ainda não existir
 * uma receita ativa (não cancelada) vinculada a ele.
 * Evita duplicação quando o pedido é confirmado por caminhos diferentes
 * (Agenda, Detalhe do Pedido, programação automática).
 *
 * @returns {Promise<{created: boolean, revenue?: object}>}
 */
export async function ensureRevenueForOrder(order, { amount, dueDate, paymentMethod } = {}) {
  const value = Number(amount) || 0;
  if (value <= 0) return { created: false };

  const existing = await db.Revenue.filter({ order_id: order.id });
  const active = (existing || []).filter(r => r.status !== "cancelled");
  if (active.length > 0) return { created: false, revenue: active[0] };

  const revenue = await db.Revenue.create({
    order_id: order.id,
    description: `Frete ${order.protocol || ""} — ${order.client_name || ""}`.trim(),
    amount: value,
    due_date: dueDate || order.collection_date || todayLocalISO(),
    status: "receivable",
    payment_method: paymentMethod || order.payment_method || undefined,
    client_id: order.client_id || undefined,
  });
  return { created: true, revenue };
}

/**
 * Estorna (marca como cancelled) todas as receitas ainda não recebidas
 * vinculadas a um pedido. Usado quando o pedido é cancelado/recusado.
 *
 * @returns {Promise<number>} quantidade de receitas estornadas
 */
export async function cancelRevenuesForOrder(orderId) {
  const existing = await db.Revenue.filter({ order_id: orderId });
  const toCancel = (existing || []).filter(r => r.status === "receivable" || r.status === "overdue");
  for (const rev of toCancel) {
    try {
      await db.Revenue.update(rev.id, { status: "cancelled" });
    } catch {
      // Banco ainda sem o status 'cancelled' no CHECK (migration pendente) — remove a receita
      await db.Revenue.delete(rev.id);
    }
  }
  return toCancel.length;
}

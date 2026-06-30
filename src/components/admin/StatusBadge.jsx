import React from "react";

/**
 * StatusBadge corporativo: tag retangular com ponto indicador (padrão TMS).
 * dot = cor do ponto · text/bg = tom suave do texto e fundo.
 */
export const orderStatusConfig = {
  awaiting_approval: { label: "Aguardando aprovação", dot: "bg-fuchsia-500", cls: "text-fuchsia-600 dark:text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/25" },
  new:        { label: "Novo",        dot: "bg-blue-500",    cls: "text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/25" },
  confirmed:  { label: "Confirmado",  dot: "bg-indigo-500",  cls: "text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/25" },
  collecting: { label: "Em coleta",   dot: "bg-amber-500",   cls: "text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/25" },
  in_transit: { label: "Em trânsito", dot: "bg-violet-500",  cls: "text-violet-600 dark:text-violet-300 bg-violet-500/10 border-violet-500/25" },
  delivered:  { label: "Entregue",    dot: "bg-green-600",   cls: "text-green-600 dark:text-green-300 bg-green-500/10 border-green-500/25" },
  cancelled:  { label: "Cancelado",   dot: "bg-red-500",     cls: "text-red-600 dark:text-red-300 bg-red-500/10 border-red-500/25" },
  awaiting_cargo:       { label: "Aguardando carga",  dot: "bg-orange-500", cls: "text-orange-600 dark:text-orange-300 bg-orange-500/10 border-orange-500/25" },
  partially_delivered:  { label: "Entrega parcial",   dot: "bg-teal-500",   cls: "text-teal-600 dark:text-teal-300 bg-teal-500/10 border-teal-500/25" },
  in_transfer:          { label: "Em transferência",  dot: "bg-cyan-500",   cls: "text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/25" },
  // trips
  planned:     { label: "Planejada",   dot: "bg-blue-500",   cls: "text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/25" },
  in_progress: { label: "Em rota",     dot: "bg-green-600 animate-pulse", cls: "text-green-600 dark:text-green-300 bg-green-500/10 border-green-500/25" },
  completed:   { label: "Concluída",   dot: "bg-slate-500",  cls: "text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-500/25" },
};

// Status de fatura — fonte única (portal + admin). Antes estava duplicado
// e divergente: admin com tokens semânticos, portal só claro (amber/green/red).
export const invoiceStatusConfig = {
  open:      { label: "Em aberto", dot: "bg-amber-500", cls: "text-warning bg-warning/15 border-warning/30" },
  paid:      { label: "Paga",      dot: "bg-green-600", cls: "text-success bg-success/15 border-success/30" },
  cancelled: { label: "Cancelada", dot: "bg-red-500",   cls: "text-destructive bg-destructive/15 border-destructive/30" },
};

export default function StatusBadge({ status, config = orderStatusConfig }) {
  const c = config[status] || { label: status, dot: "bg-gray-400", cls: "text-muted-foreground dark:text-gray-300 bg-gray-500/10 border-gray-500/25" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

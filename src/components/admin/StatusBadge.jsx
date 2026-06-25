import React from "react";

/**
 * StatusBadge corporativo: tag retangular com ponto indicador (padrão TMS).
 * dot = cor do ponto · text/bg = tom suave do texto e fundo.
 */
export const orderStatusConfig = {
  awaiting_approval: { label: "Aguardando aprovação", dot: "bg-fuchsia-500", cls: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200" },
  new:        { label: "Novo",        dot: "bg-blue-500",    cls: "text-blue-700 bg-blue-50 border-blue-200" },
  confirmed:  { label: "Confirmado",  dot: "bg-indigo-500",  cls: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  collecting: { label: "Em coleta",   dot: "bg-amber-500",   cls: "text-amber-700 bg-amber-50 border-amber-200" },
  in_transit: { label: "Em trânsito", dot: "bg-violet-500",  cls: "text-violet-700 bg-violet-50 border-violet-200" },
  delivered:  { label: "Entregue",    dot: "bg-green-600",   cls: "text-green-700 bg-green-50 border-green-200" },
  cancelled:  { label: "Cancelado",   dot: "bg-red-500",     cls: "text-red-700 bg-red-50 border-red-200" },
  awaiting_cargo:       { label: "Aguardando carga",  dot: "bg-orange-500", cls: "text-orange-700 bg-orange-50 border-orange-200" },
  partially_delivered:  { label: "Entrega parcial",   dot: "bg-teal-500",   cls: "text-teal-700 bg-teal-50 border-teal-200" },
  in_transfer:          { label: "Em transferência",  dot: "bg-cyan-500",   cls: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  // trips
  planned:     { label: "Planejada",   dot: "bg-blue-500",   cls: "text-blue-700 bg-blue-50 border-blue-200" },
  in_progress: { label: "Em rota",     dot: "bg-green-600 animate-pulse", cls: "text-green-700 bg-green-50 border-green-200" },
  completed:   { label: "Concluída",   dot: "bg-slate-500",  cls: "text-slate-700 bg-slate-100 border-slate-200" },
};

export default function StatusBadge({ status, config = orderStatusConfig }) {
  const c = config[status] || { label: status, dot: "bg-gray-400", cls: "text-gray-700 bg-gray-50 border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

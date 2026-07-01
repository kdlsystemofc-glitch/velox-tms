import React from "react";
import { Check } from "lucide-react";
import { formatDateTimeBR } from "@/utils/dateUtils";

// Marcos padronizados da jornada do pedido (1.3). Independe de e-mail —
// é visão de progresso. O "atingido" vem do status atual + status_history.
const MILESTONES = [
  { key: "confirmed", label: "Confirmado" },
  { key: "collecting", label: "Coletado" },
  { key: "in_transit", label: "Em trânsito" },
  { key: "delivered", label: "Entregue" },
];
const ORDER = ["new", "awaiting_approval", "confirmed", "collecting", "in_transit", "delivered"];

function reachedIndex(order) {
  // parcial conta como "em trânsito"; cancelado não avança
  const st = order?.status === "partially_delivered" ? "in_transit" : order?.status;
  return ORDER.indexOf(st);
}

export default function OrderMilestones({ order }) {
  if (!order || order.status === "cancelled") return null;
  const curIdx = reachedIndex(order);
  const historyAt = (statusKey) =>
    (order.status_history || []).find(h => h.status === statusKey && h.timestamp)?.timestamp;

  return (
    <section className="bg-card border border-border rounded-xl p-5">
      <h2 className="font-semibold text-sm mb-4">Andamento</h2>
      <ol className="flex items-start justify-between gap-1">
        {MILESTONES.map((m, i) => {
          const reached = curIdx >= ORDER.indexOf(m.key);
          const at = historyAt(m.key);
          const isLast = i === MILESTONES.length - 1;
          return (
            <li key={m.key} className="flex-1 flex flex-col items-center text-center relative">
              {!isLast && (
                <span className={`absolute top-3.5 left-1/2 w-full h-0.5 ${curIdx > ORDER.indexOf(m.key) ? "bg-brand-gradient" : "bg-border"}`} />
              )}
              <span className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${reached ? "bg-brand-gradient text-white" : "bg-muted text-muted-foreground"}`}>
                {reached ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className={`text-[11px] mt-1.5 font-medium ${reached ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</span>
              {at && <span className="text-[10px] text-muted-foreground">{formatDateTimeBR(at)}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

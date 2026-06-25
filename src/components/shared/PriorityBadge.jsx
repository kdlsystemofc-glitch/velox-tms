import React from "react";
import { priorityMeta, isElevatedPriority } from "@/utils/priority";

/**
 * Selo de prioridade OPERACIONAL do pedido (normal/urgente/crítica).
 * Por padrão só aparece quando a prioridade é elevada (urgente/crítica),
 * para não poluir a tela com "Normal" em todo pedido. Passe `showNormal`
 * para forçar a exibição também do nível normal.
 */
export default function PriorityBadge({ priority, showNormal = false, className = "" }) {
  if (!showNormal && !isElevatedPriority(priority)) return null;
  const m = priorityMeta(priority);
  return (
    <span
      title={`Prioridade ${m.label.toLowerCase()}`}
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${m.color} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.short}
    </span>
  );
}

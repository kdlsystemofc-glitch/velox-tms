import React from "react";

export const orderStatusConfig = {
  new: { label: "Novo", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Confirmado", color: "bg-indigo-100 text-indigo-800" },
  collecting: { label: "Em Coleta", color: "bg-amber-100 text-amber-800" },
  in_transit: { label: "Em Trânsito", color: "bg-orange-100 text-orange-800" },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export default function StatusBadge({ status, config = orderStatusConfig }) {
  const c = config[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${c.color}`}>
      {c.label}
    </span>
  );
}
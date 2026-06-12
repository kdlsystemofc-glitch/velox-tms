import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GripVertical, MapPin, Weight, Package } from "lucide-react";

export default function OrderQueueCard({ order, onDragStart }) {
  const originCity = order.origin?.city || "—";
  const originState = order.origin?.state || "";
  const destCount = order.recipients?.length || 0;
  const weightKg = order.total_weight_kg || 0;
  const volumes = order.total_volumes || 0;
  const dateLabel = order.collection_date
    ? format(new Date(order.collection_date + "T12:00:00"), "dd/MM", { locale: ptBR })
    : "Sem data";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("orderId", order.id);
        if (onDragStart) onDragStart(order.id);
      }}
      className="bg-background border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-velox-amber/50 hover:shadow-sm transition-all select-none"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-bold text-velox-amber truncate">{order.protocol}</p>
          <p className="text-xs font-semibold text-foreground truncate mt-0.5">{order.client_name}</p>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground truncate">
              {originCity}{originState ? ` - ${originState}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Package className="w-3 h-3" />
              {destCount} dest.
            </span>
            <span className="flex items-center gap-0.5">
              <Weight className="w-3 h-3" />
              {weightKg.toFixed(0)} kg
            </span>
            <span>{volumes} vol</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              order.collection_date ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}>
              {dateLabel}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              order.status === "confirmed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
            }`}>
              {order.status === "confirmed" ? "Confirmado" : "Novo"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
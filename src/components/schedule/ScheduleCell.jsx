import React from "react";
import { Plus } from "lucide-react";

const capacityColor = (pct) => {
  if (pct > 85) return { bar: "bg-red-500", bg: "bg-red-50 border-red-200", text: "text-red-700" };
  if (pct > 60) return { bar: "bg-amber-500", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" };
  return { bar: "bg-green-500", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" };
};

export default function ScheduleCell({
  orders = [],
  truckCapacityKg = 0,
  onDrop,
  onClick,
  onOrderClick,
  isDragOver,
  cellKey,
  isBlocked = false,
}) {
  const usedKg = orders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
  const pct = truckCapacityKg > 0 ? Math.round((usedKg / truckCapacityKg) * 100) : 0;
  const colors = capacityColor(pct);
  const availableKg = Math.max(0, truckCapacityKg - usedKg);

  const handleDragOver = (e) => {
    if (isBlocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e) => {
    if (isBlocked) return;
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");
    if (orderId) onDrop(orderId);
  };

  if (isBlocked) {
    return (
      <div className="min-h-[80px] rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
        <span className="text-xs text-gray-400">—</span>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={orders.length === 0 ? onClick : undefined}
      className={`min-h-[80px] rounded-lg border transition-all cursor-pointer ${
        isDragOver
          ? "border-velox-amber bg-velox-amber/5 scale-[1.02]"
          : orders.length > 0
          ? `${colors.bg} border`
          : "border-dashed border-gray-300 bg-gray-50 hover:border-velox-amber/50 hover:bg-velox-amber/5"
      }`}
    >
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full py-4 gap-1">
          <Plus className="w-4 h-4 text-gray-400" />
          <span className="text-[10px] text-gray-400">Adicionar</span>
          {truckCapacityKg > 0 && (
            <span className="text-[10px] text-gray-400 font-mono">{(truckCapacityKg / 1000).toFixed(0)}t livres</span>
          )}
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {orders.slice(0, 3).map((o) => (
            <button
              key={o.id}
              onClick={(e) => { e.stopPropagation(); onOrderClick(o); }}
              className="block w-full text-left"
            >
              <span className={`text-[10px] font-mono font-semibold ${colors.text} hover:underline truncate block`}>
                {o.protocol}
              </span>
            </button>
          ))}
          {orders.length > 3 && (
            <p className={`text-[10px] ${colors.text} opacity-70`}>+{orders.length - 3} mais</p>
          )}
          {/* Peso */}
          <p className={`text-[10px] font-mono mt-1 ${colors.text}`}>
            {(usedKg / 1000).toFixed(1)}/{(truckCapacityKg / 1000).toFixed(0)}t
          </p>
          {/* Barra */}
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colors.bar}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          {/* Adicionar mais */}
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="text-[10px] text-gray-500 hover:text-velox-amber flex items-center gap-0.5 mt-1"
          >
            <Plus className="w-2.5 h-2.5" /> add
          </button>
        </div>
      )}
    </div>
  );
}
import React from "react";
import { Button } from "@/components/ui/button";
import { planLoadDistribution, checkTimeWindows } from "@/utils/routePlanner";

export function SmartScheduleModal({ orders, trucks, existingOrders, targetDate, onConfirm, onClose }) {
  const { plan, unscheduled } = planLoadDistribution(orders, trucks, targetDate, existingOrders);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-lg">Programação automática sugerida</h3>
        <p className="text-sm text-muted-foreground">
          {targetDate} · {orders.length} pedidos · {trucks.filter(t => t.status === "available").length} carretas disponíveis
        </p>
      </div>

      {plan.length === 0 && unscheduled.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido para programar nesta data.</p>
      )}

      {plan.map((slot, i) => (
        <div key={i} className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-mono font-bold">{slot.truck.plate}</p>
              <p className="text-xs text-muted-foreground">{slot.truck.model}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">
                {slot.totalKg.toLocaleString("pt-BR")} kg
                <span className="text-muted-foreground font-normal"> / {slot.capacity.toLocaleString("pt-BR")} kg</span>
              </p>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      slot.utilizationPct > 90 ? "bg-red-500" :
                      slot.utilizationPct > 70 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${slot.utilizationPct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{slot.utilizationPct}%</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {slot.orders.map(order => {
              const warnings = checkTimeWindows(order, targetDate);
              return (
                <div key={order.id} className="flex items-start justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{order.protocol}</p>
                    <p className="font-medium">{order.client_name}</p>
                    {warnings.map((w, wi) => (
                      <p key={wi} className="text-xs text-amber-600">{w}</p>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                    {(order.total_weight_kg || 0).toLocaleString("pt-BR")} kg
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {unscheduled.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
          <p className="font-semibold text-amber-800 text-sm mb-2">
            ⚠ {unscheduled.length} pedido(s) sem carreta disponível para esta data
          </p>
          {unscheduled.map(o => (
            <p key={o.id} className="text-xs text-amber-700">
              {o.protocol} — {(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
        <Button
          onClick={() => onConfirm(plan, unscheduled)}
          disabled={plan.length === 0}
          className="flex-1 bg-velox-amber text-velox-dark font-bold hover:bg-velox-amber/90"
        >
          Confirmar programação
        </Button>
      </div>
    </div>
  );
}
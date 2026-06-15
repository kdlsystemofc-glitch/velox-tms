import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, Wand2 } from "lucide-react";

/**
 * Algoritmo de auto-programação:
 * 1. Pedidos sem data → pergunta qual data usar
 * 2. Ordena por peso desc
 * 3. Para cada pedido, tenta alocar na carreta com mais espaço na data solicitada
 * 4. Se não couber: tenta dia seguinte (dentro da semana)
 * 5. Se não couber em nenhum dia: deixa na fila
 */
export function runAutoSchedule(pendingOrders, trucks, weekDays, existingScheduled) {
  const activeTrucks = trucks.filter(t => t.status !== "inactive");

  // Capacidade usada por data+carreta
  const used = {};
  existingScheduled.forEach(o => {
    if (o.scheduled_date && o.scheduled_truck_id) {
      const key = `${o.scheduled_date}_${o.scheduled_truck_id}`;
      used[key] = (used[key] || 0) + (o.total_weight_kg || 0);
    }
  });

  const getAvailable = (date, truckId, capacityKg) => {
    const key = `${date}_${truckId}`;
    return capacityKg - (used[key] || 0);
  };

  // Ordenar por peso desc
  const sorted = [...pendingOrders].sort((a, b) => (b.total_weight_kg || 0) - (a.total_weight_kg || 0));

  const scheduled = [];
  const unscheduled = [];

  sorted.forEach(order => {
    const targetDate = order.scheduled_date_override || order.collection_date || weekDays[0];
    let placed = false;

    // Tentar a data alvo primeiro, depois dias seguintes da semana
    const startIdx = weekDays.indexOf(targetDate);
    const daysToTry = startIdx >= 0
      ? weekDays.slice(startIdx)
      : weekDays;

    for (const day of daysToTry) {
      // Ordenar carretas por espaço disponível desc
      const trucksSorted = [...activeTrucks].sort((a, b) => {
        const aAvail = getAvailable(day, a.id, a.capacity_kg || 0);
        const bAvail = getAvailable(day, b.id, b.capacity_kg || 0);
        return bAvail - aAvail;
      });

      for (const truck of trucksSorted) {
        const avail = getAvailable(day, truck.id, truck.capacity_kg || 0);
        if (avail >= (order.total_weight_kg || 0)) {
          // Alocar
          const key = `${day}_${truck.id}`;
          used[key] = (used[key] || 0) + (order.total_weight_kg || 0);
          scheduled.push({ order, truck, date: day });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }

    if (!placed) unscheduled.push(order);
  });

  return { scheduled, unscheduled };
}

export default function AutoScheduleModal({ pendingOrders, trucks, weekDays, existingScheduled, onConfirm, onCancel }) {
  const [dateOverrides, setDateOverrides] = useState({});
  const [preview, setPreview] = useState(null);

  const ordersWithoutDate = pendingOrders.filter(o => !o.collection_date);

  const handlePreview = () => {
    const withOverrides = pendingOrders.map(o => ({
      ...o,
      scheduled_date_override: dateOverrides[o.id] || o.collection_date || weekDays[0],
    }));
    const result = runAutoSchedule(withOverrides, trucks, weekDays, existingScheduled);
    setPreview(result);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-velox-amber" />
            Programar automaticamente
          </DialogTitle>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {pendingOrders.length} pedido{pendingOrders.length !== 1 ? "s" : ""} aguardando programação.
            </p>

            {ordersWithoutDate.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  {ordersWithoutDate.length} pedido{ordersWithoutDate.length !== 1 ? "s sem" : " sem"} data definida. Escolha uma data para cada:
                </p>
                {ordersWithoutDate.map(o => (
                  <div key={o.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-bold text-velox-amber">{o.protocol}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.client_name}</p>
                    </div>
                    <Input
                      type="date"
                      className="w-36 text-sm"
                      min={weekDays[0]}
                      max={weekDays[weekDays.length - 1]}
                      value={dateOverrides[o.id] || weekDays[0]}
                      onChange={e => setDateOverrides(d => ({ ...d, [o.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button
                className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2"
                onClick={handlePreview}
              >
                <Wand2 className="w-4 h-4" /> Calcular programação
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold font-mono text-green-700">{preview.scheduled.length}</p>
                <p className="text-xs text-green-600">pedidos serão programados</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold font-mono text-amber-700">{preview.unscheduled.length}</p>
                <p className="text-xs text-amber-600">ficarão na fila</p>
              </div>
            </div>

            {preview.scheduled.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A programar:</p>
                {preview.scheduled.map(({ order, truck, date }) => (
                  <div key={order.id} className="flex items-center gap-2 text-xs bg-green-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span className="font-mono font-bold text-green-700">{order.protocol}</span>
                    <span className="text-muted-foreground flex-1 truncate">{order.client_name}</span>
                    <span className="text-green-600 font-medium">{truck.plate} · {date}</span>
                  </div>
                ))}
              </div>
            )}

            {preview.unscheduled.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sem espaço (ficarão na fila):</p>
                {preview.unscheduled.map(order => (
                  <div key={order.id} className="flex items-center gap-2 text-xs bg-amber-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <span className="font-mono font-bold text-amber-700">{order.protocol}</span>
                    <span className="text-muted-foreground truncate">{order.client_name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setPreview(null)}>Voltar</Button>
              <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button
                className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold"
                onClick={() => onConfirm(preview.scheduled)}
              >
                Confirmar programação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
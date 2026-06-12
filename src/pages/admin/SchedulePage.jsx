import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Wand2, Truck } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { useCompanySettings } from "@/hooks/useCompanySettings";

import ScheduleCell from "@/components/schedule/ScheduleCell";
import OrderQueueCard from "@/components/schedule/OrderQueueCard";
import ScheduleTimeModal from "@/components/schedule/ScheduleTimeModal";
import AddOrderModal from "@/components/schedule/AddOrderModal";
import OrderDetailPanel from "@/components/schedule/OrderDetailPanel";
import AutoScheduleModal from "@/components/schedule/AutoScheduleModal";
import AvailabilityPanel from "@/components/schedule/AvailabilityPanel";

const QUEUE_FILTERS = [
  { key: "no_date", label: "Sem data" },
  { key: "this_week", label: "Esta semana" },
  { key: "next_week", label: "Próxima semana" },
];
const SORT_OPTIONS = [
  { key: "date", label: "Data solicitada" },
  { key: "weight", label: "Peso" },
  { key: "created", label: "Criação" },
];

export default function SchedulePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useCompanySettings();

  // Semana selecionada
  const [weekOffset, setWeekOffset] = useState(0);
  const now = new Date();
  const weekStart = startOfWeek(addDays(now, weekOffset * 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = addDays(weekStart, i);
    return d.toISOString().split("T")[0];
  });

  const weekLabel = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} – ${format(addDays(weekStart, 5), "d 'de' MMM yyyy", { locale: ptBR })}`;

  // Dados
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 300),
  });
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });
  const { data: blocks = [] } = useQuery({
    queryKey: ["schedule-blocks"],
    queryFn: () => base44.entities.ScheduleBlock.list("-date", 100),
  });

  // Pedidos da fila
  const [queueFilter, setQueueFilter] = useState("this_week");
  const [queueSort, setQueueSort] = useState("date");
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Modais
  const [timeModal, setTimeModal] = useState(null); // { orderId, truckId, date }
  const [addModal, setAddModal] = useState(null);   // { truckId, date }
  const [detailOrder, setDetailOrder] = useState(null);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [capacityError, setCapacityError] = useState(null);

  const updateOrder = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  // Pedidos na fila (sem programação, status new/confirmed)
  const queueOrders = React.useMemo(() => {
    const nextWeekStart = addDays(weekStart, 7).toISOString().split("T")[0];
    const nextWeekEnd = addDays(weekStart, 13).toISOString().split("T")[0];

    let list = orders.filter(o =>
      (o.status === "new" || o.status === "confirmed") &&
      !o.scheduled_truck_id &&
      o.schedule_status !== "scheduled"
    );

    if (queueFilter === "no_date") {
      list = list.filter(o => !o.collection_date);
    } else if (queueFilter === "this_week") {
      list = list.filter(o => !o.collection_date || (o.collection_date >= weekDays[0] && o.collection_date <= weekDays[5]));
    } else if (queueFilter === "next_week") {
      list = list.filter(o => o.collection_date >= nextWeekStart && o.collection_date <= nextWeekEnd);
    }

    list = [...list].sort((a, b) => {
      if (queueSort === "date") return (a.collection_date || "9999") < (b.collection_date || "9999") ? -1 : 1;
      if (queueSort === "weight") return (b.total_weight_kg || 0) - (a.total_weight_kg || 0);
      return new Date(b.created_date) - new Date(a.created_date);
    });

    return list;
  }, [orders, queueFilter, queueSort, weekDays]);

  // Pedidos programados na semana atual
  const scheduledOrders = orders.filter(o =>
    o.scheduled_truck_id &&
    o.scheduled_date &&
    weekDays.includes(o.scheduled_date)
  );

  const activeTrucks = trucks.filter(t => t.status !== "inactive");

  const getCell = (truckId, date) =>
    scheduledOrders.filter(o => o.scheduled_truck_id === truckId && o.scheduled_date === date);

  const getTruckCapacityForDay = (truckId, date) => {
    const truck = trucks.find(t => t.id === truckId);
    if (!truck) return 0;
    const block = blocks.find(b => b.date === date && b.truck_id === truckId);
    if (block?.block_type === "full_block") return 0;
    return truck.capacity_kg || 0;
  };

  const getTruckUsedKg = (truckId) =>
    scheduledOrders.filter(o => o.scheduled_truck_id === truckId)
      .reduce((s, o) => s + (o.total_weight_kg || 0), 0);

  // Dropar pedido em célula (data×carreta)
  const handleDrop = (orderId, truckId, date) => {
    const order = orders.find(o => o.id === orderId);
    const truck = trucks.find(t => t.id === truckId);
    if (!order || !truck) return;

    const cellOrders = getCell(truckId, date);
    const usedKg = cellOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    const capacityKg = getTruckCapacityForDay(truckId, date);
    const available = capacityKg - usedKg;
    const orderKg = order.total_weight_kg || 0;

    if (orderKg > available) {
      setCapacityError({
        message: `Capacidade insuficiente — sobram apenas ${available.toFixed(0)} kg nesta carreta neste dia`,
        truckId,
        date,
      });
      setTimeout(() => setCapacityError(null), 4000);
      return;
    }

    // Abrir modal de horário
    setTimeModal({ orderId, truckId, date });
    setDragOverCell(null);
  };

  const confirmTimeModal = async (times) => {
    const { orderId, truckId, date } = timeModal;
    await updateOrder.mutateAsync({
      id: orderId,
      data: {
        scheduled_truck_id: truckId,
        scheduled_date: date,
        status: "confirmed",
        schedule_status: "scheduled",
        ...times,
      },
    });
    setTimeModal(null);
    toast({ title: "Pedido programado com sucesso!" });
  };

  // Clique em célula vazia → modal de adicionar
  const handleCellClick = (truckId, date) => {
    setAddModal({ truckId, date });
  };

  const confirmAddModal = (orderIds) => {
    const { truckId, date } = addModal;
    setAddModal(null);
    // Para cada pedido selecionado, abrir modal de horário em sequência
    if (orderIds.length > 0) {
      setTimeModal({ orderId: orderIds[0], truckId, date });
    }
  };

  const handleRemoveOrder = async (order) => {
    await updateOrder.mutateAsync({
      id: order.id,
      data: {
        scheduled_truck_id: null,
        scheduled_date: null,
        schedule_status: "unscheduled",
        scheduled_start_time: null,
        scheduled_lunch_start: null,
        scheduled_lunch_end: null,
        scheduled_end_time: null,
        schedule_notes: null,
      },
    });
    setDetailOrder(null);
    toast({ title: "Pedido removido da programação" });
  };

  const confirmAutoSchedule = async (scheduled) => {
    for (const { order, truck, date } of scheduled) {
      await updateOrder.mutateAsync({
        id: order.id,
        data: {
          scheduled_truck_id: truck.id,
          scheduled_date: date,
          status: "confirmed",
          schedule_status: "scheduled",
          scheduled_start_time: "08:00",
          scheduled_lunch_start: "12:00",
          scheduled_lunch_end: "13:00",
          scheduled_end_time: "17:00",
        },
      });
    }
    setShowAutoModal(false);
    toast({ title: `${scheduled.length} pedido(s) programados!` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Programação de Coletas</h1>
          <p className="text-muted-foreground text-sm mt-1">Organize os pedidos por data e distribua entre as carretas</p>
        </div>
        <Button
          className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2 self-start sm:self-auto"
          onClick={() => setShowAutoModal(true)}
          disabled={queueOrders.length === 0}
        >
          <Wand2 className="w-4 h-4" /> Programar automaticamente
        </Button>
      </div>

      {/* Seletor de semana */}
      <div className="flex items-center gap-3">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold min-w-[200px] text-center">{weekLabel}</span>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="text-xs text-velox-amber hover:underline">
            Hoje
          </button>
        )}
      </div>

      {/* Erro de capacidade */}
      {capacityError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <span className="font-bold">⚠</span> {capacityError.message}
        </div>
      )}

      {/* Layout 2 colunas */}
      <div className="flex gap-4 items-start">

        {/* Coluna esquerda — Fila de pedidos */}
        <div className="w-72 flex-shrink-0 space-y-3">
          <div className="bg-background border border-border rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Aguardando programação
                {queueOrders.length > 0 && (
                  <span className="ml-2 bg-velox-amber text-velox-dark text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {queueOrders.length}
                  </span>
                )}
              </h2>
            </div>

            {/* Filtros */}
            <div className="flex gap-1 flex-wrap">
              {QUEUE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setQueueFilter(f.key)}
                  className={`text-[11px] px-2 py-1 rounded-full font-medium transition-colors ${
                    queueFilter === f.key
                      ? "bg-velox-amber text-velox-dark"
                      : "bg-muted text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Ordenação */}
            <Select value={queueSort} onValueChange={setQueueSort}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(s => (
                  <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Lista */}
            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-0.5">
              {queueOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum pedido aguardando</p>
              ) : (
                queueOrders.map(order => (
                  <OrderQueueCard
                    key={order.id}
                    order={order}
                    onDragStart={setDraggingId}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna direita — Grade semanal */}
        <div className="flex-1 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: "700px" }}>
              <thead>
                <tr>
                  <th className="w-28 text-left p-2 text-xs font-semibold text-muted-foreground">Carreta</th>
                  {weekDays.map(dateStr => {
                    const d = new Date(dateStr + "T12:00:00");
                    const isToday = d.toDateString() === now.toDateString();
                    return (
                      <th key={dateStr} className={`p-2 text-center text-xs font-semibold ${isToday ? "text-velox-amber" : "text-muted-foreground"}`}>
                        <div className={`rounded-lg px-2 py-1 ${isToday ? "bg-velox-amber/10" : ""}`}>
                          <p className="uppercase">{format(d, "EEE", { locale: ptBR })}</p>
                          <p className="font-mono text-sm">{format(d, "d")}</p>
                        </div>
                      </th>
                    );
                  })}
                  <th className="w-24 text-center p-2 text-xs font-semibold text-muted-foreground">Semana</th>
                </tr>
              </thead>
              <tbody>
                {activeTrucks.map(truck => {
                  const weekUsedKg = getTruckUsedKg(truck.id);
                  const weekCapKg = (truck.capacity_kg || 0) * 6;
                  const weekPct = weekCapKg > 0 ? Math.round((weekUsedKg / weekCapKg) * 100) : 0;

                  return (
                    <tr key={truck.id} className="border-t border-border">
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-velox-amber flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-foreground">{truck.plate}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[80px]">{truck.model}</p>
                          </div>
                        </div>
                      </td>
                      {weekDays.map(dateStr => {
                        const isBlocked = blocks.some(b =>
                          b.date === dateStr && (!b.truck_id || b.truck_id === truck.id) && b.block_type === "full_block"
                        );
                        const cellOrders = getCell(truck.id, dateStr);
                        const cellKey = `${truck.id}_${dateStr}`;
                        return (
                          <td key={dateStr} className="p-1">
                            <ScheduleCell
                              orders={cellOrders}
                              truckCapacityKg={truck.capacity_kg || 0}
                              isBlocked={isBlocked}
                              onDrop={(orderId) => handleDrop(orderId, truck.id, dateStr)}
                              onClick={() => handleCellClick(truck.id, dateStr)}
                              onOrderClick={(order) => setDetailOrder(order)}
                              isDragOver={dragOverCell === cellKey}
                              cellKey={cellKey}
                            />
                          </td>
                        );
                      })}
                      {/* Coluna semana */}
                      <td className="p-2">
                        <div className="text-center">
                          <p className="text-[11px] font-mono font-semibold text-foreground">
                            {(weekUsedKg / 1000).toFixed(1)}t
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            / {(weekCapKg / 1000).toFixed(0)}t
                          </p>
                          <div className="h-1 rounded-full bg-gray-200 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${weekPct > 85 ? "bg-red-500" : weekPct > 60 ? "bg-amber-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(100, weekPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {activeTrucks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                      Nenhuma carreta ativa cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Painel de disponibilidade */}
      <AvailabilityPanel trucks={trucks} orders={orders} settings={settings} />

      {/* Modais */}
      {timeModal && (
        <ScheduleTimeModal
          order={orders.find(o => o.id === timeModal.orderId)}
          truck={trucks.find(t => t.id === timeModal.truckId)}
          date={timeModal.date}
          onConfirm={confirmTimeModal}
          onCancel={() => setTimeModal(null)}
        />
      )}

      {addModal && (
        <AddOrderModal
          orders={queueOrders}
          truck={trucks.find(t => t.id === addModal.truckId)}
          date={addModal.date}
          onConfirm={confirmAddModal}
          onCancel={() => setAddModal(null)}
        />
      )}

      {showAutoModal && (
        <AutoScheduleModal
          pendingOrders={queueOrders}
          trucks={trucks}
          weekDays={weekDays}
          existingScheduled={scheduledOrders}
          onConfirm={confirmAutoSchedule}
          onCancel={() => setShowAutoModal(false)}
        />
      )}

      {/* Painel lateral de detalhe */}
      {detailOrder && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDetailOrder(null)} />
          <OrderDetailPanel
            order={detailOrder}
            onClose={() => setDetailOrder(null)}
            onRemove={handleRemoveOrder}
          />
        </>
      )}
    </div>
  );
}
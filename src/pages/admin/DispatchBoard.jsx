import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { todayLocalISO, toLocalISO, formatDateBR } from "@/utils/dateUtils";
import {
  Package, Truck, ChevronLeft, ChevronRight, MapPin,
  CalendarDays, Send, X, ArrowRight
} from "lucide-react";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * DESPACHO — o coração do TMS (dispatch board).
 * Esquerda: fila de pedidos confirmados sem programação/viagem.
 * Direita: quadro caminhões × dias com capacidade.
 * Fluxo: seleciona pedidos → clica na célula (caminhão+dia) → programado.
 * Dali, "Criar viagem" leva os pedidos programados para a viagem.
 */
export default function DispatchBoard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 500) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list(), select: d => d.filter(t => t.status !== "inactive") });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 50) });

  // Fila: confirmados sem viagem
  const queue = orders.filter(o => o.status === "confirmed" && !o.trip_id);
  const unscheduled = queue.filter(o => !o.scheduled_truck_id || !o.scheduled_date);
  const scheduled = orders.filter(o => ["confirmed", "collecting"].includes(o.status) && o.scheduled_truck_id && o.scheduled_date && !o.trip_id);
  const activeTrips = trips.filter(t => t.status === "in_progress" || t.status === "planned");

  const today = new Date();
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // seg-sáb

  const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
  const selectedKg = selectedOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ── Programar pedidos selecionados numa célula ────────────────
  const assignMutation = useMutation({
    mutationFn: async ({ truckId, dateStr }) => {
      for (const order of selectedOrders) {
        await base44.entities.Order.update(order.id, {
          scheduled_truck_id: truckId,
          scheduled_date: dateStr,
          status_history: [...(order.status_history || []), {
            status: order.status,
            timestamp: new Date().toISOString(),
            user: "Admin",
            note: `Programado no despacho para ${formatDateBR(dateStr)}`,
          }],
        });
      }
    },
    onSuccess: (_, { dateStr }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: `${selectedOrders.length} pedido(s) programado(s) para ${formatDateBR(dateStr)}` });
      setSelectedIds([]);
    },
    onError: (e) => toast({ title: "Erro ao programar", description: e?.message, variant: "destructive" }),
  });

  // ── Remover programação de um pedido ──────────────────────────
  const unassignMutation = useMutation({
    mutationFn: (order) => base44.entities.Order.update(order.id, { scheduled_truck_id: "", scheduled_date: "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Pedido devolvido à fila." });
    },
  });

  const handleCellClick = (truck, day) => {
    if (selectedIds.length === 0) {
      toast({ title: "Selecione pedidos na fila", description: "Marque um ou mais pedidos à esquerda e clique na célula para programar." });
      return;
    }
    const dateStr = toLocalISO(day);
    // valida capacidade
    const usedKg = scheduled
      .filter(o => o.scheduled_truck_id === truck.id && o.scheduled_date === dateStr)
      .reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    if (truck.capacity_kg > 0 && usedKg + selectedKg > truck.capacity_kg) {
      toast({
        title: "Capacidade excedida",
        description: `${truck.plate}: ${(usedKg + selectedKg).toLocaleString("pt-BR")} kg > ${truck.capacity_kg.toLocaleString("pt-BR")} kg. Remova pedidos ou escolha outro dia/caminhão.`,
        variant: "destructive",
      });
      return;
    }
    assignMutation.mutate({ truckId: truck.id, dateStr });
  };

  // ── Criar viagem a partir de uma célula ───────────────────────
  const createTripFromCell = (truck, dateStr, cellOrders) => {
    navigate("/admin/viagens/nova", {
      state: { preselectedOrderIds: cellOrders.map(o => o.id), preselectedTruckId: truck.id },
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Despacho</h1>
          <p className="text-muted-foreground text-sm">Selecione pedidos na fila e clique no dia/caminhão para programar</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTrips.length > 0 && (
            <Link to="/admin/viagens" className="text-xs text-velox-amber hover:underline flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> {activeTrips.length} viagem(ns) ativa(s) →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        {/* ── FILA (esquerda) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-velox-amber" /> Fila de despacho
              <span className="text-muted-foreground font-normal">({unscheduled.length})</span>
            </h2>
            {selectedIds.length > 0 && (
              <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="w-3 h-3" /> Limpar ({selectedIds.length})
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="rounded-lg bg-velox-amber/10 border border-velox-amber/30 px-3 py-2 text-xs font-medium text-velox-dark">
              {selectedIds.length} selecionado(s) · {selectedKg.toLocaleString("pt-BR")} kg — clique numa célula do quadro →
            </div>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {unscheduled.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Fila vazia.<br />
                <Link to="/admin/coletas?status=new" className="text-velox-amber hover:underline text-xs">
                  Ver pedidos aguardando confirmação →
                </Link>
              </div>
            ) : unscheduled.map(o => (
              <label key={o.id}
                className={`block rounded-xl border p-3 cursor-pointer transition-all ${
                  selectedIds.includes(o.id)
                    ? "border-velox-amber bg-velox-amber/5 shadow-sm"
                    : "border-border hover:border-velox-amber/40"
                }`}>
                <div className="flex items-start gap-2.5">
                  <Checkbox checked={selectedIds.includes(o.id)} onCheckedChange={() => toggleSelect(o.id)} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold">{o.protocol}</span>
                      <span className="text-xs font-mono text-muted-foreground">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</span>
                    </div>
                    <p className="text-sm font-medium truncate mt-0.5">{o.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      <MapPin className="w-3 h-3 inline mr-0.5" />
                      {o.origin?.city || "—"} → {(o.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                    </p>
                    {o.collection_date && (
                      <p className="text-[11px] text-amber-600 mt-0.5">Solicitado: {formatDateBR(o.collection_date)}</p>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── QUADRO (direita) ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              {format(weekStart, "dd/MM", { locale: ptBR })} – {format(addDays(weekStart, 5), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="text-xs text-velox-amber hover:underline">Esta semana</button>
            )}
          </div>

          {trucks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-20" />
              Nenhum caminhão ativo. <Link to="/admin/frota" className="text-velox-amber hover:underline">Cadastrar →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse bg-background">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 w-32 border-b border-r border-border bg-muted/30">Caminhão</th>
                    {days.map((day, i) => (
                      <th key={i} className={`text-center text-xs p-2 border-b border-border min-w-[130px] ${isToday(day) ? "bg-velox-amber/10" : "bg-muted/30"}`}>
                        <span className={`font-medium ${isToday(day) ? "text-velox-amber" : "text-muted-foreground"}`}>
                          {format(day, "EEE", { locale: ptBR })}
                        </span>
                        <span className={`block text-base font-bold font-mono ${isToday(day) ? "text-velox-amber" : "text-foreground"}`}>
                          {format(day, "dd/MM")}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trucks.map(truck => (
                    <tr key={truck.id} className="border-b border-border/40 last:border-0">
                      <td className="p-3 border-r border-border align-top">
                        <p className="font-mono font-bold text-sm">{truck.plate}</p>
                        <p className="text-xs text-muted-foreground">{truck.model}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{(truck.capacity_kg || 0).toLocaleString("pt-BR")} kg</p>
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          truck.status === "available" ? "bg-green-100 text-green-700" :
                          truck.status === "on_route" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {truck.status === "available" ? "Disponível" : truck.status === "on_route" ? "Em rota" : "Manutenção"}
                        </span>
                      </td>
                      {days.map((day, di) => {
                        const dateStr = toLocalISO(day);
                        const cellOrders = scheduled.filter(o => o.scheduled_truck_id === truck.id && o.scheduled_date === dateStr);
                        const usedKg = cellOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
                        const pct = truck.capacity_kg > 0 ? (usedKg / truck.capacity_kg) * 100 : 0;
                        const clickable = selectedIds.length > 0;
                        return (
                          <td key={di}
                            onClick={() => clickable && handleCellClick(truck, day)}
                            className={`p-1.5 align-top transition-colors ${isToday(day) ? "bg-velox-amber/5" : ""} ${
                              clickable ? "cursor-pointer hover:bg-velox-amber/15 hover:ring-2 hover:ring-inset hover:ring-velox-amber/40" : ""
                            }`}>
                            {cellOrders.length === 0 ? (
                              <div className={`text-[11px] py-4 text-center rounded-lg ${
                                clickable ? "text-velox-amber/60 border border-dashed border-velox-amber/30" : "text-muted-foreground/30"
                              }`}>
                                {clickable ? "+ programar aqui" : "livre"}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {cellOrders.map(o => (
                                  <div key={o.id} className="group relative bg-velox-amber/10 border border-velox-amber/25 rounded-lg p-1.5">
                                    <Link to={`/admin/coletas/${o.id}`} onClick={e => e.stopPropagation()} className="block hover:opacity-80">
                                      <p className="font-mono text-[10px] text-muted-foreground">{o.protocol}</p>
                                      <p className="text-xs font-medium truncate">{o.client_name}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</p>
                                    </Link>
                                    <button
                                      title="Devolver à fila"
                                      onClick={e => { e.stopPropagation(); unassignMutation.mutate(o); }}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500"}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground font-mono">{usedKg.toLocaleString("pt-BR")} kg</span>
                                  <button
                                    onClick={e => { e.stopPropagation(); createTripFromCell(truck, dateStr, cellOrders); }}
                                    className="text-[10px] font-bold text-velox-amber hover:underline flex items-center gap-0.5">
                                    <Send className="w-2.5 h-2.5" /> Viagem
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Viagens ativas resumidas */}
          {activeTrips.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Em rota / planejadas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeTrips.map(trip => {
                  const completed = (trip.stops || []).filter(s => s.status === "completed").length;
                  const total = (trip.stops || []).length;
                  return (
                    <Link key={trip.id} to={`/admin/viagens/${trip.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-velox-amber/40 transition-colors">
                      <Truck className="w-4 h-4 text-velox-amber flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          <span className="font-mono">{trip.truck_plate}</span> · {trip.driver_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{completed}/{total} paradas · {trip.order_ids?.length || 0} pedidos</p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

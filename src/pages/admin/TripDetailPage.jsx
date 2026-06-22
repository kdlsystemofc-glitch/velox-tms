import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft, MapPin, CheckCircle2, Circle, Truck, Package,
  DollarSign, X, Play, Square, Plus, Trash2, FileText, AlertTriangle, FileDown,
  Sparkles, ChevronUp, ChevronDown
} from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import FileUploadButton from "@/components/shared/FileUploadButton";
import { todayLocalISO } from "@/utils/dateUtils";
import { optimizeStops } from "@/utils/routeOptimizer";
import { format } from "date-fns";

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeForm, setCloseForm] = useState({ real_km: "", fuel_liters: "", fuel_cost: "", tolls_cost: "", notes: "", other_costs: [] });
  const [generatingManifest, setGeneratingManifest] = useState(false);
  const { settings } = useCompanySettings();

  const { data: trip } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => base44.entities.Trip.filter({ id }),
    select: (d) => d[0],
    staleTime: 15_000,
    refetchInterval: (data) => data?.status === "in_progress" ? 30_000 : false,
  });

  // Motoristas — necessário para calcular a comissão no encerramento (acerto Fase 6).
  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.list(),
  });

  // Pedidos — para sugestão de retorno (backhaul, S9).
  const { data: allOrders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Trip.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", id] }),
  });

  if (!trip) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full" /></div>;

  const completedStops = (trip.stops || []).filter(s => s.status === "completed").length;
  const totalStops = (trip.stops || []).length;
  const userName = user?.full_name || "Sistema";
  // Comboio (Onda 7): lista de veículos da viagem
  const crew = (trip.vehicles && trip.vehicles.length) ? trip.vehicles : [{ truck_id: trip.truck_id, truck_plate: trip.truck_plate, driver_id: trip.driver_id, driver_name: trip.driver_name }];
  const setStopVehicle = (i, idx) => {
    const stops = [...(trip.stops || [])];
    stops[i] = { ...stops[i], vehicle_index: idx };
    updateMutation.mutate({ stops });
  };

  // ── Backhaul (S9): caminhão terminou as entregas e volta vazio ──
  const linkedOrders = allOrders.filter(o => (trip.order_ids || []).includes(o.id));
  const deliveryCities = new Set(
    linkedOrders.flatMap(o => (o.recipients || []).map(r => (r.city || "").toLowerCase().trim())).filter(Boolean)
  );
  const deliveryStops = (trip.stops || []).filter(s => s.type === "delivery");
  const allDeliveriesDone = deliveryStops.length > 0 && deliveryStops.every(s => s.status === "completed");
  const backhaulCandidates = (trip.status === "in_progress" && allDeliveriesDone)
    ? allOrders.filter(o => o.status === "confirmed" && !o.trip_id && o.origin?.city && deliveryCities.has(o.origin.city.toLowerCase().trim()))
    : [];

  const addBackhaul = useMutation({
    mutationFn: async (order) => {
      const stop = {
        type: "collection", order_id: order.id,
        recipient_name: order.client_name,
        address: [order.origin?.street, order.origin?.number, order.origin?.city, order.origin?.state].filter(Boolean).join(", "),
        cep: order.origin?.cep || "", status: "pending", stop_order: (trip.stops || []).length + 1,
      };
      await base44.entities.Trip.update(trip.id, {
        stops: [...(trip.stops || []), stop],
        order_ids: [...(trip.order_ids || []), order.id],
        order_protocols: [...(trip.order_protocols || []), order.protocol],
        total_revenue: (trip.total_revenue || 0) + (order.freight_value || 0),
        events: [...(trip.events || []), { type: "backhaul_added", description: `Coleta de retorno adicionada: ${order.protocol} (${order.client_name}) em ${order.origin?.city}`, timestamp: new Date().toISOString(), user: userName }],
      });
      await base44.entities.Order.update(order.id, {
        trip_id: trip.id, truck_id: trip.truck_id, driver_id: trip.driver_id, status: "collecting",
        status_history: [...(order.status_history || []), { status: "collecting", timestamp: new Date().toISOString(), user: userName, note: `Aproveitamento de retorno — viagem ${trip.truck_plate}` }],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Coleta de retorno adicionada!", description: "O pedido entrou na viagem para aproveitar o retorno." });
    },
    onError: (e) => toast({ title: "Erro ao adicionar", description: e?.message, variant: "destructive" }),
  });

  const updateStop = async (index, newStatus) => {
    const stops = [...(trip.stops || [])];
    const stop = { ...stops[index], status: newStatus, completed_at: new Date().toISOString() };
    stops[index] = stop;

    updateMutation.mutate({
      stops,
      events: [...(trip.events || []), {
        type: "stop_update",
        description: `Parada "${stop.recipient_name || stop.address}" marcada como ${newStatus}`,
        timestamp: new Date().toISOString(),
        user: userName
      }]
    });

    // Sync Order status when a stop is completed
    if (newStatus === "completed" && stop.order_id) {
      try {
        const orders = await base44.entities.Order.filter({ id: stop.order_id });
        const order = orders[0];
        if (!order) return;

        if (stop.type === "collection") {
          await base44.entities.Order.update(stop.order_id, {
            status: "in_transit",
            status_history: [...(order.status_history || []), {
              status: "in_transit",
              timestamp: new Date().toISOString(),
              user: userName,
              note: `Coleta concluída — caminhão ${trip.truck_plate}`
            }]
          });
        } else if (stop.type === "delivery") {
          // Mark this recipient as delivered
          const recipients = (order.recipients || []).map(r => {
            if (r.name === stop.recipient_name) return { ...r, delivery_status: "delivered" };
            return r;
          });
          const allDelivered = recipients.every(r => r.delivery_status === "delivered");
          const newOrderStatus = allDelivered ? "delivered" : "in_transit";
          await base44.entities.Order.update(stop.order_id, {
            recipients,
            status: newOrderStatus,
            status_history: [...(order.status_history || []), {
              status: newOrderStatus,
              timestamp: new Date().toISOString(),
              user: userName,
              note: allDelivered
                ? `Todos os destinatários entregues — viagem ${trip.truck_plate}`
                : `Entrega para ${stop.recipient_name} concluída`
            }]
          });
        }
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } catch (e) {
        // Silent — stop update already succeeded
      }
    }

    toast({ title: "Parada atualizada!" });
  };

  const startTrip = async () => {
    updateMutation.mutate({
      status: "in_progress",
      departure_date: new Date().toISOString(),
      events: [...(trip.events || []), {
        type: "started",
        description: "Viagem iniciada",
        timestamp: new Date().toISOString(),
        user: userName
      }],
    });

    // Update truck status to on_route (todos os veículos do comboio)
    const crewTrucks = (trip.vehicles && trip.vehicles.length) ? trip.vehicles.map(v => v.truck_id) : [trip.truck_id];
    crewTrucks.filter(Boolean).forEach(tid => base44.entities.Truck.update(tid, { status: "on_route" }));

    // Update all linked orders to "collecting"
    if (trip.order_ids && trip.order_ids.length > 0) {
      await Promise.all(trip.order_ids.map(async (orderId) => {
        try {
          const orders = await base44.entities.Order.filter({ id: orderId });
          const order = orders[0];
          if (!order) return;
          await base44.entities.Order.update(orderId, {
            status: "collecting",
            status_history: [...(order.status_history || []), {
              status: "collecting",
              timestamp: new Date().toISOString(),
              user: userName,
              note: `Viagem iniciada — caminhão ${trip.truck_plate}`
            }]
          });
        } catch (e) {
          // Silent
        }
      }));
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }

    toast({ title: "Viagem iniciada!" });
  };

  // ── Roteirização (Fase 2) ─────────────────────────────────────
  const saveStopsOrder = (stops) => updateMutation.mutate({ stops: stops.map((s, idx) => ({ ...s, stop_order: idx + 1 })) });
  const optimizeRoute = () => {
    saveStopsOrder(optimizeStops(trip.stops || []));
    toast({ title: "Rota otimizada", description: "Paradas reordenadas por proximidade de CEP (coleta antes da entrega)." });
  };
  const moveStop = (i, dir) => {
    const stops = [...(trip.stops || [])];
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    [stops[i], stops[j]] = [stops[j], stops[i]];
    saveStopsOrder(stops);
  };

  const closeTrip = async () => {
    const otherCostsTotal = (closeForm.other_costs || []).reduce((s, c) => s + Number(c.amount || 0), 0);
    const totalCost = Number(closeForm.fuel_cost || 0) + Number(closeForm.tolls_cost || 0) + otherCostsTotal;
    const netProfit = (trip.total_revenue || 0) - totalCost;

    // Comissão por motorista do comboio (% sobre a receita do SEU veículo) — Fase 6 / Onda 7
    const crew = (trip.vehicles && trip.vehicles.length) ? trip.vehicles : [{ truck_id: trip.truck_id, truck_plate: trip.truck_plate, driver_id: trip.driver_id, driver_name: trip.driver_name }];
    const orderVehicleIndex = (orderId) => {
      const col = (trip.stops || []).find(s => s.order_id === orderId && s.type === "collection");
      return col?.vehicle_index || 0;
    };
    const revenueOfVehicle = (idx) => linkedOrders
      .filter(o => orderVehicleIndex(o.id) === idx)
      .reduce((s, o) => s + (o.freight_value || 0), 0);
    const commissionRows = crew.map((v, idx) => {
      const drv = drivers.find(d => d.id === v.driver_id);
      const pct = Number(drv?.commission_percent) || 0;
      // se só há 1 veículo, usa a receita total; senão, a receita do veículo
      const rev = crew.length === 1 ? (trip.total_revenue || 0) : revenueOfVehicle(idx);
      return { driver_id: v.driver_id, driver_name: v.driver_name || drv?.name, truck_plate: v.truck_plate, pct, amount: Math.round(rev * (pct / 100) * 100) / 100 };
    }).filter(r => r.amount > 0);
    const commission = commissionRows.reduce((s, r) => s + r.amount, 0);

    await updateMutation.mutateAsync({
      status: "completed",
      arrival_date: new Date().toISOString(),
      real_km: Number(closeForm.real_km),
      fuel_liters: Number(closeForm.fuel_liters),
      fuel_cost: Number(closeForm.fuel_cost),
      tolls_cost: Number(closeForm.tolls_cost),
      other_costs: closeForm.other_costs,
      total_cost: totalCost,
      net_profit: netProfit,
      commission_amount: commission,
      events: [...(trip.events || []), {
        type: "completed",
        description: `Viagem encerrada. Km final: ${closeForm.real_km}`,
        timestamp: new Date().toISOString(),
        user: userName
      }],
    });

    // Criar despesas automaticamente dos gastos da viagem
    const today = todayLocalISO();
    const expensesToCreate = [];
    if (Number(closeForm.fuel_cost) > 0) {
      expensesToCreate.push({
        category: "fuel",
        description: `Combustível — ${trip.truck_plate} (${closeForm.fuel_liters}L)`,
        amount: Number(closeForm.fuel_cost),
        date: today,
        status: "paid",
        trip_id: trip.id,
      });
    }
    if (Number(closeForm.tolls_cost) > 0) {
      expensesToCreate.push({
        category: "tolls",
        description: `Pedágios — ${trip.truck_plate}`,
        amount: Number(closeForm.tolls_cost),
        date: today,
        status: "paid",
        trip_id: trip.id,
      });
    }
    (closeForm.other_costs || []).forEach(c => {
      if (Number(c.amount) > 0) {
        expensesToCreate.push({
          category: "other",
          description: c.description || `Gasto extra — ${trip.truck_plate}`,
          amount: Number(c.amount),
          date: today,
          status: "paid",
          trip_id: trip.id,
        });
      }
    });
    // Comissão de cada motorista do comboio vira despesa A PAGAR (acerto)
    commissionRows.forEach(r => {
      expensesToCreate.push({
        category: "salaries",
        description: `Comissão ${r.pct}% — ${r.driver_name || "motorista"} (viagem ${r.truck_plate || trip.truck_plate})`,
        amount: r.amount,
        date: today,
        status: "pending",
        trip_id: trip.id,
        driver_id: r.driver_id || undefined,
      });
    });
    if (expensesToCreate.length > 0) {
      await Promise.all(expensesToCreate.map(e => base44.entities.Expense.create(e)));
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }

    // Update trucks back to available (todos do comboio; odômetro só no líder)
    crew.map(v => v.truck_id).filter(Boolean).forEach((tid, i) => {
      const upd = { status: "available" };
      if (i === 0 && Number(closeForm.real_km) > 0) upd.total_km = Number(closeForm.real_km);
      base44.entities.Truck.update(tid, upd);
    });

    // Ensure all linked orders are delivered
    if (trip.order_ids && trip.order_ids.length > 0) {
      await Promise.all(trip.order_ids.map(async (orderId) => {
        try {
          const orders = await base44.entities.Order.filter({ id: orderId });
          const order = orders[0];
          if (!order || order.status === "delivered" || order.status === "cancelled") return;
          await base44.entities.Order.update(orderId, {
            status: "delivered",
            status_history: [...(order.status_history || []), {
              status: "delivered",
              timestamp: new Date().toISOString(),
              user: userName,
              note: `Viagem encerrada — ${trip.truck_plate}`
            }]
          });
        } catch (e) {
          // Silent
        }
      }));
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }

    setShowCloseModal(false);
    toast({ title: "Viagem encerrada!", description: `Lucro líquido: R$ ${netProfit.toFixed(2)}` });
  };

  const stopTypeLabel = { departure: "Partida", collection: "Coleta", delivery: "Entrega" };
  const stopTypeColor = { departure: "text-blue-600 bg-blue-50", collection: "text-amber-600 bg-amber-50", delivery: "text-green-600 bg-green-50" };
  const statusColor = { pending: "text-muted-foreground", arrived: "text-amber-600", completed: "text-green-600" };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/viagens")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold">Viagem</h1>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              trip.status === "in_progress" ? "bg-amber-100 text-amber-700" :
              trip.status === "completed" ? "bg-green-100 text-green-700" :
              trip.status === "planned" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
            }`}>
              {trip.status === "in_progress" ? "Em Andamento" : trip.status === "completed" ? "Concluída" : trip.status === "planned" ? "Planejada" : "Cancelada"}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{trip.driver_name} · {trip.truck_plate}</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={generatingManifest}
          onClick={async () => {
            setGeneratingManifest(true);
            try {
              const orderIds = trip.order_ids || [];
              const linkedOrders = [];
              for (const oid of orderIds) {
                const res = await base44.entities.Order.filter({ id: oid });
                if (res?.[0]) linkedOrders.push(res[0]);
              }
              const { generateTripManifest } = await import("@/utils/generateTripManifest");
              const blob = generateTripManifest(trip, linkedOrders, settings);
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `Romaneio-${trip.truck_plate || "viagem"}-${todayLocalISO()}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              toast({ title: "Erro ao gerar romaneio", description: e?.message || "Tente novamente.", variant: "destructive" });
            } finally {
              setGeneratingManifest(false);
            }
          }}
        >
          <FileDown className="w-4 h-4" />
          {generatingManifest ? "Gerando..." : "Romaneio PDF"}
        </Button>
        {trip.status === "planned" && (
          <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={startTrip}>
            <Play className="w-4 h-4" /> Iniciar
          </Button>
        )}
        {trip.status === "in_progress" && (
          <Button className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2" onClick={() => setShowCloseModal(true)}>
            <Square className="w-4 h-4" /> Encerrar Viagem
          </Button>
        )}
      </div>

      {/* Progress */}
      {totalStops > 0 && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progresso da viagem</span>
              <span className="font-semibold">{completedStops}/{totalStops} paradas</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full">
              <div className="h-2 bg-velox-amber rounded-full transition-all" style={{ width: `${(completedStops / totalStops) * 100}%` }} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stops timeline */}
        <div className="lg:col-span-2">
          {backhaulCandidates.length > 0 && (
            <Card className="mb-3 border-blue-200 bg-blue-50/60">
              <CardContent className="pt-4">
                <p className="text-sm font-semibold text-blue-800 flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" /> Aproveitar o retorno?
                </p>
                <p className="text-xs text-blue-700 mb-3">
                  As entregas terminaram. O caminhão vai voltar vazio e há coleta(s) pendente(s) na mesma região:
                </p>
                <div className="space-y-2">
                  {backhaulCandidates.map(o => (
                    <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-white p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{o.client_name} <span className="font-mono text-xs text-muted-foreground">{o.protocol}</span></p>
                        <p className="text-xs text-muted-foreground">{o.origin?.city}/{o.origin?.state} · {(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</p>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 flex-shrink-0"
                        disabled={addBackhaul.isPending} onClick={() => addBackhaul.mutate(o)}>
                        <Plus className="w-3.5 h-3.5" /> Adicionar à viagem
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-velox-amber" /> Paradas
            </h3>
            {trip.status !== "completed" && (trip.stops || []).length > 1 && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={optimizeRoute}>
                <Sparkles className="w-3.5 h-3.5" /> Otimizar rota
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {(trip.stops || []).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhuma parada cadastrada.</p>
            ) : (
              (trip.stops || []).map((stop, i) => (
                <Card key={i} className={stop.status === "completed" ? "opacity-70" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${stop.status === "completed" ? "bg-green-100 text-green-700" : stop.status === "arrived" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                        {stop.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${stopTypeColor[stop.type] || "text-muted-foreground bg-muted"}`}>
                            {stopTypeLabel[stop.type] || stop.type}
                          </span>
                          {stop.recipient_name && <span className="font-medium text-sm">{stop.recipient_name}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{stop.address}</p>
                        {crew.length > 1 && trip.status !== "completed" && (
                          <select value={stop.vehicle_index || 0} onChange={e => setStopVehicle(i, Number(e.target.value))}
                            className="mt-1 text-[11px] border border-border rounded px-1.5 py-0.5 bg-background">
                            {crew.map((v, vi) => <option key={vi} value={vi}>{v.truck_plate || `Veículo ${vi + 1}`}</option>)}
                          </select>
                        )}
                        {crew.length > 1 && trip.status === "completed" && (
                          <span className="text-[11px] text-muted-foreground"> · {crew[stop.vehicle_index || 0]?.truck_plate}</span>
                        )}
                        {stop.completed_at && <p className="text-xs text-green-600 mt-1">Concluído em {format(new Date(stop.completed_at), "dd/MM HH:mm")}</p>}
                        {stop.type === "delivery" && (
                          stop.nf_signed_url
                            ? <a href={stop.nf_signed_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"><FileText className="w-3.5 h-3.5" /> Ver NF Assinada</a>
                            : trip.status === "in_progress"
                              ? <div className="mt-1"><FileUploadButton label="Anexar NF" accept="image/*,application/pdf" onUpload={async (url) => {
                                  if (!url) return;
                                  const stops = [...(trip.stops || [])];
                                  stops[i] = { ...stops[i], nf_signed_url: url };
                                  updateMutation.mutate({ stops });
                                  toast({ title: "NF anexada!" });
                                }} /></div>
                              : <span className="text-xs text-amber-500 flex items-center gap-1 mt-1"><AlertTriangle className="w-3.5 h-3.5" /> NF não enviada</span>
                        )}
                      </div>
                      {trip.status !== "completed" && stop.status !== "completed" && (
                        <div className="flex flex-col gap-0.5 flex-shrink-0" title="Reordenar parada">
                          <button onClick={() => moveStop(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => moveStop(i, 1)} disabled={i === (trip.stops || []).length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                        </div>
                      )}
                      {trip.status === "in_progress" && stop.status !== "completed" && (
                        <div className="flex gap-1">
                          {stop.status === "pending" && (
                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStop(i, "arrived")}>Chegou</Button>
                          )}
                          {stop.status !== "completed" && (
                            <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStop(i, "completed")}>Concluir</Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          {crew.length > 1 && (
            <Card>
              <CardHeader className="py-3 border-b border-border bg-muted/30">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-velox-amber" /> Comboio ({crew.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-1.5">
                {crew.map((v, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold">{v.truck_plate || "—"}</span>
                    <span className="text-muted-foreground">{v.driver_name || "—"}{i === 0 ? " · líder" : ""}</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground pt-1">Atribua cada parada a um veículo na lista de paradas.</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="py-3 border-b border-border bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-velox-amber" /> Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pt-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Receita total</span><span className="font-mono font-semibold text-green-600">R$ {(trip.total_revenue || 0).toFixed(2)}</span></div>
              {Number(trip.advance_amount) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Adiantamento pago</span><span className="font-mono text-amber-600">R$ {Number(trip.advance_amount).toFixed(2)}</span></div>
              )}
              {trip.status === "completed" && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Custo total</span><span className="font-mono text-red-600">R$ {(trip.total_cost || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Lucro líquido</span>
                    <span className={`font-mono ${(trip.net_profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>R$ {(trip.net_profit || 0).toFixed(2)}</span>
                  </div>
                  {(() => {
                    const rev = trip.total_revenue || 0;
                    const margin = rev > 0 ? ((trip.net_profit || 0) / rev) * 100 : 0;
                    const costPerKm = Number(trip.real_km) > 0 ? (trip.total_cost || 0) / trip.real_km : null;
                    return (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Margem</span>
                          <span className={`font-mono font-semibold ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Custo por km</span>
                          <span className="font-mono">{costPerKm != null ? `R$ ${costPerKm.toFixed(2)}/km` : "—"}</span>
                        </div>
                      </>
                    );
                  })()}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Km real</span><span className="font-mono">{trip.real_km || "—"} km</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Combustível</span><span className="font-mono">{trip.fuel_liters || "—"}L · R$ {(trip.fuel_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Pedágios</span><span className="font-mono">R$ {(trip.tolls_cost || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {trip.status === "completed" && (Number(trip.commission_amount) > 0 || Number(trip.advance_amount) > 0) && (() => {
            const comm = Number(trip.commission_amount) || 0;
            const adv = Number(trip.advance_amount) || 0;
            const saldo = comm - adv;
            return (
              <Card>
                <CardHeader className="py-3 border-b border-border bg-muted/30">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-velox-amber" /> Acerto do motorista</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm pt-4">
                  <div className="flex justify-between"><span className="text-muted-foreground">Motorista</span><span className="font-medium">{trip.driver_name || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Comissão</span><span className="font-mono text-green-600">R$ {comm.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">(−) Adiantamento (vale-frete)</span><span className="font-mono text-amber-600">R$ {adv.toFixed(2)}</span></div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Saldo a {saldo >= 0 ? "pagar ao" : "receber do"} motorista</span>
                    <span className={`font-mono ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>R$ {Math.abs(saldo).toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">A comissão foi lançada como despesa "a pagar" em Financeiro → Despesas.</p>
                </CardContent>
              </Card>
            );
          })()}

          {trip.events && trip.events.length > 0 && (
            <Card>
              <CardHeader className="py-3 border-b border-border bg-muted/30"><CardTitle className="text-sm font-semibold">Eventos</CardTitle></CardHeader>
              <CardContent className="space-y-2 pt-4">
                {trip.events.slice().reverse().map((e, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-foreground">{e.description}</p>
                    <p className="text-muted-foreground">{e.timestamp ? format(new Date(e.timestamp), "dd/MM HH:mm") : ""}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Close modal */}
      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Encerrar Viagem</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Km Final (odômetro)</label><Input type="number" value={closeForm.real_km} onChange={e => setCloseForm(f => ({ ...f, real_km: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Combustível (litros)</label><Input type="number" step="0.1" value={closeForm.fuel_liters} onChange={e => setCloseForm(f => ({ ...f, fuel_liters: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custo combustível (R$)</label><Input type="number" step="0.01" value={closeForm.fuel_cost} onChange={e => setCloseForm(f => ({ ...f, fuel_cost: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pedágios (R$)</label><Input type="number" step="0.01" value={closeForm.tolls_cost} onChange={e => setCloseForm(f => ({ ...f, tolls_cost: e.target.value }))} /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outros gastos</label>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setCloseForm(f => ({ ...f, other_costs: [...f.other_costs, { description: "", amount: "" }] }))}>
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
              {closeForm.other_costs.map((c, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input placeholder="Descrição" value={c.description} onChange={e => { const oc = [...closeForm.other_costs]; oc[i].description = e.target.value; setCloseForm(f => ({ ...f, other_costs: oc })); }} className="flex-1 h-8 text-xs" />
                  <Input type="number" step="0.01" placeholder="R$" value={c.amount} onChange={e => { const oc = [...closeForm.other_costs]; oc[i].amount = e.target.value; setCloseForm(f => ({ ...f, other_costs: oc })); }} className="w-24 h-8 text-xs" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => setCloseForm(f => ({ ...f, other_costs: f.other_costs.filter((_, j) => j !== i) }))}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações finais</label>
              <Textarea placeholder="Ocorrências, observações sobre a rota, etc." rows={2} value={closeForm.notes} onChange={e => setCloseForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" />
            </div>

            <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-0.5">
              <div className="flex justify-between"><span>Receita</span><span className="font-mono text-green-600">R$ {(trip.total_revenue || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Custo estimado</span><span className="font-mono text-red-600">R$ {(Number(closeForm.fuel_cost || 0) + Number(closeForm.tolls_cost || 0) + closeForm.other_costs.reduce((s, c) => s + Number(c.amount || 0), 0)).toFixed(2)}</span></div>
              {Number(trip.advance_amount) > 0 && (
                <div className="flex justify-between text-xs text-amber-700"><span>Adiantamento já pago (acerto)</span><span className="font-mono">R$ {Number(trip.advance_amount).toFixed(2)}</span></div>
              )}
            </div>

            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" onClick={closeTrip} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Encerrando..." : "Confirmar Encerramento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
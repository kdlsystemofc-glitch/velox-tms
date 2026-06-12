import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { NumericInput } from "@/components/shared/NumericInput";
import { calculateFreight } from "@/utils/freightCalculator";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Package, CheckCircle, XCircle, Truck, Clock, MapPin, AlertTriangle, Plus } from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";

function suggestTruckForOrder(order, trucks, existingOrders) {
  const targetDate = order.collection_date;
  const orderWeight = order.total_weight_kg || 0;
  return trucks
    .filter(t => t.status === "available" || t.status === "on_route")
    .map(truck => {
      const usedKg = existingOrders
        .filter(o => o.scheduled_truck_id === truck.id && o.scheduled_date === targetDate && o.status !== "cancelled")
        .reduce((sum, o) => sum + (o.total_weight_kg || 0), 0);
      const availableKg = (truck.capacity_kg || 0) - usedKg;
      const canFit = availableKg >= orderWeight;
      const usagePercent = ((usedKg + orderWeight) / (truck.capacity_kg || 1)) * 100;
      return { truck, usedKg, availableKg, canFit, usagePercent, score: canFit ? usagePercent : -1 };
    })
    .filter(t => t.canFit)
    .sort((a, b) => b.score - a.score);
}

export default function Operations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useCompanySettings();

  const [scheduleOrder, setScheduleOrder] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ truck_id: "", date: "", freight_value: "", payment_method: "pix" });

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 200) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date") });

  const pendingOrders = orders.filter(o => o.status === "new");
  const scheduledOrders = orders.filter(o => o.status === "confirmed" && o.scheduled_truck_id);
  const activeTrips = trips.filter(t => t.status === "in_progress" || t.status === "planned");

  const confirmMutation = useMutation({
    mutationFn: async ({ order, form }) => {
      const fv = typeof form.freight_value === "number" ? form.freight_value : parseFloat(String(form.freight_value).replace(",", ".")) || 0;
      await base44.entities.Order.update(order.id, {
        status: "confirmed",
        scheduled_truck_id: form.truck_id || undefined,
        scheduled_date: form.date || order.collection_date,
        freight_value: fv,
        payment_method: form.payment_method || undefined,
        status_history: [...(order.status_history || []), { status: "confirmed", timestamp: new Date().toISOString(), user: "Admin", note: "Confirmado via Operações" }],
      });
      // Criar receita automaticamente
      if (fv > 0) {
        await base44.entities.Revenue.create({
          order_id: order.id,
          description: `Frete ${order.protocol} — ${order.client_name}`,
          amount: fv,
          due_date: form.date || order.collection_date || new Date().toISOString().split("T")[0],
          status: "receivable",
          payment_method: form.payment_method || undefined,
          client_id: order.client_id || undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setScheduleOrder(null);
      toast({ title: "Pedido confirmado e programado!" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (order) => base44.entities.Order.update(order.id, {
      status: "cancelled",
      status_history: [...(order.status_history || []), { status: "cancelled", timestamp: new Date().toISOString(), user: "Admin", note: "Recusado via Operações" }],
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Pedido recusado." }); },
  });

  const openSchedule = (order) => {
    const suggestions = suggestTruckForOrder(order, trucks, orders);
    const est = calculateFreight(order.total_weight_kg || 0, null, settings);
    setScheduleForm({
      truck_id: suggestions[0]?.truck.id || "",
      date: order.collection_date || "",
      freight_value: order.freight_value || est || "",
      payment_method: order.payment_method || "pix",
    });
    setScheduleOrder(order);
  };

  const suggestions = scheduleOrder ? suggestTruckForOrder(scheduleOrder, trucks, orders) : [];
  const selectedSuggestion = suggestions.find(s => s.truck.id === scheduleForm.truck_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground flex items-center gap-2">
            <Truck className="w-7 h-7 text-velox-amber" /> Operações
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Confirmar coletas, programar carretas e acompanhar viagens</p>
        </div>
        <Button className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2" onClick={() => navigate("/admin/pedidos/novo")}>
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Aguardando {pendingOrders.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingOrders.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            Programado {scheduledOrders.length > 0 && <span className="bg-velox-amber text-velox-dark text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{scheduledOrders.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            Viagens Ativas {activeTrips.length > 0 && <span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeTrips.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: AGUARDANDO */}
        <TabsContent value="pending" className="mt-4">
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
              <p className="font-semibold text-lg">Nenhum pedido aguardando</p>
              <p className="text-sm text-muted-foreground">Todos os pedidos foram processados. 🎉</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingOrders.map(order => {
                const destinations = order.recipients?.map(r => r.city || r.name).filter(Boolean).join(" + ") || "—";
                const kg = (order.total_weight_kg || 0).toLocaleString("pt-BR");
                const vol = order.total_volumes || "?";
                const val = (order.total_declared_value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                return (
                  <Card key={order.id} className="border-l-4 border-l-velox-amber">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono font-bold text-sm">{order.protocol}</span>
                            {order.freight_type === "urgent" && <Badge className="bg-red-500 text-white text-[10px]">URGENTE</Badge>}
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="font-semibold text-sm">{order.client_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <MapPin className="w-3 h-3 inline mr-0.5" />
                            {order.origin?.city || "—"} → {destinations}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {vol} vol · {kg} kg · {val} declarado
                          </p>
                          {order.collection_date && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <Clock className="w-3 h-3 inline mr-0.5" />
                              Coleta desejada: {new Date(order.collection_date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button size="sm" className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-1 whitespace-nowrap" onClick={() => openSchedule(order)}>
                            <CheckCircle className="w-3.5 h-3.5" /> Confirmar e Programar
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-300 text-red-500 hover:bg-red-50 gap-1" onClick={() => rejectMutation.mutate(order)}>
                            <XCircle className="w-3.5 h-3.5" /> Recusar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: PROGRAMADO */}
        <TabsContent value="scheduled" className="mt-4">
          {scheduledOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="font-semibold text-lg">Nenhum pedido programado</p>
              <p className="text-sm text-muted-foreground">Confirme pedidos da aba "Aguardando" para programá-los.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {scheduledOrders.map(order => {
                const truck = trucks.find(t => t.id === order.scheduled_truck_id);
                return (
                  <Card key={order.id} className="border-l-4 border-l-indigo-400 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/pedidos/${order.id}`)}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-sm">{order.protocol}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="font-semibold text-sm">{order.client_name}</p>
                          {truck && <p className="text-xs text-muted-foreground mt-0.5"><Truck className="w-3 h-3 inline mr-0.5" />{truck.plate} — {truck.model}</p>}
                          {order.scheduled_date && <p className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-0.5" />{new Date(order.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">{order.freight_value ? `R$ ${Number(order.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</p>
                          <p className="text-xs text-muted-foreground">{order.total_weight_kg ? `${Number(order.total_weight_kg).toLocaleString("pt-BR")} kg` : ""}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 3: VIAGENS ATIVAS */}
        <TabsContent value="active" className="mt-4">
          {activeTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="font-semibold text-lg">Nenhuma viagem ativa</p>
              <p className="text-sm text-muted-foreground">Quando uma viagem for iniciada, ela aparecerá aqui.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activeTrips.map(trip => {
                const completed = (trip.stops || []).filter(s => s.status === "completed").length;
                const total = (trip.stops || []).length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <Card key={trip.id} className="border-l-4 border-l-green-400 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/viagens/${trip.id}`)}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Truck className="w-4 h-4 text-velox-amber" />
                            <span className="font-semibold text-sm">{trip.truck_plate || "—"}</span>
                            <StatusBadge status={trip.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">{trip.driver_name}</p>
                          <p className="text-xs text-muted-foreground">{trip.order_ids?.length || 0} pedidos</p>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-sm font-bold">{completed}/{total} paradas</p>
                          <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{pct}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet de programação */}
      <Sheet open={!!scheduleOrder} onOpenChange={open => !open && setScheduleOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {scheduleOrder && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>Programar Coleta — {scheduleOrder.protocol}</SheetTitle>
              </SheetHeader>

              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg text-sm">
                  <p className="font-semibold">{scheduleOrder.client_name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {scheduleOrder.total_weight_kg ? `${Number(scheduleOrder.total_weight_kg).toLocaleString("pt-BR")} kg` : ""} · {scheduleOrder.total_volumes || "?"} vol
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Data de coleta</label>
                  <Input type="date" value={scheduleForm.date} onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Carreta</label>
                  <Select value={scheduleForm.truck_id} onValueChange={v => setScheduleForm(f => ({ ...f, truck_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar carreta..." /></SelectTrigger>
                    <SelectContent>
                      {suggestions.map(s => (
                        <SelectItem key={s.truck.id} value={s.truck.id}>
                          {s.truck.plate} — {s.truck.model} ({s.usagePercent.toFixed(0)}% cheio)
                        </SelectItem>
                      ))}
                      {trucks.filter(t => !suggestions.find(s => s.truck.id === t.id)).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedSuggestion && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-0.5">
                      <p>⚡ {selectedSuggestion.truck.plate} tem {selectedSuggestion.availableKg.toLocaleString("pt-BR")} kg livres.</p>
                      <p>Esta carga usa {(scheduleOrder.total_weight_kg || 0).toLocaleString("pt-BR")} kg ({selectedSuggestion.usagePercent.toFixed(0)}% da cap.).</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Valor do frete (R$)</label>
                  <NumericInput currency value={scheduleForm.freight_value} onChange={v => setScheduleForm(f => ({ ...f, freight_value: v }))} placeholder="ex: 1.114,50" />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Forma de pagamento</label>
                  <Select value={scheduleForm.payment_method} onValueChange={v => setScheduleForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setScheduleOrder(null)}>Cancelar</Button>
                  <Button
                    className="flex-1 bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold"
                    disabled={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate({ order: scheduleOrder, form: scheduleForm })}
                  >
                    {confirmMutation.isPending ? "Confirmando..." : "Confirmar Programação"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
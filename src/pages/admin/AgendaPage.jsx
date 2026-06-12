import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumericInput } from "@/components/shared/NumericInput";
import { calculateFreight } from "@/utils/freightCalculator";
import { SmartScheduleModal } from "@/components/schedule/SmartScheduleModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  Plus, Clock, Calendar, Truck, Package, CheckCircle, XCircle,
  MapPin, ChevronLeft, ChevronRight, CheckCircle2
} from "lucide-react";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function AgendaPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useCompanySettings();
  const [tab, setTab] = useState("aguardando");
  const [scheduleOrder, setScheduleOrder] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ truck_id: "", date: "", freight_value: "", payment_method: "pix" });
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [smartDate, setSmartDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 300) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date") });

  const pendingOrders = orders.filter(o => o.status === "new");
  const confirmedOrders = orders.filter(o => ["confirmed", "collecting"].includes(o.status));
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
        status_history: [...(order.status_history || []), { status: "confirmed", timestamp: new Date().toISOString(), user: "Admin", note: "Confirmado via Programação" }],
      });
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
      status_history: [...(order.status_history || []), { status: "cancelled", timestamp: new Date().toISOString(), user: "Admin", note: "Recusado" }],
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Programação</h1>
          <p className="text-muted-foreground text-sm mt-1">Confirme coletas, programe rotas e acompanhe viagens</p>
        </div>
        <Button onClick={() => navigate("/admin/coletas/nova")} className="bg-velox-amber text-velox-dark font-bold gap-2 hover:bg-velox-amber/90">
          <Plus className="w-4 h-4" /> Nova Coleta
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="aguardando" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Clock className="w-3.5 h-3.5" />
            Aguardando
            {pendingOrders.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="programado" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Calendar className="w-3.5 h-3.5" /> Programado
          </TabsTrigger>
          <TabsTrigger value="em-rota" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Truck className="w-3.5 h-3.5" /> Em Rota
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: AGUARDANDO */}
        <TabsContent value="aguardando" className="mt-4">
          {/* Programação automática */}
          {pendingOrders.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Input type="date" value={smartDate} onChange={e => setSmartDate(e.target.value)} className="w-40 h-8 text-sm" />
              <Button size="sm" variant="outline" onClick={() => setShowSmartModal(true)} className="gap-1.5 text-xs">
                ⚡ Programar automaticamente
              </Button>
            </div>
          )}
          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Tudo confirmado</h3>
              <p className="text-sm text-muted-foreground">Não há coletas aguardando confirmação no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map(order => {
                const kg = order.total_weight_kg || 0;
                const destinations = (order.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "Destino a definir";
                return (
                  <div key={order.id} className="bg-background border border-border rounded-2xl p-4 hover:border-velox-amber/40 transition-all hover:shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{order.protocol}</span>
                          {order.freight_type === "urgent" && (
                            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full uppercase">Urgente</span>
                          )}
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="font-semibold text-sm truncate">{order.client_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3 inline mr-0.5" />
                          {order.origin?.city || "—"} → {destinations}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {order.total_volumes || "?"} vol · {kg.toLocaleString("pt-BR")} kg
                          </span>
                          {order.collection_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(order.collection_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm"
                          className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs"
                          onClick={() => rejectMutation.mutate(order)}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Recusar
                        </Button>
                        <Button size="sm"
                          className="bg-velox-amber text-velox-dark font-bold hover:bg-velox-amber/90 text-xs"
                          onClick={() => openSchedule(order)}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirmar →
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: PROGRAMADO — calendário semanal */}
        <TabsContent value="programado" className="mt-4">
          <WeekCalendar orders={confirmedOrders} trucks={trucks} />
        </TabsContent>

        {/* ABA 3: EM ROTA */}
        <TabsContent value="em-rota" className="mt-4">
          {activeTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/30 mb-3" />
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

      {/* Modal de programação automática */}
      {showSmartModal && (
        <Dialog open onOpenChange={() => setShowSmartModal(false)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <SmartScheduleModal
              orders={pendingOrders}
              trucks={trucks}
              existingOrders={orders}
              targetDate={smartDate}
              onClose={() => setShowSmartModal(false)}
              onConfirm={async (plan) => {
                for (const slot of plan) {
                  for (const order of slot.orders) {
                    const est = calculateFreight(order.total_weight_kg, null, settings);
                    await base44.entities.Order.update(order.id, {
                      status: "confirmed",
                      scheduled_truck_id: slot.truck.id,
                      scheduled_date: smartDate,
                      freight_value: est || 0,
                      status_history: [...(order.status_history || []), {
                        status: "confirmed",
                        timestamp: new Date().toISOString(),
                        user: "Sistema",
                        note: "Programado automaticamente pelo sistema",
                      }],
                    });
                    if (est > 0) {
                      await base44.entities.Revenue.create({
                        order_id: order.id,
                        description: `Frete ${order.protocol} — ${order.client_name}`,
                        amount: est,
                        due_date: smartDate,
                        status: "receivable",
                        payment_method: order.payment_method || "pix",
                      });
                    }
                  }
                }
                queryClient.invalidateQueries({ queryKey: ["orders"] });
                toast({ title: `${plan.reduce((s, p) => s + p.orders.length, 0)} pedidos programados!` });
                setShowSmartModal(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Sheet de programação */}
      <Sheet open={!!scheduleOrder} onOpenChange={open => !open && setScheduleOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {scheduleOrder && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle>Confirmar Coleta — {scheduleOrder.protocol}</SheetTitle>
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
                    {confirmMutation.isPending ? "Confirmando..." : "Confirmar"}
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

function WeekCalendar({ orders, trucks }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  if (trucks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Truck className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p>Nenhuma carreta cadastrada. <Link to="/admin/frota" className="text-velox-amber hover:underline">Cadastrar →</Link></p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">
          {format(weekStart, "dd/MM", { locale: ptBR })} a {format(addDays(weekStart, 4), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)} className="text-xs text-velox-amber hover:underline ml-2">
            Esta semana
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground p-3 w-32 border-b border-border">Carreta</th>
              {days.map((day, i) => (
                <th key={i} className={`text-center text-xs font-medium p-3 border-b border-border min-w-[120px] ${isToday(day) ? "bg-velox-amber/10 text-velox-amber" : "text-muted-foreground"}`}>
                  <div>{format(day, "EEE", { locale: ptBR })}</div>
                  <div className={`text-base font-bold font-mono ${isToday(day) ? "text-velox-amber" : "text-foreground"}`}>{format(day, "d")}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trucks.map(truck => (
              <tr key={truck.id} className="border-b border-border/40">
                <td className="p-3 text-xs">
                  <p className="font-mono font-semibold text-sm">{truck.plate}</p>
                  <p className="text-muted-foreground">{truck.model}</p>
                  <p className="text-muted-foreground">{(truck.capacity_kg || 0).toLocaleString("pt-BR")} kg</p>
                </td>
                {days.map((day, di) => {
                  const dayStr = day.toISOString().split("T")[0];
                  const dayOrders = orders.filter(o => o.scheduled_truck_id === truck.id && o.scheduled_date === dayStr);
                  const usedKg = dayOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
                  const pct = truck.capacity_kg > 0 ? (usedKg / truck.capacity_kg) * 100 : 0;
                  return (
                    <td key={di} className={`p-2 align-top ${isToday(day) ? "bg-velox-amber/5" : ""}`}>
                      {dayOrders.length === 0 ? (
                        <div className="text-xs text-muted-foreground/40 py-2 text-center">livre</div>
                      ) : (
                        <div className="space-y-1">
                          {dayOrders.map(o => (
                            <Link key={o.id} to={`/admin/coletas/${o.id}`}
                              className="block bg-velox-amber/10 border border-velox-amber/20 rounded-lg p-1.5 hover:bg-velox-amber/20 transition-colors">
                              <p className="font-mono text-[10px] text-muted-foreground">{o.protocol}</p>
                              <p className="text-xs font-medium truncate">{o.client_name}</p>
                              <p className="text-[10px] text-muted-foreground">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</p>
                            </Link>
                          ))}
                          <div className="mt-1.5 space-y-0.5">
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center">
                              {usedKg.toLocaleString("pt-BR")} / {(truck.capacity_kg || 0).toLocaleString("pt-BR")} kg
                            </p>
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
    </div>
  );
}
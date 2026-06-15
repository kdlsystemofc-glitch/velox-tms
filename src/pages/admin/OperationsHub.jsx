import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/admin/StatusBadge";
import { useAuth } from "@/lib/AuthContext";
import { todayLocalISO } from "@/utils/dateUtils";
import {
  Package, Truck, CheckCircle2, AlertCircle, ArrowRight, Plus,
  Clock, MapPin, DollarSign, CalendarDays, Inbox
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * PAINEL DE OPERAÇÕES — torre de controle.
 * Padrão de grandes TMS: gestão por exceção.
 * 1. Fila de ação (o que precisa de decisão AGORA)
 * 2. Pipeline do dia (onde cada pedido está)
 * 3. Operação de hoje (coletas/entregas em ordem)
 * 4. Frota agora (cada caminhão e sua viagem)
 */
export default function OperationsHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const todayStr = todayLocalISO();

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 300) });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 50) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: () => base44.entities.Alert.list("-created_date", 100), select: d => d.filter(a => !a.resolved) });
  const { data: revenues = [] } = useQuery({ queryKey: ["revenues"], queryFn: () => base44.entities.Revenue.list("-due_date", 100), enabled: isAdmin });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 100), enabled: isAdmin });

  useEffect(() => {
    base44.functions.invoke("syncAlerts", {}).then(() => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    }).catch(() => {});
  }, []);

  // ── Pipeline ────────────────────────────────────────────────
  const active = orders.filter(o => o.status !== "cancelled");
  const pipeline = [
    { key: "new",        label: "Novos",       count: active.filter(o => o.status === "new").length,        to: "/admin/coletas?status=new",        color: "text-blue-600 bg-blue-50 border-blue-200" },
    { key: "confirmed",  label: "Confirmados", count: active.filter(o => o.status === "confirmed").length,  to: "/admin/coletas?status=confirmed",  color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { key: "collecting", label: "Em coleta",   count: active.filter(o => o.status === "collecting").length, to: "/admin/coletas?status=collecting", color: "text-amber-600 bg-amber-50 border-amber-200" },
    { key: "in_transit", label: "Em trânsito", count: active.filter(o => o.status === "in_transit").length, to: "/admin/coletas?status=in_transit", color: "text-purple-600 bg-purple-50 border-purple-200" },
    { key: "delivered",  label: "Entregues",   count: active.filter(o => o.status === "delivered").length,  to: "/admin/coletas?status=delivered",  color: "text-green-600 bg-green-50 border-green-200" },
  ];

  // ── Fila de ação (exceções) ─────────────────────────────────
  const newOrders = active.filter(o => o.status === "new");
  const confirmedUnassigned = active.filter(o => o.status === "confirmed" && !o.trip_id);
  const criticalAlerts = alerts.filter(a => a.level === "critical");
  const overdueRevenues = isAdmin ? revenues.filter(r => r.status === "overdue" || (r.status === "receivable" && r.due_date && r.due_date < todayStr)) : [];

  const actionQueue = [
    newOrders.length > 0 && {
      icon: Inbox, color: "border-blue-300 bg-blue-50",
      iconColor: "text-blue-600",
      title: `${newOrders.length} pedido${newOrders.length > 1 ? "s" : ""} aguardando confirmação`,
      desc: "Confirme ou recuse na fila de pedidos",
      action: { label: "Revisar", to: "/admin/coletas?status=new" },
    },
    confirmedUnassigned.length > 0 && {
      icon: CalendarDays, color: "border-indigo-300 bg-indigo-50",
      iconColor: "text-indigo-600",
      title: `${confirmedUnassigned.length} pedido${confirmedUnassigned.length > 1 ? "s" : ""} confirmado${confirmedUnassigned.length > 1 ? "s" : ""} sem viagem`,
      desc: "Programe no quadro de despacho",
      action: { label: "Despachar", to: "/admin/despacho" },
    },
    criticalAlerts.length > 0 && {
      icon: AlertCircle, color: "border-red-300 bg-red-50",
      iconColor: "text-red-600",
      title: `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} crítico${criticalAlerts.length > 1 ? "s" : ""}`,
      desc: criticalAlerts[0]?.message || "Documentos ou manutenção",
      action: { label: "Ver alertas", to: "/admin/config" },
    },
    isAdmin && overdueRevenues.length > 0 && {
      icon: DollarSign, color: "border-amber-300 bg-amber-50",
      iconColor: "text-amber-600",
      title: `${overdueRevenues.length} recebimento${overdueRevenues.length > 1 ? "s" : ""} em atraso`,
      desc: `R$ ${overdueRevenues.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} vencidos`,
      action: { label: "Cobrar", to: "/admin/financeiro?aba=receitas" },
    },
  ].filter(Boolean);

  // ── Operação de hoje ────────────────────────────────────────
  const periodOrder = { morning: 0, afternoon: 1, to_arrange: 2 };
  const periodLabel = { morning: "Manhã", afternoon: "Tarde", to_arrange: "A combinar" };
  const todayOps = active
    .filter(o => (o.collection_date === todayStr || o.scheduled_date === todayStr) && !["delivered", "cancelled"].includes(o.status))
    .sort((a, b) => (periodOrder[a.collection_time] ?? 2) - (periodOrder[b.collection_time] ?? 2));

  // ── Frota agora ─────────────────────────────────────────────
  const activeTrips = trips.filter(t => t.status === "in_progress");
  const fleetNow = trucks.filter(t => t.status !== "inactive").map(truck => {
    const trip = activeTrips.find(t => t.truck_id === truck.id);
    const completed = trip ? (trip.stops || []).filter(s => s.status === "completed").length : 0;
    const total = trip ? (trip.stops || []).length : 0;
    const nextStop = trip ? (trip.stops || []).find(s => s.status !== "completed") : null;
    return { truck, trip, completed, total, nextStop };
  });

  // ── Financeiro do dia (admin) ───────────────────────────────
  const toReceive = isAdmin ? revenues.filter(r => r.status === "receivable").reduce((s, r) => s + (r.amount || 0), 0) : 0;
  const toPay = isAdmin ? expenses.filter(e => e.status === "pending").reduce((s, e) => s + (e.amount || 0), 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">Painel de Operações</h1>
          <p className="text-muted-foreground text-sm capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/despacho")}>
            <CalendarDays className="w-4 h-4" /> Despacho
          </Button>
          <Button className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2" onClick={() => navigate("/admin/coletas/nova")}>
            <Plus className="w-4 h-4" /> Novo Pedido
          </Button>
        </div>
      </div>

      {/* Fila de ação */}
      {actionQueue.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {actionQueue.map((item, i) => (
            <Link key={i} to={item.action.to}
              className={`rounded-xl border-2 p-4 flex flex-col gap-1 transition-all hover:shadow-md ${item.color}`}>
              <div className="flex items-center justify-between">
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                <span className={`text-xs font-bold flex items-center gap-1 ${item.iconColor}`}>
                  {item.action.label} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-1 leading-snug">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">Nenhuma pendência. Operação em dia.</p>
        </div>
      )}

      {/* Pipeline */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {pipeline.map((stage, i) => (
              <React.Fragment key={stage.key}>
                <Link to={stage.to}
                  className={`flex-1 min-w-[110px] rounded-lg border px-3 py-2.5 text-center transition-all hover:shadow-sm ${stage.color}`}>
                  <p className="text-2xl font-bold font-mono leading-none">{stage.count}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mt-1">{stage.label}</p>
                </Link>
                {i < pipeline.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operação de hoje */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-velox-amber" /> Operação de hoje
                <span className="text-muted-foreground font-normal">({todayOps.length})</span>
              </h2>
              <Link to="/admin/despacho" className="text-xs text-velox-amber hover:underline">Quadro completo →</Link>
            </div>
            {todayOps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma coleta programada para hoje.</p>
            ) : (
              <div className="space-y-2">
                {todayOps.slice(0, 8).map(o => (
                  <Link key={o.id} to={`/admin/coletas/${o.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-velox-amber/40 hover:bg-muted/20 transition-colors">
                    <span className="text-[11px] font-bold bg-velox-amber/10 text-velox-amber px-2 py-1 rounded w-20 text-center flex-shrink-0">
                      {periodLabel[o.collection_time] || "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.client_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.origin?.city || "—"} → {(o.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frota agora */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-velox-amber" /> Frota agora
              </h2>
              <Link to="/admin/frota" className="text-xs text-velox-amber hover:underline">Gerenciar →</Link>
            </div>
            {fleetNow.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum caminhão cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {fleetNow.map(({ truck, trip, completed, total, nextStop }) => (
                  <div key={truck.id}
                    className="p-2.5 rounded-lg border border-border flex items-center gap-3 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => trip ? navigate(`/admin/viagens/${trip.id}`) : navigate(`/admin/frota/${truck.id}`)}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      trip ? "bg-green-500 animate-pulse" :
                      truck.status === "available" ? "bg-blue-400" :
                      truck.status === "maintenance" ? "bg-amber-400" : "bg-gray-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{truck.plate}</span>
                        <span className="text-xs text-muted-foreground">{truck.model}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {trip
                          ? <>Em rota — {completed}/{total} paradas{nextStop && <> · próx.: {nextStop.recipient_name || nextStop.city || "—"}</>}</>
                          : truck.status === "available" ? "Disponível para despacho"
                          : truck.status === "maintenance" ? "Em manutenção" : "Indisponível"}
                      </p>
                    </div>
                    {trip && (
                      <div className="w-16 flex-shrink-0">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500" style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financeiro resumido (admin) */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <Link to="/admin/financeiro?aba=receitas"
            className="rounded-xl border border-border p-4 flex items-center justify-between hover:border-green-300 hover:shadow-sm transition-all">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">A receber</p>
              <p className="text-xl font-bold font-mono text-green-600">R$ {toReceive.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="w-6 h-6 text-green-300" />
          </Link>
          <Link to="/admin/financeiro?aba=despesas"
            className="rounded-xl border border-border p-4 flex items-center justify-between hover:border-red-300 hover:shadow-sm transition-all">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">A pagar</p>
              <p className="text-xl font-bold font-mono text-red-600">R$ {toPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="w-6 h-6 text-red-300" />
          </Link>
        </div>
      )}
    </div>
  );
}

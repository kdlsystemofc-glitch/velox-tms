import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";

const TONE_FROM_COLOR = {
  "text-blue-600 dark:text-blue-300": "primary", "text-green-600 dark:text-green-300": "success", "text-indigo-600 dark:text-indigo-300": "primary",
  "text-amber-600 dark:text-amber-300": "warning", "text-violet-600 dark:text-violet-300": "primary", "text-red-600 dark:text-red-300": "danger",
  "text-muted-foreground": "muted",
};
import { useAuth } from "@/lib/AuthContext";
import { todayLocalISO, formatDateTimeBR } from "@/utils/dateUtils";
import { trucksNeedingReplan, driversNeedingReplan } from "@/utils/replanner";
import { incidentSeverity } from "@/utils/incidents";
import { slaStatus } from "@/utils/sla";
import { findStaleOrders, DEFAULT_STALE_DAYS } from "@/utils/staleOrders";
import { orderVolumeM3, truckVolumeM3, fmtM3 } from "@/utils/cargoVolume";
import { incidentTypeLabel } from "@/utils/incidents";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  Package, Truck, CheckCircle2, AlertCircle, ArrowRight, Plus,
  Clock, MapPin, DollarSign, CalendarDays, Inbox, Wrench, UserX,
  TrendingUp, Percent, ShieldAlert, Activity
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
  const { settings } = useCompanySettings();
  const [period, setPeriod] = useState("today"); // today | tomorrow | week

  // Torre "ao vivo": auto-atualiza com a tela aberta (TMS deixa o painel num telão).
  const LIVE = 45000;
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 400), refetchInterval: LIVE });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 80), refetchInterval: LIVE });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list(), refetchInterval: LIVE });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: () => base44.entities.Alert.list("-created_date", 100), select: d => d.filter(a => !a.resolved), refetchInterval: LIVE });
  const { data: revenues = [] } = useQuery({ queryKey: ["revenues"], queryFn: () => base44.entities.Revenue.list("-due_date", 100), enabled: isAdmin });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 100), enabled: isAdmin });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-all"], queryFn: () => base44.entities.Incident.list("-created_date", 300), select: d => d.filter(i => i.status !== "resolved"), refetchInterval: LIVE });

  useEffect(() => {
    base44.functions.invoke("syncAlerts", {}).then(() => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    }).catch(() => {});
  }, []);

  // ── Pipeline ────────────────────────────────────────────────
  const active = orders.filter(o => o.status !== "cancelled");
  const awaitingApproval = active.filter(o => o.status === "awaiting_approval");
  const pipeline = [
    ...(awaitingApproval.length ? [{ key: "awaiting_approval", label: "Aprovação", count: awaitingApproval.length, to: "/admin/coletas?status=awaiting_approval", color: "text-fuchsia-600 dark:text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30" }] : []),
    { key: "new",        label: "Novos",       count: active.filter(o => o.status === "new").length,        to: "/admin/coletas?status=new",        color: "text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/30" },
    { key: "confirmed",  label: "Confirmados", count: active.filter(o => o.status === "confirmed").length,  to: "/admin/coletas?status=confirmed",  color: "text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30" },
    { key: "collecting", label: "Em coleta",   count: active.filter(o => o.status === "collecting").length, to: "/admin/coletas?status=collecting", color: "text-amber-600 dark:text-amber-300 bg-amber-500/10 border-amber-500/30" },
    { key: "in_transit", label: "Em trânsito", count: active.filter(o => o.status === "in_transit").length, to: "/admin/coletas?status=in_transit", color: "text-purple-600 dark:text-purple-300 bg-purple-500/10 border-purple-500/30" },
    ...(active.some(o => o.status === "in_transfer") ? [{ key: "in_transfer", label: "Em transferência", count: active.filter(o => o.status === "in_transfer").length, to: "/admin/transferencias", color: "text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 border-cyan-500/30" }] : []),
    { key: "delivered",  label: "Entregues",   count: active.filter(o => o.status === "delivered").length,  to: "/admin/coletas?status=delivered",  color: "text-green-600 dark:text-green-300 bg-green-500/10 border-green-500/30" },
  ];

  // ── Fila de ação (exceções) ─────────────────────────────────
  const newOrders = active.filter(o => o.status === "new");
  const confirmedUnassigned = active.filter(o => o.status === "confirmed" && !o.trip_id);
  const criticalAlerts = alerts.filter(a => a.level === "critical");
  const overdueRevenues = isAdmin ? revenues.filter(r => r.status === "overdue" || (r.status === "receivable" && r.due_date && r.due_date < todayStr)) : [];

  // Replanejamento (S1/S2): caminhões indisponíveis com carga e motoristas ausentes com viagem.
  const truckReplan = trucksNeedingReplan(trucks, orders, trips);
  const driverReplan = driversNeedingReplan(drivers, trips);

  const criticalIncidents = incidents.filter(i => ["critical", "high"].includes(incidentSeverity(i)));

  // Pedidos parados (item 42 / L-004): criados há mais de N dias e ainda sem
  // programação. Limite configurável em Configurações (padrão 3 dias).
  // Atenção: NÃO usar `|| DEFAULT` aqui — 0 é um valor válido (alertar na hora)
  // e `0 || 3` viraria 3. Só cai no padrão quando é nulo/indefinido/negativo.
  const staleCfg = Number(settings?.stale_order_days);
  const staleDays = Number.isFinite(staleCfg) && staleCfg >= 0 ? staleCfg : DEFAULT_STALE_DAYS;
  const staleList = findStaleOrders(orders, staleDays);

  const actionQueue = [
    awaitingApproval.length > 0 && {
      icon: ShieldAlert, color: "border-fuchsia-300 bg-fuchsia-500/10",
      iconColor: "text-fuchsia-600 dark:text-fuchsia-300",
      title: `${awaitingApproval.length} pedido${awaitingApproval.length > 1 ? "s" : ""} aguardando aprovação`,
      desc: "Aprove ou recuse para liberar à operação",
      action: { label: "Aprovar", to: "/admin/coletas?status=awaiting_approval" },
    },
    staleList.length > 0 && {
      icon: Clock, color: "border-rose-300 bg-rose-500/10",
      iconColor: "text-rose-600 dark:text-rose-300",
      title: `${staleList.length} pedido${staleList.length > 1 ? "s" : ""} parado${staleList.length > 1 ? "s" : ""} há +${staleDays} dias`,
      desc: `Mais antigo: ${staleList[0]?.protocol || "—"} (${staleList[0]?.client_name || "—"}) há ${staleList[0]?.stale_days} dias sem programação`,
      action: { label: "Resolver", to: "/admin/coletas?status=new" },
    },
    criticalIncidents.length > 0 && {
      icon: AlertCircle, color: "border-red-300 bg-red-500/10",
      iconColor: "text-red-600 dark:text-red-300",
      title: `${criticalIncidents.length} ocorrência(s) grave(s) em aberto`,
      desc: "Roubo, acidente, avaria ou recusa — trate agora",
      action: { label: "Tratar", to: "/admin/ocorrencias" },
    },
    truckReplan.length > 0 && {
      icon: Wrench, color: "border-amber-300 bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-300",
      title: `${truckReplan.length} caminhão(ões) indisponível(eis) com carga programada`,
      desc: "Redistribua os pedidos/viagens afetados",
      action: { label: "Replanejar", to: "/admin/replanejamento" },
    },
    driverReplan.length > 0 && {
      icon: UserX, color: "border-orange-300 bg-orange-500/10",
      iconColor: "text-orange-600 dark:text-orange-300",
      title: `${driverReplan.reduce((s, d) => s + d.trips.length, 0)} viagem(ns) sem motorista hoje`,
      desc: "Reatribua a um motorista disponível",
      action: { label: "Reatribuir", to: "/admin/replanejamento" },
    },
    newOrders.length > 0 && {
      icon: Inbox, color: "border-blue-300 bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-300",
      title: `${newOrders.length} pedido${newOrders.length > 1 ? "s" : ""} aguardando confirmação`,
      desc: "Confirme ou recuse na fila de pedidos",
      action: { label: "Revisar", to: "/admin/coletas?status=new" },
    },
    confirmedUnassigned.length > 0 && {
      icon: CalendarDays, color: "border-indigo-300 bg-indigo-500/10",
      iconColor: "text-indigo-600 dark:text-indigo-300",
      title: `${confirmedUnassigned.length} pedido${confirmedUnassigned.length > 1 ? "s" : ""} confirmado${confirmedUnassigned.length > 1 ? "s" : ""} sem viagem`,
      desc: "Programe no quadro de despacho",
      action: { label: "Despachar", to: "/admin/despacho" },
    },
    criticalAlerts.length > 0 && {
      icon: AlertCircle, color: "border-red-300 bg-red-500/10",
      iconColor: "text-red-600 dark:text-red-300",
      title: `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} crítico${criticalAlerts.length > 1 ? "s" : ""}`,
      desc: criticalAlerts[0]?.message || "Documentos ou manutenção",
      action: { label: "Ver alertas", to: "/admin/alertas" },
    },
    isAdmin && overdueRevenues.length > 0 && {
      icon: DollarSign, color: "border-amber-300 bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-300",
      title: `${overdueRevenues.length} recebimento${overdueRevenues.length > 1 ? "s" : ""} em atraso`,
      desc: `R$ ${overdueRevenues.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} vencidos`,
      action: { label: "Cobrar", to: "/admin/financeiro?aba=receitas" },
    },
  ].filter(Boolean);

  // ── Operação por período (Hoje / Amanhã / Semana) ───────────
  const periodOrder = { morning: 0, afternoon: 1, to_arrange: 2 };
  const periodLabel = { morning: "Manhã", afternoon: "Tarde", to_arrange: "A combinar" };
  const addDaysISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const periodRange = period === "today" ? [todayStr]
    : period === "tomorrow" ? [addDaysISO(1)]
    : Array.from({ length: 7 }, (_, i) => addDaysISO(i)); // semana
  const inPeriod = (o) => periodRange.includes(o.collection_date) || periodRange.includes(o.scheduled_date);
  const todayOps = active
    .filter(o => inPeriod(o) && !["delivered", "cancelled"].includes(o.status))
    .sort((a, b) => ((a.scheduled_date || a.collection_date) || "").localeCompare((b.scheduled_date || b.collection_date) || "")
      || (periodOrder[a.collection_time] ?? 2) - (periodOrder[b.collection_time] ?? 2));
  const periodTitle = period === "today" ? "Operação de hoje" : period === "tomorrow" ? "Operação de amanhã" : "Operação da semana";

  // ── Frota agora (ciente de comboio — Onda 7) ────────────────
  const activeTrips = trips.filter(t => t.status === "in_progress");
  const truckTripMap = {};
  activeTrips.forEach(t => {
    const ids = (t.vehicles && t.vehicles.length) ? t.vehicles.map(v => v.truck_id) : [t.truck_id];
    ids.filter(Boolean).forEach(id => { if (!truckTripMap[id]) truckTripMap[id] = t; });
  });
  const fleetNow = trucks.filter(t => t.status !== "inactive").map(truck => {
    const trip = truckTripMap[truck.id];
    const completed = trip ? (trip.stops || []).filter(s => s.status === "completed").length : 0;
    const total = trip ? (trip.stops || []).length : 0;
    const nextStop = trip ? (trip.stops || []).find(s => s.status !== "completed") : null;
    return { truck, trip, completed, total, nextStop };
  });

  // ── Financeiro do dia (admin) ───────────────────────────────
  const toReceive = isAdmin ? revenues.filter(r => r.status === "receivable" || r.status === "overdue").reduce((s, r) => s + (r.amount || 0), 0) : 0;
  const toPay = isAdmin ? expenses.filter(e => e.status === "pending").reduce((s, e) => s + (e.amount || 0), 0) : 0;

  // ── Métricas de comando (faixa superior) ────────────────────
  const activeTrucks = trucks.filter(t => t.status !== "inactive");
  const trucksAvailable = trucks.filter(t => t.status === "available").length;
  const trucksOnRoute = Object.keys(truckTripMap).length;
  const collectingToday = active.filter(o => o.status === "collecting" && (o.collection_date === todayStr || o.scheduled_date === todayStr)).length;
  const deliveredTodayList = orders.filter(o => o.status === "delivered" && (o.status_history || []).some(h => h.status === "delivered" && (h.timestamp || "").slice(0, 10) === todayStr));
  const deliveredToday = deliveredTodayList.length;

  // SLA: atrasados/em risco entre os pedidos em andamento + OTD de hoje
  const inFlight = active.filter(o => ["confirmed", "collecting", "in_transit", "awaiting_cargo", "partially_delivered"].includes(o.status));
  const lateOrders = inFlight.filter(o => slaStatus(o, settings) === "late").length;
  const atRiskOrders = inFlight.filter(o => slaStatus(o, settings) === "at_risk").length;
  const onTimeToday = deliveredTodayList.filter(o => slaStatus(o, settings) === "on_time").length;
  const otdToday = deliveredToday > 0 ? Math.round((onTimeToday / deliveredToday) * 100) : null;

  // Ocupação da frota hoje: peso programado/em rota ÷ capacidade total ativa
  const todaysLoadKg = active
    .filter(o => ["collecting", "in_transit"].includes(o.status) || o.scheduled_date === todayStr)
    .reduce((s, o) => s + (o.total_weight_kg || 0), 0);
  const totalCapacityKg = activeTrucks.reduce((s, t) => s + (t.capacity_kg || 0), 0);
  const occupancy = totalCapacityKg > 0 ? Math.round((todaysLoadKg / totalCapacityKg) * 100) : 0;

  const metrics = [
    { label: "Frota disponível", value: `${trucksAvailable}/${activeTrucks.length}`, icon: Truck, color: "text-blue-600 dark:text-blue-300" },
    { label: "Em rota agora", value: trucksOnRoute, icon: MapPin, color: "text-green-600 dark:text-green-300" },
    { label: "Ocupação da frota", value: `${occupancy}%`, icon: Percent, color: "text-indigo-600 dark:text-indigo-300" },
    { label: "Coletas hoje", value: collectingToday, icon: Clock, color: "text-amber-600 dark:text-amber-300" },
    { label: "Entregas hoje", value: deliveredToday, icon: CheckCircle2, color: "text-violet-600 dark:text-violet-300" },
    { label: "No prazo (hoje)", value: otdToday != null ? `${otdToday}%` : "—", icon: TrendingUp, color: otdToday != null && otdToday < 90 ? "text-amber-600 dark:text-amber-300" : "text-green-600 dark:text-green-300" },
    { label: "Atrasados / em risco", value: `${lateOrders}/${atRiskOrders}`, icon: ShieldAlert, color: lateOrders > 0 ? "text-red-600 dark:text-red-300" : "text-muted-foreground" },
    { label: "Ocorrências abertas", value: incidents.length, icon: Activity, color: incidents.length > 0 ? "text-orange-600 dark:text-orange-300" : "text-muted-foreground" },
  ];

  // ── Selo de SLA por pedido ──────────────────────────────────
  const slaBadge = (o) => {
    const st = slaStatus(o, settings);
    if (st === "late") return { label: "Atrasado", cls: "bg-red-500/15 text-red-700 dark:text-red-300" };
    if (st === "at_risk") return { label: "Risco", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
    return null;
  };

  // ── Painel de exceções (o que "some" do pipeline) ───────────
  const exceptionReason = (o) => {
    if (o.status === "awaiting_cargo") return "Aguardando carga";
    if (o.status === "partially_delivered") return "Entrega parcial";
    if (o.status === "in_transfer") return "Em transferência";
    if ((o.recipients || []).some(r => r.delivery_status === "failed")) return "Tentativa sem sucesso";
    if (["confirmed", "collecting", "in_transit"].includes(o.status) && slaStatus(o, settings) === "late") return "Prazo estourado";
    return null;
  };
  const exceptions = active.map(o => ({ o, reason: exceptionReason(o) })).filter(x => x.reason);

  // ── Capacidade do dia (peso e volume programados × frota) ───
  const todaysOrdersForCap = active.filter(o => ["collecting", "in_transit"].includes(o.status) || o.scheduled_date === todayStr);
  const todaysLoadVol = todaysOrdersForCap.reduce((s, o) => s + orderVolumeM3(o), 0);
  const totalCapVol = activeTrucks.reduce((s, t) => s + truckVolumeM3(t), 0);
  const occVol = totalCapVol > 0 ? Math.round((todaysLoadVol / totalCapVol) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-foreground">Painel de Operações</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 dark:text-green-300 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Ao vivo
            </span>
          </div>
          <p className="text-muted-foreground text-xs capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/admin/despacho")}>
            <CalendarDays className="w-4 h-4" /> Despacho
          </Button>
          <Button className="font-bold gap-2" onClick={() => navigate("/admin/coletas/nova")}>
            <Plus className="w-4 h-4" /> Novo Pedido
          </Button>
        </div>
      </div>

      {/* Faixa de métricas de comando */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <StatCard key={i} icon={m.icon} label={m.label} value={m.value} tone={TONE_FROM_COLOR[m.color] || "primary"} />
        ))}
      </div>

      {/* Fila de ação */}
      {actionQueue.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {actionQueue.map((item, i) => (
            <Link key={i} to={item.action.to}
              className={`card-interactive rounded-xl border-2 p-4 flex flex-col gap-1 ${item.color}`}>
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
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-300" />
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Nenhuma pendência. Operação em dia.</p>
        </div>
      )}

      {/* Pipeline */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {pipeline.map((stage, i) => (
              <React.Fragment key={stage.key}>
                <Link to={stage.to}
                  className={`card-interactive flex-1 min-w-[110px] rounded-lg border px-3 py-2.5 text-center ${stage.color}`}>
                  <p className="text-2xl font-bold font-mono leading-none">{stage.count}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wide mt-1">{stage.label}</p>
                </Link>
                {i < pipeline.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Exceções + Capacidade do dia */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Exceções operacionais */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-velox-amber" /> Exceções operacionais
                <span className="text-muted-foreground font-normal">({exceptions.length})</span>
              </h2>
              <Link to="/admin/ocorrencias" className="text-xs text-velox-amber hover:underline">Ocorrências →</Link>
            </div>
            {exceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Nenhuma exceção. Tudo dentro do fluxo normal.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {exceptions.slice(0, 12).map(({ o, reason }) => (
                  <Link key={o.id} to={`/admin/coletas/${o.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10/40 hover:border-velox-amber/50 transition-colors">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{o.client_name} <span className="font-mono text-xs text-muted-foreground">{o.protocol}</span></p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">{reason}</p>
                    </div>
                    <StatusBadge status={o.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Capacidade do dia */}
        <Card>
          <CardContent className="pt-5">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2 mb-4">
              <Percent className="w-4 h-4 text-velox-amber" /> Capacidade do dia
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Peso</span>
                  <span className="font-mono">{todaysLoadKg.toLocaleString("pt-BR")} / {totalCapacityKg.toLocaleString("pt-BR")} kg</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${occupancy > 95 ? "bg-red-500" : occupancy > 80 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(occupancy, 100)}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{occupancy}% da frota</p>
              </div>
              {totalCapVol > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Volume</span>
                    <span className="font-mono">{fmtM3(todaysLoadVol)} / {fmtM3(totalCapVol)}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${occVol > 95 ? "bg-red-500" : occVol > 80 ? "bg-amber-500" : "bg-blue-400"}`} style={{ width: `${Math.min(occVol, 100)}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{occVol}% do baú</p>
                </div>
              )}
              <Link to="/admin/despacho" className="block text-center text-xs text-velox-amber hover:underline pt-1">Abrir o despacho →</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operação de hoje */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-velox-amber" /> {periodTitle}
                <span className="text-muted-foreground font-normal">({todayOps.length})</span>
              </h2>
              <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5">
                {[["today", "Hoje"], ["tomorrow", "Amanhã"], ["week", "Semana"]].map(([k, l]) => (
                  <button key={k} onClick={() => setPeriod(k)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${period === k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {todayOps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nada programado para o período.</p>
            ) : (
              <div className="space-y-2">
                {todayOps.slice(0, 8).map(o => (
                  <Link key={o.id} to={`/admin/coletas/${o.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-velox-amber/40 hover:bg-muted/20 transition-colors">
                    <span className="text-[11px] font-bold bg-velox-amber/10 text-velox-amber px-2 py-1 rounded w-20 text-center flex-shrink-0">
                      {periodLabel[o.collection_time] || "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {o.client_name}
                        {period === "week" && (o.scheduled_date || o.collection_date) && (
                          <span className="ml-1.5 text-[10px] font-mono text-muted-foreground">{(o.scheduled_date || o.collection_date).slice(8, 10)}/{(o.scheduled_date || o.collection_date).slice(5, 7)}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {o.origin?.city || "—"} → {(o.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    {(() => { const b = slaBadge(o); return b ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.cls}`}>{b.label}</span> : null; })()}
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

      {/* Feed de alertas ao vivo */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-velox-amber" /> Alertas recentes
              <span className="text-muted-foreground font-normal">({alerts.length})</span>
            </h2>
            <Link to="/admin/alertas" className="text-xs text-velox-amber hover:underline">Ver todos →</Link>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Sem alertas ativos.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {alerts.slice(0, 6).map(a => {
                const to = a.reference_type === "driver" ? `/admin/motoristas/${a.reference_id}`
                  : a.reference_type === "truck" ? `/admin/frota/${a.reference_id}`
                  : a.reference_type === "order" ? `/admin/coletas/${a.reference_id}` : "/admin/alertas";
                return (
                  <Link key={a.id} to={to} className="flex items-start gap-2 p-2 rounded-lg border border-border hover:border-velox-amber/40 transition-colors">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${a.level === "critical" ? "bg-red-500" : a.level === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                    <div className="min-w-0">
                      <p className="text-xs leading-snug truncate">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTimeBR(a.created_date)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financeiro resumido (admin) */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <Link to="/admin/financeiro?aba=receitas"
            className="card-interactive rounded-xl border border-border p-4 flex items-center justify-between hover:border-green-300">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">A receber</p>
              <p className="text-xl font-bold font-mono text-green-600 dark:text-green-300">R$ {toReceive.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="w-6 h-6 text-green-300" />
          </Link>
          <Link to="/admin/financeiro?aba=despesas"
            className="card-interactive rounded-xl border border-border p-4 flex items-center justify-between hover:border-red-300">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">A pagar</p>
              <p className="text-xl font-bold font-mono text-red-600 dark:text-red-300">R$ {toPay.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <DollarSign className="w-6 h-6 text-red-300" />
          </Link>
        </div>
      )}
    </div>
  );
}

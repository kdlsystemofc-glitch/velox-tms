import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Package, Truck, CheckCircle2, Bell, AlertCircle, AlertTriangle, Info, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KPICard from "@/components/admin/KPICard";
import StatusBadge from "@/components/admin/StatusBadge";
import { useAuth } from "@/lib/AuthContext";
import { toLocalISO, todayLocalISO } from "@/utils/dateUtils";
import { format, addDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 200),
  });
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 50),
    enabled: isAdmin,
  });
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => base44.entities.Revenue.list("-due_date", 50),
    enabled: isAdmin,
  });
  const { data: savedAlerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.list("-created_date", 100),
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.functions.invoke("syncAlerts", {}).then(() => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    }).catch(() => {});
  }, []);

  const now = new Date();
  const todayStr = todayLocalISO();

  // KPIs linha 1
  const newOrders = orders.filter(o => o.status === "new");
  const collectingToday = orders.filter(o =>
    o.status === "collecting" && o.collection_date === todayStr
  );
  const deliveredToday = orders.filter(o => {
    if (o.status !== "delivered") return false;
    const last = o.status_history?.slice(-1)[0];
    return last && new Date(last.timestamp).toDateString() === now.toDateString();
  });
  const alerts = savedAlerts.filter(a => !a.resolved).map(a => ({
    ...a,
    link: a.reference_type === "driver" ? `/admin/motoristas/${a.reference_id}`
      : a.reference_type === "truck" ? `/admin/frota/${a.reference_id}`
      : a.reference_type === "order" ? `/admin/coletas/${a.reference_id}`
      : "#",
  }));

  // Programação da semana (7 dias a partir de hoje)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i);
    const dayStr = toLocalISO(d);
    const dayOrders = orders.filter(o => o.collection_date === dayStr && o.status !== "cancelled");
    const availableTrucks = trucks.filter(t => t.status === "available").length;
    const totalTrucks = trucks.filter(t => t.status !== "inactive").length;
    let color = "green";
    if (dayOrders.length >= totalTrucks && totalTrucks > 0) color = "red";
    else if (dayOrders.length >= totalTrucks * 0.7 && totalTrucks > 0) color = "amber";
    return { date: d, dayStr, count: dayOrders.length, availableTrucks, color };
  });

  // Últimos 6 pedidos
  const recentOrders = orders.slice(0, 6);

  // Linha do tempo do dia: coletas previstas para hoje, ordenadas por período
  const timePeriodOrder = { morning: 0, afternoon: 1, to_arrange: 2 };
  const todayOrders = orders
    .filter(o => o.collection_date === todayStr && o.status !== "cancelled" && o.status !== "delivered")
    .sort((a, b) => (timePeriodOrder[a.collection_time] ?? 2) - (timePeriodOrder[b.collection_time] ?? 2));
  const periodLabel = { morning: "Manhã", afternoon: "Tarde", to_arrange: "A combinar" };

  // KPIs financeiros (admin only)
  const pendingExpenses = isAdmin ? expenses.filter(e => e.status === "pending").reduce((s, e) => s + (e.amount || 0), 0) : 0;
  const pendingRevenues = isAdmin ? revenues.filter(r => r.status === "receivable").reduce((s, r) => s + (r.amount || 0), 0) : 0;

  // Alertas críticos max 4
  const criticalAlerts = alerts.filter(a => a.level === "critical").slice(0, 4);
  const allAlerts = alerts.slice(0, 4);

  // Banners de ação urgente
  const urgentBanners = [];
  if (newOrders.length > 0) {
    urgentBanners.push({
      id: "new_orders",
      level: "info",
      message: `${newOrders.length} coleta${newOrders.length > 1 ? "s" : ""} nova${newOrders.length > 1 ? "s" : ""} aguardando confirmação`,
      action: { label: "Ver coletas", to: "/admin/coletas" },
      color: "bg-blue-50 border-blue-200 text-blue-800",
      iconColor: "text-blue-500",
    });
  }
  const overdueRevenues = isAdmin ? revenues.filter(r => r.status === "overdue") : [];
  if (overdueRevenues.length > 0) {
    urgentBanners.push({
      id: "overdue_revenues",
      level: "critical",
      message: `${overdueRevenues.length} recebimento${overdueRevenues.length > 1 ? "s" : ""} em atraso`,
      action: { label: "Ver financeiro", to: "/admin/financeiro" },
      color: "bg-red-50 border-red-200 text-red-800",
      iconColor: "text-red-500",
    });
  }
  if (criticalAlerts.length > 0) {
    urgentBanners.push({
      id: "critical_alerts",
      level: "critical",
      message: `${criticalAlerts.length} alerta${criticalAlerts.length > 1 ? "s" : ""} crítico${criticalAlerts.length > 1 ? "s" : ""} na frota/documentos`,
      action: { label: "Ver alertas", to: "/admin/config" },
      color: "bg-amber-50 border-amber-200 text-amber-800",
      iconColor: "text-amber-500",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Início</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Banners de ação urgente */}
      {urgentBanners.length > 0 && (
        <div className="space-y-2">
          {urgentBanners.map(banner => (
            <div key={banner.id} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${banner.color}`}>
              <div className="flex items-center gap-2.5">
                {banner.level === "critical"
                  ? <AlertCircle className={`w-4 h-4 flex-shrink-0 ${banner.iconColor}`} />
                  : <Info className={`w-4 h-4 flex-shrink-0 ${banner.iconColor}`} />
                }
                <p className="text-sm font-medium">{banner.message}</p>
              </div>
              <Link to={banner.action.to} className="text-xs font-semibold underline underline-offset-2 flex-shrink-0 hover:opacity-80">
                {banner.action.label} →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Linha 1 — O que está acontecendo agora */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Pedidos Novos"
          value={newOrders.length}
          icon={Package}
          color="bg-blue-500"
          subtitle="Aguardando confirmação"
          to="/admin/agenda"
        />
        <KPICard
          title="Em Coleta Hoje"
          value={collectingToday.length}
          icon={Truck}
          color="bg-velox-amber"
          subtitle="Coletas agendadas para hoje"
          to="/admin/coletas?status=collecting"
        />
        <KPICard
          title="Entregues Hoje"
          value={deliveredToday.length}
          icon={CheckCircle2}
          color="bg-green-500"
          subtitle="Confirmadas hoje"
          to="/admin/coletas?status=delivered"
        />
        <KPICard
          title="Alertas Ativos"
          value={alerts.length}
          icon={Bell}
          color={alerts.length > 0 ? "bg-red-500" : "bg-gray-400"}
          subtitle={alerts.length > 0 ? `${criticalAlerts.length} crítico(s)` : "Tudo em ordem"}
          to="/admin/config"
        />
      </div>

      {/* Linha financeira — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <KPICard
            title="A Receber"
            value={`R$ ${pendingRevenues.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="bg-green-500"
            subtitle="Receitas pendentes"
            to="/admin/financeiro?aba=receitas"
          />
          <KPICard
            title="A Pagar"
            value={`R$ ${pendingExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="bg-red-500"
            subtitle="Despesas pendentes"
            to="/admin/financeiro?aba=despesas"
          />
        </div>
      )}

      {/* Linha do tempo do dia */}
      {todayOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-heading font-semibold">Coletas de hoje ({todayOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayOrders.map(o => (
                <Link key={o.id} to={`/admin/coletas/${o.id}`}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border hover:border-velox-amber/40 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-semibold bg-velox-amber/10 text-velox-amber px-2 py-1 rounded-md flex-shrink-0 w-20 text-center">
                      {periodLabel[o.collection_time] || "—"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.client_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="font-mono">{o.protocol}</span> · {o.origin?.city || "—"} → {(o.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linha 2 — Programação da semana */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-heading font-semibold">Programação desta semana</CardTitle>
            <Link to="/admin/agenda" className="text-xs text-velox-amber hover:underline">Ver programação →</Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => {
              const dayLabel = format(day.date, "EEE", { locale: ptBR });
              const dayNum = format(day.date, "d");
              const isNow = isToday(day.date);
              return (
                <Link
                  to={`/admin/agenda`}
                  key={i}
                  className={`rounded-xl p-3 text-center border-2 transition-all block hover:shadow-sm ${
                    isNow ? "border-velox-amber bg-velox-amber/5" : "border-border bg-muted/20 hover:border-velox-amber/40"
                  }`}
                >
                  <p className={`text-[11px] uppercase font-semibold ${isNow ? "text-velox-amber" : "text-muted-foreground"}`}>
                    {dayLabel}
                  </p>
                  <p className={`text-xl font-bold font-mono my-1 ${isNow ? "text-velox-amber" : "text-foreground"}`}>
                    {dayNum}
                  </p>
                  <div className={`text-sm font-bold font-mono ${
                    day.color === "red" ? "text-red-500" :
                    day.color === "amber" ? "text-amber-500" :
                    "text-green-500"
                  }`}>
                    {day.count}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {day.count === 1 ? "coleta" : "coletas"}
                  </p>
                  <div className={`mt-1.5 w-2 h-2 rounded-full mx-auto ${
                    day.color === "red" ? "bg-red-400" :
                    day.color === "amber" ? "bg-amber-400" :
                    "bg-green-400"
                  }`} />
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />Disponível</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Quase cheio</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Sem capacidade</span>
          </div>
        </CardContent>
      </Card>

      {/* Linha 3 — Últimos pedidos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading font-semibold">Últimas Coletas</CardTitle>
              <Link to="/admin/coletas" className="text-xs text-velox-amber hover:underline">Ver todas →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-1 font-medium text-muted-foreground">Protocolo</th>
                    <th className="text-left py-2 px-1 font-medium text-muted-foreground hidden sm:table-cell">Cliente</th>
                    <th className="text-left py-2 px-1 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-1 font-medium text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-xs">Nenhum pedido ainda.</td></tr>
                  )}
                  {recentOrders.map(order => (
                    <tr key={order.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="py-2 px-1">
                       <Link to={`/admin/coletas/${order.id}`} className="font-mono font-semibold text-xs hover:text-velox-amber transition-colors">
                         {order.protocol}
                       </Link>
                      </td>
                      <td className="py-2 px-1 hidden sm:table-cell text-xs text-muted-foreground">{order.client_name}</td>
                      <td className="py-2 px-1"><StatusBadge status={order.status} /></td>
                      <td className="py-2 px-1 text-right font-mono text-xs">
                        {order.freight_value ? `R$ ${Number(order.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-velox-amber" /> Alertas
              </CardTitle>
              <Link to="/admin/config" className="text-xs text-velox-amber hover:underline">Ver todos →</Link>
            </div>
          </CardHeader>
          <CardContent>
            {allAlerts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm">Nenhum alerta no momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allAlerts.map(alert => {
                  const Icon = alert.level === "critical" ? AlertCircle : alert.level === "warning" ? AlertTriangle : Info;
                  const color = alert.level === "critical" ? "text-red-500" : alert.level === "warning" ? "text-amber-500" : "text-blue-500";
                  return (
                    <Link key={alert.id} to={alert.link} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                      <p className="text-xs text-foreground leading-snug">{alert.message}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
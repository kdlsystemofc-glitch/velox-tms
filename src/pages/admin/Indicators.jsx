import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { slaStatus } from "@/utils/sla";
import {
  BarChart3, Package, CheckCircle2, Clock, Truck, AlertTriangle, DollarSign, TrendingUp, Percent,
} from "lucide-react";

/**
 * INDICADORES OPERACIONAIS — KPIs do mês corrente (item 16 do checklist enterprise).
 */
export default function Indicators() {
  const { settings } = useCompanySettings();
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 500) });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 100) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: revenues = [] } = useQuery({ queryKey: ["revenues"], queryFn: () => base44.entities.Revenue.list("-due_date", 300) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 300) });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-all"], queryFn: () => base44.entities.Incident.list("-created_date", 300) });

  const now = new Date();
  const inMonth = (ts) => { if (!ts) return false; const d = new Date(ts); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); };
  const historyHas = (o, status) => (o.status_history || []).some(h => h.status === status && inMonth(h.timestamp));

  // Coletas e entregas realizadas no mês
  const collectedMonth = orders.filter(o => historyHas(o, "in_transit") || historyHas(o, "collecting")).length;
  const deliveredMonth = orders.filter(o => historyHas(o, "delivered"));
  const delivered = deliveredMonth.length;
  const onTime = deliveredMonth.filter(o => slaStatus(o, settings) === "on_time").length;
  const late = deliveredMonth.filter(o => slaStatus(o, settings) === "late").length;
  const otd = delivered > 0 ? (onTime / delivered) * 100 : 0;

  // Frota
  const activeTrucks = trucks.filter(t => t.status !== "inactive");
  const onRoute = trips.filter(t => t.status === "in_progress").length;
  const available = trucks.filter(t => t.status === "available").length;
  const occupancy = activeTrucks.length > 0 ? (onRoute / activeTrucks.length) * 100 : 0;

  // Ocorrências
  const openIncidents = incidents.filter(i => i.status !== "resolved").length;

  // Financeiro do mês
  const revMonth = revenues.filter(r => inMonth(r.received_date) || inMonth(r.due_date)).reduce((s, r) => s + (r.amount || 0), 0);
  const expMonth = expenses.filter(e => inMonth(e.date)).reduce((s, e) => s + (e.amount || 0), 0);
  const margin = revMonth > 0 ? ((revMonth - expMonth) / revMonth) * 100 : 0;

  const fmt = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const kpis = [
    { icon: Package, label: "Coletas realizadas", value: collectedMonth, color: "text-amber-600" },
    { icon: CheckCircle2, label: "Entregas realizadas", value: delivered, color: "text-green-600" },
    { icon: TrendingUp, label: "Entregas no prazo", value: onTime, sub: `${otd.toFixed(0)}% OTD`, color: "text-green-600" },
    { icon: Clock, label: "Entregas atrasadas", value: late, color: "text-red-600" },
    { icon: Truck, label: "Veículos disponíveis", value: `${available}/${activeTrucks.length}`, color: "text-blue-600" },
    { icon: Truck, label: "Veículos em viagem", value: onRoute, color: "text-violet-600" },
    { icon: Percent, label: "Ocupação da frota", value: `${occupancy.toFixed(0)}%`, color: "text-indigo-600" },
    { icon: AlertTriangle, label: "Ocorrências abertas", value: openIncidents, color: "text-orange-600" },
    { icon: DollarSign, label: "Faturamento do mês", value: fmt(revMonth), color: "text-green-600" },
    { icon: BarChart3, label: "Margem operacional", value: `${margin.toFixed(1)}%`, sub: `${fmt(revMonth - expMonth)} resultado`, color: margin >= 0 ? "text-green-600" : "text-red-600" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader icon={BarChart3} title="Indicadores" subtitle={`KPIs operacionais — ${now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`w-4 h-4 ${k.color}`} />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight">{k.label}</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${k.color}`}>{k.value}</p>
              {k.sub && <p className="text-[11px] text-muted-foreground">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        OTD = On-Time Delivery (entregas no prazo ÷ total entregue). Prazo previsto = data de coleta + dias úteis do destino (tabela de prazos).
      </p>
    </div>
  );
}

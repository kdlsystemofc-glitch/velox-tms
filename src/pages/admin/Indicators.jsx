import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { slaStatus } from "@/utils/sla";
import {
  BarChart3, Package, CheckCircle2, Clock, Truck, AlertTriangle, DollarSign, TrendingUp, Percent,
} from "lucide-react";

const PERIODS = [
  ["this_month", "Mês atual"], ["last_month", "Mês anterior"], ["3m", "3 meses"], ["6m", "6 meses"], ["12m", "12 meses"], ["ytd", "Ano"],
];

function periodRange(key, now) {
  const y = now.getFullYear(), m = now.getMonth();
  const end = new Date(y, m + 1, 1);
  switch (key) {
    case "last_month": return [new Date(y, m - 1, 1), new Date(y, m, 1)];
    case "3m": return [new Date(y, m - 2, 1), end];
    case "6m": return [new Date(y, m - 5, 1), end];
    case "12m": return [new Date(y, m - 11, 1), end];
    case "ytd": return [new Date(y, 0, 1), end];
    default: return [new Date(y, m, 1), end]; // this_month
  }
}

const fmt = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const TARGET_OTD = 95, TARGET_MARGIN = 15;

export default function Indicators() {
  const { settings } = useCompanySettings();
  const [period, setPeriod] = useState("this_month");

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 1000) });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 200) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: revenues = [] } = useQuery({ queryKey: ["revenues"], queryFn: () => base44.entities.Revenue.list("-due_date", 1000) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 1000) });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-all"], queryFn: () => base44.entities.Incident.list("-created_date", 500) });

  const now = new Date();
  const [start, end] = periodRange(period, now);
  const durationMs = end - start;
  const prevStart = new Date(start.getTime() - durationMs);

  const computeKpis = (s, e) => {
    const inR = (ts) => { if (!ts) return false; const d = new Date(ts); return d >= s && d < e; };
    const histIn = (o, st) => (o.status_history || []).some(h => h.status === st && inR(h.timestamp));
    const deliveredOrders = orders.filter(o => histIn(o, "delivered"));
    const delivered = deliveredOrders.length;
    const onTime = deliveredOrders.filter(o => slaStatus(o, settings) === "on_time").length;
    const late = deliveredOrders.filter(o => slaStatus(o, settings) === "late").length;
    const collected = orders.filter(o => histIn(o, "in_transit") || histIn(o, "collecting")).length;
    const faturamento = revenues.filter(r => r.status === "received" && inR(r.received_date || r.due_date)).reduce((a, r) => a + (r.amount || 0), 0);
    const despesa = expenses.filter(x => x.status === "paid" && inR(x.paid_date || x.date)).reduce((a, x) => a + (x.amount || 0), 0);
    const resultado = faturamento - despesa;
    const margin = faturamento > 0 ? (resultado / faturamento) * 100 : 0;
    const otd = delivered > 0 ? (onTime / delivered) * 100 : 0;
    const incidentsCreated = incidents.filter(i => inR(i.created_date)).length;
    return { collected, delivered, onTime, late, otd, faturamento, despesa, resultado, margin, incidentsCreated };
  };

  const cur = computeKpis(start, end);
  const prev = computeKpis(prevStart, start);

  // Frota agora (snapshot) — ocupação por caminhão (on_route inclui viagens E transferências)
  const activeTrucks = trucks.filter(t => t.status !== "inactive");
  const onRouteTrucks = trucks.filter(t => t.status === "on_route").length;
  const available = trucks.filter(t => t.status === "available").length;
  const occupancy = activeTrucks.length > 0 ? (onRouteTrucks / activeTrucks.length) * 100 : 0;
  const openIncidents = incidents.filter(i => i.status !== "resolved").length;

  const deltaPct = (c, p) => (p === 0 ? null : ((c - p) / Math.abs(p)) * 100);
  const Delta = ({ c, p, lowerBetter = false }) => {
    const d = deltaPct(c, p);
    if (d == null || Math.abs(d) < 0.5) return null;
    const good = lowerBetter ? d < 0 : d > 0;
    return <span className={`text-[11px] font-semibold ${good ? "text-green-600" : "text-red-600"}`}>{d > 0 ? "▲" : "▼"} {Math.abs(d).toFixed(0)}%</span>;
  };
  const metaDot = (value, target) => {
    const cls = value >= target ? "bg-green-500" : value >= target - 10 ? "bg-amber-500" : "bg-red-500";
    return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} title={`Meta: ${target}%`} />;
  };

  const periodKpis = [
    { icon: Package, label: "Coletas realizadas", value: cur.collected, c: cur.collected, p: prev.collected, color: "text-amber-600" },
    { icon: CheckCircle2, label: "Entregas realizadas", value: cur.delivered, c: cur.delivered, p: prev.delivered, color: "text-green-600" },
    { icon: TrendingUp, label: "OTD (no prazo)", value: `${cur.otd.toFixed(0)}%`, c: cur.otd, p: prev.otd, color: "text-green-600", meta: TARGET_OTD, metaVal: cur.otd, sub: `${cur.onTime}/${cur.delivered}` },
    { icon: Clock, label: "Entregas atrasadas", value: cur.late, c: cur.late, p: prev.late, color: "text-red-600", lowerBetter: true },
    { icon: AlertTriangle, label: "Ocorrências no período", value: cur.incidentsCreated, c: cur.incidentsCreated, p: prev.incidentsCreated, color: "text-orange-600", lowerBetter: true },
    { icon: DollarSign, label: "Faturamento (caixa)", value: fmt(cur.faturamento), c: cur.faturamento, p: prev.faturamento, color: "text-green-600" },
    { icon: DollarSign, label: "Despesas (caixa)", value: fmt(cur.despesa), c: cur.despesa, p: prev.despesa, color: "text-red-600", lowerBetter: true },
    { icon: BarChart3, label: "Margem", value: `${cur.margin.toFixed(1)}%`, c: cur.margin, p: prev.margin, color: cur.margin >= 0 ? "text-green-600" : "text-red-600", meta: TARGET_MARGIN, metaVal: cur.margin, sub: `${fmt(cur.resultado)} resultado` },
  ];

  return (
    <div className="space-y-5">
      <PageHeader icon={BarChart3} title="Indicadores" subtitle="KPIs operacionais e financeiros" />

      <div className="flex gap-1.5 flex-wrap">
        {PERIODS.map(([v, l]) => (
          <Button key={v} size="sm" variant={period === v ? "default" : "outline"} className={period === v ? "bg-velox-dark text-white" : ""} onClick={() => setPeriod(v)}>{l}</Button>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-2">
          {start.toLocaleDateString("pt-BR")} – {new Date(end - 1).toLocaleDateString("pt-BR")} · vs período anterior
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {periodKpis.map((k, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`w-4 h-4 ${k.color}`} />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide leading-tight flex-1">{k.label}</span>
                {k.meta != null && metaDot(k.metaVal, k.meta)}
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-bold font-mono ${k.color}`}>{k.value}</p>
                <Delta c={k.c} p={k.p} lowerBetter={k.lowerBetter} />
              </div>
              {k.sub && <p className="text-[11px] text-muted-foreground">{k.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Frota agora</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-blue-600" /><span className="text-[11px] text-muted-foreground uppercase">Disponíveis</span></div><p className="text-2xl font-bold font-mono text-blue-600">{available}/{activeTrucks.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-violet-600" /><span className="text-[11px] text-muted-foreground uppercase">Em rota</span></div><p className="text-2xl font-bold font-mono text-violet-600">{onRouteTrucks}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Percent className="w-4 h-4 text-indigo-600" /><span className="text-[11px] text-muted-foreground uppercase">Ocupação</span></div><p className="text-2xl font-bold font-mono text-indigo-600">{occupancy.toFixed(0)}%</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-orange-600" /><span className="text-[11px] text-muted-foreground uppercase">Ocorrências abertas</span></div><p className="text-2xl font-bold font-mono text-orange-600">{openIncidents}</p></CardContent></Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        OTD = entregas no prazo ÷ total entregue (meta {TARGET_OTD}%). Faturamento e despesas em <strong>base caixa</strong> (recebido/pago no período), alinhado ao Financeiro. ● verde = meta atingida, âmbar = perto, vermelho = abaixo.
      </p>
    </div>
  );
}

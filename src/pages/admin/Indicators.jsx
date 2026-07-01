import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/repositories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { slaStatus } from "@/utils/sla";
import { ComposedChart, Bar, Line, BarChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  BarChart3, Package, CheckCircle2, Clock, Truck, AlertTriangle, DollarSign, TrendingUp, Percent, Activity, Users, MapPin, Download, Gauge,
} from "lucide-react";
import { downloadCsv } from "@/utils/exportCsv";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => db.Order.list("-created_date", 1000) });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => db.Trip.list("-created_date", 200) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => db.Truck.list() });
  const { data: revenues = [] } = useQuery({ queryKey: ["revenues"], queryFn: () => db.Revenue.list("-due_date", 1000) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => db.Expense.list("-date", 1000) });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-all"], queryFn: () => db.Incident.list("-created_date", 500) });

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

  // Série dos últimos 12 meses (tendências, Ind-2)
  const series = Array.from({ length: 12 }, (_, idx) => {
    const i = 11 - idx;
    const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const k = computeKpis(s, e);
    return { name: MONTHS_SHORT[s.getMonth()], entregas: k.delivered, otd: Number(k.otd.toFixed(0)), receita: k.faturamento, despesa: k.despesa, resultado: k.resultado, ocorrencias: k.incidentsCreated };
  });

  // ── Rankings e indicadores avançados do período (Ind-3) ──
  const inSel = (ts) => { if (!ts) return false; const d = new Date(ts); return d >= start && d < end; };
  const deliveredInPeriod = orders.filter(o => (o.status_history || []).some(h => h.status === "delivered" && inSel(h.timestamp)));
  const byClient = {};
  deliveredInPeriod.forEach(o => { const k = o.client_name || "—"; (byClient[k] ||= { name: k, entregas: 0, receita: 0 }); byClient[k].entregas++; byClient[k].receita += o.freight_value || 0; });
  const topClientes = Object.values(byClient).sort((a, b) => b.receita - a.receita).slice(0, 5);
  const byCity = {};
  deliveredInPeriod.forEach(o => (o.recipients || []).forEach(r => { const c = r.city || "—"; (byCity[c] ||= { city: c, entregas: 0 }); byCity[c].entregas++; }));
  const topDestinos = Object.values(byCity).sort((a, b) => b.entregas - a.entregas).slice(0, 5);
  const tripsInPeriod = trips.filter(t => t.status === "completed" && inSel(t.arrival_date || t.departure_date));
  const byDriver = {};
  tripsInPeriod.forEach(t => { const k = t.driver_name || "—"; (byDriver[k] ||= { name: k, viagens: 0, receita: 0 }); byDriver[k].viagens++; byDriver[k].receita += Number(t.total_revenue) || 0; });
  const topMotoristas = Object.values(byDriver).sort((a, b) => b.receita - a.receita).slice(0, 5);

  const totKm = tripsInPeriod.reduce((s, t) => s + (Number(t.real_km) || 0), 0);
  const totCost = tripsInPeriod.reduce((s, t) => s + (Number(t.total_cost) || 0), 0);
  const totRev = tripsInPeriod.reduce((s, t) => s + (Number(t.total_revenue) || 0), 0);
  const custoKm = totKm > 0 ? totCost / totKm : 0;
  const receitaKm = totKm > 0 ? totRev / totKm : 0;
  const freightDelivered = deliveredInPeriod.reduce((s, o) => s + (o.freight_value || 0), 0);
  const ticket = deliveredInPeriod.length > 0 ? freightDelivered / deliveredInPeriod.length : 0;
  const leadTimes = deliveredInPeriod.map(o => {
    const h = o.status_history || [];
    const startEv = h.find(x => x.status === "collecting" || x.status === "in_transit");
    const delEv = [...h].reverse().find(x => x.status === "delivered");
    if (!startEv || !delEv) return null;
    const v = (new Date(delEv.timestamp) - new Date(startEv.timestamp)) / 86400000;
    return v >= 0 ? v : null;
  }).filter(v => v != null);
  const leadAvg = leadTimes.length ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : null;

  const exportSummary = () => {
    const rows = [
      ["Coletas realizadas", cur.collected], ["Entregas realizadas", cur.delivered], ["OTD (%)", cur.otd.toFixed(0)],
      ["Entregas atrasadas", cur.late], ["Ocorrências no período", cur.incidentsCreated],
      ["Faturamento (caixa)", cur.faturamento.toFixed(2)], ["Despesas (caixa)", cur.despesa.toFixed(2)],
      ["Resultado", cur.resultado.toFixed(2)], ["Margem (%)", cur.margin.toFixed(1)],
      ["Ticket médio", ticket.toFixed(2)], ["Custo por km", custoKm.toFixed(2)], ["Receita por km", receitaKm.toFixed(2)],
      ["Lead time médio (dias)", leadAvg != null ? leadAvg.toFixed(1) : ""],
    ].map(([indicador, valor]) => ({ indicador, valor }));
    downloadCsv(`indicadores-${period}-${new Date().toISOString().slice(0,10)}`, rows, [
      { key: "indicador", label: "Indicador" }, { key: "valor", label: "Valor" },
    ]);
  };

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
    return <span className={`text-[11px] font-semibold ${good ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>{d > 0 ? "▲" : "▼"} {Math.abs(d).toFixed(0)}%</span>;
  };
  const metaDot = (value, target) => {
    const cls = value >= target ? "bg-green-500" : value >= target - 10 ? "bg-amber-500" : "bg-red-500";
    return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} title={`Meta: ${target}%`} />;
  };

  const periodKpis = [
    { icon: Package, label: "Coletas realizadas", value: cur.collected, c: cur.collected, p: prev.collected, color: "text-amber-600 dark:text-amber-300" },
    { icon: CheckCircle2, label: "Entregas realizadas", value: cur.delivered, c: cur.delivered, p: prev.delivered, color: "text-green-600 dark:text-green-300" },
    { icon: TrendingUp, label: "OTD (no prazo)", value: `${cur.otd.toFixed(0)}%`, c: cur.otd, p: prev.otd, color: "text-green-600 dark:text-green-300", meta: TARGET_OTD, metaVal: cur.otd, sub: `${cur.onTime}/${cur.delivered}` },
    { icon: Clock, label: "Entregas atrasadas", value: cur.late, c: cur.late, p: prev.late, color: "text-red-600 dark:text-red-300", lowerBetter: true },
    { icon: AlertTriangle, label: "Ocorrências no período", value: cur.incidentsCreated, c: cur.incidentsCreated, p: prev.incidentsCreated, color: "text-orange-600 dark:text-orange-300", lowerBetter: true },
    { icon: DollarSign, label: "Faturamento (caixa)", value: fmt(cur.faturamento), c: cur.faturamento, p: prev.faturamento, color: "text-green-600 dark:text-green-300" },
    { icon: DollarSign, label: "Despesas (caixa)", value: fmt(cur.despesa), c: cur.despesa, p: prev.despesa, color: "text-red-600 dark:text-red-300", lowerBetter: true },
    { icon: BarChart3, label: "Margem", value: `${cur.margin.toFixed(1)}%`, c: cur.margin, p: prev.margin, color: cur.margin >= 0 ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300", meta: TARGET_MARGIN, metaVal: cur.margin, sub: `${fmt(cur.resultado)} resultado` },
  ];

  return (
    <div className="space-y-5">
      <PageHeader icon={BarChart3} title="Indicadores" subtitle="KPIs operacionais e financeiros" />

      <div className="flex gap-1.5 flex-wrap items-center">
        {PERIODS.map(([v, l]) => (
          <Button key={v} size="sm" variant={period === v ? "default" : "outline"} className={period === v ? "bg-velox-dark text-white" : ""} onClick={() => setPeriod(v)}>{l}</Button>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-2">
          {start.toLocaleDateString("pt-BR")} – {new Date(end - 1).toLocaleDateString("pt-BR")} · vs período anterior
        </span>
        <Button size="sm" variant="outline" className="gap-2 ml-auto" onClick={exportSummary}><Download className="w-4 h-4" /> Exportar</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {periodKpis.map((k, i) => (
          <Card key={i} className="card-interactive">
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Eficiência do período</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-green-600 dark:text-green-300" /><span className="text-[11px] text-muted-foreground uppercase">Ticket médio</span></div><p className="text-xl font-bold font-mono text-green-600 dark:text-green-300">{fmt(ticket)}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Gauge className="w-4 h-4 text-red-600 dark:text-red-300" /><span className="text-[11px] text-muted-foreground uppercase">Custo / km</span></div><p className="text-xl font-bold font-mono text-red-600 dark:text-red-300">{custoKm > 0 ? `${fmt(custoKm)}/km` : "—"}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-300" /><span className="text-[11px] text-muted-foreground uppercase">Receita / km</span></div><p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-300">{receitaKm > 0 ? `${fmt(receitaKm)}/km` : "—"}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-300" /><span className="text-[11px] text-muted-foreground uppercase">Lead time médio</span></div><p className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-300">{leadAvg != null ? `${leadAvg.toFixed(1)} dias` : "—"}</p></CardContent></Card>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Frota agora</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-blue-600 dark:text-blue-300" /><span className="text-[11px] text-muted-foreground uppercase">Disponíveis</span></div><p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-300">{available}/{activeTrucks.length}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-violet-600 dark:text-violet-300" /><span className="text-[11px] text-muted-foreground uppercase">Em rota</span></div><p className="text-2xl font-bold font-mono text-violet-600 dark:text-violet-300">{onRouteTrucks}</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><Percent className="w-4 h-4 text-indigo-600 dark:text-indigo-300" /><span className="text-[11px] text-muted-foreground uppercase">Ocupação</span></div><p className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-300">{occupancy.toFixed(0)}%</p></CardContent></Card>
          <Card><CardContent className="pt-4 pb-3"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-300" /><span className="text-[11px] text-muted-foreground uppercase">Ocorrências abertas</span></div><p className="text-2xl font-bold font-mono text-orange-600 dark:text-orange-300">{openIncidents}</p></CardContent></Card>
        </div>
      </div>

      {/* Tendências — últimos 12 meses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-velox-amber" /> Entregas e OTD (12 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Legend />
                <Bar yAxisId="l" dataKey="entregas" fill="#10B981" radius={[4, 4, 0, 0]} name="Entregas" />
                <Line yAxisId="r" type="monotone" dataKey="otd" stroke="#1E3A5F" strokeWidth={2} name="OTD %" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-velox-amber" /> Receita × Despesa × Resultado (12 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={v => fmt(v)} />
                <Legend />
                <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} name="Receita" />
                <Bar dataKey="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} name="Despesa" />
                <Bar dataKey="resultado" fill="#1E3A5F" radius={[4, 4, 0, 0]} name="Resultado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-velox-amber" /> Ocorrências por mês (12 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="ocorrencias" fill="#F97316" radius={[4, 4, 0, 0]} name="Ocorrências" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings do período */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-velox-amber" /> Top clientes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topClientes.length === 0 ? <p className="text-xs text-muted-foreground py-3 text-center">Sem entregas no período.</p> : topClientes.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate flex items-center gap-2"><span className="text-xs text-muted-foreground w-4">{i + 1}.</span>{c.name}</span>
                <span className="font-mono font-semibold text-green-600 dark:text-green-300 flex-shrink-0">{fmt(c.receita)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-velox-amber" /> Top motoristas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topMotoristas.length === 0 ? <p className="text-xs text-muted-foreground py-3 text-center">Sem viagens concluídas no período.</p> : topMotoristas.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate flex items-center gap-2"><span className="text-xs text-muted-foreground w-4">{i + 1}.</span>{d.name} <span className="text-xs text-muted-foreground">· {d.viagens} viag.</span></span>
                <span className="font-mono font-semibold text-green-600 dark:text-green-300 flex-shrink-0">{fmt(d.receita)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-velox-amber" /> Top destinos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topDestinos.length === 0 ? <p className="text-xs text-muted-foreground py-3 text-center">Sem entregas no período.</p> : topDestinos.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate flex items-center gap-2"><span className="text-xs text-muted-foreground w-4">{i + 1}.</span>{c.city}</span>
                <span className="font-mono font-semibold flex-shrink-0">{c.entregas} entregas</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        OTD = entregas no prazo ÷ total entregue (meta {TARGET_OTD}%). Faturamento e despesas em <strong>base caixa</strong> (recebido/pago no período), alinhado ao Financeiro. ● verde = meta atingida, âmbar = perto, vermelho = abaixo.
      </p>
    </div>
  );
}

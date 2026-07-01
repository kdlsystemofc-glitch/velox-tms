import React from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/repositories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, Wallet, AlertCircle, CalendarClock, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { parseLocalDate, todayLocalISO, formatDateBR } from "@/utils/dateUtils";
import StatCard from "@/components/shared/StatCard";

const brl = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const categoryLabels = { fuel: "Combustível", maintenance: "Manutenção", tires: "Pneus", tolls: "Pedágios", salaries: "Salários", taxes: "Impostos", insurance: "Seguros", rent: "Aluguel", administrative: "Administrativo", marketing: "Marketing", other: "Outros" };

const TONE_MAP = { "text-green-600 dark:text-green-300": "success", "text-red-600 dark:text-red-300": "danger", "text-amber-600 dark:text-amber-300": "warning", "text-blue-600 dark:text-blue-300": "primary", "": "primary" };
function Kpi({ label, value, tone = "", icon: Icon, hint }) {
  return <StatCard icon={Icon} label={label} value={value} hint={hint} tone={TONE_MAP[tone] || "primary"} />;
}

export default function Financial({ hideTitle = false }) {
  const { data: revenues = [] } = useQuery({ queryKey: ["revenues"], queryFn: () => db.Revenue.list("-due_date", 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => db.Expense.list("-date", 500) });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => db.Order.list("-created_date", 500) });
  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: () => db.CompanySettings.list(), select: d => d[0] || {} });

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const todayStr = todayLocalISO();
  const dd = (s) => (s || "").slice(0, 10);
  const inMonth = (s, m = thisMonth, y = thisYear) => { const d = s ? new Date(s) : null; return d && d.getMonth() === m && d.getFullYear() === y; };

  const openingBalance = Number(settings.opening_cash_balance) || 0;

  // Caixa do mês
  const recebidoMes = revenues.filter(r => r.status === "received" && inMonth(r.received_date || r.due_date)).reduce((s, r) => s + (r.amount || 0), 0);
  const pagoMes = expenses.filter(e => e.status === "paid" && inMonth(e.paid_date || e.date)).reduce((s, e) => s + (e.amount || 0), 0);
  const resultadoMes = recebidoMes - pagoMes;

  // Saldos em aberto
  const openRev = revenues.filter(r => r.status === "receivable" || r.status === "overdue");
  const openExp = expenses.filter(e => e.status === "pending" || e.status === "installment");
  const aReceber = openRev.reduce((s, r) => s + (r.amount || 0), 0);
  const aPagar = openExp.reduce((s, e) => s + (e.amount || 0), 0);

  // Inadimplência: a receber vencido / total a receber
  const vencidoReceber = openRev.filter(r => dd(r.due_date) < todayStr).reduce((s, r) => s + (r.amount || 0), 0);
  const inadimplencia = aReceber > 0 ? (vencidoReceber / aReceber) * 100 : 0;

  // Runway: saldo de caixa ÷ saída média diária (90d)
  const last90 = (s) => { const d = parseLocalDate(dd(s)); return d && (now - d) / 86400000 <= 90; };
  const pago90 = expenses.filter(e => e.status === "paid" && last90(e.paid_date || e.date)).reduce((s, e) => s + (e.amount || 0), 0);
  const avgDaily = pago90 / 90;
  const runway = avgDaily > 0 ? Math.round(openingBalance / avgDaily) : null;

  // Gráfico 6 meses (receita realizada x despesa paga x resultado)
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const m = (thisMonth - 5 + i + 12) % 12;
    const y = m > thisMonth ? thisYear - 1 : thisYear;
    const rev = revenues.filter(r => r.status === "received" && inMonth(r.received_date || r.due_date, m, y)).reduce((s, r) => s + (r.amount || 0), 0);
    const exp = expenses.filter(e => e.status === "paid" && inMonth(e.paid_date || e.date, m, y)).reduce((s, e) => s + (e.amount || 0), 0);
    return { name: MONTHS[m], receita: rev, despesa: exp, resultado: rev - exp };
  });

  // Top 5 clientes (receita de frete — últimos 90 dias)
  const topClients = Object.values(orders.filter(o => o.status !== "cancelled" && last90(o.created_date)).reduce((acc, o) => {
    const k = o.client_name || "—";
    (acc[k] ||= { name: k, total: 0 }).total += o.freight_value || 0;
    return acc;
  }, {})).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);

  // Top categorias de custo (mês)
  const topCats = Object.entries(expenses.filter(e => inMonth(e.date)).reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + (e.amount || 0); return acc; }, {}))
    .map(([k, v]) => ({ label: categoryLabels[k] || k, total: v })).filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  const catMax = topCats[0]?.total || 1;

  // Contas vencendo nos próximos 7 dias
  const in7 = (s) => { const v = dd(s); return v >= todayStr && parseLocalDate(v) && (parseLocalDate(v) - parseLocalDate(todayStr)) / 86400000 <= 7; };
  const dueRev = openRev.filter(r => in7(r.due_date)).sort((a, b) => dd(a.due_date).localeCompare(dd(b.due_date)));
  const dueExp = openExp.filter(e => in7(e.due_date)).sort((a, b) => dd(a.due_date).localeCompare(dd(b.due_date)));

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <div><h1 className="font-display text-xl font-bold text-foreground">Financeiro</h1><p className="text-muted-foreground text-xs mt-0.5">Painel executivo</p></div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="Saldo em caixa" value={brl(openingBalance)} icon={Wallet} hint="ajuste em Fluxo de Caixa" />
        <Kpi label="Resultado do mês (caixa)" value={brl(resultadoMes)} tone={resultadoMes >= 0 ? "text-blue-600 dark:text-blue-300" : "text-red-600 dark:text-red-300"} icon={DollarSign} hint={`Recebido ${brl(recebidoMes)} · Pago ${brl(pagoMes)}`} />
        <Kpi label="Dias de caixa (runway)" value={runway == null ? "—" : `${runway} dias`} icon={CalendarClock} hint={avgDaily > 0 ? `saída média ${brl(avgDaily)}/dia` : "sem saídas recentes"} />
        <Kpi label="A receber (em aberto)" value={brl(aReceber)} tone="text-amber-600 dark:text-amber-300" icon={TrendingUp} />
        <Kpi label="A pagar (em aberto)" value={brl(aPagar)} tone="text-red-600 dark:text-red-300" icon={TrendingDown} />
        <Kpi label="Inadimplência" value={`${inadimplencia.toFixed(0)}%`} tone={inadimplencia > 15 ? "text-red-600 dark:text-red-300" : "text-green-600 dark:text-green-300"} icon={AlertCircle} hint={`${brl(vencidoReceber)} vencido`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base font-heading font-semibold flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-velox-amber" /> Recebido × Pago × Resultado (6 meses)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={v => brl(v)} />
              <Legend />
              <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} name="Recebido" />
              <Bar dataKey="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} name="Pago" />
              <Bar dataKey="resultado" fill="#1E3A5F" radius={[4, 4, 0, 0]} name="Resultado" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-velox-amber" /> Top clientes (90 dias)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topClients.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">Sem dados no período.</p> : topClients.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate flex items-center gap-2"><span className="text-xs text-muted-foreground w-4">{i + 1}.</span>{c.name}</span>
                <span className="font-mono font-semibold text-green-600 dark:text-green-300">{brl(c.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingDown className="w-4 h-4 text-velox-amber" /> Custos do mês por categoria</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {topCats.length === 0 ? <p className="text-xs text-muted-foreground py-4 text-center">Sem despesas no mês.</p> : topCats.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs mb-0.5"><span>{c.label}</span><span className="font-mono text-red-600 dark:text-red-300">{brl(c.total)}</span></div>
                <div className="h-2 bg-muted rounded-full"><div className="h-2 bg-red-400 rounded-full" style={{ width: `${(c.total / catMax) * 100}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {(dueRev.length > 0 || dueExp.length > 0) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-velox-amber" /> Vencem nos próximos 7 dias</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1.5">A receber ({dueRev.length})</p>
              {dueRev.length === 0 ? <p className="text-xs text-muted-foreground">Nada a receber.</p> : dueRev.slice(0, 6).map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                  <span className="truncate">{r.description || "Receita"} <span className="text-muted-foreground">· {formatDateBR(r.due_date)}</span></span>
                  <span className="font-mono text-green-600 dark:text-green-300 flex-shrink-0">{brl(r.amount)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1.5">A pagar ({dueExp.length})</p>
              {dueExp.length === 0 ? <p className="text-xs text-muted-foreground">Nada a pagar.</p> : dueExp.slice(0, 6).map(e => (
                <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                  <span className="truncate">{e.description || "Despesa"} <span className="text-muted-foreground">· {formatDateBR(e.due_date)}</span></span>
                  <span className="font-mono text-red-600 dark:text-red-300 flex-shrink-0">{brl(e.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

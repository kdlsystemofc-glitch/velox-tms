import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertTriangle, TrendingUp, Wallet, Pencil, Check } from "lucide-react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { todayLocalISO } from "@/utils/dateUtils";

const brl = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function CashFlow({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState("30");
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState("");

  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: () => base44.entities.CompanySettings.list(), select: d => d[0] || {} });
  const openingBalance = Number(settings.opening_cash_balance) || 0;

  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => base44.entities.Revenue.list("-due_date", 500),
    select: (d) => d.filter(r => (r.status === "receivable" || r.status === "overdue") && r.due_date),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-due_date", 500),
    select: (d) => d.filter(e => (e.status === "pending" || e.status === "installment") && e.due_date),
  });

  const saveBalance = useMutation({
    mutationFn: (value) => {
      if (!settings.id) throw new Error("Configure a empresa primeiro (Configurações).");
      return base44.entities.CompanySettings.update(settings.id, { opening_cash_balance: value, opening_cash_date: todayLocalISO() });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); setEditingBalance(false); toast({ title: "Saldo em caixa atualizado" }); },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });

  const numDays = parseInt(days);
  const today = new Date();
  const todayStr = todayLocalISO();
  const dd = (s) => (s || "").slice(0, 10);

  // Atrasados (vencimento <= hoje) entram no dia 0; depois, dia a dia.
  const chartData = [];
  let runningBalance = openingBalance;
  for (let i = 0; i < numDays; i++) {
    const day = addDays(today, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const dayLabel = format(day, "dd/MM", { locale: ptBR });
    const inDay = (s) => i === 0 ? dd(s) <= todayStr : dd(s) === dayStr;

    const dayRevenues = revenues.filter(r => inDay(r.due_date)).reduce((s, r) => s + (r.amount || 0), 0);
    const dayExpenses = expenses.filter(e => inDay(e.due_date)).reduce((s, e) => s + (e.amount || 0), 0);
    runningBalance += dayRevenues - dayExpenses;

    if (dayRevenues > 0 || dayExpenses > 0 || i % 7 === 0 || i === 0) {
      chartData.push({ date: i === 0 ? "Hoje" : dayLabel, saldo: parseFloat(runningBalance.toFixed(2)), entrada: dayRevenues, saida: dayExpenses });
    }
  }

  const endBalance = runningBalance;
  const lowestBalance = chartData.length ? Math.min(...chartData.map(d => d.saldo)) : openingBalance;
  const negativeDay = chartData.find(d => d.saldo < 0);
  const overdueRev = revenues.filter(r => dd(r.due_date) < todayStr).reduce((s, r) => s + (r.amount || 0), 0);
  const overdueExp = expenses.filter(e => dd(e.due_date) < todayStr).reduce((s, e) => s + (e.amount || 0), 0);

  // Tabela: linha de atrasados primeiro, depois dia a dia.
  const tableData = [];
  let bal = openingBalance;
  for (let i = 0; i < numDays; i++) {
    const day = addDays(today, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const inDay = (s) => i === 0 ? dd(s) <= todayStr : dd(s) === dayStr;
    const revItems = revenues.filter(r => inDay(r.due_date));
    const expItems = expenses.filter(e => inDay(e.due_date));
    if (revItems.length + expItems.length === 0) continue;
    const label = i === 0 ? "Hoje (inclui atrasados)" : format(day, "dd/MM/yyyy");
    revItems.forEach(r => { bal += r.amount || 0; tableData.push({ date: label, desc: r.description || "Receita", overdue: dd(r.due_date) < todayStr, entrada: r.amount || 0, saida: 0, saldo: bal }); });
    expItems.forEach(e => { bal -= e.amount || 0; tableData.push({ date: label, desc: e.description || "Despesa", overdue: dd(e.due_date) < todayStr, entrada: 0, saida: e.amount || 0, saldo: bal }); });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle ? (
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Fluxo de Caixa</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Projeção a partir do saldo real, contas a receber e a pagar</p>
          </div>
        ) : <div />}
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs de caixa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Saldo em caixa hoje</p>
            {editingBalance ? (
              <div className="flex items-center gap-1 mt-1">
                <Input type="number" step="0.01" value={balanceDraft} onChange={e => setBalanceDraft(e.target.value)} className="h-8 text-sm" autoFocus />
                <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" disabled={saveBalance.isPending} onClick={() => saveBalance.mutate(Number(balanceDraft) || 0)}><Check className="w-4 h-4" /></Button>
              </div>
            ) : (
              <p className="text-xl font-bold font-mono flex items-center gap-2">{brl(openingBalance)}
                <button onClick={() => { setBalanceDraft(String(openingBalance)); setEditingBalance(true); }} className="text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
              </p>
            )}
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo projetado ({days}d)</p><p className={`text-xl font-bold font-mono ${endBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{brl(endBalance)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Menor saldo no período</p><p className={`text-xl font-bold font-mono ${lowestBalance >= 0 ? "text-blue-600" : "text-red-600"}`}>{brl(lowestBalance)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Atrasados (receber / pagar)</p><p className="text-sm font-bold font-mono"><span className="text-amber-600">{brl(overdueRev)}</span> / <span className="text-red-600">{brl(overdueExp)}</span></p></CardContent></Card>
      </div>

      {negativeDay && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>Atenção: o caixa fica <strong>negativo</strong> em <strong>{negativeDay.date}</strong> — saldo projetado: <strong>{brl(negativeDay.saldo)}</strong></p>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-velox-amber" /> Saldo Projetado — próximos {days} dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma conta a receber ou a pagar para o período.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={v => [brl(v), ""]} />
                <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="saldo" stroke={lowestBalance >= 0 ? "#10B981" : "#EF4444"} fill={lowestBalance >= 0 ? "#10B98120" : "#EF444420"} strokeWidth={2} name="Saldo Projetado" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {tableData.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Descrição</th>
                    <th className="text-right py-3 px-4 font-medium text-green-600">Entrada</th>
                    <th className="text-right py-3 px-4 font-medium text-red-600">Saída</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(0, 40).map((row, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-2 px-4 text-muted-foreground">{row.date}</td>
                      <td className="py-2 px-4">{row.desc}{row.overdue && <span className="ml-2 text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">atrasado</span>}</td>
                      <td className="py-2 px-4 text-right font-mono text-green-600">{row.entrada > 0 ? brl(row.entrada) : "—"}</td>
                      <td className="py-2 px-4 text-right font-mono text-red-600">{row.saida > 0 ? brl(row.saida) : "—"}</td>
                      <td className={`py-2 px-4 text-right font-mono font-semibold ${row.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>{brl(row.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

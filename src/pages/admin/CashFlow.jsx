import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { addDays, format, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CashFlow() {
  const [days, setDays] = useState("30");

  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => base44.entities.Revenue.list("-due_date", 200),
    select: (d) => d.filter(r => r.status === "receivable" && r.due_date),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-due_date", 200),
    select: (d) => d.filter(e => e.status === "pending" && e.due_date),
  });

  const numDays = parseInt(days);
  const today = new Date();

  // Build day-by-day projection
  const chartData = [];
  let runningBalance = 0;

  for (let i = 0; i < numDays; i++) {
    const day = addDays(today, i);
    const dayStr = format(day, "yyyy-MM-dd");
    const dayLabel = format(day, "dd/MM", { locale: ptBR });

    const dayRevenues = revenues
      .filter(r => r.due_date && r.due_date.startsWith(dayStr))
      .reduce((s, r) => s + (r.amount || 0), 0);

    const dayExpenses = expenses
      .filter(e => e.due_date && e.due_date.startsWith(dayStr))
      .reduce((s, e) => s + (e.amount || 0), 0);

    runningBalance += dayRevenues - dayExpenses;

    if (dayRevenues > 0 || dayExpenses > 0 || i % 7 === 0) {
      chartData.push({
        date: dayLabel,
        saldo: parseFloat(runningBalance.toFixed(2)),
        entrada: dayRevenues,
        saida: dayExpenses,
      });
    }
  }

  const lowestBalance = Math.min(...chartData.map(d => d.saldo));
  const negativeDay = chartData.find(d => d.saldo < 0);

  // Table data: only days with movements
  const tableData = [];
  let bal = 0;
  for (let i = 0; i < numDays; i++) {
    const day = addDays(today, i);
    const dayStr = format(day, "yyyy-MM-dd");

    const dayRevItems = revenues.filter(r => r.due_date?.startsWith(dayStr));
    const dayExpItems = expenses.filter(e => e.due_date?.startsWith(dayStr));

    if (dayRevItems.length + dayExpItems.length === 0) continue;

    dayRevItems.forEach(r => { bal += r.amount || 0; tableData.push({ date: format(day, "dd/MM/yyyy"), desc: r.description || "Receita", entrada: r.amount || 0, saida: 0, saldo: bal }); });
    dayExpItems.forEach(e => { bal -= e.amount || 0; tableData.push({ date: format(day, "dd/MM/yyyy"), desc: e.description || "Despesa", entrada: 0, saida: e.amount || 0, saldo: bal }); });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Fluxo de Caixa</h1>
          <p className="text-muted-foreground text-sm mt-1">Projeção baseada em contas a receber e a pagar</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="60">60 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {negativeDay && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>Atenção: projeção com saldo negativo a partir de <strong>{negativeDay.date}</strong> — saldo estimado: <strong>R$ {negativeDay.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></p>
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
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma conta a receber ou a pagar cadastrada para o período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `R$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  formatter={v => [`R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]}
                />
                <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke={lowestBalance >= 0 ? "#10B981" : "#EF4444"}
                  fill={lowestBalance >= 0 ? "#10B98120" : "#EF444420"}
                  strokeWidth={2}
                  name="Saldo Projetado"
                />
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
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground text-green-600">Entrada</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground text-red-600">Saída</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.slice(0, 30).map((row, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="py-2 px-4 text-muted-foreground">{row.date}</td>
                      <td className="py-2 px-4">{row.desc}</td>
                      <td className="py-2 px-4 text-right font-mono text-green-600">{row.entrada > 0 ? `R$ ${row.entrada.toFixed(2)}` : "—"}</td>
                      <td className="py-2 px-4 text-right font-mono text-red-600">{row.saida > 0 ? `R$ ${row.saida.toFixed(2)}` : "—"}</td>
                      <td className={`py-2 px-4 text-right font-mono font-semibold ${row.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>R$ {row.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
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
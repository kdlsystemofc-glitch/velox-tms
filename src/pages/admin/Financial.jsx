import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Financial({ hideTitle = false }) {
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => base44.entities.Revenue.list("-due_date", 500),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 200),
  });

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthRevenue = revenues
    .filter((r) => {
      const d = new Date(r.due_date || r.created_date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const monthExpenses = expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const profit = monthRevenue - monthExpenses;

  // Last 6 months data
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const m = (thisMonth - 5 + i + 12) % 12;
    const y = m > thisMonth ? thisYear - 1 : thisYear;
    const rev = revenues
      .filter((r) => { const d = new Date(r.due_date || r.created_date); return d.getMonth() === m && d.getFullYear() === y; })
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const exp = expenses
      .filter((e) => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; })
      .reduce((s, e) => s + (e.amount || 0), 0);
    return { name: monthNames[m], receita: rev, despesa: exp };
  });

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Visão financeira do mês</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Receita do mês</span>
          </div>
          <p className="text-2xl font-bold font-mono text-green-600">R$ {monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Despesas do mês</span>
          </div>
          <p className="text-2xl font-bold font-mono text-red-600">R$ {monthExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${profit >= 0 ? "bg-blue-100" : "bg-red-100"}`}>
              <DollarSign className={`w-5 h-5 ${profit >= 0 ? "text-blue-600" : "text-red-600"}`} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Resultado</span>
          </div>
          <p className={`text-2xl font-bold font-mono ${profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
            R$ {profit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-heading font-semibold flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-velox-amber" />
            Receita x Despesa (últimos 6 meses)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
              />
              <Bar dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} name="Receita" />
              <Bar dataKey="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} name="Despesa" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
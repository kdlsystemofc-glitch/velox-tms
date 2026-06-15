import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FileText, Download } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { jsPDF } from "jspdf";

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const categoryLabels = {
  fuel: "Combustível", maintenance: "Manutenção", tires: "Pneus", tolls: "Pedágios",
  salaries: "Salários", taxes: "Impostos/Enc.", insurance: "Seguros", rent: "Aluguel",
  administrative: "Administrativo", marketing: "Marketing", other: "Outros",
};
const variableCosts = ["fuel", "maintenance", "tires", "tolls"];
const fixedCosts = ["salaries", "taxes", "insurance", "rent", "administrative", "marketing"];
const COLORS = ["#F59E0B", "#1E3A5F", "#10B981", "#EF4444", "#64748B", "#8B5CF6", "#EC4899"];

export default function DRE({ hideTitle = false }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const { settings } = useCompanySettings();
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 500) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 500) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });

  const month = parseInt(selectedMonth);
  const year = parseInt(selectedYear);

  const periodOrders = orders.filter(o => {
    const d = new Date(o.created_date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const periodExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const taxRate = (settings?.tax_rate_percent || 5) / 100;
  const depreciation = settings?.monthly_depreciation || 800;

  const grossRevenue = periodOrders.reduce((s, o) => s + (o.freight_value || 0), 0);
  const taxes = grossRevenue * taxRate;
  const netRevenue = grossRevenue - taxes;

  const varTotal = variableCosts.reduce((s, c) => s + periodExpenses.filter(e => e.category === c).reduce((ss, e) => ss + (e.amount || 0), 0), 0);
  const fixTotal = fixedCosts.reduce((s, c) => s + periodExpenses.filter(e => e.category === c).reduce((ss, e) => ss + (e.amount || 0), 0), 0);
  const otherExp = periodExpenses.filter(e => !variableCosts.includes(e.category) && !fixedCosts.includes(e.category)).reduce((s, e) => s + (e.amount || 0), 0);
  const ebitda = netRevenue - varTotal - fixTotal - otherExp;
  const netProfit = ebitda - depreciation;
  const margin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const costsByCategory = Object.entries(categoryLabels).map(([k, label]) => ({
    name: label,
    value: periodExpenses.filter(e => e.category === k).reduce((s, e) => s + (e.amount || 0), 0),
  })).filter(c => c.value > 0);

  // Resultado por caminhão (centro de custo): receita dos pedidos atribuídos vs despesas diretas
  const truckResults = trucks.map(t => {
    const revenue = periodOrders
      .filter(o => (o.truck_id === t.id || o.scheduled_truck_id === t.id) && o.status !== "cancelled")
      .reduce((s, o) => s + (o.freight_value || 0), 0);
    const directCosts = periodExpenses
      .filter(e => e.truck_id === t.id)
      .reduce((s, e) => s + (e.amount || 0), 0);
    return { truck: t, revenue, directCosts, result: revenue - directCosts };
  }).filter(r => r.revenue > 0 || r.directCosts > 0);

  const generateDREPdf = () => {
    const doc = new jsPDF();
    const companyName = (settings?.company_name || "VELOX TRANSPORTADORA").toUpperCase();
    const cnpj = settings?.cnpj || "";
    const periodLabel = `${MONTH_NAMES[month]}/${year}`;
    const now = new Date();
    const geradoEm = `${now.toLocaleDateString("pt-BR")} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    const fmt = (v) => v < 0
      ? `(R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`
      : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

    let y = 20;
    const lw = 190; // line width
    const colRight = 200;

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(companyName, 105, y, { align: "center" });
    y += 7;

    if (cnpj) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`CNPJ: ${cnpj}`, 105, y, { align: "center" });
      y += 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DEMONSTRATIVO DE RESULTADO DO EXERCÍCIO", 105, y, { align: "center" });
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel}`, 105, y, { align: "center" });
    y += 5;

    doc.setDrawColor(180, 140, 0);
    doc.setLineWidth(0.8);
    doc.line(10, y, 200, y);
    y += 8;

    const drawRow = (label, value, opts = {}) => {
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(opts.bold ? 10 : 9.5);
      doc.setTextColor(opts.color || 0);
      doc.text(opts.indent ? `    ${label}` : label, 12, y);
      doc.text(value, colRight, y, { align: "right" });
      doc.setTextColor(0);
      y += 6;
    };

    const drawSection = (title) => {
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text(title.toUpperCase(), 12, y);
      doc.setTextColor(0);
      y += 5;
    };

    const drawSeparator = (thick = false) => {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(thick ? 0.5 : 0.2);
      doc.line(10, y - 2, 200, y - 2);
      y += 2;
    };

    drawSection("Receitas");
    drawRow("(+) Receita Bruta", fmt(grossRevenue), { bold: true });
    drawRow("Fretes realizados", fmt(grossRevenue), { indent: true });
    drawRow(`(-) Deduções estimadas (${(taxRate * 100).toFixed(1)}%)`, fmt(-taxes), { indent: true });
    drawRow("(=) Receita Líquida", fmt(netRevenue), { bold: true });
    drawSeparator();

    drawSection("Custos Variáveis");
    variableCosts.forEach(c => {
      const val = periodExpenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0);
      if (val > 0) drawRow(categoryLabels[c], fmt(-val), { indent: true });
    });
    drawRow("(-) Total Variável", fmt(-varTotal), { bold: true });
    drawSeparator();

    drawSection("Custos Fixos");
    fixedCosts.forEach(c => {
      const val = periodExpenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0);
      if (val > 0) drawRow(categoryLabels[c], fmt(-val), { indent: true });
    });
    drawRow("(-) Total Fixo", fmt(-fixTotal), { bold: true });
    drawSeparator(true);

    y += 3;
    drawRow("(=) Resultado Operacional (EBITDA)", fmt(ebitda), { bold: true });
    drawRow("(-) Depreciação estimada (frota)", fmt(-depreciation), { indent: true });

    y += 2;
    doc.setDrawColor(0);
    doc.setLineWidth(0.8);
    doc.line(10, y - 2, 200, y - 2);
    y += 4;

    const profitColor = netProfit >= 0 ? [22, 163, 74] : [220, 38, 38];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...profitColor);
    doc.text(`(=) ${netProfit >= 0 ? "LUCRO" : "PREJUÍZO"} LÍQUIDO`, 12, y);
    doc.text(fmt(Math.abs(netProfit)), colRight, y, { align: "right" });
    doc.setTextColor(0);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Margem líquida: ${margin.toFixed(1)}%`, 105, y, { align: "center" });
    doc.setTextColor(0);
    y += 10;

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(10, y, 200, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Documento gerencial — não tem validade fiscal.", 105, y, { align: "center" });
    y += 5;
    doc.text(`Gerado em ${geradoEm}`, 105, y, { align: "center" });
    y += 5;
    doc.text(`Parâmetros: alíquota ${(taxRate * 100).toFixed(1)}% · depreciação R$ ${depreciation.toLocaleString("pt-BR")}/mês`, 105, y, { align: "center" });

    doc.save(`DRE-Velox-${MONTH_NAMES[month]}-${year}.pdf`);
  };

  const exportCSV = () => {
    const BOM = "\uFEFF";
    const lines = [
      ["Descrição", "Valor (R$)"],
      ["(+) Receita Bruta", grossRevenue.toFixed(2)],
      ["  Fretes realizados", grossRevenue.toFixed(2)],
      [`  (-) Deduções estimadas (${(taxRate * 100).toFixed(1)}%)`, (-taxes).toFixed(2)],
      ["(=) Receita Líquida", netRevenue.toFixed(2)],
      ["--- Custos Variáveis ---", ""],
      ...variableCosts.map(c => {
        const val = periodExpenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0);
        return [`  ${categoryLabels[c]}`, (-val).toFixed(2)];
      }),
      ["(-) Total Variável", (-varTotal).toFixed(2)],
      ["--- Custos Fixos ---", ""],
      ...fixedCosts.map(c => {
        const val = periodExpenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0);
        return [`  ${categoryLabels[c]}`, (-val).toFixed(2)];
      }),
      ["(-) Total Fixo", (-fixTotal).toFixed(2)],
      ["(=) EBITDA", ebitda.toFixed(2)],
      ["  (-) Depreciação estimada (frota)", (-depreciation).toFixed(2)],
      [`(=) ${netProfit >= 0 ? "LUCRO" : "PREJUÍZO"} LÍQUIDO`, netProfit.toFixed(2)],
      [`Margem líquida`, `${margin.toFixed(1)}%`],
    ];
    const csv = BOM + lines.map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DRE-Velox-${MONTH_NAMES[month]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Row = ({ label, value, indent = false, bold = false, color = "" }) => (
    <div className={`flex items-center justify-between py-1.5 border-b border-border/30 ${bold ? "font-semibold text-base" : "text-sm"}`}>
      <span className={`${indent ? "pl-6" : ""} ${color} text-muted-foreground`}>{label}</span>
      <span className={`font-mono ${color} ${bold ? "text-base" : ""} ${value < 0 ? "text-red-600" : ""}`}>
        {value < 0 ? `(R$ ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})` : `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        {!hideTitle ? (
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">DRE</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Demonstrativo de Resultado</p>
          </div>
        ) : <div />}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}><Download className="w-4 h-4" /> Exportar Excel</Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={generateDREPdf}><FileText className="w-4 h-4" /> Gerar PDF</Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="font-display text-lg font-bold text-center mb-4 uppercase tracking-wide">
            Demonstrativo de Resultado — {MONTH_NAMES[month]}/{year}
          </h2>

          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 mt-2">Receitas</div>
            <Row label="(+) Receita Bruta" value={grossRevenue} bold />
            <Row label="Fretes realizados" value={grossRevenue} indent />
            <Row label={`(-) Deduções estimadas (${(taxRate*100).toFixed(1)}%)`} value={-taxes} indent />
            <Row label="(=) Receita Líquida" value={netRevenue} bold />

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 mt-3">Custos Variáveis</div>
            {variableCosts.map(c => {
              const val = periodExpenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0);
              return val > 0 ? <Row key={c} label={categoryLabels[c]} value={-val} indent /> : null;
            })}
            <Row label="(-) Total Variável" value={-varTotal} bold />

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 mt-3">Custos Fixos</div>
            {fixedCosts.map(c => {
              const val = periodExpenses.filter(e => e.category === c).reduce((s, e) => s + (e.amount || 0), 0);
              return val > 0 ? <Row key={c} label={categoryLabels[c]} value={-val} indent /> : null;
            })}
            <Row label="(-) Total Fixo" value={-fixTotal} bold />

            <div className="mt-4 pt-2 border-t-2 border-border">
              <Row label="(=) Resultado Operacional (EBITDA)" value={ebitda} bold />
              <Row label="(-) Depreciação estimada (frota)" value={-depreciation} indent />
            </div>

            <div className="mt-4 pt-2 border-t-2 border-border">
              <div className={`flex items-center justify-between py-2 text-lg font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                <span>(=) {netProfit >= 0 ? "LUCRO" : "PREJUÍZO"} LÍQUIDO</span>
                <span className="font-mono">R$ {Math.abs(netProfit).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="text-sm text-muted-foreground text-center">Margem líquida: {margin.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {costsByCategory.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-4">Composição dos Custos</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={costsByCategory} innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                  {costsByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `R$ ${Number(v).toFixed(2)}`} />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Resultado por caminhão (centro de custo) */}
      {truckResults.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-sm mb-1">Resultado por Caminhão</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Receita dos fretes atribuídos ao veículo vs despesas lançadas com o veículo (combustível, manutenção, pedágio...). Custos fixos gerais não são rateados.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted-foreground">Placa</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Receita</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Custos diretos</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {truckResults.map(({ truck, revenue, directCosts, result }) => (
                    <tr key={truck.id} className="border-b border-border/40">
                      <td className="py-2 font-mono font-semibold">{truck.plate}</td>
                      <td className="py-2 text-right font-mono text-green-600">R$ {revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right font-mono text-red-600">R$ {directCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${result >= 0 ? "text-green-600" : "text-red-600"}`}>
                        R$ {result.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center pb-2">
        Documento gerencial — não tem validade fiscal. Gerado em {new Date().toLocaleDateString("pt-BR")}.
      </p>
      <p className="text-xs text-muted-foreground text-center pb-4">
        Parâmetros usados: Alíquota fiscal: {(taxRate*100).toFixed(1)}% · Depreciação mensal: R$ {depreciation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}
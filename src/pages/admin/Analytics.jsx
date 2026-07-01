import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { computeOTIF, laneAnalysis, clientAnalysis } from "@/utils/analytics";
import { BarChart3, Target, DollarSign, Route } from "lucide-react";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const pctColor = (p) => p == null ? "" : p >= 95 ? "text-green-600 dark:text-green-300" : p >= 85 ? "text-amber-600 dark:text-amber-300" : "text-red-600 dark:text-red-300";

export default function Analytics() {
  const { settings } = useCompanySettings();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });

  const otif = useMemo(() => computeOTIF(orders, settings), [orders, settings]);
  const lanes = useMemo(() => laneAnalysis(orders).slice(0, 12), [orders]);
  const clients = useMemo(() => clientAnalysis(orders).slice(0, 12), [orders]);
  const freightSpend = useMemo(() => orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (Number(o.freight_value) || 0), 0), [orders]);

  return (
    <div className="space-y-4">
      <PageHeader icon={BarChart3} title="Análises" subtitle="Nível de serviço (OTIF) e gasto de frete por corredor e cliente." />

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Target} label="OTIF" value={otif.otifPct != null ? `${otif.otifPct}%` : "—"} tone="primary" hint={`${otif.otif}/${otif.total} entregas`} />
            <StatCard icon={Target} label="No prazo (OT)" value={otif.onTimePct != null ? `${otif.onTimePct}%` : "—"} tone="success" />
            <StatCard icon={Target} label="Completo (IF)" value={otif.inFullPct != null ? `${otif.inFullPct}%` : "—"} tone="success" />
            <StatCard icon={DollarSign} label="Frete total" value={brl(freightSpend)} tone="primary" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Corredores */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-sm font-semibold flex items-center gap-1.5"><Route className="w-4 h-4 text-velox-amber" /> Por corredor (top 12)</div>
              {lanes.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Sem dados.</div> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 px-4">Corredor</th><th className="py-2 px-4 text-right">Pedidos</th><th className="py-2 px-4 text-right">Frete</th><th className="py-2 px-4 text-right hidden sm:table-cell">R$/kg</th>
                  </tr></thead>
                  <tbody>
                    {lanes.map(l => (
                      <tr key={l.lane} className="border-b border-border/50 last:border-0">
                        <td className="py-2 px-4 font-mono">{l.lane}</td>
                        <td className="py-2 px-4 text-right text-muted-foreground">{l.orders}</td>
                        <td className="py-2 px-4 text-right font-mono">{brl(l.freight)}</td>
                        <td className="py-2 px-4 text-right font-mono text-muted-foreground hidden sm:table-cell">{l.avgPerKg > 0 ? `R$ ${l.avgPerKg.toFixed(2)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Clientes */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-sm font-semibold flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-velox-amber" /> Por cliente (top 12)</div>
              {clients.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Sem dados.</div> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 px-4">Cliente</th><th className="py-2 px-4 text-right">Pedidos</th><th className="py-2 px-4 text-right">Frete</th><th className="py-2 px-4 text-right hidden sm:table-cell">Ticket</th>
                  </tr></thead>
                  <tbody>
                    {clients.map(c => (
                      <tr key={c.client_id || c.client_name} className="border-b border-border/50 last:border-0">
                        <td className="py-2 px-4 max-w-[160px] truncate">{c.client_name}</td>
                        <td className="py-2 px-4 text-right text-muted-foreground">{c.orders}</td>
                        <td className="py-2 px-4 text-right font-mono">{brl(c.freight)}</td>
                        <td className="py-2 px-4 text-right font-mono text-muted-foreground hidden sm:table-cell">{brl(c.avgTicket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <p className={`text-xs px-1 ${pctColor(otif.otifPct)}`}>OTIF = entregue no prazo (SLA) e completo (sem entrega parcial). Base: {otif.total} entregas.</p>
        </>
      )}
    </div>
  );
}

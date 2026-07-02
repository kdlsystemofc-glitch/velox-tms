import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/repositories";
import { supabase } from "@/api/supabaseClient";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { computeOTIF, laneAnalysis, clientAnalysis } from "@/utils/analytics";
import { fleetCO2 } from "@/utils/carbon";
import { BarChart3, Target, DollarSign, Route, Leaf } from "lucide-react";

// Consome uma view analítica do servidor (PA-01); se ausente/erro, retorna null
// e o componente cai no cálculo cliente (utils/analytics) — fallback seguro.
function useServerView(view) {
  const { data } = useQuery({
    queryKey: ["analytics-view", view],
    queryFn: async () => { const { data, error } = await supabase.from(view).select("*").limit(12); if (error) throw error; return data || []; },
    retry: false, staleTime: 60_000,
  });
  return data;
}

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const pctColor = (p) => p == null ? "" : p >= 95 ? "text-green-600 dark:text-green-300" : p >= 85 ? "text-amber-600 dark:text-amber-300" : "text-red-600 dark:text-red-300";

export default function Analytics() {
  const { settings } = useCompanySettings();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"], queryFn: () => db.Order.list("-created_date", 1000),
  });
  const { data: trips = [] } = useQuery({
    queryKey: ["trips"], queryFn: () => db.Trip.list("-created_date", 500),
  });

  // Agregações do servidor (views) com fallback ao cálculo cliente (PA-01).
  const laneView = useServerView("v_lane_analysis");
  const clientView = useServerView("v_client_analysis");

  const otif = useMemo(() => computeOTIF(orders, settings), [orders, settings]);
  const co2 = useMemo(() => fleetCO2(trips), [trips]);
  const lanes = useMemo(() => (laneView?.length
    ? laneView.map(l => ({ lane: l.lane, orders: l.orders, freight: Number(l.freight), avgPerKg: Number(l.avg_per_kg) }))
    : laneAnalysis(orders).slice(0, 12)), [laneView, orders]);
  const clients = useMemo(() => (clientView?.length
    ? clientView.map(c => ({ client_id: c.client_id, client_name: c.client_name, orders: c.orders, freight: Number(c.freight), avgTicket: Number(c.avg_ticket) }))
    : clientAnalysis(orders).slice(0, 12)), [clientView, orders]);
  const freightSpend = useMemo(() => orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (Number(o.freight_value) || 0), 0), [orders]);

  return (
    <div className="space-y-4">
      <PageHeader icon={BarChart3} title="Análises" subtitle="Nível de serviço (OTIF) e gasto de frete por corredor e cliente." />

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={Target} label="OTIF" value={otif.otifPct != null ? `${otif.otifPct}%` : "—"} tone="primary" hint={`${otif.otif}/${otif.total} entregas`} />
            <StatCard icon={Target} label="No prazo (OT)" value={otif.onTimePct != null ? `${otif.onTimePct}%` : "—"} tone="success" />
            <StatCard icon={Target} label="Completo (IF)" value={otif.inFullPct != null ? `${otif.inFullPct}%` : "—"} tone="success" />
            <StatCard icon={DollarSign} label="Frete total" value={brl(freightSpend)} tone="primary" />
            <StatCard icon={Leaf} label="CO₂ (frota)" value={co2.kg >= 1000 ? `${(co2.kg / 1000).toFixed(1)} t` : `${co2.kg} kg`} tone="success" hint={co2.perKm != null ? `${co2.perKm} kg/km · ${co2.trips} viagens` : `${co2.trips} viagens`} />
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

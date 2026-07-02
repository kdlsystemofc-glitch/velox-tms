import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/repositories";
import { Link } from "react-router-dom";
import StatCard from "@/components/shared/StatCard";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { auditThreeWay } from "@/services/freightThreeWay";
import { ScanLine, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const STATUS = {
  ok: { label: "OK", cls: "bg-green-500/15 text-green-700 dark:text-green-300" },
  under: { label: "Subcobrado", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
  over: { label: "Sobrecobrado", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  na: { label: "—", cls: "bg-muted text-muted-foreground" },
};
const TABS = [["all", "Todos"], ["diverg", "Divergentes"], ["under", "Subcobrados"], ["over", "Sobrecobrados"]];

export default function FreightAudit() {
  const { settings } = useCompanySettings();
  const [tab, setTab] = useState("diverg");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"], queryFn: () => db.Order.list("-created_date", 1000),
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => db.Client.list() });
  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  // Audita pedidos com frete cobrado (não cancelados). 3-way: contratado (snapshot)
  // × executado (recálculo) × cobrado. A coluna Divergência usa cobrado × executado.
  const audited = useMemo(() => {
    return orders
      .filter(o => o.status !== "cancelled" && Number(o.freight_value) > 0)
      .map(o => ({ order: o, audit: auditThreeWay(o, { client: clientById[o.client_id], settings }) }))
      .sort((a, b) => Math.abs(b.audit.executedVsCharged.diff) - Math.abs(a.audit.executedVsCharged.diff));
  }, [orders, clientById, settings]);

  const diverg = audited.filter(a => a.audit.status === "diverge");
  const underTotal = audited.filter(a => a.audit.executedVsCharged.status === "under").reduce((s, a) => s + a.audit.executedVsCharged.diff, 0); // negativo
  const overTotal = audited.filter(a => a.audit.executedVsCharged.status === "over").reduce((s, a) => s + a.audit.executedVsCharged.diff, 0);   // positivo

  const rows = tab === "all" ? audited
    : tab === "diverg" ? diverg
    : audited.filter(a => a.audit.executedVsCharged.status === tab);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={AlertTriangle} label="Pedidos divergentes" value={diverg.length} tone="warning" />
        <StatCard icon={TrendingDown} label="Subcobrado (perda)" value={brl(Math.abs(underTotal))} tone="danger" />
        <StatCard icon={TrendingUp} label="Sobrecobrado" value={brl(overTotal)} tone="primary" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-semibold flex items-center gap-1.5"><ScanLine className="w-4 h-4 text-velox-amber" /> Auditoria de frete (contratado × executado × cobrado)</span>
          <div className="flex gap-1">
            {TABS.map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${tab === v ? "bg-brand-gradient text-white" : "text-muted-foreground hover:bg-muted"}`}>{l}</button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <ScanLine className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-foreground font-medium">Nada a exibir</p>
            <p className="text-sm text-muted-foreground mt-1">{tab === "diverg" ? "Nenhuma divergência acima da tolerância (5%)." : "Sem pedidos com frete cobrado."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2.5 px-4">Protocolo</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4 text-right hidden lg:table-cell">Contratado</th>
                  <th className="py-2.5 px-4 text-right">Cobrado</th>
                  <th className="py-2.5 px-4 text-right">Executado</th>
                  <th className="py-2.5 px-4 text-right">Divergência</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ order: o, audit: a }) => (
                  <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 px-4"><Link to={`/admin/coletas/${o.id}`} className="font-mono text-velox-amber hover:underline text-xs">{o.protocol}</Link></td>
                    <td className="py-2.5 px-4 max-w-[180px] truncate">{o.client_name || "—"}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted-foreground hidden lg:table-cell"
                      title={a.contractedVsCharged.status === "over" || a.contractedVsCharged.status === "under" ? "Cobrado difere do contratado" : ""}>
                      {a.contracted > 0 ? brl(a.contracted) : "—"}
                      {a.contracted > 0 && a.contractedVsCharged.status !== "ok" && a.contractedVsCharged.status !== "na" && " ⚠"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">{brl(a.charged)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">{brl(a.executed)}</td>
                    <td className={`py-2.5 px-4 text-right font-mono font-semibold ${a.executedVsCharged.diff < 0 ? "text-red-600 dark:text-red-300" : a.executedVsCharged.diff > 0 ? "text-amber-600 dark:text-amber-300" : ""}`}>
                      {a.executedVsCharged.diff > 0 ? "+" : ""}{brl(a.executedVsCharged.diff)} <span className="text-[10px] font-normal">({a.executedVsCharged.diffPct > 0 ? "+" : ""}{a.executedVsCharged.diffPct}%)</span>
                    </td>
                    <td className="py-2.5 px-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(STATUS[a.executedVsCharged.status] || STATUS.na).cls}`}>{(STATUS[a.executedVsCharged.status] || STATUS.na).label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground px-1">Contratado = preço congelado no snapshot do pedido · Executado = recálculo pelo motor de tarifação (cliente/lane/faixas) com o peso real · Cobrado = valor lançado. Tolerância de 5%. ⚠ na coluna Contratado = cobrança difere do acordado.</p>
    </div>
  );
}

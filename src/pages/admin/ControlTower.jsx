import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { incidentSlaStatus } from "@/utils/incidentSla";
import { findStaleOrders, DEFAULT_STALE_DAYS } from "@/utils/staleOrders";
import { auditOrderFreight } from "@/utils/freightAudit";
import { RadioTower, ShieldAlert, PackageX, Bell, FileWarning, ScanLine, Navigation, CheckCircle2, ArrowRight } from "lucide-react";

const LIVE = 30_000;
const todayISO = () => new Date().toISOString().slice(0, 10);
// minutos desde um timestamp
const minsSince = (ts) => ts ? Math.round((Date.now() - new Date(ts).getTime()) / 60000) : Infinity;

const SEV = {
  critical: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  high: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  medium: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

export default function ControlTower() {
  const { settings } = useCompanySettings();

  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-all"], queryFn: () => base44.entities.Incident.list("-created_date", 300), select: d => d.filter(i => i.status !== "resolved"), refetchInterval: LIVE });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 600), refetchInterval: LIVE });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: () => base44.entities.Alert.list("-created_date", 100), select: d => d.filter(a => !a.resolved), refetchInterval: LIVE });
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-issue_date", 500) });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 120), refetchInterval: LIVE });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  const staleDays = settings?.stale_order_days || DEFAULT_STALE_DAYS;

  const buckets = useMemo(() => {
    const slaLate = incidents.filter(i => incidentSlaStatus(i, settings) === "late");
    const stale = findStaleOrders(orders, staleDays);
    const critAlerts = alerts.filter(a => a.level === "critical");
    const overdueInv = invoices.filter(i => i.status === "open" && i.due_date && i.due_date < todayISO());
    const undercharged = orders
      .filter(o => o.status !== "cancelled" && Number(o.freight_value) > 0)
      .map(o => ({ o, a: auditOrderFreight(o, { client: clientById[o.client_id], settings }) }))
      .filter(x => x.a.status === "under");
    const noGps = trips.filter(t => t.status === "in_progress" && minsSince(t.location_updated_at) > 30);

    return [
      {
        key: "sla", severity: "critical", icon: ShieldAlert, title: "Ocorrências com SLA estourado",
        count: slaLate.length, cta: { to: "/admin/ocorrencias", label: "Ver ocorrências" },
        items: slaLate.slice(0, 4).map(i => ({ label: `${i.type || "Ocorrência"} — ${i.order_protocol || i.protocol || ""}`, to: "/admin/ocorrencias" })),
      },
      {
        key: "alerts", severity: "critical", icon: Bell, title: "Alertas críticos não resolvidos",
        count: critAlerts.length, cta: { to: "/admin/alertas", label: "Ver alertas" },
        items: critAlerts.slice(0, 4).map(a => ({ label: a.message || a.type, to: "/admin/alertas" })),
      },
      {
        key: "stale", severity: "high", icon: PackageX, title: `Pedidos parados (> ${staleDays} dias)`,
        count: stale.length, cta: { to: "/admin/coletas", label: "Ver pedidos" },
        items: stale.slice(0, 4).map(o => ({ label: `${o.protocol} — ${o.client_name || ""}`, to: `/admin/coletas/${o.id}` })),
      },
      {
        key: "nogps", severity: "high", icon: Navigation, title: "Viagens sem GPS recente (> 30 min)",
        count: noGps.length, cta: { to: "/admin/mapa", label: "Ver mapa" },
        items: noGps.slice(0, 4).map(t => ({ label: `${t.truck_plate || "Caminhão"} — ${t.driver_name || ""}`, to: `/admin/viagens/${t.id}` })),
      },
      {
        key: "overdue", severity: "high", icon: FileWarning, title: "Faturas vencidas em aberto",
        count: overdueInv.length, cta: { to: "/admin/financeiro?aba=faturas", label: "Ver faturas" },
        items: overdueInv.slice(0, 4).map(i => ({ label: `${i.number || "Fatura"} — ${i.client_name || ""}`, to: "/admin/financeiro?aba=faturas" })),
      },
      {
        key: "under", severity: "medium", icon: ScanLine, title: "Fretes subcobrados (auditoria)",
        count: undercharged.length, cta: { to: "/admin/financeiro?aba=auditoria", label: "Ver auditoria" },
        items: undercharged.slice(0, 4).map(x => ({ label: `${x.o.protocol} — ${x.a.diffPct}%`, to: `/admin/coletas/${x.o.id}` })),
      },
    ];
  }, [incidents, orders, alerts, invoices, trips, clientById, settings, staleDays]);

  const active = buckets.filter(b => b.count > 0);
  const totalExceptions = active.reduce((s, b) => s + b.count, 0);

  return (
    <div className="space-y-4 max-w-5xl">
      <PageHeader icon={RadioTower} title="Torre de Controle" subtitle="Todas as exceções operacionais e financeiras em um só lugar, priorizadas." />

      {active.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="text-foreground font-medium">Nenhuma exceção no momento</p>
          <p className="text-sm text-muted-foreground mt-1">Operação sob controle. 🎉</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{totalExceptions}</span> exceção(ões) em {active.length} categoria(s).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {active.map(b => (
              <div key={b.key} className={`rounded-xl border p-4 ${SEV[b.severity]}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <b.icon className="w-5 h-5" />
                    <h3 className="font-semibold text-sm">{b.title}</h3>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{b.count}</span>
                </div>
                <ul className="space-y-1 mb-2">
                  {b.items.map((it, i) => (
                    <li key={i} className="text-xs truncate">
                      <Link to={it.to} className="hover:underline">• {it.label}</Link>
                    </li>
                  ))}
                  {b.count > b.items.length && <li className="text-xs opacity-70">+ {b.count - b.items.length} outros…</li>}
                </ul>
                <Link to={b.cta.to} className="inline-flex items-center gap-1 text-xs font-semibold hover:underline">
                  {b.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

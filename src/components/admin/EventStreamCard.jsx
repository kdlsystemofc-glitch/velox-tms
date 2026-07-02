import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { supabase } from "@/api/supabaseClient";
import { useRealtime } from "@/hooks/useRealtime";
import { useToast } from "@/components/ui/use-toast";
import { Activity, Play } from "lucide-react";

const fmt = (ts) => (ts ? new Date(ts).toLocaleString("pt-BR") : "—");

// Rótulos amigáveis dos tipos de evento do backbone (P05).
const LABEL = {
  "order.created": "Pedido criado",
  "order.status_changed": "Pedido mudou de status",
  "settlement.created": "Baixa registrada",
  "settlement.reversed": "Baixa estornada",
  "incident.opened": "Ocorrência aberta",
  "incident.resolved": "Ocorrência resolvida",
  "transfer.status_changed": "Transferência mudou de status",
  "maintenance.overdue_swept": "Varredura de vencidos",
  "invoice.created": "Fatura gerada",
  "carrier.settled": "Acerto de parceiro",
  "incident.sla_breached": "SLA estourado",
};

// Rótulos do resumo do último job (P06).
const JOB_LABEL = {
  sweep_overdue: "vencidos",
  run_billing_cycle: "faturas",
  sweep_carrier: "acertos",
  auto_reconcile: "conciliados",
  sweep_incident_sla: "SLA",
  notify_from_events: "notif.",
  dispatch_notifications: "enviadas",
};

/**
 * Observabilidade do backbone de eventos (Projeto 05.4): fluxo recente de
 * domain_events (ao vivo via realtime) + última execução dos jobs + disparo
 * manual de run_due_jobs. Somente staff (RLS).
 */
export default function EventStreamCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useRealtime(["domain_events"], ["domain-events"]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["domain-events"],
    queryFn: () => db.DomainEvent.list("-created_at", 20),
  });

  const { data: lastRun } = useQuery({
    queryKey: ["job-runs-last"],
    queryFn: async () => {
      const { data, error } = await supabase.from("job_runs").select("*").order("ran_at", { ascending: false }).limit(1);
      if (error) throw error;
      return (data && data[0]) || null;
    },
  });

  const runJobs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("run_due_jobs");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-runs-last"] });
      queryClient.invalidateQueries({ queryKey: ["domain-events"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast({ title: "Jobs executados", description: "Automações e notificações processadas." });
    },
    onError: (e) => toast({ title: "Erro ao executar jobs", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold flex items-center gap-1.5"><Activity className="w-4 h-4 text-velox-amber" /> Eventos & Jobs</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground">Último job: {lastRun ? fmt(lastRun.ran_at) : "nunca"}</span>
          <button onClick={() => runJobs.mutate()} disabled={runJobs.isPending}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-gradient text-white inline-flex items-center gap-1 disabled:opacity-60">
            <Play className="w-3 h-3" /> {runJobs.isPending ? "Rodando…" : "Rodar jobs agora"}
          </button>
        </div>
        {lastRun?.result && (
          <p className="w-full text-[11px] text-muted-foreground">
            Último resultado: {Object.entries(JOB_LABEL)
              .filter(([k]) => Number(lastRun.result[k]) > 0)
              .map(([k, l]) => `${l} ${lastRun.result[k]}`).join(" · ") || "nada pendente"}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Nenhum evento registrado ainda.</div>
      ) : (
        <ul className="divide-y divide-border/60 max-h-72 overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="px-4 py-2 flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                <span className="font-medium">{LABEL[e.type] || e.type}</span>
                {e.entity_id && <span className="text-muted-foreground text-xs ml-2 font-mono">{e.entity}:{String(e.entity_id).slice(0, 8)}</span>}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">{fmt(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

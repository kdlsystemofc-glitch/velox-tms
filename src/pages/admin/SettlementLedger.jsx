import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { supabase } from "@/api/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import StatCard from "@/components/shared/StatCard";
import { BookOpen, Check, AlertTriangle, Undo2 } from "lucide-react";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const SOURCE = { manual: "Manual", bank: "Extrato", invoice: "Fatura", backfill: "Histórico" };
const TYPE = { revenue: "Receita", expense: "Despesa" };

/**
 * Razão de liquidação (Projeto 04.4): eventos de baixa (settlements) + estornos +
 * indicador de reconciliação (relatório × razão devem bater). Somente staff (RLS).
 */
export default function SettlementLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reverting, setReverting] = useState(null);

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ["settlements"],
    queryFn: () => db.Settlement.list("-created_at", 300),
  });

  const { data: recon = [], error: reconError } = useQuery({
    queryKey: ["ledger-reconciliation"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_ledger_reconciliation").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const unsettleMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc("unsettle", { p_settlement_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setReverting(null);
      toast({ title: "Baixa estornada", description: "Conta reaberta e razão ajustado." });
    },
    onError: (e) => { setReverting(null); toast({ title: "Erro ao estornar", description: e?.message, variant: "destructive" }); },
  });

  const reconOk = recon.every((r) => Math.round(Number(r.diferenca) * 100) === 0);

  return (
    <div className="space-y-4">
      {/* Indicador de reconciliação: relatório × razão */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`rounded-xl border p-4 ${reconError ? "border-border" : reconOk ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {reconError ? <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              : reconOk ? <Check className="w-4 h-4 text-green-600 dark:text-green-300" />
              : <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-300" />}
            Reconciliação relatório × razão
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {reconError ? "Aplique as migrations do razão para habilitar." : reconOk ? "Bate: relatórios conferem com o razão." : "Não bate — revise as baixas."}
          </p>
        </div>
        {recon.map((r) => (
          <StatCard key={r.dimensao} icon={BookOpen}
            label={r.dimensao === "receitas_recebidas" ? "Receitas × razão" : "Despesas × razão"}
            value={brl(r.ledger_total)}
            tone={Math.round(Number(r.diferenca) * 100) === 0 ? "success" : "danger"} />
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-sm font-semibold flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-velox-amber" /> Razão de liquidação</span>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando…</div>
        ) : settlements.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-foreground font-medium">Nenhuma liquidação registrada</p>
            <p className="text-sm text-muted-foreground mt-1">Baixas de receitas, despesas e faturas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2.5 px-4">Data</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4">Origem</th>
                  <th className="py-2.5 px-4 text-right">Valor</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">Por</th>
                  <th className="py-2.5 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => {
                  const isReversal = !!s.reversal_of;
                  const isReversed = !!s.reversed_at;
                  return (
                    <tr key={s.id} className={`border-b border-border/60 last:border-0 hover:bg-muted/30 ${isReversal ? "opacity-60" : ""}`}>
                      <td className="py-2.5 px-4 text-muted-foreground">{fmtDate(s.settled_date)}</td>
                      <td className="py-2.5 px-4">
                        {TYPE[s.target_type] || s.target_type}
                        {isReversal && <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase">estorno</span>}
                        {isReversed && <span className="ml-1.5 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded uppercase">estornada</span>}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{SOURCE[s.source] || s.source}</td>
                      <td className={`py-2.5 px-4 text-right font-mono font-semibold ${Number(s.amount) < 0 ? "text-red-600 dark:text-red-300" : ""}`}>{brl(s.amount)}</td>
                      <td className="py-2.5 px-4 hidden sm:table-cell text-xs text-muted-foreground truncate max-w-[160px]">{s.actor_email || "—"}</td>
                      <td className="py-2.5 px-4 text-right">
                        {!isReversal && !isReversed && (
                          reverting === s.id ? (
                            <span className="text-xs text-muted-foreground">
                              Confirmar?
                              <button className="ml-2 text-red-600 dark:text-red-300 font-semibold hover:underline" onClick={() => unsettleMutation.mutate(s.id)} disabled={unsettleMutation.isPending}>Sim</button>
                              <button className="ml-2 hover:underline" onClick={() => setReverting(null)}>Não</button>
                            </span>
                          ) : (
                            <button className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" onClick={() => setReverting(s.id)}>
                              <Undo2 className="w-3 h-3" /> Estornar
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground px-1">O razão é a fonte única das baixas: toda liquidação (manual, por fatura ou por extrato) registra um evento aqui; estornos geram uma linha de reversão e reabrem a conta.</p>
    </div>
  );
}

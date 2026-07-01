import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "@/components/shared/StatCard";
import { useToast } from "@/components/ui/use-toast";
import { Upload, ArrowDownCircle, ArrowUpCircle, CheckCircle2, Link2, Ban, Undo2, Landmark } from "lucide-react";
import { formatDateBR } from "@/utils/dateUtils";
import { parseBankStatement } from "@/utils/parseBankStatement";
import { suggestMatch, matchCandidates } from "@/utils/reconcileMatch";
import { logAction } from "@/utils/auditLog";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const CONF = {
  high: { label: "alta", cls: "bg-green-500/15 text-green-700 dark:text-green-300" },
  medium: { label: "média", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  low: { label: "baixa", cls: "bg-muted text-muted-foreground" },
};

export default function BankReconciliation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [manual, setManual] = useState({}); // txId -> targetId

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["bank-transactions"],
    queryFn: () => base44.entities.BankTransaction.list("-posted_at", 500),
  });
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"], queryFn: () => base44.entities.Revenue.list("-created_date", 1000),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-date", 1000),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-issue_date", 1000),
  });
  const openRevenues = revenues.filter(r => r.status === "receivable");
  const openExpenses = expenses.filter(e => e.status === "pending");
  const openInvoices = invoices.filter(i => i.status === "open");

  const pending = txs.filter(t => t.status === "pending");
  const matched = txs.filter(t => t.status === "matched");
  const pendingValue = pending.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseBankStatement(file.name, text);
      if (rows.length === 0) { toast({ title: "Nada para importar", description: "Não reconheci lançamentos no arquivo (OFX ou CSV).", variant: "destructive" }); return; }
      const existing = new Set(txs.map(t => t.fitid).filter(Boolean));
      const batch = `${file.name} · ${new Date().toLocaleString("pt-BR")}`;
      let added = 0, skipped = 0;
      for (const r of rows) {
        if (existing.has(r.fitid)) { skipped++; continue; }
        try { await base44.entities.BankTransaction.create({ ...r, batch, status: "pending" }); added++; }
        catch { skipped++; } // provável duplicidade (unique fitid)
      }
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast({ title: "Extrato importado", description: `${added} novo(s) lançamento(s)${skipped ? `, ${skipped} já existia(m)` : ""}.` });
    } catch (err) {
      toast({ title: "Erro ao ler o arquivo", description: err?.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const reconcile = useMutation({
    mutationFn: async ({ txId, type, targetId }) => {
      const { error } = await supabase.rpc("reconcile_bank_tx", { p_tx_id: txId, p_type: type, p_target_id: targetId });
      if (error) throw error;
      logAction("Conciliou lançamento bancário", "bank_tx", txId, `→ ${type}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Conciliado!", description: "Baixa lançada no financeiro com a data do extrato." });
    },
    onError: (e) => toast({ title: "Não foi possível conciliar", description: e?.message, variant: "destructive" }),
  });

  const ignore = useMutation({
    mutationFn: (txId) => base44.entities.BankTransaction.update(txId, { status: "ignored" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }),
  });
  const undo = useMutation({
    mutationFn: async (txId) => { const { error } = await supabase.rpc("unreconcile_bank_tx", { p_tx_id: txId }); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank-transactions"] }),
  });

  const ledgerLabel = (t) => {
    if (t.matched_type === "invoice") {
      const inv = invoices.find(x => x.id === t.matched_id);
      return inv ? `Fatura ${inv.number || ""}` : "Fatura";
    }
    const arr = t.matched_type === "revenue" ? revenues : expenses;
    const f = arr.find(x => x.id === t.matched_id);
    return f ? f.description : (t.matched_type === "revenue" ? "Receita" : "Despesa");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Link2} label="Pendentes de conciliação" value={pending.length} tone="warning" />
        <StatCard icon={CheckCircle2} label="Conciliados" value={matched.length} tone="success" />
        <StatCard icon={Landmark} label="Valor pendente" value={brl(pendingValue)} tone="primary" />
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-sm">Importar extrato</p>
          <p className="text-xs text-muted-foreground">Arquivo OFX (padrão dos bancos) ou CSV (Data; Valor; Histórico).</p>
        </div>
        <input ref={fileRef} type="file" accept=".ofx,.csv,text/csv" className="hidden" onChange={onPickFile} />
        <Button onClick={() => fileRef.current?.click()} disabled={importing} className="gap-2">
          <Upload className="w-4 h-4" /> {importing ? "Importando…" : "Importar OFX/CSV"}
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : txs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Landmark className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-foreground font-medium">Nenhum lançamento importado</p>
          <p className="text-sm text-muted-foreground mt-1">Importe um extrato para conciliar com receitas e despesas.</p>
        </div>
      ) : (
        <>
          {/* Pendentes */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-sm font-semibold">Pendentes ({pending.length})</div>
            {pending.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Tudo conciliado. 🎉</div>
            ) : (
              <div className="divide-y divide-border">
                {pending.map(t => {
                  const credit = Number(t.amount) > 0;
                  const sug = suggestMatch(t, openRevenues, openExpenses, openInvoices);
                  const cands = matchCandidates(t, openRevenues, openExpenses, openInvoices);
                  const chosen = manual[t.id] || sug?.candidate?.id || "";
                  const chosenType = cands.find(c => c.id === chosen)?.type || (credit ? "revenue" : "expense");
                  return (
                    <div key={t.id} className="p-3 flex flex-col lg:flex-row lg:items-center gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {credit ? <ArrowDownCircle className="w-5 h-5 text-green-600 dark:text-green-300 mt-0.5 flex-shrink-0" />
                                : <ArrowUpCircle className="w-5 h-5 text-red-600 dark:text-red-300 mt-0.5 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.description || "Lançamento"}</p>
                          <p className="text-xs text-muted-foreground">{formatDateBR(t.posted_at)} · {credit ? "crédito" : "débito"}</p>
                        </div>
                      </div>
                      <div className={`font-mono font-semibold text-sm w-28 lg:text-right ${credit ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>
                        {credit ? "+" : "−"} {brl(Math.abs(t.amount))}
                      </div>
                      <div className="flex items-center gap-2 flex-1 lg:justify-end">
                        {sug && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CONF[sug.confidence].cls}`} title="Confiança da sugestão">
                            sugestão {CONF[sug.confidence].label}
                          </span>
                        )}
                        <Select value={chosen} onValueChange={(v) => setManual(m => ({ ...m, [t.id]: v }))}>
                          <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder={`Casar com ${credit ? "receita" : "despesa"}…`} /></SelectTrigger>
                          <SelectContent>
                            {cands.length === 0 ? <div className="px-2 py-1.5 text-xs text-muted-foreground">Nada em aberto compatível</div>
                              : cands.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 gap-1" disabled={!chosen || reconcile.isPending}
                          onClick={() => reconcile.mutate({ txId: t.id, type: chosenType, targetId: chosen })}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Conciliar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" title="Ignorar"
                          disabled={ignore.isPending} onClick={() => ignore.mutate(t.id)}>
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conciliados */}
          {matched.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-sm font-semibold">Conciliados ({matched.length})</div>
              <div className="divide-y divide-border">
                {matched.map(t => {
                  const credit = Number(t.amount) > 0;
                  return (
                    <div key={t.id} className="p-3 flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-300 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{t.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDateBR(t.posted_at)} → {ledgerLabel(t)}</p>
                      </div>
                      <span className={`font-mono ${credit ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>{credit ? "+" : "−"} {brl(Math.abs(t.amount))}</span>
                      <Button size="sm" variant="ghost" className="h-8 gap-1 text-muted-foreground" disabled={undo.isPending} onClick={() => undo.mutate(t.id)}>
                        <Undo2 className="w-3.5 h-3.5" /> Desfazer
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

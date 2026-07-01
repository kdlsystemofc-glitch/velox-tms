import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { todayLocalISO } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, TrendingUp, Search, CheckCircle2, Download } from "lucide-react";
import { downloadCsv, csvMoney, csvDate } from "@/utils/exportCsv";
import { NumericInput } from "@/components/shared/NumericInput";
import { parseLocalDate, todayLocalISO as _today, formatDateBR } from "@/utils/dateUtils";

const statusConfig = {
  receivable: { label: "A Receber", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  received: { label: "Recebido", color: "bg-green-500/15 text-green-700 dark:text-green-300" },
  overdue: { label: "Atrasado", color: "bg-red-500/15 text-red-700 dark:text-red-300" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

/** Faixas de aging (contas a receber em aberto) — padrão TMS. */
const AGING = [
  { key: "today",        label: "Vence hoje",     cls: "text-amber-800 dark:text-amber-300 bg-amber-500/15 border-amber-300 hover:bg-amber-200" },
  { key: "d7",           label: "Vence ≤ 7 dias", cls: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15" },
  { key: "d30",          label: "8–30 dias",      cls: "text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15" },
  { key: "d60",          label: "31–60 dias",     cls: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/15" },
  { key: "overdue30",    label: "Venceu < 30d",   cls: "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/30 hover:bg-red-500/15" },
  { key: "overdue30p",   label: "Venceu > 30d",   cls: "text-red-800 dark:text-red-300 bg-red-500/15 border-red-300 hover:bg-red-200" },
];

/** Classifica uma conta em aberto pela data de vencimento. */
function agingOf(dueDate) {
  const d = parseLocalDate(dueDate);
  if (!d) return "d60";
  const today = parseLocalDate(_today());
  const days = Math.round((d - today) / 86400000);
  if (days === 0) return "today";
  if (days < 0) return days >= -30 ? "overdue30" : "overdue30p";
  if (days <= 7) return "d7";
  if (days <= 30) return "d30";
  return "d60";
}

export default function Revenues({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [agingFilter, setAgingFilter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", due_date: "", payment_method: "pix", order_id: "" });

  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => db.Revenue.list("-due_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.Revenue.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      setShowModal(false);
      setForm({ description: "", amount: "", due_date: "", payment_method: "pix", order_id: "" });
      toast({ title: "Receita cadastrada!" });
    },
    onError: (e) => toast({ title: "Erro ao cadastrar receita", description: e?.message, variant: "destructive" }),
  });

  const markReceivedMutation = useMutation({
    mutationFn: ({ id, date }) => db.Revenue.update(id, { status: "received", received_date: date }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["revenues"] }); toast({ title: "Recebimento confirmado!" }); },
    onError: (e) => toast({ title: "Erro ao confirmar", description: e?.message, variant: "destructive" }),
  });

  // Contas em aberto (a receber/atrasadas) para o aging
  const open = revenues.filter(r => r.status === "receivable" || r.status === "overdue");
  const agingTotals = AGING.reduce((acc, b) => {
    const items = open.filter(r => agingOf(r.due_date) === b.key);
    acc[b.key] = { count: items.length, total: items.reduce((s, r) => s + (r.amount || 0), 0) };
    return acc;
  }, {});

  const filtered = revenues.filter(r => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch = !search || r.description?.toLowerCase().includes(search.toLowerCase());
    const matchAging = !agingFilter || ((r.status === "receivable" || r.status === "overdue") && agingOf(r.due_date) === agingFilter);
    return matchStatus && matchSearch && matchAging;
  });

  const totalReceivable = open.reduce((s, r) => s + (r.amount || 0), 0);
  const totalReceived = revenues.filter(r => r.status === "received").reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle ? (
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Receitas</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Gestão de contas a receber</p>
          </div>
        ) : <div />}
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={filtered.length === 0}
            onClick={() => downloadCsv(`receitas-${todayLocalISO()}`, filtered, [
              { key: "description", label: "Descrição" },
              { key: "amount", label: "Valor", format: csvMoney },
              { key: "due_date", label: "Vencimento", format: csvDate },
              { key: "status", label: "Status", format: v => (statusConfig[v] || {}).label || v },
              { key: "received_date", label: "Recebido em", format: csvDate },
            ])}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button className="font-bold gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nova Receita
          </Button>
        </div>
      </div>

      {/* Resumo + Aging de contas a receber */}
      <div className="grid grid-cols-2 lg:grid-cols-8 gap-2.5">
        <Card className="p-3 lg:col-span-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total a receber</p>
          <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-300">R$ {totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-3 lg:col-span-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Recebido</p>
          <p className="text-lg font-bold font-mono text-green-600 dark:text-green-300">R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        {AGING.map(b => {
          const t = agingTotals[b.key] || { count: 0, total: 0 };
          const active = agingFilter === b.key;
          return (
            <button key={b.key}
              onClick={() => setAgingFilter(active ? null : b.key)}
              className={`text-left rounded-md border p-3 transition-colors ${b.cls} ${active ? "ring-2 ring-offset-1 ring-current" : ""}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide flex items-center justify-between">
                {b.label}
                {t.count > 0 && <span className="font-mono">{t.count}</span>}
              </p>
              <p className="text-base font-bold font-mono">R$ {t.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </button>
          );
        })}
      </div>
      {agingFilter && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Filtrando por faixa: <strong className="text-foreground">{AGING.find(a => a.key === agingFilter)?.label}</strong>
          <button onClick={() => setAgingFilter(null)} className="text-primary hover:underline">limpar</button>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar receita..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Vencimento</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />Nenhuma receita encontrada.
                  </td></tr>
                )}
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-3 px-4">{r.description || "—"}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-green-600 dark:text-green-300">R$ {(r.amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                      {formatDateBR(r.due_date)}
                      {(r.status === "receivable" || r.status === "overdue") && (() => {
                        const d = parseLocalDate(r.due_date);
                        if (!d) return null;
                        const days = Math.round((d - parseLocalDate(_today())) / 86400000);
                        return (
                          <span className={`ml-2 text-[10px] font-semibold ${days < 0 ? "text-red-600 dark:text-red-300" : days <= 7 ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground"}`}>
                            {days < 0 ? `${Math.abs(days)}d vencida` : days === 0 ? "vence hoje" : `em ${days}d`}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(statusConfig[r.status] || statusConfig.receivable).color}`}>
                        {(statusConfig[r.status] || statusConfig.receivable).label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === "receivable" && (
                        <Button variant="ghost" size="sm" onClick={() => markReceivedMutation.mutate({ id: r.id, date: todayLocalISO() })} className="h-7 text-xs gap-1 text-green-600 dark:text-green-300">
                          <CheckCircle2 className="w-3 h-3" /> Recebido
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Receita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Descrição <span className="text-red-500">*</span></label>
              <Input placeholder="ex: Frete VLX-2026-00042" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Valor <span className="text-red-500">*</span></label>
                <NumericInput currency value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Vencimento <span className="text-red-500">*</span></label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Forma de pagamento</label>
              <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full font-bold" onClick={() => createMutation.mutate({ ...form, amount: Number(form.amount), status: "receivable" })} disabled={!form.description || !form.amount || createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import StatCard from "@/components/shared/StatCard";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Plus, CheckCircle2, Receipt, FileDown } from "lucide-react";
import { logAction } from "@/utils/auditLog";
import { useAuth } from "@/lib/AuthContext";
import { can } from "@/lib/permissions";
import { formatDateBR } from "@/utils/dateUtils";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import StatusBadge, { invoiceStatusConfig } from "@/components/admin/StatusBadge";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const mayPay = can(user, "pay_invoice");
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [picked, setPicked] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [detail, setDetail] = useState(null);
  const { settings } = useCompanySettings();

  const downloadPdf = (inv) => {
    const blob = generateInvoicePDF(inv, settings);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${inv.number || "fatura"}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 300) });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 1000) });

  // Pedidos faturáveis do cliente escolhido: entregues, com frete, sem fatura.
  const billable = orders.filter(o => o.client_id === clientId && o.status === "delivered" && Number(o.freight_value) > 0 && !o.invoice_id);
  const pickedTotal = billable.filter(o => picked.includes(o.id)).reduce((s, o) => s + (Number(o.freight_value) || 0), 0);

  const openTotal = invoices.filter(i => i.status === "open").reduce((s, i) => s + (Number(i.total) || 0), 0);
  const paidTotal = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (Number(i.total) || 0), 0);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("create_invoice", {
        p_client_id: clientId, p_order_ids: picked, p_due_date: dueDate || null, p_notes: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (num) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Fatura criada!", description: `Número ${num}.` });
      setOpen(false); setClientId(""); setPicked([]); setDueDate("");
    },
    onError: (e) => toast({ title: "Erro ao faturar", description: e?.message, variant: "destructive" }),
  });

  const pay = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc("pay_invoice", { p_invoice_id: id });
      if (error) throw error;
      logAction("Baixou (pagou) fatura", "invoice", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Fatura baixada!", description: "Receitas vinculadas marcadas como recebidas." });
    },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Faturas</h2>
          <p className="text-sm text-muted-foreground">Agrupe pedidos entregues em uma cobrança por cliente.</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Nova fatura</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Receipt} label="Faturas em aberto" value={brl(openTotal)} tone="warning" />
        <StatCard icon={CheckCircle2} label="Faturas pagas" value={brl(paidTotal)} tone="success" />
        <StatCard icon={FileText} label="Total de faturas" value={invoices.length} tone="primary" />
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /> Nenhuma fatura ainda.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                  <th className="py-2.5 px-4">Número</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">Emissão</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">Vencimento</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 px-4 font-mono font-semibold text-xs">
                      <button onClick={() => setDetail(inv)} className="text-primary hover:underline">{inv.number}</button>
                    </td>
                    <td className="py-2.5 px-4 max-w-[200px] truncate">{inv.client_name}</td>
                    <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">{formatDateBR(inv.issue_date)}</td>
                    <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">{formatDateBR(inv.due_date)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{brl(inv.total)}</td>
                    <td className="py-2.5 px-4"><StatusBadge status={inv.status} config={invoiceStatusConfig} /></td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => downloadPdf(inv)}><FileDown className="w-3.5 h-3.5" /> PDF</Button>
                      {inv.status === "open" && mayPay && (
                        <Button size="sm" variant="outline" disabled={pay.isPending} onClick={() => pay.mutate(inv.id)}>Dar baixa</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova fatura</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cliente</label>
              <Select value={clientId} onValueChange={(v) => { setClientId(v); setPicked([]); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {clientId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Pedidos entregues sem fatura ({billable.length})</label>
                <div className="mt-1 border border-border rounded-lg max-h-56 overflow-y-auto divide-y divide-border">
                  {billable.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 text-center">Nenhum pedido faturável para este cliente.</p>
                  ) : billable.map(o => (
                    <label key={o.id} className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={picked.includes(o.id)} onCheckedChange={() => setPicked(p => p.includes(o.id) ? p.filter(x => x !== o.id) : [...p, o.id])} />
                      <span className="font-mono text-xs">{o.protocol}</span>
                      <span className="text-xs text-muted-foreground flex-1 truncate">{(o.recipients || []).map(r => r.city).filter(Boolean).join(", ")}</span>
                      <span className="font-mono text-xs">{brl(o.freight_value)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Vencimento</label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" />
              </div>
              <div className="flex items-end justify-end">
                <span className="text-sm">Total: <strong className="font-mono">{brl(pickedTotal)}</strong></span>
              </div>
            </div>

            <Button className="w-full" disabled={!clientId || picked.length === 0 || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Gerando…" : `Gerar fatura (${picked.length} pedido${picked.length !== 1 ? "s" : ""})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhe da fatura */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono">{detail.number}</span>
                  <StatusBadge status={detail.status} config={invoiceStatusConfig} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{detail.client_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Emissão</span><span>{formatDateBR(detail.issue_date)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vencimento</span><span>{formatDateBR(detail.due_date)}</span></div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/40 text-muted-foreground text-left"><th className="py-1.5 px-2">Protocolo</th><th className="py-1.5 px-2 text-right">Valor</th></tr></thead>
                    <tbody>
                      {(detail.lines || []).map((l, i) => (
                        <tr key={i} className="border-t border-border"><td className="py-1.5 px-2 font-mono">{l.protocol}</td><td className="py-1.5 px-2 text-right font-mono">{brl(l.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-2"><span>Total</span><span className="font-mono">{brl(detail.total)}</span></div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 gap-1" onClick={() => downloadPdf(detail)}><FileDown className="w-4 h-4" /> Baixar PDF</Button>
                  {detail.status === "open" && mayPay && (
                    <Button className="flex-1" disabled={pay.isPending} onClick={() => { pay.mutate(detail.id); setDetail(null); }}>Dar baixa</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

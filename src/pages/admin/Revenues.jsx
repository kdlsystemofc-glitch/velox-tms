import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { todayLocalISO } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, TrendingUp, Search, CheckCircle2 } from "lucide-react";
import { NumericInput } from "@/components/shared/NumericInput";
import { format, parseISO } from "date-fns";

const statusConfig = {
  receivable: { label: "A Receber", color: "bg-amber-100 text-amber-700" },
  received: { label: "Recebido", color: "bg-green-100 text-green-700" },
  overdue: { label: "Atrasado", color: "bg-red-100 text-red-700" },
};

export default function Revenues() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", due_date: "", payment_method: "pix", order_id: "" });

  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: () => base44.entities.Revenue.list("-due_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Revenue.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      setShowModal(false);
      setForm({ description: "", amount: "", due_date: "", payment_method: "pix", order_id: "" });
      toast({ title: "Receita cadastrada!" });
    },
  });

  const markReceivedMutation = useMutation({
    mutationFn: ({ id, date }) => base44.entities.Revenue.update(id, { status: "received", received_date: date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["revenues"] }),
  });

  const filtered = revenues.filter(r => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchSearch = !search || r.description?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalReceivable = revenues.filter(r => r.status === "receivable").reduce((s, r) => s + (r.amount || 0), 0);
  const totalReceived = revenues.filter(r => r.status === "received").reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Receitas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de contas a receber</p>
        </div>
        <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nova Receita
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">A Receber</p>
          <p className="text-xl font-bold font-mono text-amber-600">R$ {totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-xl font-bold font-mono text-green-600">R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
      </div>

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
                    <td className="py-3 px-4 text-right font-mono font-semibold text-green-600">R$ {(r.amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{r.due_date ? format(parseISO(r.due_date), "dd/MM/yyyy") : "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(statusConfig[r.status] || statusConfig.receivable).color}`}>
                        {(statusConfig[r.status] || statusConfig.receivable).label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === "receivable" && (
                        <Button variant="ghost" size="sm" onClick={() => markReceivedMutation.mutate({ id: r.id, date: todayLocalISO() })} className="h-7 text-xs gap-1 text-green-600">
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
              <label className="text-sm font-medium text-slate-700 block mb-1">Descrição <span className="text-red-500">*</span></label>
              <Input placeholder="ex: Frete VLX-2026-00042" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Valor <span className="text-red-500">*</span></label>
                <NumericInput currency value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Vencimento <span className="text-red-500">*</span></label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Forma de pagamento</label>
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
            <Button className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" onClick={() => createMutation.mutate({ ...form, amount: Number(form.amount), status: "receivable" })} disabled={!form.description || !form.amount || createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
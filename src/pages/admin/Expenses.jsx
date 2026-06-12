import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, TrendingDown, Search, CheckCircle2 } from "lucide-react";
import { NumericInput } from "@/components/shared/NumericInput";
import FileUploadButton from "@/components/shared/FileUploadButton";
import { format, parseISO } from "date-fns";

const categoryLabels = {
  fuel: "Combustível", maintenance: "Manutenção", tires: "Pneus", tolls: "Pedágios",
  salaries: "Salários", taxes: "Impostos", insurance: "Seguros", rent: "Aluguel",
  administrative: "Administrativo", marketing: "Marketing", other: "Outros",
};

const statusConfig = {
  pending: { label: "A Pagar", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pago", color: "bg-green-100 text-green-700" },
  installment: { label: "Parcelado", color: "bg-blue-100 text-blue-700" },
};

const EMPTY_FORM = { category: "fuel", description: "", amount: "", date: "", due_date: "", payment_method: "pix", status: "paid", notes: "" };

export default function Expenses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Modal de baixa
  const [payingExpense, setPayingExpense] = useState(null);
  const [payForm, setPayForm] = useState({ paid_date: "", payment_method: "pix", receipt_url: "" });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 200),
  });

  const createMutation = {
    isPending: false,
    mutate: async (data) => {
      await base44.entities.Expense.create(data);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      toast({ title: "Despesa registrada!" });
    },
  };

  const filtered = expenses.filter(e => {
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalPaid = expenses.filter(e => e.status === "paid").reduce((s, e) => s + (e.amount || 0), 0);
  const totalPending = expenses.filter(e => e.status === "pending").reduce((s, e) => s + (e.amount || 0), 0);

  const openPayModal = (e) => {
    setPayingExpense(e);
    setPayForm({ paid_date: new Date().toISOString().split("T")[0], payment_method: "pix", receipt_url: "" });
  };

  const confirmPayment = async () => {
    await base44.entities.Expense.update(payingExpense.id, {
      status: "paid",
      paid_date: payForm.paid_date,
      payment_method: payForm.payment_method,
      ...(payForm.receipt_url ? { receipt_url: payForm.receipt_url } : {}),
    });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    setPayingExpense(null);
    toast({ title: "Despesa baixada com sucesso!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Despesas</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de custos e pagamentos</p>
        </div>
        <Button className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Nova Despesa
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">A Pagar</p>
          <p className="text-xl font-bold font-mono text-amber-600">R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Pago</p>
          <p className="text-xl font-bold font-mono text-red-600">R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar despesa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />Nenhuma despesa encontrada.
                  </td></tr>
                )}
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-3 px-4 text-muted-foreground">{e.date ? format(parseISO(e.date), "dd/MM/yy") : "—"}</td>
                    <td className="py-3 px-4"><span className="text-xs bg-muted px-2 py-0.5 rounded">{categoryLabels[e.category] || e.category}</span></td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                      {e.description || "—"}
                      {e.status === "pending" && (
                        <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">Pendente de baixa</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-red-600">R$ {(e.amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(statusConfig[e.status] || statusConfig.pending).color}`}>
                        {(statusConfig[e.status] || statusConfig.pending).label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {e.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => openPayModal(e)} className="h-7 text-xs gap-1 text-green-600">
                          <CheckCircle2 className="w-3 h-3" /> Dar Baixa
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

      {/* Modal nova despesa */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Categoria <span className="text-red-500">*</span></label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Descrição <span className="text-red-500">*</span></label>
              <Input placeholder="ex: Abastecimento rota SP-RJ" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Valor <span className="text-red-500">*</span></label>
                <NumericInput currency value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Data <span className="text-red-500">*</span></label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">A Pagar</SelectItem>
                    <SelectItem value="installment">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Forma de pagamento</label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Observações</label>
              <Textarea placeholder="ex: Nota fiscal nº 1234" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" />
            </div>
            <Button className="w-full bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold"
              onClick={() => createMutation.mutate({ ...form, amount: Number(form.amount) })}
              disabled={!form.description || !form.amount}>
              Registrar Despesa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de baixa */}
      <Dialog open={!!payingExpense} onOpenChange={() => setPayingExpense(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar pagamento</DialogTitle></DialogHeader>
          {payingExpense && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="font-medium text-sm">{payingExpense.description}</p>
                <p className="text-2xl font-bold font-mono mt-1">
                  R$ {Number(payingExpense.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data do pagamento</label>
                <Input type="date" value={payForm.paid_date} onChange={e => setPayForm(f => ({ ...f, paid_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Forma de pagamento</label>
                <Select value={payForm.payment_method} onValueChange={v => setPayForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FileUploadButton
                label="Comprovante (opcional)"
                accept="image/*,application/pdf"
                onUpload={url => setPayForm(f => ({ ...f, receipt_url: url || "" }))}
              />
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setPayingExpense(null)} className="flex-1">Cancelar</Button>
                <Button onClick={confirmPayment} className="flex-1 bg-green-600 text-white font-bold hover:bg-green-700">
                  Confirmar pagamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
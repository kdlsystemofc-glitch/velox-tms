import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { todayLocalISO } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, TrendingDown, Search, CheckCircle2, Receipt, Tag, Link2, Download } from "lucide-react";
import { downloadCsv, csvMoney, csvDate } from "@/utils/exportCsv";
import { NumericInput } from "@/components/shared/NumericInput";
import FileUploadButton from "@/components/shared/FileUploadButton";
import { parseLocalDate, formatDateBR } from "@/utils/dateUtils";
import { FormSection, Field } from "@/components/shared/FormSection";

const AGING = [
  { key: "overdue", label: "Vencidas",      cls: "text-red-700 bg-red-50 border-red-200 hover:bg-red-100" },
  { key: "d7",      label: "Vence ≤ 7 dias", cls: "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { key: "d30",     label: "8–30 dias",      cls: "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { key: "d60",     label: "31–60 dias",     cls: "text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100" },
  { key: "future",  label: "> 60 dias",      cls: "text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100" },
];
function agingOf(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d) return "future";
  const days = Math.round((d - new Date(new Date().setHours(0,0,0,0))) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 7) return "d7";
  if (days <= 30) return "d30";
  if (days <= 60) return "d60";
  return "future";
}

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

const EMPTY_FORM = { category: "fuel", description: "", amount: "", date: "", due_date: "", paid_date: "", payment_method: "pix", status: "paid", notes: "", supplier_id: "", supplier_name: "", truck_id: "", driver_id: "", cost_center: "", receipt_url: "" };
const COST_CENTERS = ["Operação", "Frota", "Administrativo", "Comercial", "Manutenção", "Combustível"];

export default function Expenses({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [agingFilter, setAgingFilter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Modal de baixa
  const [payingExpense, setPayingExpense] = useState(null);
  const [payForm, setPayForm] = useState({ paid_date: "", payment_method: "pix", receipt_url: "" });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 200),
  });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => base44.entities.Supplier.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      toast({ title: "Despesa registrada!" });
    },
    onError: (e) => toast({ title: "Erro ao registrar despesa", description: e?.message, variant: "destructive" }),
  });

  const open = expenses.filter(e => e.status === "pending" || e.status === "installment");
  const agingTotals = AGING.reduce((acc, b) => {
    const items = open.filter(e => agingOf(e.due_date || e.date) === b.key);
    acc[b.key] = { count: items.length, total: items.reduce((s, e) => s + (e.amount || 0), 0) };
    return acc;
  }, {});

  const filtered = expenses.filter(e => {
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase());
    const matchAging = !agingFilter || ((e.status === "pending" || e.status === "installment") && agingOf(e.due_date || e.date) === agingFilter);
    return matchCat && matchSearch && matchAging;
  });

  const totalPaid = expenses.filter(e => e.status === "paid").reduce((s, e) => s + (e.amount || 0), 0);
  const totalPending = open.reduce((s, e) => s + (e.amount || 0), 0);

  const openPayModal = (e) => {
    setPayingExpense(e);
    setPayForm({ paid_date: todayLocalISO(), payment_method: "pix", receipt_url: "" });
  };

  const confirmPayment = async () => {
    try {
      await base44.entities.Expense.update(payingExpense.id, {
        status: "paid",
        paid_date: payForm.paid_date,
        payment_method: payForm.payment_method,
        ...(payForm.receipt_url ? { receipt_url: payForm.receipt_url } : {}),
      });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setPayingExpense(null);
      toast({ title: "Despesa baixada com sucesso!" });
    } catch (e) {
      toast({ title: "Erro ao dar baixa", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle ? (
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Despesas</h1>
            <p className="text-muted-foreground text-xs mt-0.5">Controle de custos e pagamentos</p>
          </div>
        ) : <div />}
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={filtered.length === 0}
            onClick={() => downloadCsv(`despesas-${todayLocalISO()}`, filtered, [
              { key: "date", label: "Data", format: csvDate },
              { key: "category", label: "Categoria", format: v => categoryLabels[v] || v },
              { key: "cost_center", label: "Centro de custos" },
              { key: "description", label: "Descrição" },
              { key: "supplier_name", label: "Fornecedor" },
              { key: "amount", label: "Valor", format: csvMoney },
              { key: "status", label: "Status" },
              { key: "due_date", label: "Vencimento", format: csvDate },
            ])}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Resumo + Aging de contas a pagar */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-2.5">
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total a pagar</p>
          <p className="text-lg font-bold font-mono text-amber-600">R$ {totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total pago</p>
          <p className="text-lg font-bold font-mono text-red-600">R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </Card>
        {AGING.map(b => {
          const t = agingTotals[b.key] || { count: 0, total: 0 };
          const active = agingFilter === b.key;
          return (
            <button key={b.key}
              onClick={() => setAgingFilter(active ? null : b.key)}
              className={`text-left rounded-md border p-3 transition-colors ${b.cls} ${active ? "ring-2 ring-offset-1 ring-current" : ""}`}>
              <p className="text-[11px] font-semibold uppercase tracking-wide flex items-center justify-between">
                {b.label}{t.count > 0 && <span className="font-mono">{t.count}</span>}
              </p>
              <p className="text-base font-bold font-mono">R$ {t.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </button>
          );
        })}
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
                    <td className="py-3 px-4 text-muted-foreground">{formatDateBR(e.date)}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{categoryLabels[e.category] || e.category}</span>
                      {e.cost_center && <span className="block text-[10px] text-muted-foreground mt-0.5">{e.cost_center}</span>}
                    </td>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle className="flex items-center gap-2 text-base"><Receipt className="w-4.5 h-4.5 text-primary" /> Nova Despesa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 p-5">
            <FormSection title="Despesa" icon={Tag} cols={2}>
              <Field label="Categoria" required>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valor (R$)" required>
                <NumericInput currency value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
              </Field>
              <Field label="Descrição" required colSpan={2}>
                <Input placeholder="ex: Abastecimento rota SP-RJ" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </Field>
              <Field label="Centro de custos" colSpan={2}>
                <Input list="cost-centers" placeholder="ex: Operação, Frota, Administrativo" value={form.cost_center} onChange={e => setForm(f => ({ ...f, cost_center: e.target.value }))} />
                <datalist id="cost-centers">{COST_CENTERS.map(c => <option key={c} value={c} />)}</datalist>
              </Field>
            </FormSection>

            <FormSection title="Pagamento" icon={CheckCircle2} cols={2}>
              <Field label="Situação">
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">A Pagar</SelectItem>
                    <SelectItem value="installment">Parcelado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Forma de pagamento">
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
              </Field>
              <Field label="Data de competência" required hint="Quando a despesa foi gerada">
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </Field>
              {form.status === "paid" ? (
                <Field label="Data do pagamento">
                  <Input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
                </Field>
              ) : (
                <Field label="Vencimento" hint="Alimenta o aging de contas a pagar">
                  <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
                </Field>
              )}
            </FormSection>

            <FormSection title="Vínculos" description="Atribua a despesa a um fornecedor/veículo para relatórios de custo" icon={Link2} cols={2}>
              <Field label="Fornecedor" optional>
                <Select value={form.supplier_id || "none"} onValueChange={v => {
                  const s = suppliers.find(x => x.id === v);
                  setForm(f => ({ ...f, supplier_id: v === "none" ? "" : v, supplier_name: s?.name || "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Veículo" optional>
                <Select value={form.truck_id || "none"} onValueChange={v => setForm(f => ({ ...f, truck_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model || t.manufacturer || ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Motorista" optional colSpan={2}>
                <Select value={form.driver_id || "none"} onValueChange={v => setForm(f => ({ ...f, driver_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </FormSection>

            <FormSection title="Anexos e observações" cols={1}>
              <Field label="Comprovante / Nota" optional>
                <FileUploadButton
                  label={form.receipt_url ? "Comprovante anexado ✓" : "Anexar comprovante (imagem/PDF)"}
                  accept="image/*,application/pdf"
                  onUpload={url => setForm(f => ({ ...f, receipt_url: url || "" }))}
                />
              </Field>
              <Field label="Observações" optional>
                <Textarea placeholder="ex: Nota fiscal nº 1234" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" />
              </Field>
            </FormSection>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border sticky bottom-0 bg-background z-10">
            <Button variant="outline" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}>Cancelar</Button>
            <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2"
              onClick={() => createMutation.mutate({
                ...form,
                amount: Number(form.amount),
                date: form.date || todayLocalISO(),
                due_date: form.due_date || undefined,
                paid_date: form.status === "paid" ? (form.paid_date || form.date || todayLocalISO()) : undefined,
                supplier_id: form.supplier_id || undefined,
                truck_id: form.truck_id || undefined,
                driver_id: form.driver_id || undefined,
                receipt_url: form.receipt_url || undefined,
              })}
              disabled={!form.description || !form.amount}>
              <Plus className="w-4 h-4" /> Registrar despesa
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
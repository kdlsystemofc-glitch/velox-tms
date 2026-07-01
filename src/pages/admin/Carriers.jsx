import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Handshake, Plus, Phone, Mail, Pencil } from "lucide-react";
import { carrierScorecard } from "@/utils/carrierScorecard";

const empty = { company_name: "", cpf_cnpj: "", contact_name: "", phone: "", email: "", payment_term_days: 30, status: "active", notes: "" };
const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function Carriers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: carriers = [], isLoading } = useQuery({
    queryKey: ["carriers"],
    queryFn: () => base44.entities.Carrier.list("-created_at", 200),
  });
  // Scorecard (2.5): desempenho a partir dos pedidos subcontratados.
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.company_name.trim()) throw new Error("Informe a razão social da transportadora.");
      const payload = { ...form, payment_term_days: Number(form.payment_term_days) || 30 };
      if (form.id) await base44.entities.Carrier.update(form.id, payload);
      else await base44.entities.Carrier.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carriers"] });
      setOpen(false); setForm(empty);
      toast({ title: form.id ? "Transportadora atualizada!" : "Transportadora cadastrada!" });
    },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (c) => { setForm({ ...empty, ...c }); setOpen(true); };

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader icon={Handshake} title="Transportadoras parceiras" subtitle="Parceiros para subcontratar fretes. Após cadastrar, oferte pedidos pelo menu do pedido.">
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Nova transportadora</Button>
      </PageHeader>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando…</div>
        ) : carriers.length === 0 ? (
          <div className="p-12 text-center">
            <Handshake className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-foreground font-medium">Nenhuma transportadora cadastrada</p>
            <p className="text-sm text-muted-foreground mt-1">Cadastre parceiros para subcontratar fretes.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {carriers.map(c => {
              const s = carrierScorecard(orders, c.id);
              return (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{c.company_name}
                    {c.status === "inactive" && <span className="ml-2 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">inativa</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.cpf_cnpj || "sem CNPJ"} · prazo {c.payment_term_days || 30}d</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {c.contact_name && <span>{c.contact_name}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                  </div>
                  {s.offered > 0 && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.offered} ofertas</span>
                      {s.acceptanceRate != null && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.acceptanceRate >= 70 ? "bg-green-500/15 text-green-700 dark:text-green-300" : s.acceptanceRate >= 40 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>{s.acceptanceRate}% aceite</span>}
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.delivered} entregues</span>
                      {s.paid > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{brl(s.paid)} pago</span>}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /> Editar</Button>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Editar transportadora" : "Nova transportadora"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Razão social *</label>
                <Input value={form.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Transportes Beta Ltda" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CNPJ</label>
                <Input value={form.cpf_cnpj} onChange={e => set("cpf_cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo de pagamento (dias)</label>
                <Input type="number" value={form.payment_term_days} onChange={e => set("payment_term_days", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</label>
                <Input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone</label>
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</label>
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="contato@transportadora.com.br" />
              </div>
            </div>
            {form.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.status === "inactive"} onChange={e => set("status", e.target.checked ? "inactive" : "active")} />
                Marcar como inativa (não aparece nas ofertas)
              </label>
            )}
            <Button className="w-full font-bold" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Salvando…" : form.id ? "Salvar alterações" : "Cadastrar transportadora"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

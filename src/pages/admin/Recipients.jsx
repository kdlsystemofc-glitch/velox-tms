import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import DataTable from "@/components/shared/DataTable";
import { FormSection, Field } from "@/components/shared/FormSection";
import { AddressFields } from "@/components/shared/AddressFields";
import DeliveryWindowEditor from "@/components/shared/DeliveryWindowEditor";
import { Plus, MapPin, Pencil, Trash2, Building2 } from "lucide-react";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/utils/validators";

function generateRecipientCode(recipients) {
  const max = recipients.reduce((m, r) => {
    const match = r.code?.match(/DEST(\d+)/);
    return match ? Math.max(m, parseInt(match[1])) : m;
  }, 0);
  return `DEST${String(max + 1).padStart(5, "0")}`;
}

const EMPTY = {
  name: "", trade_name: "", cpf_cnpj: "", type: "eventual", phone: "", email: "",
  address: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
  delivery_window: { days: [], start: "", end: "", pause_start: "", pause_end: "" },
  client_id: "", notes: "", status: "active",
};

export default function Recipients({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: recipients = [] } = useQuery({ queryKey: ["recipients"], queryFn: () => base44.entities.Recipient.list("-created_date") });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

  const save = useMutation({
    mutationFn: (data) => {
      if (editingId) return base44.entities.Recipient.update(editingId, data);
      return base44.entities.Recipient.create({ ...data, code: data.code || generateRecipientCode(recipients) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipients"] });
      setShowForm(false); setEditingId(null); setForm(EMPTY);
      toast({ title: editingId ? "Destinatário atualizado!" : "Destinatário cadastrado!" });
    },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.Recipient.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["recipients"] }); toast({ title: "Destinatário removido" }); },
  });

  const openEdit = (r) => { setEditingId(r.id); setForm({ ...EMPTY, ...r, address: r.address || EMPTY.address, delivery_window: r.delivery_window || EMPTY.delivery_window }); setShowForm(true); };
  const openNew = () => { setEditingId(null); setForm(EMPTY); setShowForm(true); };

  // Validação de CPF/CNPJ (formato + duplicidade, ignorando o próprio em edição).
  const docDigits = onlyDigits(form.cpf_cnpj);
  const docDuplicate = (docDigits.length === 11 || docDigits.length === 14) && recipients.some(r => r.id !== editingId && onlyDigits(r.cpf_cnpj) === docDigits);
  const docInvalid = docDigits.length > 0 && !isValidCpfCnpj(docDigits);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle ? <div><h1 className="font-display text-xl font-bold">Destinatários</h1><p className="text-muted-foreground text-xs">Cadastro independente dos clientes</p></div> : <div />}
        <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={openNew}>
          <Plus className="w-4 h-4" /> Novo destinatário
        </Button>
      </div>

      <DataTable
        data={recipients}
        searchKeys={["name", "trade_name", "cpf_cnpj", "code"]}
        searchPlaceholder="Buscar por nome, CNPJ, código ou cidade..."
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(r) => openEdit(r)}
        emptyMessage="Nenhum destinatário cadastrado."
        columns={[
          { key: "code", label: "Código", sortable: true, width: 90, className: "font-mono text-xs text-muted-foreground", render: r => r.code || "—" },
          { key: "name", label: "Nome", sortable: true, className: "font-medium", render: r => (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0"><MapPin className="w-3.5 h-3.5 text-primary" /></span>
              <span className="truncate">{r.name}{r.trade_name && <span className="text-xs text-muted-foreground"> · {r.trade_name}</span>}</span>
            </div>
          )},
          { key: "cpf_cnpj", label: "CNPJ / CPF", sortable: true, className: "font-mono text-xs text-muted-foreground", render: r => r.cpf_cnpj || "—" },
          { key: "city", label: "Cidade", value: r => r.address?.city || "", className: "text-xs text-muted-foreground", render: r => r.address?.city ? `${r.address.city}/${r.address.state}` : "—" },
          { key: "type", label: "Tipo", sortable: true, value: r => r.type, render: r => <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.type === "fixo" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{r.type === "fixo" ? "Fixo" : "Eventual"}</span> },
          { key: "actions", label: "", align: "right", stopPropagation: true, width: 80, render: r => (
            <div className="flex justify-end">
              <button onClick={() => openEdit(r)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => { if (window.confirm(`Remover ${r.name}?`)) remove.mutate(r.id); }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )},
        ]}
      />

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditingId(null); setForm(EMPTY); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base"><MapPin className="w-4.5 h-4.5 text-velox-amber" /> {editingId ? "Editar destinatário" : "Novo destinatário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-5">
            <FormSection title="Identificação" icon={Building2} cols={2}>
              <Field label="Nome / Razão Social" required colSpan={2}>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Comércio Central Ltda" />
              </Field>
              <Field label="Nome fantasia"><Input value={form.trade_name} onChange={e => setForm(f => ({ ...f, trade_name: e.target.value }))} /></Field>
              <Field label="CNPJ / CPF" hint={docDuplicate ? "⚠ Já cadastrado" : docInvalid ? "⚠ Inválido" : undefined}>
                <Input value={form.cpf_cnpj} onChange={e => setForm(f => ({ ...f, cpf_cnpj: formatCpfCnpj(e.target.value) }))} placeholder="00.000.000/0001-00"
                  className={docDuplicate || docInvalid ? "border-red-400 focus-visible:ring-red-400" : ""} />
              </Field>
              <Field label="Tipo">
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fixo">Fixo (recorrente)</SelectItem><SelectItem value="eventual">Eventual</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Telefone"><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" /></Field>
              <Field label="E-mail"><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
              <Field label="Cliente que costuma enviar (opcional)" colSpan={2}>
                <Select value={form.client_id || "none"} onValueChange={v => setForm(f => ({ ...f, client_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </FormSection>

            <AddressFields title="Endereço" value={form.address || {}} onChange={addr => setForm(f => ({ ...f, address: addr }))} />

            <FormSection title="Recebimento" cols={1}>
              <DeliveryWindowEditor label="Janela de recebimento" value={form.delivery_window} onChange={w => setForm(f => ({ ...f, delivery_window: w }))} />
            </FormSection>

            <FormSection title="Observações" cols={1}>
              <Field label="Anotações" optional><Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" /></Field>
            </FormSection>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" disabled={!form.name.trim() || docInvalid || docDuplicate || save.isPending} onClick={() => save.mutate(form)}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

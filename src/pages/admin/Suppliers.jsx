import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Pencil, Phone, Mail, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DataTable from "@/components/shared/DataTable";
import { FormSection, Field } from "@/components/shared/FormSection";
import { AddressFields } from "@/components/shared/AddressFields";
import ContactsEditor from "@/components/shared/ContactsEditor";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/utils/validators";
import { downloadCsv } from "@/utils/exportCsv";
import { Download } from "lucide-react";

const CATEGORIES = [
  { value: "fuel",        label: "Combustível" },
  { value: "maintenance", label: "Manutenção" },
  { value: "tires",       label: "Pneus" },
  { value: "insurance",   label: "Seguros" },
  { value: "other",       label: "Outros" },
];

const EMPTY = {
  name: "", cnpj_cpf: "", category: "maintenance",
  contact_name: "", phone: "", whatsapp: "", email: "", notes: "", active: true,
  contacts: [], address: {}, payment_terms: "", pix_key: "",
};

// Compatibilidade: endereço antigo podia ser texto puro; o form usa objeto.
function normalizeAddress(addr) {
  if (addr && typeof addr === "object") return addr;
  if (typeof addr === "string" && addr.trim()) return { street: addr };
  return {};
}

async function generateSupplierCode(suppliers) {
  const maxNum = suppliers.reduce((max, s) => {
    const match = s.code?.match(/FOR(\d+)/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);
  return `FOR${String(maxNum + 1).padStart(5, "0")}`;
}

function SupplierForm({ form, setForm, duplicate = false }) {
  const docDigits = onlyDigits(form.cnpj_cpf);
  const docInvalid = docDigits.length > 0 && !isValidCpfCnpj(docDigits);
  return (
    <div className="space-y-4">
      <FormSection title="Identificação" icon={Building2} cols={2}>
        <Field label="Razão social / Nome" required colSpan={2}>
          <Input placeholder="ex: Posto Rodoviário Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="CNPJ / CPF" hint={duplicate ? "⚠ Já cadastrado" : docInvalid ? "⚠ Inválido" : undefined}>
          <Input placeholder="00.000.000/0001-00" value={form.cnpj_cpf}
            onChange={e => setForm(f => ({ ...f, cnpj_cpf: formatCpfCnpj(e.target.value) }))}
            className={duplicate || docInvalid ? "border-red-400 focus-visible:ring-red-400" : ""} />
        </Field>
        <Field label="Categoria">
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </FormSection>

      <AddressFields
        title="Endereço"
        value={form.address || {}}
        onChange={addr => setForm(f => ({ ...f, address: addr }))}
      />

      <FormSection title="Contato principal" icon={Phone} cols={2}>
        <Field label="Responsável" colSpan={2}>
          <Input placeholder="Nome do responsável" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
        </Field>
        <Field label="Telefone">
          <Input placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </Field>
        <Field label="WhatsApp">
          <Input placeholder="(00) 00000-0000" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
        </Field>
        <Field label="E-mail" colSpan={2}>
          <Input type="email" placeholder="contato@fornecedor.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </Field>
      </FormSection>

      <FormSection title="Financeiro" description="Como esse fornecedor é pago" icon={DollarSign} cols={2}>
        <Field label="Condições de pagamento" hint="Ex: 30 dias, à vista, boleto 15/30">
          <Input placeholder="Ex: 30 dias" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
        </Field>
        <Field label="Chave PIX">
          <Input placeholder="CNPJ, telefone, e-mail..." value={form.pix_key} onChange={e => setForm(f => ({ ...f, pix_key: e.target.value }))} />
        </Field>
        <Field label="Observações" colSpan={2}>
          <Textarea placeholder="Condições comerciais, observações..." rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" />
        </Field>
      </FormSection>
    </div>
  );
}

export default function Suppliers({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editForm, setEditForm] = useState(EMPTY);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const allSuppliers = await base44.entities.Supplier.list("-created_date", 1000);
      const code = await generateSupplierCode(allSuppliers);
      return base44.entities.Supplier.create({ ...data, code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowAdd(false);
      setForm(EMPTY);
      toast({ title: "Fornecedor cadastrado!" });
    },
    onError: (e) => toast({ title: "Erro ao cadastrar", description: e?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setEditingId(null);
      toast({ title: "Fornecedor atualizado!" });
    },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });

  // CPF/CNPJ: validade e duplicidade (ignorando o próprio na edição).
  const docOk = (v) => { const d = onlyDigits(v); return d.length === 0 || isValidCpfCnpj(d); };
  const isDup = (v, ignoreId) => { const d = onlyDigits(v); return (d.length === 11 || d.length === 14) && suppliers.some(s => s.id !== ignoreId && onlyDigits(s.cnpj_cpf) === d); };
  const createDup = isDup(form.cnpj_cpf, null);
  const editDup = isDup(editForm.cnpj_cpf, editingId);

  const catLabel = (v) => CATEGORIES.find(c => c.value === v)?.label || v;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!hideTitle && (
          <div>
            <h1 className="font-display text-3xl font-extrabold text-foreground">Fornecedores</h1>
            <p className="text-muted-foreground text-sm mt-1">{suppliers.length} fornecedor(es) cadastrado(s)</p>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" className="gap-2" disabled={suppliers.length === 0}
          onClick={() => downloadCsv(`fornecedores-${new Date().toISOString().slice(0,10)}`, suppliers, [
            { key: "code", label: "Código" },
            { key: "name", label: "Nome" },
            { key: "cnpj_cpf", label: "CNPJ/CPF" },
            { key: "category", label: "Categoria", format: v => catLabel(v) },
            { key: "contact_name", label: "Contato" },
            { key: "phone", label: "Telefone" },
            { key: "email", label: "E-mail" },
            { key: "payment_terms", label: "Pagamento" },
          ])}>
          <Download className="w-4 h-4" /> Exportar
        </Button>
        <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setForm(EMPTY); }}>
          <DialogTrigger asChild>
            <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cadastrar Fornecedor</DialogTitle></DialogHeader>
            <SupplierForm form={form} setForm={setForm} duplicate={createDup} />
            <div className="border-t border-border/40 pt-3 mt-1"><ContactsEditor value={form.contacts} onChange={v => setForm(f => ({ ...f, contacts: v }))} /></div>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createDup || !docOk(form.cnpj_cpf) || createMutation.isPending}
              className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold mt-2"
            >
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <DataTable
        data={suppliers}
        searchKeys={["name", "cnpj_cpf", "code", "contact_name"]}
        searchPlaceholder="Buscar por nome, CNPJ ou código..."
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(s) => { setEditingId(s.id); setEditForm({ ...EMPTY, ...s, address: normalizeAddress(s.address), contacts: s.contacts || [] }); }}
        emptyMessage="Nenhum fornecedor cadastrado."
        columns={[
          { key: "code", label: "Código", sortable: true, width: 90, className: "font-mono text-xs text-muted-foreground", render: s => s.code || "—" },
          { key: "name", label: "Fornecedor", sortable: true, className: "font-medium", render: s => (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="w-3.5 h-3.5 text-primary" /></span>
              <span className="truncate">{s.name}</span>
            </div>
          )},
          { key: "category", label: "Categoria", sortable: true, value: s => catLabel(s.category), render: s => (
            <span className="text-[11px] bg-muted text-muted-foreground font-medium px-2 py-0.5 rounded">{catLabel(s.category)}</span>
          )},
          { key: "cnpj_cpf", label: "CNPJ / CPF", sortable: true, className: "font-mono text-xs text-muted-foreground", render: s => s.cnpj_cpf || "—" },
          { key: "contact_name", label: "Contato", className: "text-xs", render: s => s.contact_name || "—" },
          { key: "phone", label: "Telefone / E-mail", className: "text-xs text-muted-foreground", render: s => (
            <div className="leading-tight">
              {s.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</p>}
              {s.email && <p className="flex items-center gap-1 truncate max-w-[180px]"><Mail className="w-3 h-3" />{s.email}</p>}
              {!s.phone && !s.email && "—"}
            </div>
          )},
          { key: "actions", label: "", align: "right", stopPropagation: true, width: 50, render: s => (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Editar"
              onClick={() => { setEditingId(s.id); setEditForm({ ...EMPTY, ...s, address: normalizeAddress(s.address), contacts: s.contacts || [] }); }}><Pencil className="w-3.5 h-3.5" /></Button>
          )},
        ]}
      />

      {/* Edit modal */}
      <Dialog open={!!editingId} onOpenChange={(v) => { if (!v) setEditingId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Fornecedor</DialogTitle></DialogHeader>
        <SupplierForm form={editForm} setForm={setEditForm} duplicate={editDup} />
        <div className="border-t border-border/40 pt-3 mt-1"><ContactsEditor value={editForm.contacts} onChange={v => setEditForm(f => ({ ...f, contacts: v }))} /></div>
        <Button
          onClick={() => updateMutation.mutate({ id: editingId, data: editForm })}
            disabled={!editForm.name || editDup || !docOk(editForm.cnpj_cpf) || updateMutation.isPending}
            className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold mt-2"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
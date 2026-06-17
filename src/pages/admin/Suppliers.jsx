import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Search, Pencil, Phone, Mail, Trash2, MessageCircle, MapPin, DollarSign } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DataTable from "@/components/shared/DataTable";
import { FormSection, Field } from "@/components/shared/FormSection";

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
  contacts: [], address: "", payment_terms: "", pix_key: "",
};

async function generateSupplierCode(suppliers) {
  const maxNum = suppliers.reduce((max, s) => {
    const match = s.code?.match(/FOR(\d+)/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);
  return `FOR${String(maxNum + 1).padStart(5, "0")}`;
}

function FormField({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SupplierForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <FormSection title="Identificação" icon={Building2} cols={2}>
        <Field label="Razão social / Nome" required colSpan={2}>
          <Input placeholder="ex: Posto Rodoviário Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="CNPJ / CPF">
          <Input placeholder="00.000.000/0001-00" value={form.cnpj_cpf} onChange={e => setForm(f => ({ ...f, cnpj_cpf: e.target.value }))} />
        </Field>
        <Field label="Categoria">
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Endereço" colSpan={2}>
          <Input placeholder="Rua, número, cidade — UF" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </Field>
      </FormSection>

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

function SupplierContactsSection({ contacts, onChange }) {
  const [showModal, setShowModal] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [contactForm, setContactForm] = useState({ name: "", role: "", phone: "", whatsapp: "", email: "", is_primary: false });
  const EMPTY_C = { name: "", role: "", phone: "", whatsapp: "", email: "", is_primary: false };

  const handleSave = () => {
    if (!contactForm.name.trim()) return;
    const updated = [...(contacts || [])];
    if (contactForm.is_primary) updated.forEach(c => { c.is_primary = false; });
    if (editIdx !== null) { updated[editIdx] = contactForm; } else { updated.push({ ...contactForm }); }
    onChange(updated);
    setShowModal(false);
    setEditIdx(null);
    setContactForm(EMPTY_C);
  };

  const handleRemove = (i) => {
    onChange((contacts || []).filter((_, idx) => idx !== i));
  };

  return (
    <div className="border-t border-border/40 pt-3 mt-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contatos</p>
        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => { setEditIdx(null); setContactForm(EMPTY_C); setShowModal(true); }}>
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      </div>
      {(contacts || []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum contato adicionado.</p>
      ) : (
        <div className="space-y-2">
          {(contacts || []).map((c, i) => (
            <div key={i} className={`flex items-start justify-between p-2.5 rounded-lg border text-xs ${c.is_primary ? "bg-velox-amber/5 border-velox-amber/30" : "border-border"}`}>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium">{c.name}</p>
                  {c.is_primary && <span className="text-[9px] bg-velox-amber/20 text-white font-bold px-1.5 py-0.5 rounded-full">Principal</span>}
                </div>
                {c.role && <p className="text-muted-foreground">{c.role}</p>}
                <div className="flex gap-2 mt-0.5">
                  {c.phone && <p>{c.phone}</p>}
                  {c.email && <p className="text-blue-600">{c.email}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                {c.whatsapp && (
                  <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <MessageCircle className="w-3 h-3" />
                  </a>
                )}
                <button onClick={() => { setEditIdx(i); setContactForm({ ...c }); setShowModal(true); }} className="p-1 text-blue-400 hover:bg-blue-50 rounded">
                  <Pencil className="w-3 h-3" />
                </button>
                <button onClick={() => handleRemove(i)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-3">
            <h3 className="font-semibold text-sm">{editIdx !== null ? "Editar Contato" : "Adicionar Contato"}</h3>
            <div className="space-y-2">
              <FormField label="Nome *"><Input placeholder="Nome completo" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} /></FormField>
              <FormField label="Função">
                <Select value={contactForm.role || ""} onValueChange={v => setContactForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {["Financeiro","Comercial","Técnico","Gerente","Diretor","Outro"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Telefone"><Input placeholder="(00) 00000-0000" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></FormField>
                <FormField label="WhatsApp"><Input placeholder="(00) 00000-0000" value={contactForm.whatsapp} onChange={e => setContactForm(f => ({ ...f, whatsapp: e.target.value }))} /></FormField>
              </div>
              <FormField label="E-mail"><Input type="email" placeholder="contato@email.com" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></FormField>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={contactForm.is_primary} onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))} className="w-4 h-4 accent-velox-amber" />
                Contato principal
              </label>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => { setShowModal(false); setEditIdx(null); }}>Cancelar</Button>
              <Button size="sm" className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" onClick={handleSave} disabled={!contactForm.name.trim()}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Suppliers({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
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
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setEditingId(null);
      toast({ title: "Fornecedor atualizado!" });
    },
  });

  const filtered = suppliers.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.cnpj_cpf?.includes(search)
  );

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
        <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setForm(EMPTY); }}>
          <DialogTrigger asChild>
            <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cadastrar Fornecedor</DialogTitle></DialogHeader>
            <SupplierForm form={form} setForm={setForm} />
            <SupplierContactsSection contacts={form.contacts} onChange={v => setForm(f => ({ ...f, contacts: v }))} />
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createMutation.isPending}
              className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold mt-2"
            >
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={suppliers}
        searchKeys={["name", "cnpj_cpf", "code", "contact_name"]}
        searchPlaceholder="Buscar por nome, CNPJ ou código..."
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(s) => { setEditingId(s.id); setEditForm({ ...EMPTY, ...s, contacts: s.contacts || [] }); }}
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
              onClick={() => { setEditingId(s.id); setEditForm({ ...EMPTY, ...s, contacts: s.contacts || [] }); }}><Pencil className="w-3.5 h-3.5" /></Button>
          )},
        ]}
      />

      {/* Edit modal */}
      <Dialog open={!!editingId} onOpenChange={(v) => { if (!v) setEditingId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Fornecedor</DialogTitle></DialogHeader>
        <SupplierForm form={editForm} setForm={setEditForm} />
        <SupplierContactsSection contacts={editForm.contacts} onChange={v => setEditForm(f => ({ ...f, contacts: v }))} />
        <Button
          onClick={() => updateMutation.mutate({ id: editingId, data: editForm })}
            disabled={!editForm.name || updateMutation.isPending}
            className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold mt-2"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
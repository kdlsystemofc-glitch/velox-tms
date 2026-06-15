import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Building2, Search, Pencil, Phone, Mail, Trash2, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  contacts: [],
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
    <div className="space-y-3">
      <FormField label="Razão Social / Nome *">
        <Input placeholder="ex: Posto Rodoviário Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="CNPJ / CPF">
          <Input placeholder="00.000.000/0001-00" value={form.cnpj_cpf} onChange={e => setForm(f => ({ ...f, cnpj_cpf: e.target.value }))} />
        </FormField>
        <FormField label="Categoria">
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormField>
      </div>
      <FormField label="Contato principal">
        <Input placeholder="Nome do responsável" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Telefone">
          <Input placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
        </FormField>
        <FormField label="WhatsApp">
          <Input placeholder="(00) 00000-0000" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
        </FormField>
      </div>
      <FormField label="E-mail">
        <Input type="email" placeholder="contato@fornecedor.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </FormField>
      <FormField label="Observações">
        <Textarea placeholder="Condições comerciais, observações..." rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" />
      </FormField>
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar fornecedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            Nenhum fornecedor cadastrado.
          </div>
        )}
        {filtered.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-velox-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-velox-blue" />
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     <p className="font-semibold truncate">{s.name}</p>
                     {s.code && <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground flex-shrink-0">{s.code}</span>}
                   </div>
                   <span className="text-[10px] bg-muted text-muted-foreground font-medium px-1.5 py-0.5 rounded-full">{catLabel(s.category)}</span>
                 </div>
                <Button variant="ghost" size="icon" className="w-7 h-7 flex-shrink-0" onClick={() => { setEditingId(s.id); setEditForm({ ...EMPTY, ...s, contacts: s.contacts || [] }); }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {s.contact_name && <p className="font-medium text-foreground">{s.contact_name}</p>}
                {s.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</p>}
                {s.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import DataTable from "@/components/shared/DataTable";
import { FormSection, Field } from "@/components/shared/FormSection";
import { AddressFields } from "@/components/shared/AddressFields";
import { Plus, Warehouse, Pencil, Trash2, Download } from "lucide-react";
import { downloadCsv } from "@/utils/exportCsv";

const EMPTY = { name: "", type: "filial", code: "", phone: "", status: "active", address: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" } };
const TYPES = { filial: "Filial", cd: "Centro de Distribuição", base: "Base" };

function generateBranchCode(branches) {
  const max = branches.reduce((m, b) => {
    const match = b.code?.match(/FIL(\d+)/);
    return match ? Math.max(m, parseInt(match[1])) : m;
  }, 0);
  return `FIL${String(max + 1).padStart(4, "0")}`;
}

export default function Branches({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => base44.entities.Branch.list("-created_date") });

  const save = useMutation({
    mutationFn: (data) => editingId ? base44.entities.Branch.update(editingId, data) : base44.entities.Branch.create({ ...data, code: data.code || generateBranchCode(branches) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); setShowForm(false); setEditingId(null); setForm(EMPTY); toast({ title: editingId ? "Filial atualizada!" : "Filial cadastrada!" }); },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.Branch.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); toast({ title: "Filial removida" }); },
    onError: (e) => {
      const inUse = /foreign key|violates|referenced/i.test(e?.message || "");
      toast({ title: inUse ? "Filial em uso" : "Erro ao remover", description: inUse ? "Há transferências ou pedidos vinculados a esta filial. Inative-a em vez de excluir." : e?.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle ? <div><h1 className="font-display text-xl font-bold">Filiais & CDs</h1><p className="text-muted-foreground text-xs">Pontos de origem, hubs e centros de distribuição</p></div> : <div />}
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" disabled={branches.length === 0}
            onClick={() => downloadCsv(`filiais-${new Date().toISOString().slice(0,10)}`, branches, [
              { key: "code", label: "Código" },
              { key: "name", label: "Nome" },
              { key: "type", label: "Tipo", format: v => TYPES[v] || v },
              { key: "address", label: "Cidade", format: a => a?.city ? `${a.city}/${a.state}` : "" },
              { key: "phone", label: "Telefone" },
            ])}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button className="font-bold gap-2" onClick={() => { setEditingId(null); setForm(EMPTY); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Nova filial / CD
          </Button>
        </div>
      </div>

      <DataTable
        data={branches}
        searchKeys={["name", "code", "phone"]}
        searchPlaceholder="Buscar por nome ou código..."
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(b) => { setEditingId(b.id); setForm({ ...EMPTY, ...b, address: b.address || EMPTY.address }); setShowForm(true); }}
        emptyMessage="Nenhuma filial/CD cadastrada."
        columns={[
          { key: "code", label: "Código", sortable: true, width: 80, className: "font-mono text-xs text-muted-foreground", render: b => b.code || "—" },
          { key: "name", label: "Nome", sortable: true, className: "font-medium", render: b => (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded bg-velox-amber/10 flex items-center justify-center flex-shrink-0"><Warehouse className="w-3.5 h-3.5 text-velox-amber" /></span>
              <span className="truncate">{b.name}</span>
            </div>
          )},
          { key: "type", label: "Tipo", sortable: true, value: b => TYPES[b.type] || b.type, render: b => <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{TYPES[b.type] || b.type}</span> },
          { key: "city", label: "Cidade", value: b => b.address?.city || "", className: "text-xs text-muted-foreground", render: b => b.address?.city ? `${b.address.city}/${b.address.state}` : "—" },
          { key: "phone", label: "Telefone", className: "text-xs text-muted-foreground", render: b => b.phone || "—" },
          { key: "actions", label: "", align: "right", stopPropagation: true, width: 80, render: b => (
            <div className="flex justify-end">
              <button onClick={() => { setEditingId(b.id); setForm({ ...EMPTY, ...b, address: b.address || EMPTY.address }); setShowForm(true); }} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => { if (window.confirm(`Remover ${b.name}?`)) remove.mutate(b.id); }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )},
        ]}
      />

      <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditingId(null); setForm(EMPTY); } }}>
        <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border"><DialogTitle className="flex items-center gap-2"><Warehouse className="w-4.5 h-4.5 text-velox-amber" /> {editingId ? "Editar filial / CD" : "Nova filial / CD"}</DialogTitle></DialogHeader>
          <div className="space-y-4 p-5">
            <FormSection title="Identificação" icon={Warehouse} cols={2}>
              <Field label="Nome" required colSpan={2}><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: CD Guarulhos" /></Field>
              <Field label="Tipo">
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Telefone"><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Field>
            </FormSection>
            <AddressFields title="Endereço" value={form.address || {}} onChange={addr => setForm(f => ({ ...f, address: addr }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="font-bold" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate(form)}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

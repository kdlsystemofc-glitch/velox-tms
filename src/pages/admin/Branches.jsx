import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { FormSection, Field } from "@/components/shared/FormSection";
import { AddressFields } from "@/components/shared/AddressFields";
import { Plus, Warehouse, Pencil, Trash2 } from "lucide-react";

const EMPTY = { name: "", type: "filial", code: "", phone: "", status: "active", address: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" } };
const TYPES = { filial: "Filial", cd: "Centro de Distribuição", base: "Base" };

export default function Branches({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => base44.entities.Branch.list("-created_date") });

  const save = useMutation({
    mutationFn: (data) => editingId ? base44.entities.Branch.update(editingId, data) : base44.entities.Branch.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); setShowForm(false); setEditingId(null); setForm(EMPTY); toast({ title: editingId ? "Filial atualizada!" : "Filial cadastrada!" }); },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities.Branch.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); toast({ title: "Filial removida" }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle ? <div><h1 className="font-display text-xl font-bold">Filiais & CDs</h1><p className="text-muted-foreground text-xs">Pontos de origem, hubs e centros de distribuição</p></div> : <div />}
        <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={() => { setEditingId(null); setForm(EMPTY); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Nova filial / CD
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {branches.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhuma filial/CD cadastrada.</p>}
        {branches.map(b => (
          <Card key={b.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-1.5"><Warehouse className="w-4 h-4 text-velox-amber" /> {b.name}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{TYPES[b.type] || b.type}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingId(b.id); setForm({ ...EMPTY, ...b, address: b.address || EMPTY.address }); setShowForm(true); }} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { if (window.confirm(`Remover ${b.name}?`)) remove.mutate(b.id); }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{b.address?.city ? `${b.address.city}/${b.address.state}` : "Sem endereço"}{b.phone && ` · ${b.phone}`}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
              <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate(form)}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

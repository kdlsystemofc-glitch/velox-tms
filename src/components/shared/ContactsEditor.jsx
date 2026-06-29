import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

const ROLES = ["Financeiro", "Logística", "Compras", "Comercial", "Técnico", "Gerente", "Diretor", "Outro"];

/**
 * Editor de contatos reutilizável (Clientes, Fornecedores...).
 * Cada contato: { name, role, phone, whatsapp, email, is_primary }.
 * "Principal" funciona como rádio: marcar um desmarca os demais.
 *
 * @param {Array} value     lista de contatos
 * @param {Function} onChange recebe a nova lista
 */
export default function ContactsEditor({ value = [], onChange }) {
  const contacts = value || [];
  const update = (i, patch) => onChange(contacts.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const setPrimary = (i) => onChange(contacts.map((c, idx) => ({ ...c, is_primary: idx === i })));
  const add = () => onChange([...contacts, { name: "", role: "", phone: "", whatsapp: "", email: "", is_primary: contacts.length === 0 }]);
  const remove = (i) => onChange(contacts.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Pessoas de contato</span>
        <button type="button" onClick={add} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
          <Plus className="w-3 h-3" /> Adicionar contato
        </button>
      </div>
      {contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nenhum contato adicionado.</p>
      ) : (
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={i} className="border border-border rounded-md p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Contato {i + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" checked={!!c.is_primary} onChange={() => setPrimary(i)} className="w-3.5 h-3.5 accent-primary" />
                    Principal
                  </label>
                  <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 dark:text-red-300"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nome *" value={c.name || ""} onChange={e => update(i, { name: e.target.value })} />
                <Select value={c.role || ""} onValueChange={v => update(i, { role: v })}>
                  <SelectTrigger><SelectValue placeholder="Função" /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Telefone" value={c.phone || ""} onChange={e => update(i, { phone: e.target.value })} />
                <Input placeholder="WhatsApp" value={c.whatsapp || ""} onChange={e => update(i, { whatsapp: e.target.value })} />
                <Input placeholder="E-mail" value={c.email || ""} onChange={e => update(i, { email: e.target.value })} className="col-span-2" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

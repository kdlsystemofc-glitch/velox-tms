import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

// Categorias de gasto de viagem → categoria de despesa (Financeiro). Vi-3.
const COST_PRESETS = [
  { key: "meals", label: "Alimentação", category: "other" },
  { key: "lodging", label: "Pernoite / Diária", category: "other" },
  { key: "maintenance", label: "Manutenção em rota", category: "maintenance" },
  { key: "tires", label: "Pneu / Borracharia", category: "tires" },
  { key: "parking", label: "Estacionamento", category: "other" },
  { key: "loading", label: "Chapa / Descarga", category: "other" },
  { key: "fines", label: "Multas", category: "other" },
  { key: "other", label: "Outros", category: "other" },
];

// Modal de encerramento da viagem. Extraído de TripDetailPage (A2).
// Estado do formulário e o submit (closeTrip) ficam no pai — aqui só apresentação.
export default function TripCloseModal({ open, onOpenChange, form, setForm, trip, onConfirm, submitting }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Encerrar Viagem</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Km Final (odômetro)</label><Input type="number" value={form.real_km} onChange={e => setForm(f => ({ ...f, real_km: e.target.value }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Combustível (litros)</label><Input type="number" step="0.1" value={form.fuel_liters} onChange={e => setForm(f => ({ ...f, fuel_liters: e.target.value }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custo combustível (R$)</label><Input type="number" step="0.01" value={form.fuel_cost} onChange={e => setForm(f => ({ ...f, fuel_cost: e.target.value }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pedágios (R$)</label><Input type="number" step="0.01" value={form.tolls_cost} onChange={e => setForm(f => ({ ...f, tolls_cost: e.target.value }))} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outros gastos da viagem</label>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setForm(f => ({ ...f, other_costs: [...f.other_costs, { type: "meals", category: "other", description: "", amount: "" }] }))}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            {form.other_costs.length === 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {COST_PRESETS.slice(0, 4).map(p => (
                  <button key={p.key} type="button"
                    className="text-[11px] px-2 py-1 rounded-full border border-border hover:bg-muted text-muted-foreground"
                    onClick={() => setForm(f => ({ ...f, other_costs: [...f.other_costs, { type: p.key, category: p.category, description: p.label, amount: "" }] }))}>
                    + {p.label}
                  </button>
                ))}
              </div>
            )}
            {form.other_costs.map((c, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select value={c.type || "other"} className="h-8 text-xs border border-border rounded-md px-1.5 bg-background w-32 flex-shrink-0"
                  onChange={e => { const preset = COST_PRESETS.find(p => p.key === e.target.value); const oc = [...form.other_costs]; oc[i] = { ...oc[i], type: e.target.value, category: preset?.category || "other", description: oc[i].description || preset?.label || "" }; setForm(f => ({ ...f, other_costs: oc })); }}>
                  {COST_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
                <Input placeholder="Descrição" value={c.description} onChange={e => { const oc = [...form.other_costs]; oc[i] = { ...oc[i], description: e.target.value }; setForm(f => ({ ...f, other_costs: oc })); }} className="flex-1 h-8 text-xs" />
                <Input type="number" step="0.01" placeholder="R$" value={c.amount} onChange={e => { const oc = [...form.other_costs]; oc[i] = { ...oc[i], amount: e.target.value }; setForm(f => ({ ...f, other_costs: oc })); }} className="w-20 h-8 text-xs" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 flex-shrink-0" onClick={() => setForm(f => ({ ...f, other_costs: f.other_costs.filter((_, j) => j !== i) }))}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações finais</label>
            <Textarea placeholder="Ocorrências, observações sobre a rota, etc." rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" />
          </div>

          <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-0.5">
            <div className="flex justify-between"><span>Receita</span><span className="font-mono text-green-600 dark:text-green-300">R$ {(trip.total_revenue || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Custo estimado</span><span className="font-mono text-red-600 dark:text-red-300">R$ {(Number(form.fuel_cost || 0) + Number(form.tolls_cost || 0) + form.other_costs.reduce((s, c) => s + Number(c.amount || 0), 0)).toFixed(2)}</span></div>
            {Number(trip.advance_amount) > 0 && (
              <div className="flex justify-between text-xs text-amber-700 dark:text-amber-300"><span>Adiantamento já pago (acerto)</span><span className="font-mono">R$ {Number(trip.advance_amount).toFixed(2)}</span></div>
            )}
          </div>

          <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold" onClick={onConfirm} disabled={submitting}>
            {submitting ? "Encerrando..." : "Confirmar Encerramento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

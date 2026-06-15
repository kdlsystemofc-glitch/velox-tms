import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AddOrderModal({ orders, truck, date, onConfirm, onCancel }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);

  const dateLabel = date
    ? format(new Date(date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : "—";

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.client_name?.toLowerCase().includes(q) || o.protocol?.toLowerCase().includes(q);
  });

  const toggleSelect = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar coleta</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {truck?.plate} · {dateLabel}
          </p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="pl-8 text-sm"
            placeholder="Buscar por cliente ou protocolo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Nenhum pedido disponível</p>
          )}
          {filtered.map(order => (
            <label key={order.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer transition-colors">
              <Checkbox
                checked={selected.includes(order.id)}
                onCheckedChange={() => toggleSelect(order.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-bold text-velox-amber">{order.protocol}</p>
                <p className="text-sm font-medium truncate">{order.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {order.total_weight_kg || 0} kg · {order.collection_date || "Sem data"}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-border">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button
            className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold"
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            Confirmar {selected.length > 0 ? `(${selected.length})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
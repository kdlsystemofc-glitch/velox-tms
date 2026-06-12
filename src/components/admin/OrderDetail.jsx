import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Package, MapPin, User } from "lucide-react";

const statusOptions = [
  { value: "new", label: "Novo" },
  { value: "confirmed", label: "Confirmado" },
  { value: "collecting", label: "Em Coleta" },
  { value: "in_transit", label: "Em Trânsito" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

export default function OrderDetail({ order, onUpdate, onClose }) {
  const { toast } = useToast();
  const [newStatus, setNewStatus] = useState(order.status);
  const [freightValue, setFreightValue] = useState(order.freight_value || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates = { freight_value: Number(freightValue) || 0 };
    if (newStatus !== order.status) {
      updates.status = newStatus;
      updates.status_history = [
        ...(order.status_history || []),
        { status: newStatus, timestamp: new Date().toISOString(), user: "Admin", note: "" },
      ];
    }
    await base44.entities.Order.update(order.id, updates);
    toast({ title: "Pedido atualizado!" });
    onUpdate();
    onClose();
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Client info */}
      <div className="bg-muted/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Solicitante</span>
        </div>
        <p className="font-semibold">{order.client_name}</p>
        <p className="text-sm text-muted-foreground">{order.client_cpf_cnpj} · {order.client_phone} · {order.client_email}</p>
      </div>

      {/* Origin */}
      <div className="bg-muted/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origem</span>
        </div>
        <p className="text-sm">
          {order.origin?.street}, {order.origin?.number} — {order.origin?.city}/{order.origin?.state}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Coleta: {order.collection_date} ({order.collection_time === "morning" ? "Manhã" : order.collection_time === "afternoon" ? "Tarde" : "A combinar"})
        </p>
      </div>

      {/* Recipients */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Destinatários ({order.recipients?.length || 0})
          </span>
        </div>
        <div className="space-y-2">
          {order.recipients?.map((r, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3">
              <p className="font-medium text-sm">{r.name}</p>
              <p className="text-xs text-muted-foreground">{r.city}/{r.state}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {r.items?.length || 0} item(s) · {r.items?.reduce((s, it) => s + (it.volumes || 0), 0)} vol · {r.items?.reduce((s, it) => s + (it.weight_kg || 0), 0)} kg
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="font-mono font-bold text-lg">{order.total_volumes || 0}</p>
          <p className="text-xs text-muted-foreground">Volumes</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="font-mono font-bold text-lg">{order.total_weight_kg?.toFixed(1) || 0}</p>
          <p className="text-xs text-muted-foreground">Peso (kg)</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="font-mono font-bold text-lg">R$ {(order.total_declared_value || 0).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Valor Decl.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Status</label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Valor do Frete (R$)</label>
            <Input
              type="number"
              value={freightValue}
              onChange={(e) => setFreightValue(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold"
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
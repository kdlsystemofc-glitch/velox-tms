import React from "react";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, Trash2, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function OrderDetailPanel({ order, onClose, onRemove }) {
  if (!order) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <p className="font-mono font-bold text-velox-amber text-sm">{order.protocol}</p>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
          <p className="font-semibold text-foreground">{order.client_name}</p>
          {order.client_phone && <p className="text-xs text-muted-foreground">{order.client_phone}</p>}
        </div>

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Origem</p>
          <p className="text-sm">{order.origin?.street}, {order.origin?.number}</p>
          <p className="text-xs text-muted-foreground">{order.origin?.city} - {order.origin?.state} · CEP {order.origin?.cep}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="font-mono font-bold text-sm">{order.recipients?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">destinos</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="font-mono font-bold text-sm">{(order.total_weight_kg || 0).toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">kg</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="font-mono font-bold text-sm">{order.total_volumes || 0}</p>
            <p className="text-[10px] text-muted-foreground">vol</p>
          </div>
        </div>

        {order.scheduled_start_time && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" /> Horários programados
            </p>
            <p className="text-xs text-blue-600">
              {order.scheduled_start_time} – {order.scheduled_end_time}
              {order.scheduled_lunch_start && ` (almoço ${order.scheduled_lunch_start}–${order.scheduled_lunch_end})`}
            </p>
            {order.schedule_notes && <p className="text-xs text-blue-500 mt-1">{order.schedule_notes}</p>}
          </div>
        )}

        {order.collection_date && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Data solicitada</p>
            <p className="text-sm">{order.collection_date}</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border space-y-2">
        <Link to={`/admin/pedidos/${order.id}`} className="block">
          <Button variant="outline" className="w-full gap-2 text-sm">
            <ExternalLink className="w-4 h-4" /> Ver pedido completo
          </Button>
        </Link>
        <Button
          variant="outline"
          className="w-full gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => onRemove(order)}
        >
          <Trash2 className="w-4 h-4" /> Remover desta programação
        </Button>
      </div>
    </div>
  );
}
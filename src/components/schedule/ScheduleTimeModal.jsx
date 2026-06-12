import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ScheduleTimeModal({ order, truck, date, onConfirm, onCancel }) {
  const [times, setTimes] = useState({
    scheduled_start_time: "08:00",
    scheduled_lunch_start: "12:00",
    scheduled_lunch_end: "13:00",
    scheduled_end_time: "17:00",
    schedule_notes: "",
  });

  const dateLabel = date
    ? format(new Date(date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : "—";

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-velox-amber" />
            Configurar horário de coleta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-3 text-sm">
            <p className="font-mono font-bold text-velox-amber">{order?.protocol}</p>
            <p className="text-foreground font-medium">{order?.client_name}</p>
            <p className="text-muted-foreground text-xs mt-1">
              Data: {dateLabel} · {truck?.plate || truck?.model || "Carreta"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Início da coleta</p>
              <Input
                type="time"
                value={times.scheduled_start_time}
                onChange={e => setTimes(t => ({ ...t, scheduled_start_time: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Encerramento previsto</p>
              <Input
                type="time"
                value={times.scheduled_end_time}
                onChange={e => setTimes(t => ({ ...t, scheduled_end_time: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Início do almoço</p>
              <Input
                type="time"
                value={times.scheduled_lunch_start}
                onChange={e => setTimes(t => ({ ...t, scheduled_lunch_start: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Fim do almoço</p>
              <Input
                type="time"
                value={times.scheduled_lunch_end}
                onChange={e => setTimes(t => ({ ...t, scheduled_lunch_end: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Observações da parada</p>
            <Textarea
              rows={2}
              placeholder="Portaria, restrições, contato..."
              value={times.schedule_notes}
              onChange={e => setTimes(t => ({ ...t, schedule_notes: e.target.value }))}
              className="resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button
              className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold"
              onClick={() => onConfirm(times)}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
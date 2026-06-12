import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar } from "lucide-react";
import { getAvailabilityForDate, statusColor } from "@/utils/availabilityChecker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABEL = { available: "Disponível", limited: "Limitado", full: "Cheio", blocked: "Bloqueado" };
const STATUS_BG = {
  available: "bg-green-100 text-green-800 border-green-200",
  limited: "bg-amber-100 text-amber-800 border-amber-200",
  full: "bg-red-100 text-red-800 border-red-200",
  blocked: "bg-gray-100 text-gray-500 border-gray-200",
};
const BLOCK_TYPE_LABELS = {
  full_block: "Bloqueio total",
  partial: "Parcial",
  maintenance: "Manutenção",
  holiday: "Feriado",
};

export default function AvailabilityPanel({ trucks, orders, settings }) {
  const queryClient = useQueryClient();
  const workingDays = settings?.working_days || [1, 2, 3, 4, 5];

  const { data: blocks = [] } = useQuery({
    queryKey: ["schedule-blocks"],
    queryFn: () => base44.entities.ScheduleBlock.list("-date", 100),
  });

  const addBlock = useMutation({
    mutationFn: (data) => base44.entities.ScheduleBlock.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["schedule-blocks"] }); setShowAddModal(false); },
  });

  const removeBlock = useMutation({
    mutationFn: (id) => base44.entities.ScheduleBlock.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedule-blocks"] }),
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newBlock, setNewBlock] = useState({ date: "", truck_id: "", block_type: "full_block", reason: "" });

  // 14 dias
  const today = new Date();
  const days14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const availability = days14.map(dateStr => ({
    dateStr,
    ...getAvailabilityForDate(dateStr, trucks, orders, blocks, workingDays),
  }));

  const activeBlocks = blocks.filter(b => b.date >= today.toISOString().split("T")[0]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-velox-amber" />
            Disponibilidade dos próximos 14 dias
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Bloquear data
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini calendário 14 dias */}
        <div className="grid grid-cols-7 gap-1.5">
          {availability.map(({ dateStr, status, availableKg, totalCapacityKg }) => {
            const d = new Date(dateStr + "T12:00:00");
            const dayLabel = format(d, "EEE", { locale: ptBR });
            const dayNum = format(d, "d");
            const availT = (availableKg / 1000).toFixed(0);
            return (
              <div key={dateStr} className={`rounded-lg border p-1.5 text-center ${STATUS_BG[status]}`}>
                <p className="text-[10px] uppercase font-semibold opacity-70">{dayLabel}</p>
                <p className="text-sm font-bold font-mono">{dayNum}</p>
                <p className="text-[10px] mt-0.5">
                  {status === "blocked" ? "Bloq."
                    : status === "full" ? "Cheio"
                    : `${availT}t`}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Disponível</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Limitado</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Cheio</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Bloqueado</span>
        </div>

        {/* Bloqueios ativos */}
        {activeBlocks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bloqueios ativos</p>
            <div className="space-y-1.5">
              {activeBlocks.map(block => {
                const truckLabel = block.truck_id
                  ? trucks.find(t => t.id === block.truck_id)?.plate || block.truck_id
                  : "Todas";
                return (
                  <div key={block.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2">
                    <span className="font-mono font-medium">{block.date}</span>
                    <span className="text-muted-foreground">|</span>
                    <span>{truckLabel}</span>
                    <span className="text-muted-foreground">|</span>
                    <span>{BLOCK_TYPE_LABELS[block.block_type] || block.block_type}</span>
                    {block.reason && <span className="text-muted-foreground flex-1 truncate">— {block.reason}</span>}
                    <button
                      onClick={() => removeBlock.mutate(block.id)}
                      className="text-red-400 hover:text-red-600 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal adicionar bloqueio */}
      {showAddModal && (
        <Dialog open onOpenChange={() => setShowAddModal(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Bloquear data</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Data *</p>
                <Input
                  type="date"
                  value={newBlock.date}
                  onChange={e => setNewBlock(b => ({ ...b, date: e.target.value }))}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Carreta</p>
                <Select value={newBlock.truck_id || "_all"} onValueChange={v => setNewBlock(b => ({ ...b, truck_id: v === "_all" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas as carretas</SelectItem>
                    {trucks.filter(t => t.status !== "inactive").map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.plate} – {t.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tipo *</p>
                <Select value={newBlock.block_type} onValueChange={v => setNewBlock(b => ({ ...b, block_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_block">Bloqueio total</SelectItem>
                    <SelectItem value="maintenance">Manutenção</SelectItem>
                    <SelectItem value="holiday">Feriado</SelectItem>
                    <SelectItem value="partial">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Motivo</p>
                <Textarea rows={2} className="resize-none" value={newBlock.reason} onChange={e => setNewBlock(b => ({ ...b, reason: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                <Button
                  className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold"
                  disabled={!newBlock.date || !newBlock.block_type || addBlock.isPending}
                  onClick={() => addBlock.mutate(newBlock)}
                >
                  Confirmar bloqueio
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
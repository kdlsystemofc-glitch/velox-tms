import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/admin/StatusBadge";
import PriorityBadge from "@/components/shared/PriorityBadge";
import { sortByPriority, isElevatedPriority } from "@/utils/priority";
import { useToast } from "@/components/ui/use-toast";
import { toLocalISO, formatDateBR } from "@/utils/dateUtils";
import { planLoads, regionLabel, localityKey } from "@/utils/dispatchPlanner";
import { truckVolumeM3, orderVolumeM3, fmtM3 } from "@/utils/cargoVolume";
import { orderWindowConflicts } from "@/utils/deliveryWindow";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Input } from "@/components/ui/input";
import {
  Package, Truck, ChevronLeft, ChevronRight, MapPin,
  CalendarDays, Send, X, Sparkles, Search, GripVertical
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import PageHeader from "@/components/shared/PageHeader";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * DESPACHO — o coração do TMS (dispatch board).
 * Esquerda: fila de pedidos confirmados sem programação/viagem.
 * Direita: quadro caminhões × dias com capacidade.
 * Fluxo: seleciona pedidos → clica na célula (caminhão+dia) → programado.
 * Dali, "Criar viagem" leva os pedidos programados para a viagem.
 */
export default function DispatchBoard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [plan, setPlan] = useState(null); // proposta da separação automática
  const [queueSearch, setQueueSearch] = useState("");
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const { settings } = useCompanySettings();

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 500) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list(), select: d => d.filter(t => t.status !== "inactive") });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 50) });

  // Fila: confirmados sem viagem
  const queue = orders.filter(o => o.status === "confirmed" && !o.trip_id);
  const unscheduled = queue.filter(o => !o.scheduled_truck_id || !o.scheduled_date);
  const scheduled = orders.filter(o => ["confirmed", "collecting"].includes(o.status) && o.scheduled_truck_id && o.scheduled_date && !o.trip_id);
  const activeTrips = trips.filter(t => t.status === "in_progress" || t.status === "planned");

  const today = new Date();
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
  // Dias do quadro respeitam os dias úteis da empresa (working_days). Padrão seg–sáb.
  const workingDays = (settings?.working_days && settings.working_days.length) ? settings.working_days : [1, 2, 3, 4, 5, 6];
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter(d => workingDays.includes(d.getDay()));

  // Fila filtrada (busca + urgente). "Urgente" agora considera a prioridade
  // OPERACIONAL (crítica/urgente) além do tipo de frete urgente.
  const filteredQueue = sortByPriority(
    unscheduled.filter(o => {
      if (onlyUrgent && o.freight_type !== "urgent" && !isElevatedPriority(o.priority)) return false;
      const q = queueSearch.trim().toLowerCase();
      if (!q) return true;
      return o.protocol?.toLowerCase().includes(q) || o.client_name?.toLowerCase().includes(q)
        || o.origin?.city?.toLowerCase().includes(q)
        || (o.recipients || []).some(r => (r.city || "").toLowerCase().includes(q) || (r.state || "").toLowerCase().includes(q));
    }),
    // Empate de prioridade → coleta mais antiga primeiro.
    (a, b) => String(a.collection_date || "9999").localeCompare(String(b.collection_date || "9999")),
  );

  // Ocupação da frota por dia (peso programado ÷ capacidade total)
  const totalFleetKg = trucks.reduce((s, t) => s + (t.capacity_kg || 0), 0);
  const dayOccupancy = (dateStr) => {
    if (totalFleetKg <= 0) return 0;
    const kg = scheduled.filter(o => o.scheduled_date === dateStr).reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    return Math.round((kg / totalFleetKg) * 100);
  };

  const selectedOrders = orders.filter(o => selectedIds.includes(o.id));
  const selectedKg = selectedOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
  const selectedVol = selectedOrders.reduce((s, o) => s + orderVolumeM3(o), 0);

  // "Mesma região" (S8): conta pedidos por cidade+bairro para destacar quem fica perto.
  const localityCount = unscheduled.reduce((acc, o) => { const k = localityKey(o); acc[k] = (acc[k] || 0) + 1; return acc; }, {});

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ── Programar pedidos selecionados numa célula ────────────────
  const assignMutation = useMutation({
    mutationFn: async ({ truckId, dateStr }) => {
      const ids = selectedOrders.map(o => o.id);
      try {
        const { error } = await supabase.rpc("schedule_orders", { p_order_ids: ids, p_truck_id: truckId, p_date: dateStr, p_user: "Admin" });
        if (!error) return;
        throw error;
      } catch { /* fallback cliente */ }
      for (const order of selectedOrders) {
        await base44.entities.Order.update(order.id, {
          scheduled_truck_id: truckId,
          scheduled_date: dateStr,
          status_history: [...(order.status_history || []), {
            status: order.status,
            timestamp: new Date().toISOString(),
            user: "Admin",
            note: `Programado no despacho para ${formatDateBR(dateStr)}`,
          }],
        });
      }
    },
    onSuccess: (_, { dateStr }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: `${selectedOrders.length} pedido(s) programado(s) para ${formatDateBR(dateStr)}` });
      setSelectedIds([]);
    },
    onError: (e) => toast({ title: "Erro ao programar", description: e?.message, variant: "destructive" }),
  });

  // ── Remover programação de um pedido ──────────────────────────
  const unassignMutation = useMutation({
    mutationFn: (order) => base44.entities.Order.update(order.id, { scheduled_truck_id: null, scheduled_date: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Pedido devolvido à fila." });
    },
  });

  // Devolve TODOS os pedidos programados (sem viagem) para a fila — útil para reprogramar do zero
  const unassignAllMutation = useMutation({
    mutationFn: async () => {
      const ids = scheduled.map(o => o.id);
      try {
        const { error } = await supabase.rpc("unschedule_orders", { p_order_ids: ids });
        if (!error) return;
        throw error;
      } catch { /* fallback cliente */ }
      for (const o of scheduled) {
        await base44.entities.Order.update(o.id, { scheduled_truck_id: null, scheduled_date: null });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Todos os pedidos voltaram para a fila." });
    },
    onError: (e) => toast({ title: "Erro ao devolver", description: e?.message, variant: "destructive" }),
  });

  // ── Separação automática (load planning) ──────────────────────
  const runAutoPlan = () => {
    const result = planLoads(orders, trucks, settings);
    if (!result.loads.length) {
      toast({ title: "Nada para sugerir", description: result.reason || "Sem pedidos/caminhões elegíveis.", variant: "destructive" });
      return;
    }
    setPlan(result);
  };

  const applyPlanMutation = useMutation({
    mutationFn: async () => {
      const loads = plan.loads.map(l => ({ truck_id: l.truck.id, date: l.date, order_ids: l.orders.map(o => o.id) }));
      try {
        const { error } = await supabase.rpc("apply_dispatch_plan", { p_loads: loads, p_user: "Admin" });
        if (!error) return;
        throw error;
      } catch { /* fallback cliente */ }
      for (const load of plan.loads) {
        for (const o of load.orders) {
          await base44.entities.Order.update(o.id, { scheduled_truck_id: load.truck.id, scheduled_date: load.date });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      const n = plan.loads.reduce((s, l) => s + l.orders.length, 0);
      toast({ title: "Separação aplicada!", description: `${n} pedido(s) distribuído(s) em ${plan.loads.length} carga(s). Revise no quadro e crie as viagens.` });
      setPlan(null);
      setSelectedIds([]);
    },
    onError: (e) => toast({ title: "Erro ao aplicar", description: e?.message, variant: "destructive" }),
  });

  const handleCellClick = (truck, day) => {
    if (selectedIds.length === 0) {
      toast({ title: "Selecione pedidos na fila", description: "Marque um ou mais pedidos à esquerda e clique na célula para programar." });
      return;
    }
    const dateStr = toLocalISO(day);
    // valida capacidade de PESO
    const cellOrders = scheduled.filter(o => o.scheduled_truck_id === truck.id && o.scheduled_date === dateStr);
    const usedKg = cellOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    if (truck.capacity_kg > 0 && usedKg + selectedKg > truck.capacity_kg) {
      toast({
        title: "Capacidade de peso excedida",
        description: `${truck.plate}: ${(usedKg + selectedKg).toLocaleString("pt-BR")} kg > ${truck.capacity_kg.toLocaleString("pt-BR")} kg. Remova pedidos ou escolha outro dia/caminhão.`,
        variant: "destructive",
      });
      return;
    }
    // valida VOLUME físico (S7) — só quando o caminhão tem dimensões cadastradas
    const capVol = truckVolumeM3(truck);
    const usedVol = cellOrders.reduce((s, o) => s + orderVolumeM3(o), 0);
    if (capVol > 0 && usedVol + selectedVol > capVol) {
      toast({
        title: "Espaço físico excedido",
        description: `${truck.plate}: ${fmtM3(usedVol + selectedVol)} > ${fmtM3(capVol)} de baú. A carga não cabe pelo tamanho, mesmo dentro do peso.`,
        variant: "destructive",
      });
      return;
    }
    // aviso de janela de recebimento (S6) — informativo, não bloqueia
    const windowWarnings = selectedOrders.flatMap(o => orderWindowConflicts(o, dateStr).map(c => `${c.recipient} (${c.window})`));
    if (windowWarnings.length > 0) {
      toast({
        title: "Fora da janela de recebimento",
        description: `Atenção: ${windowWarnings.join("; ")} não recebe(m) neste dia da semana. Confirme a data com o destinatário.`,
      });
    }
    assignMutation.mutate({ truckId: truck.id, dateStr });
  };

  // ── Validação de capacidade (compartilhada clique/arrastar) ───
  const assignError = (ordersToAssign, truck, dateStr) => {
    const cellOrders = scheduled.filter(o => o.scheduled_truck_id === truck.id && o.scheduled_date === dateStr);
    const usedKg = cellOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    const addKg = ordersToAssign.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    if (truck.capacity_kg > 0 && usedKg + addKg > truck.capacity_kg) {
      return `${truck.plate}: ${(usedKg + addKg).toLocaleString("pt-BR")} kg > ${truck.capacity_kg.toLocaleString("pt-BR")} kg (peso).`;
    }
    const capVol = truckVolumeM3(truck);
    const usedVol = cellOrders.reduce((s, o) => s + orderVolumeM3(o), 0);
    const addVol = ordersToAssign.reduce((s, o) => s + orderVolumeM3(o), 0);
    if (capVol > 0 && usedVol + addVol > capVol) {
      return `${truck.plate}: ${fmtM3(usedVol + addVol)} > ${fmtM3(capVol)} de baú (volume).`;
    }
    return null;
  };

  // ── Drag-and-drop: arrastar pedido → célula (ou de volta à fila) ──
  const assignOne = useMutation({
    mutationFn: ({ order, truckId, dateStr }) => base44.entities.Order.update(order.id, {
      scheduled_truck_id: truckId, scheduled_date: dateStr,
      status_history: [...(order.status_history || []), { status: order.status, timestamp: new Date().toISOString(), user: "Admin", note: `Programado (arrastar) para ${formatDateBR(dateStr)}` }],
    }),
    onSuccess: (_, { dateStr }) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: `Programado para ${formatDateBR(dateStr)}` });
    },
    onError: (e) => toast({ title: "Erro ao programar", description: e?.message, variant: "destructive" }),
  });

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const order = orders.find(o => o.id === draggableId);
    if (!order) return;
    if (destination.droppableId.startsWith("cell:")) {
      const [, truckId, dateStr] = destination.droppableId.split(":");
      const truck = trucks.find(t => t.id === truckId);
      if (!truck) return;
      if (order.scheduled_truck_id === truckId && order.scheduled_date === dateStr) return; // sem mudança
      const err = assignError([order], truck, dateStr);
      if (err) { toast({ title: "Não cabe", description: err, variant: "destructive" }); return; }
      const conflicts = orderWindowConflicts(order, dateStr);
      if (conflicts.length) toast({ title: "Fora da janela", description: conflicts.map(c => `${c.recipient} (${c.window})`).join("; ") });
      assignOne.mutate({ order, truckId, dateStr });
    } else if (destination.droppableId === "queue" && order.scheduled_truck_id) {
      unassignMutation.mutate(order);
    }
  };

  // ── Criar viagem a partir de uma célula ───────────────────────
  const createTripFromCell = (truck, dateStr, cellOrders) => {
    navigate("/admin/viagens/nova", {
      state: { preselectedOrderIds: cellOrders.map(o => o.id), preselectedTruckId: truck.id },
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={CalendarDays} title="Despacho" subtitle="Selecione pedidos na fila e clique no dia/caminhão para programar">
        {unscheduled.length > 0 && (
          <Button size="sm" className="text-xs gap-1 font-bold" onClick={runAutoPlan}>
            <Sparkles className="w-3.5 h-3.5" /> Separação automática
          </Button>
        )}
        {scheduled.length > 0 && (
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => unassignAllMutation.mutate()} disabled={unassignAllMutation.isPending}>
            <X className="w-3.5 h-3.5" /> Devolver {scheduled.length} à fila
          </Button>
        )}
        {activeTrips.length > 0 && (
          <Link to="/admin/viagens" className="text-xs text-primary hover:underline flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> {activeTrips.length} viagem(ns) ativa(s) →
          </Link>
        )}
      </PageHeader>

      <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-5">
        {/* ── FILA (esquerda) ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-velox-amber" /> Fila de despacho
              <span className="text-muted-foreground font-normal">({filteredQueue.length}{filteredQueue.length !== unscheduled.length ? `/${unscheduled.length}` : ""})</span>
            </h2>
            {filteredQueue.length > 0 && (
              filteredQueue.every(o => selectedIds.includes(o.id))
                ? <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> Limpar</button>
                : <button onClick={() => setSelectedIds(filteredQueue.map(o => o.id))} className="text-xs text-primary hover:underline">Selecionar todos</button>
            )}
          </div>

          {/* Busca + filtro */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Cliente, cidade, UF..." value={queueSearch} onChange={e => setQueueSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <button onClick={() => setOnlyUrgent(v => !v)}
              className={`text-[11px] font-semibold px-2.5 rounded-md border transition-colors ${onlyUrgent ? "bg-red-500 text-white border-red-500" : "bg-background text-muted-foreground border-border hover:border-red-300"}`}>
              Urgentes
            </button>
          </div>

          {selectedIds.length > 0 && (
            <div className="rounded-lg bg-velox-amber/10 border border-velox-amber/30 px-3 py-2.5 space-y-2">
              <p className="text-xs font-medium text-velox-dark">
                {selectedIds.length} selecionado(s) · {selectedKg.toLocaleString("pt-BR")} kg{selectedVol > 0 ? ` · ${fmtM3(selectedVol)}` : ""}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => setSelectedIds([])}>Limpar</Button>
                <Button size="sm" className="h-7 text-xs flex-1 font-bold gap-1"
                  onClick={() => navigate("/admin/viagens/nova", { state: { preselectedOrderIds: selectedIds } })}>
                  <Send className="w-3 h-3" /> Criar viagem
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">ou clique numa célula do quadro para programar →</p>
            </div>
          )}

          <Droppable droppableId="queue">
          {(dpQueue) => (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1" ref={dpQueue.innerRef} {...dpQueue.droppableProps}>
            {filteredQueue.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {unscheduled.length === 0 ? <>Fila vazia.<br /><Link to="/admin/coletas?status=new" className="text-velox-amber hover:underline text-xs">Ver pedidos aguardando confirmação →</Link></> : "Nenhum pedido com este filtro."}
              </div>
            ) : filteredQueue.map((o, qi) => (
              <Draggable key={o.id} draggableId={o.id} index={qi}>
              {(d) => (
              <label ref={d.innerRef} {...d.draggableProps}
                className={`block rounded-xl border p-3 cursor-pointer transition-all ${
                  selectedIds.includes(o.id)
                    ? "border-velox-amber bg-velox-amber/5 shadow-sm"
                    : "border-border hover:border-velox-amber/40"
                }`}>
                <div className="flex items-start gap-2.5">
                  <span {...d.dragHandleProps} className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing pt-0.5" title="Arraste para o quadro"><GripVertical className="w-4 h-4" /></span>
                  <Checkbox checked={selectedIds.includes(o.id)} onCheckedChange={() => toggleSelect(o.id)} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold flex items-center gap-1">
                        {o.protocol}
                        <PriorityBadge priority={o.priority} />
                        {o.freight_type === "urgent" && <span className="text-[9px] bg-red-500/15 text-red-700 dark:text-red-300 font-bold px-1 rounded uppercase">Frete urgente</span>}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</span>
                    </div>
                    <p className="text-sm font-medium truncate mt-0.5">
                      {o.client_name}
                      {localityCount[localityKey(o)] > 1 && (
                        <span className="ml-1.5 text-[9px] bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold px-1 py-0.5 rounded">Mesma região</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      <MapPin className="w-3 h-3 inline mr-0.5" />
                      {o.origin?.city || "—"} → {(o.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                    </p>
                    {o.collection_date && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-0.5">Solicitado: {formatDateBR(o.collection_date)}</p>
                    )}
                  </div>
                </div>
              </label>
              )}
              </Draggable>
            ))}
            {dpQueue.placeholder}
          </div>
          )}
          </Droppable>
        </div>

        {/* ── QUADRO (direita) ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              {format(weekStart, "dd/MM", { locale: ptBR })} – {format(days[days.length - 1] || addDays(weekStart, 5), "dd/MM/yyyy", { locale: ptBR })}
            </span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => setWeekOffset(0)} className="text-xs text-velox-amber hover:underline">Esta semana</button>
            )}
          </div>

          {trucks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-20" />
              Nenhum caminhão ativo. <Link to="/admin/frota" className="text-velox-amber hover:underline">Cadastrar →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse bg-background">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 w-32 border-b border-r border-border bg-muted/30">Caminhão</th>
                    {days.map((day, i) => {
                      const occ = dayOccupancy(toLocalISO(day));
                      return (
                        <th key={i} className={`text-center text-xs p-2 border-b border-border min-w-[130px] ${isToday(day) ? "bg-velox-amber/10" : "bg-muted/30"}`}>
                          <span className={`font-medium ${isToday(day) ? "text-velox-amber" : "text-muted-foreground"}`}>
                            {format(day, "EEE", { locale: ptBR })}
                          </span>
                          <span className={`block text-base font-bold font-mono ${isToday(day) ? "text-velox-amber" : "text-foreground"}`}>
                            {format(day, "dd/MM")}
                          </span>
                          {occ > 0 && (
                            <span className={`block text-[10px] font-semibold ${occ > 95 ? "text-red-600 dark:text-red-300" : occ > 75 ? "text-amber-600 dark:text-amber-300" : "text-green-600 dark:text-green-300"}`}>
                              {occ}% frota
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {trucks.map(truck => (
                    <tr key={truck.id} className="border-b border-border/40 last:border-0">
                      <td className="p-3 border-r border-border align-top">
                        <p className="font-mono font-bold text-sm">{truck.plate}</p>
                        <p className="text-xs text-muted-foreground">{truck.model}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{(truck.capacity_kg || 0).toLocaleString("pt-BR")} kg</p>
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          truck.status === "available" ? "bg-green-500/15 text-green-700 dark:text-green-300" :
                          truck.status === "on_route" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"
                        }`}>
                          {truck.status === "available" ? "Disponível" : truck.status === "on_route" ? "Em rota" : "Manutenção"}
                        </span>
                      </td>
                      {days.map((day, di) => {
                        const dateStr = toLocalISO(day);
                        const cellOrders = scheduled.filter(o => o.scheduled_truck_id === truck.id && o.scheduled_date === dateStr);
                        const usedKg = cellOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
                        const pct = truck.capacity_kg > 0 ? (usedKg / truck.capacity_kg) * 100 : 0;
                        const capVol = truckVolumeM3(truck);
                        const usedVol = cellOrders.reduce((s, o) => s + orderVolumeM3(o), 0);
                        const volPct = capVol > 0 ? (usedVol / capVol) * 100 : 0;
                        const clickable = selectedIds.length > 0;
                        return (
                          <td key={di}
                            onClick={() => clickable && handleCellClick(truck, day)}
                            className={`p-1.5 align-top transition-colors ${isToday(day) ? "bg-velox-amber/5" : ""} ${
                              clickable ? "cursor-pointer hover:bg-velox-amber/15 hover:ring-2 hover:ring-inset hover:ring-velox-amber/40" : ""
                            }`}>
                            <Droppable droppableId={`cell:${truck.id}:${dateStr}`}>
                            {(dpCell) => (
                            <div ref={dpCell.innerRef} {...dpCell.droppableProps}
                              className={`min-h-[2.5rem] rounded-lg transition-colors ${dpCell.isDraggingOver ? "ring-2 ring-velox-amber/60 bg-velox-amber/10" : ""}`}>
                            {cellOrders.length === 0 ? (
                              <div className={`text-[11px] py-4 text-center rounded-lg ${
                                clickable ? "text-velox-amber/60 border border-dashed border-velox-amber/30" : "text-muted-foreground/30"
                              }`}>
                                {clickable ? "+ programar aqui" : "livre"}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {cellOrders.map(o => (
                                  <div key={o.id} className="group relative bg-velox-amber/10 border border-velox-amber/25 rounded-lg p-1.5">
                                    <Link to={`/admin/coletas/${o.id}`} onClick={e => e.stopPropagation()} className="block hover:opacity-80">
                                      <p className="font-mono text-[10px] text-muted-foreground">{o.protocol}</p>
                                      <p className="text-xs font-medium truncate">{o.client_name}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</p>
                                    </Link>
                                    <button
                                      title="Devolver à fila"
                                      onClick={e => { e.stopPropagation(); unassignMutation.mutate(o); }}
                                      className="absolute top-1 right-1 opacity-60 hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden" title={`Peso: ${Math.round(pct)}%`}>
                                  <div className={`h-full rounded-full ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500"}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                {capVol > 0 && (
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden" title={`Volume: ${Math.round(volPct)}% (${fmtM3(usedVol)} / ${fmtM3(capVol)})`}>
                                    <div className={`h-full rounded-full ${volPct > 100 ? "bg-red-500" : volPct > 85 ? "bg-amber-500" : "bg-blue-400"}`}
                                      style={{ width: `${Math.min(volPct, 100)}%` }} />
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground font-mono" title="peso · volume">
                                    {usedKg.toLocaleString("pt-BR")} kg{capVol > 0 ? ` · ${usedVol.toFixed(1)}m³` : ""}
                                  </span>
                                  <button
                                    onClick={e => { e.stopPropagation(); createTripFromCell(truck, dateStr, cellOrders); }}
                                    className="text-[10px] font-bold text-velox-amber hover:underline flex items-center gap-0.5">
                                    <Send className="w-2.5 h-2.5" /> Viagem
                                  </button>
                                </div>
                              </div>
                            )}
                            {dpCell.placeholder}
                            </div>
                            )}
                            </Droppable>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Viagens ativas resumidas */}
          {activeTrips.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">Em rota / planejadas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeTrips.map(trip => {
                  const completed = (trip.stops || []).filter(s => s.status === "completed").length;
                  const total = (trip.stops || []).length;
                  return (
                    <Link key={trip.id} to={`/admin/viagens/${trip.id}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:border-velox-amber/40 transition-colors">
                      <Truck className="w-4 h-4 text-velox-amber flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          <span className="font-mono">{trip.truck_plate}</span> · {trip.driver_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{completed}/{total} paradas · {trip.order_ids?.length || 0} pedidos</p>
                      </div>
                      <StatusBadge status={trip.status} />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      </DragDropContext>

      {/* Diálogo: proposta de separação automática */}
      <Dialog open={!!plan} onOpenChange={(o) => !o && setPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle className="flex items-center gap-2 text-base"><Sparkles className="w-4.5 h-4.5 text-velox-amber" /> Separação automática sugerida</DialogTitle>
          </DialogHeader>
          {plan && (
            <div className="p-5 space-y-3">
              <p className="text-xs text-muted-foreground">
                Agrupado por <strong>data de coleta</strong>, <strong>região de destino</strong> e <strong>capacidade</strong>, mantendo pedidos do <strong>mesmo local de coleta</strong> juntos. Revise e aplique — você ainda pode ajustar no quadro antes de criar as viagens.
              </p>
              {plan.loads.map((load, i) => {
                const pct = load.truck.capacity_kg > 0 ? Math.round((load.weight / load.truck.capacity_kg) * 100) : 0;
                return (
                  <div key={i} className="border border-border rounded-md">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Truck className="w-4 h-4 text-velox-amber flex-shrink-0" />
                        <span className="font-mono font-semibold text-sm">{load.truck.plate}</span>
                        <span className="text-xs text-muted-foreground truncate">{load.truck.model}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{formatDateBR(load.date)} · </span>
                        <span className={`text-xs font-semibold ${pct > 100 ? "text-red-600 dark:text-red-300" : "text-foreground"}`}>{load.weight.toLocaleString("pt-BR")} / {load.truck.capacity_kg.toLocaleString("pt-BR")} kg ({pct}%)</span>
                        {load.capVol > 0 && (
                          <span className="block text-[11px] text-muted-foreground">{fmtM3(load.volume)} / {fmtM3(load.capVol)} de baú</span>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-border/50">
                      {load.orders.map((o) => {
                        const r = (load.reasons || []).find(x => x.protocol === o.protocol);
                        return (
                          <div key={o.id} className="px-3 py-1.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-muted-foreground inline-flex items-center gap-1">{o.protocol}<PriorityBadge priority={o.priority} />{o.freight_type === "urgent" && <span className="text-[9px] bg-red-500/15 text-red-700 dark:text-red-300 font-bold px-1 rounded">URG</span>}</span>
                              <span className="flex-1 truncate">{o.client_name}</span>
                              <span className="text-muted-foreground">{regionLabel(o)}</span>
                              <span className="font-mono">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</span>
                            </div>
                            {r?.why && <p className="text-[10px] text-blue-600 dark:text-blue-300 mt-0.5">↳ {r.why}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {plan.unassigned?.length > 0 && (
                <div className="border border-amber-300 bg-amber-500/10 rounded-md p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                  <strong>{plan.unassigned.length} pedido(s) não alocado(s):</strong>
                  {plan.unassigned.map((u, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="font-mono font-semibold flex-shrink-0">{u.order.protocol}</span>
                      <span className="text-amber-700 dark:text-amber-300">— {u.reason}</span>
                    </div>
                  ))}
                  <p className="text-[11px] text-amber-600 dark:text-amber-300 pt-1">Despache manualmente ou ajuste a frota.</p>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border sticky bottom-0 bg-background">
            <Button variant="outline" onClick={() => setPlan(null)}>Cancelar</Button>
            <Button className="font-bold gap-2" disabled={applyPlanMutation.isPending} onClick={() => applyPlanMutation.mutate()}>
              <Sparkles className="w-4 h-4" /> {applyPlanMutation.isPending ? "Aplicando..." : "Aplicar separação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

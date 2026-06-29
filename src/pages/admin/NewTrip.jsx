import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Package, Truck, Users, MapPin, DollarSign, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import { todayLocalISO } from "@/utils/dateUtils";
import { optimizeStops } from "@/utils/routeOptimizer";

export default function NewTrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pré-seleção vinda do quadro de Despacho ("Criar viagem" numa célula)
  const preset = location.state || {};

  const [selectedOrders, setSelectedOrders] = useState(preset.preselectedOrderIds || []);
  const [driverId, setDriverId] = useState("");
  const [truckId, setTruckId] = useState(preset.preselectedTruckId || "");
  const [departureDate, setDepartureDate] = useState("");
  const [notes, setNotes] = useState("");
  const [startNow, setStartNow] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [extraVehicles, setExtraVehicles] = useState([]); // comboio: [{ driver_id, truck_id }]

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 100),
    select: (data) => data.filter(o => o.status === "confirmed" && !o.trip_id),
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.list(),
    select: (d) => d.filter(dr => dr.status === "active"),
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
    select: (t) => t.filter(tr => tr.status === "available"),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      let trip;
      try {
        trip = await base44.entities.Trip.create(data);
      } catch (e) {
        // Banco ainda sem colunas novas (migration pendente) — recria sem elas
        const msg = String(e?.message || "");
        if (msg.includes("advance") || msg.includes("vehicles")) {
          const { advance_amount, advance_date, vehicles, ...rest } = data;
          trip = await base44.entities.Trip.create(rest);
        } else {
          throw e;
        }
      }
      // Update orders with trip_id
      await Promise.all(selectedOrders.map(oid =>
        base44.entities.Order.update(oid, { trip_id: trip.id, driver_id: driverId, truck_id: truckId })
      ));
      // Adiantamento ao motorista vira despesa pendente automaticamente
      const adv = Number(advanceAmount) || 0;
      if (adv > 0) {
        await base44.entities.Expense.create({
          category: "other",
          description: `Adiantamento de viagem — ${selectedDriver?.name || "motorista"} (${selectedTruck?.plate || ""})`,
          amount: adv,
          date: todayLocalISO(),
          status: "pending",
          truck_id: truckId || undefined,
          notes: `Vale-frete da viagem criada em ${todayLocalISO()}. Vincular ao acerto no encerramento.`,
        });
      }
      return trip;
    },
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Viagem criada!" });
      navigate(`/admin/viagens/${trip.id}`);
    },
    onError: (e) => {
      toast({ title: "Erro ao criar viagem", description: e?.message || "Tente novamente.", variant: "destructive" });
    },
  });

  const selectedOrderData = orders.filter(o => selectedOrders.includes(o.id));
  const totalKg = selectedOrderData.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
  const totalRevenue = selectedOrderData.reduce((s, o) => s + (o.freight_value || 0), 0);
  const selectedTruck = trucks.find(t => t.id === truckId);
  const selectedDriver = drivers.find(d => d.id === driverId);
  // Comboio: capacidade somada de todos os veículos da viagem
  const crewTruckIds = [truckId, ...extraVehicles.map(v => v.truck_id)].filter(Boolean);
  const totalCapacity = crewTruckIds.reduce((s, tid) => s + (trucks.find(t => t.id === tid)?.capacity_kg || 0), 0);
  const isOverCapacity = totalCapacity > 0 && totalKg > totalCapacity;
  const excessKg = isOverCapacity ? totalKg - totalCapacity : 0;

  const buildVehicles = () => {
    const lead = { truck_id: truckId, truck_plate: selectedTruck?.plate || "", driver_id: driverId, driver_name: selectedDriver?.name || "" };
    const extras = extraVehicles.filter(v => v.truck_id && v.driver_id).map(v => {
      const t = trucks.find(x => x.id === v.truck_id); const d = drivers.find(x => x.id === v.driver_id);
      return { truck_id: v.truck_id, truck_plate: t?.plate || "", driver_id: v.driver_id, driver_name: d?.name || "" };
    });
    return [lead, ...extras];
  };

  // Build stops from selected orders
  const buildStops = () => {
    const stops = [];
    selectedOrderData.forEach(o => {
      // Coleta consolidada: uma parada por ponto de coleta (origins) ou a origem única.
      const pickups = (o.origins && o.origins.length) ? o.origins : [o.origin || {}];
      pickups.forEach((p, pi) => {
        stops.push({ type: "collection", order_id: o.id, origin_index: pi, cep: p?.cep || "", address: `${p?.street || ""}, ${p?.number || ""}, ${p?.city || ""} - ${p?.state || ""}`, city: p?.city, state: p?.state, status: "pending" });
      });
      (o.recipients || []).forEach(r => {
        stops.push({ type: "delivery", order_id: o.id, cep: r.cep || "", recipient_name: r.name, address: `${r.street || ""}, ${r.number || ""}, ${r.city || ""} - ${r.state || ""}`, city: r.city, state: r.state, status: "pending" });
      });
    });
    // Roteiriza por proximidade de CEP (coleta antes da entrega do mesmo pedido)
    return optimizeStops(stops);
  };

  const handleCreate = () => {
    createMutation.mutate({
      driver_id: driverId,
      driver_name: selectedDriver?.name || "",
      truck_id: truckId,
      truck_plate: selectedTruck?.plate || "",
      order_ids: selectedOrders,
      order_protocols: selectedOrderData.map(o => o.protocol),
      status: startNow ? "in_progress" : "planned",
      departure_date: departureDate || new Date().toISOString(),
      stops: buildStops(),
      vehicles: buildVehicles(),
      total_revenue: totalRevenue,
      ...(Number(advanceAmount) > 0 ? { advance_amount: Number(advanceAmount), advance_date: todayLocalISO() } : {}),
      notes,
    });
  };

  const toggleOrder = (id) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/viagens")}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Nova Viagem</h1>
          <p className="text-muted-foreground text-xs">Agrupar pedidos e definir rota</p>
        </div>
      </div>

      {/* Step 1: Orders */}
      <Card>
        <CardHeader className="py-3 border-b border-border bg-muted/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-velox-amber" /> Pedidos para esta viagem
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {orders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhum pedido confirmado disponível para viagem.
              <p className="text-xs mt-1">Pedidos precisam estar com status "Confirmado" e sem viagem atribuída.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(o => (
                <label key={o.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedOrders.includes(o.id) ? "border-velox-amber bg-velox-amber/5" : "border-border hover:bg-muted/30"}`}>
                  <Checkbox
                    checked={selectedOrders.includes(o.id)}
                    onCheckedChange={() => toggleOrder(o.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{o.protocol}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{o.client_name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      <span>{o.origin?.city || "—"} → {(o.recipients || []).map(r => r.city).join(", ")}</span>
                      <span>{o.total_weight_kg || 0} kg</span>
                      {o.freight_value && <span>R$ {o.freight_value.toFixed(2)}</span>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          {selectedOrders.length > 0 && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg flex gap-4 text-sm">
              <span><strong>{selectedOrders.length}</strong> pedido(s)</span>
              <span><strong>{totalKg}</strong> kg total</span>
              <span className="text-green-600 dark:text-green-300"><strong>R$ {totalRevenue.toFixed(2)}</strong> receita</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Team */}
      <Card>
        <CardHeader className="py-3 border-b border-border bg-muted/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-velox-amber" /> Equipe e Veículo
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motorista <span className="text-red-500">*</span></label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Selecionar motorista" /></SelectTrigger>
              <SelectContent>
                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caminhão <span className="text-red-500">*</span></label>
            <Select value={truckId} onValueChange={setTruckId}>
              <SelectTrigger><SelectValue placeholder="Selecionar caminhão" /></SelectTrigger>
              <SelectContent>
                {trucks.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model} ({t.capacity_kg?.toLocaleString() || "?"} kg)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Comboio: veículos/motoristas adicionais */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Veículos adicionais (comboio)</label>
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setExtraVehicles(v => [...v, { driver_id: "", truck_id: "" }])}>+ Adicionar veículo</Button>
            </div>
            {extraVehicles.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <Select value={v.driver_id} onValueChange={val => setExtraVehicles(arr => arr.map((x, j) => j === i ? { ...x, driver_id: val } : x))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Motorista" /></SelectTrigger>
                  <SelectContent>{drivers.filter(d => d.id !== driverId).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={v.truck_id} onValueChange={val => setExtraVehicles(arr => arr.map((x, j) => j === i ? { ...x, truck_id: val } : x))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Caminhão" /></SelectTrigger>
                  <SelectContent>{trucks.filter(t => t.id !== truckId).map(t => <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-400" onClick={() => setExtraVehicles(arr => arr.filter((_, j) => j !== i))}>×</Button>
              </div>
            ))}
            {crewTruckIds.length > 0 && (
              <p className="text-[11px] text-muted-foreground">Capacidade total do comboio: {totalCapacity.toLocaleString("pt-BR")} kg ({crewTruckIds.length} veículo(s))</p>
            )}
          </div>
          {isOverCapacity && (
            <div className="md:col-span-2 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Capacidade excedida — não é possível criar a viagem
              </div>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                Peso total: {totalKg.toLocaleString("pt-BR")} kg · Capacidade do comboio: {totalCapacity.toLocaleString("pt-BR")} kg · Excesso: {excessKg.toLocaleString("pt-BR")} kg
              </p>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                Remova pedidos ou adicione um veículo ao comboio.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Schedule */}
      <Card>
        <CardHeader className="py-3 border-b border-border bg-muted/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-velox-amber" /> Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data e hora de saída</label>
            <Input type="datetime-local" value={departureDate} onChange={e => setDepartureDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adiantamento ao motorista (R$) — opcional</label>
            <Input type="number" step="0.01" min="0" placeholder="ex: 500,00" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} />
            <p className="text-xs text-muted-foreground">Vale-frete pago antes da saída. Gera despesa pendente automaticamente e entra no acerto da viagem.</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações da viagem</label>
            <Textarea placeholder="Rota, instruções especiais, pontos de atenção..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={startNow} onCheckedChange={setStartNow} />
            <span className="text-sm">Iniciar imediatamente (status: Em Andamento)</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end pb-8">
        <Button variant="outline" onClick={() => navigate("/admin/viagens")}>Cancelar</Button>
        <Button
          className="font-bold px-8"
          onClick={handleCreate}
          disabled={selectedOrders.length === 0 || !driverId || !truckId || isOverCapacity || createMutation.isPending}
        >
          {createMutation.isPending ? "Criando..." : startNow ? "Criar e Iniciar Viagem" : "Criar Viagem"}
        </Button>
      </div>
    </div>
  );
}
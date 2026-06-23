import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import { Wrench, UserX, Truck, AlertTriangle, CheckCircle2, ArrowRight, Package } from "lucide-react";
import {
  trucksNeedingReplan, driversNeedingReplan, suggestTrucks, suggestDrivers,
} from "@/utils/replanner";

/**
 * REPLANEJAMENTO — torre de exceções de frota/motorista (B4).
 * Caminhão que quebrou (S1) e motorista que faltou (S2): mostra tudo o que
 * ficou órfão e redistribui em massa, com 1 clique, para outro recurso disponível.
 */
export default function Replanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pickTruck, setPickTruck] = useState({});   // { brokenTruckId: replacementTruckId }
  const [pickDriver, setPickDriver] = useState({}); // { absentDriverId: replacementDriverId }

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 500) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 80) });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });

  const truckCases = trucksNeedingReplan(trucks, orders, trips);
  const driverCases = driversNeedingReplan(drivers, trips);

  // ── Redistribuir caminhão (pedidos programados + viagens) ─────
  const redistTruck = useMutation({
    mutationFn: async ({ brokenTruckId, replacementId, affectedOrders, affectedTrips }) => {
      const newTruck = trucks.find((t) => t.id === replacementId);
      if (!newTruck) throw new Error("Selecione o caminhão substituto.");
      // Caminho ATÔMICO no servidor
      try {
        const { error } = await supabase.rpc("redistribute_truck", {
          p_truck_id: replacementId, p_plate: newTruck.plate,
          p_order_ids: affectedOrders.map((o) => o.id), p_trip_ids: affectedTrips.map((t) => t.id), p_user: "Admin",
        });
        if (!error) return;
        throw error;
      } catch { /* fallback cliente abaixo */ }
      for (const o of affectedOrders) {
        await base44.entities.Order.update(o.id, {
          scheduled_truck_id: replacementId,
          status_history: [...(o.status_history || []), { status: o.status, timestamp: new Date().toISOString(), user: "Admin", note: `Redistribuído para ${newTruck.plate} (caminhão anterior indisponível)` }],
        });
      }
      for (const t of affectedTrips) {
        await base44.entities.Trip.update(t.id, {
          truck_id: replacementId,
          truck_plate: newTruck.plate,
          events: [...(t.events || []), { type: "truck_reassigned", description: `Caminhão trocado para ${newTruck.plate} (anterior em manutenção/inativo)`, timestamp: new Date().toISOString(), user: "Admin" }],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Carga redistribuída!", description: "Pedidos e viagens passaram para o caminhão substituto." });
    },
    onError: (e) => toast({ title: "Erro ao redistribuir", description: e?.message, variant: "destructive" }),
  });

  // ── Reatribuir motorista (viagens) ────────────────────────────
  const reassignDriver = useMutation({
    mutationFn: async ({ replacementId, affectedTrips }) => {
      const newDriver = drivers.find((d) => d.id === replacementId);
      if (!newDriver) throw new Error("Selecione o motorista substituto.");
      // Caminho ATÔMICO no servidor
      try {
        const { error } = await supabase.rpc("reassign_driver", {
          p_driver_id: replacementId, p_driver_name: newDriver.name,
          p_trip_ids: affectedTrips.map((t) => t.id), p_user: "Admin",
        });
        if (!error) return;
        throw error;
      } catch { /* fallback cliente abaixo */ }
      for (const t of affectedTrips) {
        await base44.entities.Trip.update(t.id, {
          driver_id: replacementId,
          driver_name: newDriver.name,
          events: [...(t.events || []), { type: "driver_reassigned", description: `Motorista trocado para ${newDriver.name} (anterior ausente)`, timestamp: new Date().toISOString(), user: "Admin" }],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Viagens reatribuídas!", description: "Motorista substituto assumiu as viagens." });
    },
    onError: (e) => toast({ title: "Erro ao reatribuir", description: e?.message, variant: "destructive" }),
  });

  const nothing = truckCases.length === 0 && driverCases.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader icon={AlertTriangle} title="Replanejamento" subtitle="Caminhão quebrou ou motorista faltou? Redistribua tudo de uma vez." />

      {nothing && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">Nada para replanejar. Toda a frota indisponível está sem carga pendente.</p>
        </div>
      )}

      {/* ── Caminhões indisponíveis ── */}
      {truckCases.map(({ truck, orders: affectedOrders, trips: affectedTrips }) => {
        const date = affectedOrders[0]?.scheduled_date || null;
        const options = suggestTrucks(trucks, orders, truck.id, date);
        const replacementId = pickTruck[truck.id] || "";
        return (
          <Card key={truck.id} className="border-amber-200">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Wrench className="w-5 h-5 text-amber-600" />
                <span className="font-mono font-bold">{truck.plate}</span>
                <span className="text-sm text-muted-foreground">{truck.model}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {truck.status === "maintenance" ? "Em manutenção" : "Inativo"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {affectedOrders.length} pedido(s) · {affectedTrips.length} viagem(ns) afetada(s)
                </span>
              </div>

              {/* Afetados */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Pedidos programados</p>
                  {affectedOrders.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum.</p> :
                    affectedOrders.map((o) => (
                      <Link key={o.id} to={`/admin/coletas/${o.id}`} className="flex items-center justify-between text-xs rounded-lg border border-border p-2 hover:border-velox-amber/40">
                        <span className="font-mono">{o.protocol}</span>
                        <span className="truncate flex-1 mx-2">{o.client_name}</span>
                        <span className="font-mono text-muted-foreground">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</span>
                      </Link>
                    ))}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Viagens</p>
                  {affectedTrips.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma.</p> :
                    affectedTrips.map((t) => (
                      <Link key={t.id} to={`/admin/viagens/${t.id}`} className="flex items-center justify-between text-xs rounded-lg border border-border p-2 hover:border-velox-amber/40">
                        <span className="truncate flex-1">{t.driver_name} · {(t.order_ids || []).length} pedido(s)</span>
                        <StatusBadge status={t.status} />
                      </Link>
                    ))}
                </div>
              </div>

              {/* Substituto */}
              <div className="flex items-end gap-3 flex-wrap border-t border-border pt-3">
                <div className="flex-1 min-w-[220px]">
                  <p className="text-xs text-muted-foreground mb-1">Redistribuir para</p>
                  <Select value={replacementId} onValueChange={(v) => setPickTruck((p) => ({ ...p, [truck.id]: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Escolher caminhão disponível" /></SelectTrigger>
                    <SelectContent>
                      {options.length === 0 ? <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum caminhão disponível</div> :
                        options.map(({ truck: t, free }) => (
                          <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model} · {free.toLocaleString("pt-BR")} kg livres</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2"
                  disabled={!replacementId || redistTruck.isPending}
                  onClick={() => {
                    const chosen = options.find((x) => x.truck.id === replacementId);
                    const affectedKg = affectedOrders.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
                    if (chosen && chosen.truck.capacity_kg > 0 && affectedKg > chosen.free) {
                      toast({ title: "Capacidade insuficiente", description: `${chosen.truck.plate} tem ${chosen.free.toLocaleString("pt-BR")} kg livres, mas a carga afetada soma ${affectedKg.toLocaleString("pt-BR")} kg. Escolha outro caminhão ou divida a carga.`, variant: "destructive" });
                      return;
                    }
                    redistTruck.mutate({ brokenTruckId: truck.id, replacementId, affectedOrders, affectedTrips });
                  }}>
                  Redistribuir tudo <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* ── Motoristas indisponíveis ── */}
      {driverCases.map(({ driver, trips: affectedTrips }) => {
        const options = suggestDrivers(drivers, trips, driver.id);
        const replacementId = pickDriver[driver.id] || "";
        return (
          <Card key={driver.id} className="border-orange-200">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <UserX className="w-5 h-5 text-orange-600" />
                <span className="font-bold">{driver.name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  {driver.status === "away" ? "Ausente" : "Afastado"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{affectedTrips.length} viagem(ns) sem motorista</span>
              </div>
              <div className="space-y-1.5">
                {affectedTrips.map((t) => (
                  <Link key={t.id} to={`/admin/viagens/${t.id}`} className="flex items-center justify-between text-xs rounded-lg border border-border p-2 hover:border-velox-amber/40">
                    <span className="font-mono">{t.truck_plate}</span>
                    <span className="truncate flex-1 mx-2">{(t.order_ids || []).length} pedido(s)</span>
                    <StatusBadge status={t.status} />
                  </Link>
                ))}
              </div>
              <div className="flex items-end gap-3 flex-wrap border-t border-border pt-3">
                <div className="flex-1 min-w-[220px]">
                  <p className="text-xs text-muted-foreground mb-1">Substituir por</p>
                  <Select value={replacementId} onValueChange={(v) => setPickDriver((p) => ({ ...p, [driver.id]: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Escolher motorista" /></SelectTrigger>
                    <SelectContent>
                      {options.map(({ driver: d, busy }) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}{busy ? " · já em viagem" : " · livre"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2"
                  disabled={!replacementId || reassignDriver.isPending}
                  onClick={() => reassignDriver.mutate({ replacementId, affectedTrips })}>
                  Reatribuir viagens <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

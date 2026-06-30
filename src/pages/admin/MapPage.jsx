import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Truck, MapPin, Package, ArrowRight } from "lucide-react";
import LiveMap from "@/components/shared/LiveMap";
import { formatDateTimeBR } from "@/utils/dateUtils";

export default function MapPage() {
  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: () => base44.entities.Trip.list("-created_date", 50),
    select: (d) => d.filter(t => t.status === "in_progress" || t.status === "planned"),
    refetchInterval: 20_000,        // posições atualizam ~a cada 20s
    refetchOnWindowFocus: true,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 50),
    select: (d) => d.filter(o => o.status === "in_transit" || o.status === "collecting"),
  });

  const activeTrips = trips.filter(t => t.status === "in_progress");
  const plannedTrips = trips.filter(t => t.status === "planned");

  // Posições ao vivo dos caminhões em viagem (quem já enviou GPS).
  const located = activeTrips.filter(t => Number.isFinite(t.current_lat) && Number.isFinite(t.current_lng));
  const truckMarkers = located.map(t => ({
    lat: t.current_lat, lng: t.current_lng, kind: "truck", pulse: true,
    label: `${t.truck_plate || "Caminhão"} · ${t.driver_name || ""}${t.location_updated_at ? ` — ${formatDateTimeBR(t.location_updated_at)}` : ""}`,
  }));
  const lastUpdate = located.reduce((acc, t) => {
    const ts = t.location_updated_at ? new Date(t.location_updated_at).getTime() : 0;
    return ts > acc ? ts : acc;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Mapa Operacional</h1>
        <p className="text-muted-foreground text-xs mt-0.5">Visão em tempo real das operações</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Viagens Ativas", value: activeTrips.length, color: "text-amber-600 dark:text-amber-300", bg: "bg-amber-500/10" },
          { label: "Viagens Planejadas", value: plannedTrips.length, color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-500/10" },
          { label: "Pedidos em Trânsito", value: orders.filter(o => o.status === "in_transit").length, color: "text-orange-600 dark:text-orange-300", bg: "bg-orange-500/10" },
          { label: "Em Coleta", value: orders.filter(o => o.status === "collecting").length, color: "text-purple-600 dark:text-purple-300", bg: "bg-purple-500/10" },
        ].map(item => (
          <Card key={item.label} className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
          </Card>
        ))}
      </div>

      {/* Mapa ao vivo */}
      <Card className="overflow-hidden">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-500" /> {located.length} de {activeTrips.length} enviando posição
            </span>
            {lastUpdate > 0 && (
              <span className="text-[11px] text-muted-foreground">Atualizado às {new Date(lastUpdate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
          {truckMarkers.length === 0 ? (
            <div className="h-80 flex items-center justify-center bg-muted/30 rounded-xl text-center">
              <div className="text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-heading text-base">Nenhuma posição ao vivo</p>
                <p className="text-sm opacity-70 mt-1">{activeTrips.length > 0 ? "Aguardando o GPS do motorista durante a viagem." : "O mapa aparece quando houver viagem em andamento."}</p>
              </div>
            </div>
          ) : (
            <LiveMap markers={truckMarkers} height={360} />
          )}
        </CardContent>
      </Card>

      {/* Active trips list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTrips.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-velox-amber" /> Viagens em Andamento ({activeTrips.length})
            </h3>
            <div className="space-y-3">
              {activeTrips.map(trip => {
                const completedStops = (trip.stops || []).filter(s => s.status === "completed").length;
                const totalStops = (trip.stops || []).length;
                const nextStop = (trip.stops || []).find(s => s.status === "pending");
                return (
                  <Card key={trip.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-velox-dark rounded-full flex items-center justify-center">
                            <Truck className="w-4 h-4 text-velox-amber" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{trip.driver_name}</p>
                            <p className="text-xs font-mono text-muted-foreground">{trip.truck_plate}</p>
                          </div>
                        </div>
                        <Link to={`/admin/viagens/${trip.id}`} className="text-velox-amber hover:text-velox-amber/80 transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                      {totalStops > 0 && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Progresso</span>
                            <span>{completedStops}/{totalStops}</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full">
                            <div className="h-1.5 bg-velox-amber rounded-full" style={{ width: `${totalStops ? (completedStops / totalStops) * 100 : 0}%` }} />
                          </div>
                        </div>
                      )}
                      {nextStop && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>Próxima: {nextStop.city || nextStop.address?.substring(0, 30)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Orders in transit */}
        <div>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-velox-amber" /> Pedidos em Trânsito ({orders.length})
          </h3>
          {orders.length === 0 ? (
            <Card><CardContent className="p-4 text-center text-muted-foreground text-sm">Nenhum pedido em trânsito.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <Link key={order.id} to={`/admin/pedidos/${order.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono font-semibold text-sm">{order.protocol}</p>
                          <p className="text-xs text-muted-foreground">{order.client_name}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.status === "in_transit" ? "bg-orange-500/15 text-orange-700 dark:text-orange-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                          {order.status === "in_transit" ? "Em Trânsito" : "Em Coleta"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
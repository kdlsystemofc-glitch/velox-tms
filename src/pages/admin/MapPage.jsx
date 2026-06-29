import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Truck, MapPin, Package, Clock, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MapPage() {
  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: () => base44.entities.Trip.list("-created_date", 50),
    select: (d) => d.filter(t => t.status === "in_progress" || t.status === "planned"),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 50),
    select: (d) => d.filter(o => o.status === "in_transit" || o.status === "collecting"),
  });

  const activeTrips = trips.filter(t => t.status === "in_progress");
  const plannedTrips = trips.filter(t => t.status === "planned");

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

      {/* Map placeholder */}
      <Card className="overflow-hidden">
        <div className="h-80 bg-gradient-to-br from-velox-dark to-velox-blue flex items-center justify-center relative">
          <div className="absolute inset-0 opacity-10">
            {/* Grid lines for map feel */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="absolute border-white/20" style={{ left: `${i * 12.5}%`, top: 0, bottom: 0, borderLeftWidth: 1 }} />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="absolute border-white/20" style={{ top: `${i * 16.6}%`, left: 0, right: 0, borderTopWidth: 1 }} />
            ))}
          </div>
          {activeTrips.length === 0 ? (
            <div className="text-center text-white/50">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-heading text-base">Nenhuma viagem em andamento</p>
              <p className="text-sm opacity-60 mt-1">O mapa será exibido quando houver viagens ativas</p>
            </div>
          ) : (
            <div className="text-center text-white">
              <div className="flex flex-wrap justify-center gap-4 p-4">
                {activeTrips.map((trip, i) => (
                  <div key={trip.id} className="flex items-center gap-2 bg-card/10 rounded-lg px-3 py-2 text-sm backdrop-blur-sm">
                    <Truck className="w-4 h-4 text-velox-amber" />
                    <span>{trip.truck_plate}</span>
                    <span className="text-white/60">·</span>
                    <span>{trip.driver_name}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/40 mt-2">Integração com GPS em desenvolvimento</p>
            </div>
          )}
        </div>
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
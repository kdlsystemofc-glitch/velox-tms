import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Calendar, Package } from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Schedule() {
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 200),
  });
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });

  const now = new Date();
  // Semana atual (seg–dom)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const availableTrucks = trucks.filter(t => t.status === "available" || t.status === "on_route").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-foreground">Programação</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Coletas agendadas para a semana de {format(weekStart, "dd/MM", { locale: ptBR })} a {format(addDays(weekStart, 6), "dd/MM/yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day, i) => {
          const dayStr = day.toISOString().split("T")[0];
          const dayOrders = orders.filter(o =>
            o.collection_date === dayStr && o.status !== "cancelled"
          );
          const isToday = day.toDateString() === now.toDateString();
          const isPast = day < now && !isToday;

          return (
            <div key={i} className={`rounded-xl border-2 overflow-hidden ${isToday ? "border-velox-amber" : "border-border"} ${isPast ? "opacity-60" : ""}`}>
              <div className={`px-3 py-2 text-center ${isToday ? "bg-velox-amber text-velox-dark" : "bg-muted/40 text-foreground"}`}>
                <p className="text-[11px] font-semibold uppercase">{format(day, "EEE", { locale: ptBR })}</p>
                <p className="text-lg font-bold font-mono">{format(day, "d")}</p>
              </div>
              <div className="p-2 space-y-1.5 min-h-[80px]">
                {dayOrders.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center pt-3">Livre</p>
                ) : (
                  dayOrders.map(order => (
                    <Link key={order.id} to={`/admin/pedidos/${order.id}`}
                      className="block bg-background border border-border rounded-lg p-2 hover:border-velox-amber/60 transition-colors">
                      <p className="font-mono text-[10px] text-muted-foreground">{order.protocol}</p>
                      <p className="text-xs font-medium truncate">{order.client_name}</p>
                      <StatusBadge status={order.status} />
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-velox-amber" /> Resumo da semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-2xl font-bold font-mono text-velox-amber">
                {orders.filter(o => {
                  const d = o.collection_date;
                  return d >= days[0].toISOString().split("T")[0] && d <= days[6].toISOString().split("T")[0] && o.status !== "cancelled";
                }).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Coletas na semana</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-2xl font-bold font-mono text-green-500">{availableTrucks}</p>
              <p className="text-xs text-muted-foreground mt-1">Veículos disponíveis</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-2xl font-bold font-mono text-blue-500">
                {orders.filter(o => o.status === "confirmed" && !o.trip_id).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Aguardando viagem</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-2xl font-bold font-mono text-indigo-500">
                {orders.filter(o => o.status === "in_transit").length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Em trânsito</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
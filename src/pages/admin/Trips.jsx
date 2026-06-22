import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Truck, User, MapPin, CheckCircle2, Clock, Route, Download } from "lucide-react";
import { downloadCsv, csvMoney, csvDate } from "@/utils/exportCsv";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import PageHeader from "@/components/shared/PageHeader";

const tripStatusConfig = {
  planned: { label: "Planejada", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "Em Andamento", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Concluída", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

function TripCard({ trip }) {
  const sc = tripStatusConfig[trip.status] || tripStatusConfig.planned;
  const completedStops = (trip.stops || []).filter(s => s.status === "completed").length;
  const totalStops = (trip.stops || []).length;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-velox-dark rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-velox-amber" />
            </div>
            <div>
              <p className="font-semibold text-sm">{trip.driver_name || "Motorista"}</p>
              <p className="text-xs text-muted-foreground font-mono">{trip.truck_plate || "—"}</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
        </div>

        {totalStops > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso</span>
              <span>{completedStops}/{totalStops} paradas</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full">
              <div
                className="h-1.5 bg-velox-amber rounded-full transition-all"
                style={{ width: totalStops > 0 ? `${(completedStops / totalStops) * 100}%` : "0%" }}
              />
            </div>
          </div>
        )}

        <div className="space-y-1 text-xs text-muted-foreground mb-4">
          {trip.departure_date && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {format(new Date(trip.departure_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {(trip.order_ids || []).length} pedido(s) vinculado(s)
          </div>
        </div>

        <Link to={`/admin/viagens/${trip.id}`}>
          <Button variant="outline" size="sm" className="w-full text-xs">Ver Detalhes</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Trips() {
  const navigate = useNavigate();
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: () => base44.entities.Trip.list("-created_date", 100),
  });

  const grouped = {
    in_progress: trips.filter(t => t.status === "in_progress"),
    planned: trips.filter(t => t.status === "planned"),
    completed: trips.filter(t => t.status === "completed"),
    cancelled: trips.filter(t => t.status === "cancelled"),
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Truck} title="Viagens" subtitle="Gestão de rotas e viagens">
        <Button variant="outline" className="gap-2" disabled={trips.length === 0}
          onClick={() => downloadCsv(`viagens-${new Date().toISOString().slice(0,10)}`, trips, [
            { key: "truck_plate", label: "Placa" },
            { key: "driver_name", label: "Motorista" },
            { key: "status", label: "Status" },
            { key: "order_ids", label: "Pedidos", format: (v) => (v || []).length },
            { key: "departure_date", label: "Saída", format: csvDate },
            { key: "arrival_date", label: "Chegada", format: csvDate },
            { key: "real_km", label: "Km" },
            { key: "total_revenue", label: "Receita", format: csvMoney },
            { key: "total_cost", label: "Custo", format: csvMoney },
            { key: "net_profit", label: "Lucro", format: csvMoney },
          ])}>
          <Download className="w-4 h-4" /> Exportar
        </Button>
        <Button
          className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2"
          onClick={() => navigate("/admin/viagens/nova")}
        >
          <Plus className="w-4 h-4" /> Nova Viagem
        </Button>
      </PageHeader>

      <Tabs defaultValue="in_progress">
        <TabsList>
          <TabsTrigger value="in_progress">
            Ativas {grouped.in_progress.length > 0 && <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5">{grouped.in_progress.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="planned">Planejadas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        {Object.entries(grouped).map(([key, list]) => (
          <TabsContent key={key} value={key} className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full" /></div>
            ) : list.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma viagem {key === "in_progress" ? "em andamento" : key === "planned" ? "planejada" : key === "completed" ? "concluída" : "cancelada"}.</p>
                {key === "in_progress" && (
                  <Button className="mt-4 bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={() => navigate("/admin/viagens/nova")}>
                    <Plus className="w-4 h-4" /> Criar Nova Viagem
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map(trip => <TripCard key={trip.id} trip={trip} />)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
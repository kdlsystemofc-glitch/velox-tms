import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Truck, User, MapPin, CheckCircle2, Clock, Route, Download, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const crewSize = (trip.vehicles && trip.vehicles.length) ? trip.vehicles.length : 1;
  const margin = trip.total_revenue > 0 ? ((trip.net_profit || 0) / trip.total_revenue) * 100 : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-velox-dark rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-velox-amber" />
            </div>
            <div>
              <p className="font-semibold text-sm">{trip.driver_name || <span className="text-red-500">sem motorista</span>}</p>
              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                {trip.truck_plate || "—"}
                {crewSize > 1 && <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1 rounded">comboio {crewSize}</span>}
              </p>
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

        {trip.status === "completed" && (
          <div className="flex items-center justify-between text-xs mb-3 pt-3 border-t border-border/60">
            <span className="text-muted-foreground">Lucro · margem</span>
            <span className={`font-mono font-semibold ${(trip.net_profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              R$ {(trip.net_profit || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}{margin != null ? ` · ${margin.toFixed(0)}%` : ""}
            </span>
          </div>
        )}
        <Link to={`/admin/viagens/${trip.id}`}>
          <Button variant="outline" size="sm" className="w-full text-xs">Ver Detalhes</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function Kpi({ label, value, hint, tone = "" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function Trips() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: () => base44.entities.Trip.list("-created_date", 100),
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodCutoff = period === "7d" ? new Date(now - 7 * 864e5)
    : period === "30d" ? new Date(now - 30 * 864e5)
    : period === "month" ? monthStart
    : null;

  const q = search.trim().toLowerCase();
  const filtered = trips.filter(t => {
    if (q && !`${t.driver_name || ""} ${t.truck_plate || ""}`.toLowerCase().includes(q)) return false;
    if (periodCutoff) {
      const d = t.departure_date || t.created_date;
      if (!d || new Date(d) < periodCutoff) return false;
    }
    return true;
  });

  // KPIs — sobre a base completa (não dependem do filtro de texto/período)
  const lucroMes = trips
    .filter(t => t.status === "completed" && (t.arrival_date || t.departure_date) && new Date(t.arrival_date || t.departure_date) >= monthStart)
    .reduce((s, t) => s + (t.net_profit || 0), 0);

  const grouped = {
    in_progress: filtered.filter(t => t.status === "in_progress"),
    planned: filtered.filter(t => t.status === "planned"),
    completed: filtered.filter(t => t.status === "completed"),
    cancelled: filtered.filter(t => t.status === "cancelled"),
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
          className="font-bold gap-2"
          onClick={() => navigate("/admin/viagens/nova")}
        >
          <Plus className="w-4 h-4" /> Nova Viagem
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Em rota" value={trips.filter(t => t.status === "in_progress").length} tone="text-amber-600" hint="viagens em andamento" />
        <Kpi label="Planejadas" value={trips.filter(t => t.status === "planned").length} tone="text-blue-600" hint="prontas para sair" />
        <Kpi label="Concluídas no mês" value={trips.filter(t => t.status === "completed" && (t.arrival_date || t.departure_date) && new Date(t.arrival_date || t.departure_date) >= monthStart).length} hint="finalizadas neste mês" />
        <Kpi label="Lucro do mês" value={`R$ ${lucroMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} tone={lucroMes >= 0 ? "text-green-600" : "text-red-600"} hint="líquido das concluídas" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por motorista ou placa…" className="pl-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {[["all", "Tudo"], ["7d", "7 dias"], ["30d", "30 dias"], ["month", "Este mês"]].map(([val, lbl]) => (
            <Button key={val} variant={period === val ? "default" : "outline"} size="sm"
              className={period === val ? "bg-velox-dark text-white" : ""} onClick={() => setPeriod(val)}>
              {lbl}
            </Button>
          ))}
        </div>
      </div>

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
                  <Button className="mt-4 font-bold gap-2" onClick={() => navigate("/admin/viagens/nova")}>
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
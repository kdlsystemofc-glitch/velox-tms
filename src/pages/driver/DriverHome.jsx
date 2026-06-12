import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Truck, MapPin, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DriverHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: driver } = useQuery({
    queryKey: ["my-driver", user?.id],
    queryFn: () => base44.entities.Driver.filter({ user_id: user.id }),
    select: (d) => d[0],
    enabled: !!user?.id,
  });

  const { data: trip } = useQuery({
    queryKey: ["my-active-trip", driver?.id],
    queryFn: async () => {
      const trips = await base44.entities.Trip.filter({ driver_id: driver.id });
      return trips.find(t => t.status === "in_progress" || t.status === "planned") || null;
    },
    enabled: !!driver?.id,
  });

  const nextStop = trip ? (trip.stops || []).find(s => s.status !== "completed") : null;
  const completedCount = trip ? (trip.stops || []).filter(s => s.status === "completed").length : 0;
  const totalStops = trip ? (trip.stops || []).length : 0;

  const mapsUrl = nextStop
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextStop.address || "")}`
    : "#";

  return (
    <div className="min-h-screen bg-velox-dark flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider">Bem-vindo</p>
            <h1 className="font-display text-2xl font-extrabold text-white">{driver?.name || user?.full_name}</h1>
          </div>
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => supabase.auth.signOut().then(() => window.location.href = "/login")}>
            Sair
          </Button>
        </div>

        {!trip ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <Truck className="w-16 h-16 text-velox-amber mx-auto mb-4 opacity-60" />
            <h2 className="font-display text-xl font-bold text-white mb-2">Nenhuma viagem hoje</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-6">Você será notificado quando uma viagem for atribuída.</p>
            <Link to="/motorista/historico">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 gap-2">
                <History className="w-4 h-4" /> Ver histórico
              </Button>
            </Link>
          </div>
        ) : (
          <div className={`rounded-2xl p-6 ${trip.status === "in_progress" ? "bg-green-900/40 border border-green-500/30" : "bg-blue-900/40 border border-blue-500/30"}`}>
            <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${trip.status === "in_progress" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
              {trip.status === "in_progress" ? "VIAGEM EM ANDAMENTO" : "VIAGEM PLANEJADA"}
            </span>

            <div className="mt-4 space-y-2 text-sm text-white/70">
              {trip.departure_date && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-velox-amber" />
                  <span>Saída: {format(new Date(trip.departure_date), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-velox-amber" />
                <span>Caminhão: {trip.truck_plate}</span>
              </div>
            </div>

            {nextStop && (
              <div className="mt-5 bg-white/5 rounded-xl p-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Próxima parada</p>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${nextStop.type === "delivery" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                    {nextStop.type === "delivery" ? "Entrega" : nextStop.type === "collection" ? "Coleta" : "Partida"}
                  </span>
                </div>
                <p className="font-semibold text-white">{nextStop.recipient_name || "Partida"}</p>
                <p className="text-xs text-white/50 mt-1">{nextStop.address}</p>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full mt-3 bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2">
                    <MapPin className="w-4 h-4" /> Abrir no Google Maps
                  </Button>
                </a>
              </div>
            )}

            <p className="text-xs text-white/40 text-center mt-4">{completedCount} de {totalStops} paradas concluídas</p>

            <Link to={`/motorista/viagem/${trip.id}`}>
              <Button variant="outline" className="w-full mt-3 border-white/20 text-white hover:bg-white/10">
                Ver todas as paradas
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link to="/motorista/historico" className="text-white/30 hover:text-white/60 text-xs transition-colors">
            Histórico de viagens
          </Link>
        </div>
      </div>
    </div>
  );
}
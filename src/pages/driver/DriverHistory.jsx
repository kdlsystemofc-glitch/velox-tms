import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { safeDateBR, formatTimeBR } from "@/utils/dateUtils";

export default function DriverHistory() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(null);

  const { data: driver } = useQuery({
    queryKey: ["my-driver", user?.id],
    queryFn: () => base44.entities.Driver.filter({ user_id: user.id }),
    select: (d) => d[0],
    enabled: !!user?.id,
  });

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["driver-trips", driver?.id],
    queryFn: () => base44.entities.Trip.filter({ driver_id: driver.id }),
    enabled: !!driver?.id,
  });

  const pastTrips = trips.filter(t => t.status === "completed" || t.status === "cancelled").sort((a, b) => new Date(b.departure_date || b.created_date) - new Date(a.departure_date || a.created_date));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a2336] via-[#161d2c] to-[#111723] flex flex-col">
      <div className="sticky top-0 bg-velox-dark/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Link to="/motorista" className="text-white/60 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-display font-bold text-white">Histórico</h1>
      </div>

      <div className="flex-1 px-4 py-4 max-w-sm mx-auto w-full space-y-2">
        {isLoading && <p className="text-white/40 text-sm text-center py-8">Carregando...</p>}
        {!isLoading && pastTrips.length === 0 && (
          <p className="text-white/40 text-sm text-center py-8">Nenhuma viagem no histórico.</p>
        )}
        {pastTrips.map((trip, i) => (
          <div key={trip.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between text-left" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div>
                <p className="font-semibold text-sm text-white">
                  {safeDateBR(trip.departure_date)}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{(trip.order_ids || []).length} pedidos · {trip.truck_plate}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trip.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                  {trip.status === "completed" ? "Concluída" : "Cancelada"}
                </span>
                {expanded === i ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
              </div>
            </button>
            {expanded === i && (
              <div className="border-t border-white/10 p-4 space-y-2">
                {trip.real_km && <p className="text-xs text-white/50">Km real: <span className="text-white font-mono">{trip.real_km} km</span></p>}
                <div className="space-y-1">
                  {(trip.stops || []).map((s, si) => (
                    <div key={si} className="text-xs text-white/50 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "completed" ? "bg-green-500" : "bg-white/20"}`} />
                      {s.recipient_name || s.address}
                      {s.completed_at && <span className="text-white/30">{formatTimeBR(s.completed_at)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getAvailabilityForDate } from "@/utils/availabilityChecker";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export default function WeekAvailabilityBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { settings } = useCompanySettings();

  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 200),
  });
  const { data: blocks = [] } = useQuery({
    queryKey: ["schedule-blocks"],
    queryFn: () => base44.entities.ScheduleBlock.list("-date", 100),
  });

  if (dismissed) return null;

  const workingDays = settings?.working_days || [1, 2, 3, 4, 5];
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  // Seg a Sex desta semana
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = addDays(weekStart, i);
    return d.toISOString().split("T")[0];
  });

  const STATUS_STYLE = {
    available: "bg-green-100 text-green-800 border-green-200",
    limited: "bg-amber-100 text-amber-800 border-amber-200",
    full: "bg-red-100 text-red-800 border-red-200",
    blocked: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Disponibilidade desta semana
        </p>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {weekDays.map(dateStr => {
          const avail = getAvailabilityForDate(dateStr, trucks, orders, blocks, workingDays);
          const d = new Date(dateStr + "T12:00:00");
          const isToday = d.toDateString() === now.toDateString();
          const availT = (avail.availableKg / 1000).toFixed(0);
          return (
            <div key={dateStr} className={`rounded-lg border p-2 text-center ${STATUS_STYLE[avail.status]} ${isToday ? "ring-2 ring-velox-amber" : ""}`}>
              <p className="text-[10px] uppercase font-semibold opacity-70">
                {format(d, "EEE", { locale: ptBR })} {format(d, "d")}
              </p>
              <p className="text-xs font-bold font-mono mt-1">
                {avail.status === "blocked" ? "Bloq."
                  : avail.status === "full" ? "CHEIO"
                  : `${availT}t liv.`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
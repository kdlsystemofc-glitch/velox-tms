import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

// Painel financeiro da viagem (somente leitura). Extraído de TripDetailPage (A2).
export default function TripFinancialCard({ trip }) {
  const completed = trip.status === "completed";
  return (
    <Card>
      <CardHeader className="py-3 border-b border-border bg-muted/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-velox-amber" /> Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm pt-4">
        <div className="flex justify-between"><span className="text-muted-foreground">Receita total</span><span className="font-mono font-semibold text-green-600 dark:text-green-300">R$ {(trip.total_revenue || 0).toFixed(2)}</span></div>
        {Number(trip.advance_amount) > 0 && (
          <div className="flex justify-between"><span className="text-muted-foreground">Adiantamento pago</span><span className="font-mono text-amber-600 dark:text-amber-300">R$ {Number(trip.advance_amount).toFixed(2)}</span></div>
        )}
        {!completed && Number(trip.estimated_km) > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Trajeto previsto</span>
            <span className="font-mono">~{trip.estimated_km} km{Number(trip.estimated_cost) > 0 ? ` · R$ ${Number(trip.estimated_cost).toFixed(0)}` : ""}</span>
          </div>
        )}
        {completed && (
          <>
            <div className="flex justify-between"><span className="text-muted-foreground">Custo total</span><span className="font-mono text-red-600 dark:text-red-300">R$ {(trip.total_cost || 0).toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Lucro líquido</span>
              <span className={`font-mono ${(trip.net_profit || 0) >= 0 ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>R$ {(trip.net_profit || 0).toFixed(2)}</span>
            </div>
            {(() => {
              const rev = trip.total_revenue || 0;
              const margin = rev > 0 ? ((trip.net_profit || 0) / rev) * 100 : 0;
              const realKm = Number(trip.real_km) || 0;
              const costPerKm = realKm > 0 ? (trip.total_cost || 0) / realKm : null;
              const estKm = Number(trip.estimated_km) || 0;
              const estCost = Number(trip.estimated_cost) || 0;
              const kmDev = estKm > 0 && realKm > 0 ? ((realKm - estKm) / estKm) * 100 : null;
              const costDev = estCost > 0 ? (((trip.total_cost || 0) - estCost) / estCost) * 100 : null;
              const kmPerL = Number(trip.km_per_liter) || (realKm > 0 && Number(trip.fuel_liters) > 0 ? realKm / trip.fuel_liters : null);
              const devColor = (d) => d == null ? "" : d <= 0 ? "text-green-600 dark:text-green-300" : d <= 10 ? "text-amber-600 dark:text-amber-300" : "text-red-600 dark:text-red-300";
              const devLabel = (d) => d == null ? "" : `${d > 0 ? "+" : ""}${d.toFixed(0)}%`;
              return (
                <>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Margem</span>
                    <span className={`font-mono font-semibold ${margin >= 0 ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>{margin.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Custo por km</span>
                    <span className="font-mono">{costPerKm != null ? `R$ ${costPerKm.toFixed(2)}/km` : "—"}</span>
                  </div>
                  {kmPerL != null && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Eficiência</span>
                      <span className="font-mono">{kmPerL.toFixed(2)} km/L</span>
                    </div>
                  )}
                  {(estKm > 0 || estCost > 0) && (
                    <div className="pt-2 mt-1 border-t border-dashed border-border space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Estimado × Real</p>
                      {estKm > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Km: {estKm} → {realKm || "—"}</span>
                          <span className={`font-mono font-semibold ${devColor(kmDev)}`}>{devLabel(kmDev)}</span>
                        </div>
                      )}
                      {estCost > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Custo: R$ {estCost.toFixed(0)} → R$ {(trip.total_cost || 0).toFixed(0)}</span>
                          <span className={`font-mono font-semibold ${devColor(costDev)}`}>{devLabel(costDev)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Km real</span><span className="font-mono">{trip.real_km || "—"} km</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Combustível</span><span className="font-mono">{trip.fuel_liters || "—"}L · R$ {(trip.fuel_cost || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pedágios</span><span className="font-mono">R$ {(trip.tolls_cost || 0).toFixed(2)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

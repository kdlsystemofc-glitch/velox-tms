import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck } from "lucide-react";

// Acerto do motorista/comboio (somente leitura). Extraído de TripDetailPage (A2).
// Só renderiza quando há comissão ou adiantamento; a condição fica no pai.
export default function TripSettlementCard({ trip }) {
  const comm = Number(trip.commission_amount) || 0;
  const adv = Number(trip.advance_amount) || 0;
  const saldo = comm - adv;
  const rows = Array.isArray(trip.commission_rows) ? trip.commission_rows.filter(r => Number(r.amount) > 0) : [];
  const isComboio = rows.length > 1;
  return (
    <Card>
      <CardHeader className="py-3 border-b border-border bg-muted/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-velox-amber" /> Acerto {isComboio ? "do comboio" : "do motorista"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm pt-4">
        {isComboio ? (
          <>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.driver_name || "Motorista"}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{r.truck_plate || "—"} · {r.pct}%</p>
                </div>
                <span className="font-mono text-green-600 dark:text-green-300 flex-shrink-0">R$ {Number(r.amount).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Comissão total</span><span className="font-mono font-semibold text-green-600 dark:text-green-300">R$ {comm.toFixed(2)}</span></div>
          </>
        ) : (
          <>
            <div className="flex justify-between"><span className="text-muted-foreground">Motorista</span><span className="font-medium">{trip.driver_name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Comissão</span><span className="font-mono text-green-600 dark:text-green-300">R$ {comm.toFixed(2)}</span></div>
          </>
        )}
        <div className="flex justify-between"><span className="text-muted-foreground">(−) Adiantamento (vale-frete)</span><span className="font-mono text-amber-600 dark:text-amber-300">R$ {adv.toFixed(2)}</span></div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold">
          <span>Saldo a {saldo >= 0 ? "pagar" : "receber"}{isComboio ? " (comboio)" : saldo >= 0 ? " ao motorista" : " do motorista"}</span>
          <span className={`font-mono ${saldo >= 0 ? "text-green-600 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>R$ {Math.abs(saldo).toFixed(2)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">{isComboio ? "Cada motorista do comboio teve sua comissão lançada como despesa \"a pagar\"" : "A comissão foi lançada como despesa \"a pagar\""} em Financeiro → Despesas.</p>
      </CardContent>
    </Card>
  );
}

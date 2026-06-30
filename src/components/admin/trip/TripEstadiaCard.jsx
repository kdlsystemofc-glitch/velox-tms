import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { formatMinutes } from "@/utils/waitingTime";

// Estadia / tempo de espera. Extraído de TripDetailPage (A2).
// A mutation (cobrança) continua no pai; aqui só apresentação + callback.
export default function TripEstadiaCard({ estadia, onCharge, charging }) {
  return (
    <Card>
      <CardHeader className="py-3 border-b border-border bg-muted/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-velox-amber" /> Estadia / tempo de espera</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm pt-4">
        {estadia.rows.map((r) => (
          <div key={r.index} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate text-xs">{r.recipient_name}</p>
              <p className="text-[11px] text-muted-foreground">{formatMinutes(r.minutes)} no local · {r.billableHours}h cobrável{r.already_charged ? " · já cobrada" : ""}</p>
            </div>
            <span className={`font-mono flex-shrink-0 ${r.already_charged ? "text-muted-foreground line-through" : "text-green-600 dark:text-green-300"}`}>R$ {r.fee.toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 font-semibold text-xs">
          <span>Total a cobrar (pendente)</span>
          <span className="font-mono text-green-600 dark:text-green-300">R$ {estadia.pendingFee.toFixed(2)}</span>
        </div>
        {estadia.hasPending ? (
          <Button size="sm" className="w-full mt-1 bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold" disabled={charging} onClick={onCharge}>
            {charging ? "Lançando..." : "Lançar estadia como receita"}
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground pt-1">Toda a estadia já foi lançada em Financeiro → Receitas.</p>
        )}
      </CardContent>
    </Card>
  );
}

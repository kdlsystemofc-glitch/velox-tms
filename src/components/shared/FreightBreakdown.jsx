import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

/**
 * Exibe o detalhamento completo do cálculo de frete.
 * Usado no site público (passo 5) e no painel admin (OrderDetailPage).
 */
export function FreightBreakdown({ breakdown, compact = false }) {
  const [expanded, setExpanded] = useState(!compact);
  if (!breakdown) return null;

  const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const rows = [
    {
      label: "Frete peso",
      value: breakdown.freightByWeight,
      detail: `${breakdown.taxableKg?.toFixed(2)} kg taxável × R$/kg`,
      show: breakdown.freightByWeight > 0,
    },
    {
      label: null,
      value: null,
      show: breakdown.taxableKg > 0 && (!breakdown.cubicDetails || breakdown.cubicDetails.length === 0),
      isNote: true,
      detail: breakdown.usedCubic
        ? `⚠ Cubado (${breakdown.totalCubicKg?.toFixed(2)} kg) > real (${breakdown.totalRealKg?.toFixed(2)} kg)`
        : `✓ Peso real (${breakdown.totalRealKg?.toFixed(2)} kg)`,
    },
    {
      label: "Frete distância",
      value: breakdown.freightByDistance,
      detail: breakdown.distanceKm ? `${breakdown.distanceKm} km × R$/km` : "Distância não calculada",
      show: breakdown.freightByDistance > 0,
    },
    {
      label: "GRIS (Seguro risco)",
      value: breakdown.grisValue,
      detail: `${breakdown.grisRate}% sobre ${fmt(breakdown.totalDeclaredValue)} declarado`,
      show: breakdown.grisValue > 0,
    },
    {
      label: "Ad valorem (Seguro NF)",
      value: breakdown.adValoremValue,
      detail: `${breakdown.adValoremRate}% sobre valor declarado`,
      show: breakdown.adValoremValue > 0,
    },
    {
      label: "TDA (Despacho coleta)",
      value: breakdown.tdaValue,
      detail: `${breakdown.nfCount} NF(s) × R$ TDA`,
      show: breakdown.tdaValue > 0,
    },
    {
      label: "TDE (Despacho entrega)",
      value: breakdown.tdeValue,
      detail: `${breakdown.nfCount} NF(s) × R$ TDE`,
      show: breakdown.tdeValue > 0,
    },
    {
      label: "Pedágio (estimado)",
      value: breakdown.tollValue,
      detail: "Proporcional ao peso da carga",
      show: breakdown.tollValue > 0,
    },
    {
      label: "Taxa fixa",
      value: breakdown.fixedFee,
      show: breakdown.fixedFee > 0,
    },
  ].filter(r => r.show);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-velox-amber" />
          <span className="text-sm font-semibold">
            Detalhamento do frete: {fmt(breakdown.total)}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-2">
          {rows.map((row, i) => (
            <div key={i} className={`flex items-start justify-between text-sm ${row.isNote ? "bg-amber-50 rounded-lg p-2 -mx-2" : ""}`}>
              <div>
                {row.label && <p className={row.isNote ? "text-amber-700 text-xs font-medium" : "text-foreground"}>{row.label}</p>}
                {row.detail && <p className="text-xs text-muted-foreground">{row.detail}</p>}
              </div>
              {!row.isNote && row.value !== null && (
                <p className="font-mono text-sm font-medium ml-4 flex-shrink-0">{fmt(row.value)}</p>
              )}
            </div>
          ))}
          {breakdown.cubicDetails && breakdown.cubicDetails.length > 0 && (
            <div className={`rounded-lg p-3 text-xs space-y-1 -mx-2 ${
              breakdown.usedCubic ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"
            }`}>
              <p className={`font-semibold ${breakdown.usedCubic ? "text-amber-800" : "text-green-800"}`}>
                {breakdown.usedCubic ? "⚠ Peso cubado é maior — cobrança pelo cubado" : "✓ Peso real é maior — cobrança pelo peso real"}
              </p>
              {breakdown.cubicDetails.map((d, i) => (
                <div key={i} className={`pl-2 border-l-2 ${breakdown.usedCubic ? "border-amber-300" : "border-green-300"}`}>
                  {d.description && <p className="text-muted-foreground">{d.description}:</p>}
                  <p className={`font-mono text-[11px] ${breakdown.usedCubic ? "text-amber-700" : "text-green-700"}`}>
                    Cubado: {d.formula}
                  </p>
                  <p className={breakdown.usedCubic ? "text-amber-700" : "text-green-700"}>
                    Real: {d.realKg.toLocaleString("pt-BR")} kg →{" "}
                    <strong>usa {d.usedCubic ? "cubado" : "real"}: {d.taxableKg.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg</strong>
                  </p>
                </div>
              ))}
              <p className={`font-bold pt-1 ${breakdown.usedCubic ? "text-amber-800" : "text-green-800"}`}>
                Peso taxável total: {breakdown.taxableKg?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} kg
              </p>
            </div>
          )}
          <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
            <p className="font-semibold">Total do frete</p>
            <p className="font-mono text-lg font-bold text-velox-amber">{fmt(breakdown.total)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
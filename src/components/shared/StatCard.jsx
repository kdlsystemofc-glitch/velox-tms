import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * StatCard — KPI canônico do painel (visual moderno, consistente em todos os módulos).
 * - chip de ícone (gradiente de marca ou cor semântica)
 * - valor com contador animado (números) e delta opcional (▲/▼ %)
 * - hover com leve elevação
 *
 * @param {React.ElementType} icon   ícone lucide
 * @param {string} label             rótulo curto
 * @param {string|number} value      valor já formatado (string) OU número (anima)
 * @param {string} [hint]            linha auxiliar
 * @param {number} [delta]           variação % vs período anterior
 * @param {boolean} [lowerBetter]    inverte a cor do delta (ex.: despesas)
 * @param {string} [tone]            "primary"|"success"|"warning"|"danger"|"muted"
 * @param {string} [prefix] [suffix] para o contador numérico (ex.: "R$ ", "%")
 */
const TONES = {
  primary: "bg-brand-gradient text-white",
  success: "bg-[hsl(var(--success))] text-white",
  warning: "bg-[hsl(var(--warning))] text-white",
  danger: "bg-destructive text-destructive-foreground",
  muted: "bg-muted text-muted-foreground",
};

function useCountUp(target, enabled) {
  const [val, setVal] = useState(enabled ? 0 : target);
  const ref = useRef();
  useEffect(() => {
    if (!enabled) { setVal(target); return; }
    const from = 0, to = Number(target) || 0, dur = 600, t0 = performance.now();
    cancelAnimationFrame(ref.current);
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * eased);
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, enabled]);
  return val;
}

export default function StatCard({ icon: Icon, label, value, hint, delta, lowerBetter = false, tone = "primary", prefix = "", suffix = "", decimals = 0, interactive = true }) {
  const isNumber = typeof value === "number";
  const animated = useCountUp(isNumber ? value : 0, isNumber);
  const display = isNumber
    ? `${prefix}${animated.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
    : value;

  const dGood = delta == null ? null : (lowerBetter ? delta < 0 : delta > 0);
  const chip = TONES[tone] || TONES.primary;

  return (
    <Card className={interactive ? "card-interactive" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl font-bold font-mono mt-1 tracking-tight tabular-nums">{display}</p>
            {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
          </div>
          {Icon && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-soft ${chip}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        {delta != null && Math.abs(delta) >= 0.5 && (
          <div className="mt-2 flex items-center gap-1">
            <span className={`text-[11px] font-bold ${dGood ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
            </span>
            <span className="text-[11px] text-muted-foreground">vs. anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

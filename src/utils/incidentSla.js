/**
 * VELOX — SLA de ocorrências. Cada ocorrência tem um prazo de resolução em
 * função da GRAVIDADE (severity). O prazo conta a partir da abertura.
 * Estados: on_time (no prazo) · at_risk (perto de estourar) · late (estourado);
 * para resolvidas: met (resolvida no prazo) · breached (resolvida atrasada).
 */
import { incidentSeverity } from "./incidents";

// Horas-padrão para resolver, por gravidade. Pode ser sobrescrito por
// settings.incident_sla_hours (ex.: { critical: 4, high: 24, ... }).
export const DEFAULT_SLA_HOURS = { critical: 4, high: 24, medium: 72, low: 168 };

export function slaHoursFor(severity, settings) {
  const cfg = settings?.incident_sla_hours || {};
  const h = Number(cfg[severity]);
  return Number.isFinite(h) && h > 0 ? h : (DEFAULT_SLA_HOURS[severity] ?? DEFAULT_SLA_HOURS.low);
}

/** Data-limite (Date) para resolver a ocorrência. null se faltar abertura. */
export function slaDeadline(inc, settings) {
  const created = inc?.created_date || inc?.created_at;
  if (!created) return null;
  const t = new Date(created).getTime();
  if (isNaN(t)) return null;
  const hours = slaHoursFor(incidentSeverity(inc), settings);
  return new Date(t + hours * 3600_000);
}

/**
 * Estado de SLA da ocorrência. `now` é injetável para testes.
 * - resolvida: 'met' (no prazo) ou 'breached' (atrasada)
 * - em aberto: 'on_time' | 'at_risk' (faltam <=20% do prazo) | 'late'
 */
export function incidentSlaStatus(inc, settings, now = new Date()) {
  const deadline = slaDeadline(inc, settings);
  if (!deadline) return null;

  if (inc.status === "resolved") {
    const resolvedAt = inc.resolved_at ? new Date(inc.resolved_at).getTime() : null;
    if (!resolvedAt || isNaN(resolvedAt)) return "met";
    return resolvedAt <= deadline.getTime() ? "met" : "breached";
  }

  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return "late";
  const hours = slaHoursFor(incidentSeverity(inc), settings);
  // "em risco" quando resta 20% ou menos do prazo total.
  if (ms <= hours * 3600_000 * 0.2) return "at_risk";
  return "on_time";
}

export const SLA_META = {
  on_time: { label: "No prazo", cls: "bg-success/15 text-success border-success/30" },
  at_risk: { label: "Em risco", cls: "bg-warning/15 text-warning border-warning/30" },
  late:    { label: "SLA estourado", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  met:     { label: "Resolvida no prazo", cls: "bg-success/15 text-success border-success/30" },
  breached:{ label: "Resolvida atrasada", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

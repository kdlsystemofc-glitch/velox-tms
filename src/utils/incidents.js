/**
 * VELOX — Central de ocorrências (Bloco 3).
 * Gravidade, rótulos e linha do tempo das ocorrências.
 */

export const INCIDENT_TYPES = {
  roubo:               { label: "Roubo / furto",          severity: "critical" },
  acidente:            { label: "Acidente",               severity: "critical" },
  avaria:              { label: "Avaria na carga",        severity: "high" },
  carga_recusada:      { label: "Carga recusada",         severity: "high" },
  entrega_parcial:     { label: "Entrega parcial",        severity: "high" },
  carga_nao_pronta:    { label: "Carga não estava pronta", severity: "medium" },
  destinatario_ausente:{ label: "Destinatário ausente",   severity: "medium" },
  tentativa_entrega:   { label: "Tentativa sem sucesso",  severity: "medium" },
  atraso:              { label: "Atraso",                 severity: "low" },
  outro:               { label: "Outro",                  severity: "low" },
};

export const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export const SEVERITY_META = {
  critical: { label: "Crítica", cls: "bg-red-100 text-red-700 border-red-200" },
  high:     { label: "Alta",    cls: "bg-orange-100 text-orange-700 border-orange-200" },
  medium:   { label: "Média",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  low:      { label: "Baixa",   cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

export function incidentSeverity(inc) {
  return inc.severity || INCIDENT_TYPES[inc.type]?.severity || "low";
}

export function incidentTypeLabel(type) {
  return INCIDENT_TYPES[type]?.label || (type || "").replace(/_/g, " ");
}

/** Ordena por gravidade (roubo/acidente no topo) e, dentro da mesma, mais recente primeiro. */
export function sortByGravity(incidents = []) {
  return [...incidents].sort((a, b) => {
    const sa = SEVERITY_RANK[incidentSeverity(a)] ?? 9;
    const sb = SEVERITY_RANK[incidentSeverity(b)] ?? 9;
    if (sa !== sb) return sa - sb;
    return new Date(b.created_date || b.created_at || 0) - new Date(a.created_date || a.created_at || 0);
  });
}

/** Constrói a linha do tempo completa (criação + eventos registrados). */
export function buildTimeline(inc) {
  const events = [];
  const created = inc.created_date || inc.created_at;
  if (created) events.push({ at: created, by: inc.reported_by_name || "—", text: "Ocorrência registrada", kind: "created" });
  (inc.timeline || []).forEach((e) => events.push(e));
  if (inc.resolved_at) events.push({ at: inc.resolved_at, by: "Gestão", text: inc.resolution_notes ? `Resolvida: ${inc.resolution_notes}` : "Resolvida", kind: "resolved" });
  return events.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
}

/** Tempo total de resolução em horas (ou null se aberta). */
export function resolutionHours(inc) {
  const start = inc.created_date || inc.created_at;
  if (!inc.resolved_at || !start) return null;
  return Math.max(0, Math.round((new Date(inc.resolved_at) - new Date(start)) / 3600000));
}

/** Ocorrência em aberto com prazo de resolução vencido? */
export function incidentOverdue(inc) {
  if (!inc || inc.status === "resolved" || !inc.due_date) return false;
  return inc.due_date < new Date().toISOString().slice(0, 10);
}

export function formatDuration(hours) {
  if (hours == null) return "—";
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}

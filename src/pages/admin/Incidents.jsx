import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import FileUploadButton from "@/components/shared/FileUploadButton";
import { NumericInput } from "@/components/shared/NumericInput";
import { downloadCsv, csvMoney, csvDate } from "@/utils/exportCsv";
import {
  AlertTriangle, CheckCircle2, Shield, ShieldAlert, BellRing, UserCheck, Clock, FileText, ExternalLink, DollarSign, Download, LayoutGrid, List as ListIcon,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import StatCard from "@/components/shared/StatCard";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  sortByGravity, incidentSeverity, incidentTypeLabel, SEVERITY_META,
  buildTimeline, resolutionHours, formatDuration, incidentOverdue, INCIDENT_TYPES,
} from "@/utils/incidents";
import { incidentSlaStatus, SLA_META } from "@/utils/incidentSla";

// Selo de SLA reutilizável (lista e kanban).
function SlaBadge({ inc, settings }) {
  const st = incidentSlaStatus(inc, settings);
  if (!st) return null;
  const m = SLA_META[st];
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${m.cls}`}>{m.label}</span>;
}

// Colunas do quadro Kanban (status do fluxo de ocorrência).
const KANBAN_COLS = [
  { key: "open", label: "Aberta", match: (i) => i.status !== "in_progress" && i.status !== "resolved" },
  { key: "in_progress", label: "Em tratativa", match: (i) => i.status === "in_progress" },
  { key: "resolved", label: "Resolvida", match: (i) => i.status === "resolved" },
];

/**
 * CENTRAL DE OCORRÊNCIAS (Bloco 3).
 * F1 registro (motorista) · F2 tratativa (gestor) · F3 linha do tempo · F4 resolução.
 */
export default function Incidents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("open");
  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("list");
  const [form, setForm] = useState({ assigned_to: "", action_plan: "", due_date: "", financial_impact: "", root_cause: "", note: "", resolution: "" });
  const { settings } = useCompanySettings();

  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-all"], queryFn: () => db.Incident.list("-created_date", 300) });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => db.Order.list("-created_date", 500) });
  const orderById = Object.fromEntries(orders.map(o => [o.id, o]));

  const openOnly = statusFilter === "open" ? incidents.filter(i => i.status !== "resolved")
    : statusFilter === "resolved" ? incidents.filter(i => i.status === "resolved")
    : incidents;
  const aq = assignedFilter.trim().toLowerCase();
  const filteredBase = openOnly.filter(i =>
    (sevFilter === "all" || incidentSeverity(i) === sevFilter) &&
    (typeFilter === "all" || i.type === typeFilter) &&
    (!aq || (i.assigned_to || "").toLowerCase().includes(aq))
  );
  // Ordena por gravidade; atrasadas sobem para o topo.
  const filtered = sortByGravity(filteredBase).sort((a, b) => Number(incidentOverdue(b)) - Number(incidentOverdue(a)));

  // Kanban: ignora o filtro de status (as colunas SÃO os status), mantém os demais.
  const kanbanItems = sortByGravity(incidents.filter(i =>
    (sevFilter === "all" || incidentSeverity(i) === sevFilter) &&
    (typeFilter === "all" || i.type === typeFilter) &&
    (!aq || (i.assigned_to || "").toLowerCase().includes(aq))
  ));

  // Arrastar um card para outra coluna muda o status da ocorrência.
  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const inc = incidents.find(i => i.id === draggableId);
    if (!inc) return;
    const target = destination.droppableId; // open | in_progress | resolved
    const cur = inc.status === "resolved" ? "resolved" : inc.status === "in_progress" ? "in_progress" : "open";
    if (target === cur) return;
    const labelByCol = { open: "Reaberta / em aberto", in_progress: "Em tratativa", resolved: "Resolvida" };
    const patch = { status: target, timeline: tl(inc, `Movida para "${labelByCol[target]}" no quadro`, target) };
    if (target === "resolved") patch.resolved_at = new Date().toISOString();
    if (target !== "resolved") patch.resolved_at = null;
    update.mutate({ id: inc.id, patch });
  };

  const counts = {
    open: incidents.filter(i => i.status !== "resolved").length,
    critical: incidents.filter(i => i.status !== "resolved" && incidentSeverity(i) === "critical").length,
    overdue: incidents.filter(i => incidentOverdue(i)).length,
    resolved: incidents.filter(i => i.status === "resolved").length,
  };

  // ── Analytics (Oc-3) ────────────────────────────────────────
  const resolvedList = incidents.filter(i => i.status === "resolved");
  const avgHours = resolvedList.length ? Math.round(resolvedList.reduce((s, i) => s + (resolutionHours(i) || 0), 0) / resolvedList.length) : null;
  const withDue = resolvedList.filter(i => i.due_date && i.resolved_at);
  const onTime = withDue.filter(i => (i.resolved_at || "").slice(0, 10) <= i.due_date).length;
  const otPct = withDue.length ? Math.round((onTime / withDue.length) * 100) : null;
  const totalImpact = incidents.reduce((s, i) => s + (Number(i.financial_impact) || 0), 0);
  const byType = Object.entries(incidents.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  const exportIncidents = () => downloadCsv(`ocorrencias-${new Date().toISOString().slice(0, 10)}`, filtered, [
    { key: "type", label: "Tipo", format: (v) => incidentTypeLabel(v) },
    { key: "id", label: "Gravidade", format: (_, i) => SEVERITY_META[incidentSeverity(i)]?.label || "" },
    { key: "order_id", label: "Pedido", format: (v) => orderById[v]?.protocol || "" },
    { key: "status", label: "Status" },
    { key: "assigned_to", label: "Responsável" },
    { key: "due_date", label: "Prazo", format: csvDate },
    { key: "created_date", label: "Aberta em", format: csvDate },
    { key: "resolved_at", label: "Resolvida em", format: csvDate },
    { key: "id", label: "Horas p/ resolver", format: (_, i) => resolutionHours(i) ?? "" },
    { key: "financial_impact", label: "Impacto (R$)", format: csvMoney },
    { key: "root_cause", label: "Causa-raiz" },
    { key: "reported_by_name", label: "Registrada por" },
  ]);

  const reopen = async (inc) => {
    const newTl = tl(inc, "Ocorrência reaberta", "reopen");
    await update.mutateAsync({ id: inc.id, patch: { status: "in_progress", resolved_at: null, timeline: newTl } });
    setSelected(s => ({ ...s, status: "in_progress", resolved_at: null, timeline: newTl }));
    toast({ title: "Ocorrência reaberta" });
  };

  const update = useMutation({
    mutationFn: ({ id, patch }) => db.Incident.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents-all"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });

  const openManage = (inc) => {
    setSelected(inc);
    setForm({ assigned_to: inc.assigned_to || "", action_plan: inc.action_plan || "", due_date: inc.due_date || "", financial_impact: inc.financial_impact ?? "", root_cause: inc.root_cause || "", note: "", resolution: "" });
  };

  const addPhoto = async (url) => {
    if (!url) return;
    const inc = selected;
    const photos = [...(inc.photo_urls || []), url];
    await update.mutateAsync({ id: inc.id, patch: { photo_urls: photos } });
    setSelected(s => ({ ...s, photo_urls: photos }));
    toast({ title: "Anexo adicionado" });
  };

  const tl = (inc, text, kind = "note") => ([...(inc.timeline || []), { at: new Date().toISOString(), by: "Gestão", text, kind }]);

  const saveTratativa = async () => {
    const inc = selected;
    const newTl = tl(inc, `Tratativa: ${form.assigned_to ? `responsável ${form.assigned_to}. ` : ""}${form.action_plan ? `Plano: ${form.action_plan}.` : ""}${form.due_date ? ` Prazo ${form.due_date}.` : ""}`, "plan");
    const newStatus = inc.status === "open" ? "in_progress" : inc.status;
    const fi = form.financial_impact === "" ? null : Number(form.financial_impact);
    await update.mutateAsync({ id: inc.id, patch: {
      assigned_to: form.assigned_to || null, action_plan: form.action_plan || null,
      due_date: form.due_date || null, financial_impact: fi, root_cause: form.root_cause || null,
      status: newStatus, timeline: newTl,
    }});
    setSelected(s => ({ ...s, assigned_to: form.assigned_to, action_plan: form.action_plan, due_date: form.due_date, financial_impact: fi, root_cause: form.root_cause, status: newStatus, timeline: newTl }));
    toast({ title: "Tratativa salva" });
  };

  const markNotified = async () => {
    const inc = selected;
    const now = new Date().toISOString();
    const newTl = tl(inc, "Cliente notificado", "notify");
    await update.mutateAsync({ id: inc.id, patch: { client_notified: true, client_notified_at: now, timeline: newTl } });
    setSelected(s => ({ ...s, client_notified: true, client_notified_at: now, timeline: newTl }));
    toast({ title: "Cliente marcado como notificado" });
  };

  const toggleInsurance = async () => {
    const inc = selected;
    const val = !inc.insurance_triggered;
    const newTl = tl(inc, val ? "Seguro acionado" : "Acionamento de seguro cancelado", "insurance");
    await update.mutateAsync({ id: inc.id, patch: { insurance_triggered: val, timeline: newTl } });
    setSelected(s => ({ ...s, insurance_triggered: val, timeline: newTl }));
  };

  const addNote = async () => {
    if (!form.note.trim()) return;
    const inc = selected;
    const newTl = tl(inc, form.note.trim(), "note");
    await update.mutateAsync({ id: inc.id, patch: { timeline: newTl } });
    setSelected(s => ({ ...s, timeline: newTl }));
    setForm(f => ({ ...f, note: "" }));
  };

  const resolve = async () => {
    if (!form.resolution.trim()) return;
    const inc = selected;
    await update.mutateAsync({ id: inc.id, patch: {
      status: "resolved", resolution_notes: form.resolution.trim(), resolved_at: new Date().toISOString(),
      timeline: tl(inc, `Resolvida: ${form.resolution.trim()}`, "resolved"),
    }});
    setSelected(null);
    toast({ title: "Ocorrência resolvida!" });
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={AlertTriangle} title="Ocorrências" subtitle="Central de tratativa — por gravidade, com plano de ação e linha do tempo">
        <Button variant="outline" className="gap-2" disabled={filtered.length === 0} onClick={exportIncidents}>
          <Download className="w-4 h-4" /> Exportar
        </Button>
      </PageHeader>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={ShieldAlert} label="Em aberto" value={counts.open} tone="warning" />
        <StatCard icon={AlertTriangle} label="Críticas" value={counts.critical} tone="danger" />
        <StatCard icon={Clock} label="Atrasadas (prazo)" value={counts.overdue} tone={counts.overdue > 0 ? "danger" : "muted"} />
        <StatCard icon={CheckCircle2} label="Resolvidas" value={counts.resolved} tone="success" />
      </div>

      {/* Indicadores (Oc-3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Tempo médio resolução</p><p className="text-lg font-bold font-mono">{avgHours != null ? formatDuration(avgHours) : "—"}</p></Card>
        <Card className="p-3"><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Resolvidas no prazo</p><p className={`text-lg font-bold font-mono ${otPct != null && otPct < 80 ? "text-amber-600 dark:text-amber-300" : "text-green-600 dark:text-green-300"}`}>{otPct != null ? `${otPct}%` : "—"}</p></Card>
        <Card className="p-3"><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Impacto financeiro</p><p className={`text-lg font-bold font-mono ${totalImpact > 0 ? "text-red-600 dark:text-red-300" : "text-muted-foreground"}`}>R$ {totalImpact.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Tipos mais frequentes</p>
          {byType.length === 0 ? <p className="text-sm text-muted-foreground">—</p> : (
            <div className="mt-1 space-y-0.5">
              {byType.map(([t, n]) => <p key={t} className="text-[11px] flex justify-between"><span className="truncate">{incidentTypeLabel(t)}</span><span className="font-mono font-semibold ml-2">{n}</span></p>)}
            </div>
          )}
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="resolved">Resolvidas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sevFilter} onValueChange={setSevFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Gravidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda gravidade</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo tipo</SelectItem>
            {Object.keys(INCIDENT_TYPES).map(t => <SelectItem key={t} value={t}>{incidentTypeLabel(t)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Responsável..." value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} className="w-40" />
        <div className="ml-auto inline-flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView("list")} title="Lista"
            className={`px-2.5 h-9 flex items-center gap-1.5 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"}`}>
            <ListIcon className="w-4 h-4" /> Lista
          </button>
          <button onClick={() => setView("kanban")} title="Kanban"
            className={`px-2.5 h-9 flex items-center gap-1.5 text-sm ${view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/60"}`}>
            <LayoutGrid className="w-4 h-4" /> Kanban
          </button>
        </div>
      </div>

      {/* Kanban */}
      {view === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {KANBAN_COLS.map(col => {
              const items = kanbanItems.filter(col.match);
              return (
                <Droppable droppableId={col.key} key={col.key}>
                  {(dp) => (
                    <div ref={dp.innerRef} {...dp.droppableProps}
                      className="rounded-xl border border-border bg-muted/20 p-2 min-h-[120px]">
                      <div className="flex items-center justify-between px-2 py-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{col.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">{items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((inc, idx) => {
                          const meta = SEVERITY_META[incidentSeverity(inc)];
                          const order = orderById[inc.order_id];
                          return (
                            <Draggable draggableId={inc.id} index={idx} key={inc.id}>
                              {(d) => (
                                <button ref={d.innerRef} {...d.draggableProps} {...d.dragHandleProps}
                                  onClick={() => openManage(inc)}
                                  className="w-full text-left rounded-lg border border-border bg-card p-2.5 hover:border-primary/40 transition-all">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
                                    <SlaBadge inc={inc} settings={settings} />
                                  </div>
                                  <p className="text-sm font-semibold leading-tight">{incidentTypeLabel(inc.type)}</p>
                                  {order && <p className="font-mono text-[11px] text-muted-foreground">{order.protocol}</p>}
                                  {inc.assigned_to && <p className="text-[11px] text-muted-foreground mt-0.5">👤 {inc.assigned_to}</p>}
                                </button>
                              )}
                            </Draggable>
                          );
                        })}
                        {dp.placeholder}
                        {items.length === 0 && <p className="text-[11px] text-muted-foreground/60 text-center py-3">—</p>}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      ) : /* Lista */
      filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" /> Nenhuma ocorrência nesta visão.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(inc => {
            const sev = incidentSeverity(inc);
            const meta = SEVERITY_META[sev];
            const order = orderById[inc.order_id];
            return (
              <button key={inc.id} onClick={() => openManage(inc)}
                className="w-full text-left rounded-xl border border-border p-3.5 hover:border-velox-amber/40 hover:shadow-sm transition-all bg-card">
                <div className="flex items-start gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${meta.cls}`}>{meta.label}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{incidentTypeLabel(inc.type)}</span>
                      {order && <span className="font-mono text-xs text-muted-foreground">{order.protocol}</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        inc.status === "resolved" ? "bg-green-500/15 text-green-700 dark:text-green-300" :
                        inc.status === "in_progress" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      }`}>{inc.status === "resolved" ? "Resolvida" : inc.status === "in_progress" ? "Em tratativa" : "Aberta"}</span>
                      {incidentOverdue(inc) && <span className="text-[10px] bg-red-500/15 text-red-700 dark:text-red-300 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Clock className="w-3 h-3" /> Prazo vencido</span>}
                      <SlaBadge inc={inc} settings={settings} />
                      {inc.client_notified && <span className="text-[10px] text-green-600 dark:text-green-300 flex items-center gap-0.5"><BellRing className="w-3 h-3" /> cliente avisado</span>}
                      {inc.insurance_triggered && <span className="text-[10px] text-blue-600 dark:text-blue-300 flex items-center gap-0.5"><Shield className="w-3 h-3" /> seguro</span>}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{inc.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {order?.client_name || "—"}{inc.recipient_name ? ` · ${inc.recipient_name}` : ""} · por {inc.reported_by_name || "—"}
                      {inc.status === "resolved" && <> · resolvida em {formatDuration(resolutionHours(inc))}</>}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Gerenciar ocorrência */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          {selected && (() => {
            const order = orderById[selected.order_id];
            const sev = incidentSeverity(selected);
            const timeline = buildTimeline(selected);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_META[sev].cls}`}>{SEVERITY_META[sev].label}</span>
                    {incidentTypeLabel(selected.type)}
                    {order && <Link to={`/admin/coletas/${order.id}`} className="text-xs text-velox-amber hover:underline flex items-center gap-0.5 font-normal">{order.protocol} <ExternalLink className="w-3 h-3" /></Link>}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-2">
                    <p>{selected.description}</p>
                    {(selected.financial_impact > 0 || selected.root_cause) && (
                      <div className="flex items-center gap-3 text-xs">
                        {selected.financial_impact > 0 && <span className="flex items-center gap-1 text-red-700 dark:text-red-300 font-semibold"><DollarSign className="w-3.5 h-3.5" /> R$ {Number(selected.financial_impact).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                        {selected.root_cause && <span className="text-muted-foreground">Causa: {selected.root_cause}</span>}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(selected.photo_urls || []).map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-300 hover:underline"><FileText className="w-3 h-3" /> Anexo {i + 1}</a>
                      ))}
                      {selected.status !== "resolved" && (
                        <FileUploadButton label="Anexar foto/doc" accept="image/*,application/pdf" onUpload={addPhoto} />
                      )}
                    </div>
                  </div>

                  {selected.status !== "resolved" && (
                    <>
                      {/* Tratativa */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tratativa</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Responsável" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} className="h-9 text-sm" />
                          <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="h-9 text-sm" title="Prazo de resolução" />
                        </div>
                        <Textarea placeholder="Plano de ação — o que vai ser feito" rows={2} value={form.action_plan} onChange={e => setForm(f => ({ ...f, action_plan: e.target.value }))} className="resize-none text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-muted-foreground">Impacto financeiro (R$)</label>
                            <NumericInput currency value={form.financial_impact} onChange={v => setForm(f => ({ ...f, financial_impact: v }))} placeholder="custo da avaria/roubo" />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground">Causa-raiz</label>
                            <Input value={form.root_cause} onChange={e => setForm(f => ({ ...f, root_cause: e.target.value }))} placeholder="ex: manuseio, embalagem, terceiro" className="h-9 text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={saveTratativa}><UserCheck className="w-3.5 h-3.5" /> Salvar tratativa</Button>
                          <Button size="sm" variant="outline" className={`text-xs gap-1 ${selected.client_notified ? "text-green-600 dark:text-green-300 border-green-500/30" : ""}`} onClick={markNotified} disabled={selected.client_notified}>
                            <BellRing className="w-3.5 h-3.5" /> {selected.client_notified ? "Cliente notificado" : "Marcar cliente notificado"}
                          </Button>
                          <Button size="sm" variant="outline" className={`text-xs gap-1 ${selected.insurance_triggered ? "text-blue-600 dark:text-blue-300 border-blue-500/30" : ""}`} onClick={toggleInsurance}>
                            <Shield className="w-3.5 h-3.5" /> {selected.insurance_triggered ? "Seguro acionado" : "Acionar seguro"}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Linha do tempo */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Linha do tempo</p>
                    <div className="space-y-2.5 border-l-2 border-border pl-3 ml-1">
                      {timeline.map((e, i) => (
                        <div key={i} className="relative">
                          <span className="absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full bg-velox-amber" />
                          <p className="text-sm">{e.text}</p>
                          <p className="text-[11px] text-muted-foreground">{e.by} · {e.at ? new Date(e.at).toLocaleString("pt-BR") : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selected.status !== "resolved" && (
                    <>
                      {/* Nota */}
                      <div className="flex gap-2">
                        <Input placeholder="Adicionar nota à linha do tempo..." value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="h-9 text-sm" onKeyDown={e => e.key === "Enter" && addNote()} />
                        <Button size="sm" variant="outline" onClick={addNote} disabled={!form.note.trim()}>Adicionar</Button>
                      </div>

                      {/* Resolver */}
                      <div className="border-t border-border pt-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resolução</p>
                        <Textarea placeholder="Como foi resolvida..." rows={2} value={form.resolution} onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))} className="resize-none text-sm" />
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold gap-1" onClick={resolve} disabled={!form.resolution.trim()}>
                          <CheckCircle2 className="w-4 h-4" /> Marcar como resolvida
                        </Button>
                      </div>
                    </>
                  )}

                  {selected.status === "resolved" && (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm space-y-2">
                      <p className="font-semibold text-green-800 dark:text-green-300">Resolvida em {formatDuration(resolutionHours(selected))}</p>
                      {selected.resolution_notes && <p className="text-green-700 dark:text-green-300">{selected.resolution_notes}</p>}
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => reopen(selected)}>
                        <AlertTriangle className="w-3.5 h-3.5" /> Reabrir ocorrência
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

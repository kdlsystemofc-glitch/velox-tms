import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, MapPin, AlertTriangle, FileText, ClipboardCheck, PackageX, UserX, Clock } from "lucide-react";
import { format } from "date-fns";
import FileUploadButton from "@/components/shared/FileUploadButton";
import SignaturePad from "@/components/shared/SignaturePad";
import { storage } from "@/api/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import { incidentTypeLabel } from "@/utils/incidents";

const CHECKLIST_ITEMS = [
  { key: "tires", label: "Pneus calibrados e em bom estado" },
  { key: "lights", label: "Luzes e setas funcionando" },
  { key: "docs", label: "Documentos do veículo (CRLV) a bordo" },
  { key: "cargo", label: "Carga conferida e amarrada" },
  { key: "fluids", label: "Nível de óleo e água verificados" },
];

export default function DriverTrip() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [incidentModal, setIncidentModal] = useState(false);
  const [incident, setIncident] = useState({ type: "", description: "", photo_url: "" });
  const [stopActions, setStopActions] = useState({});
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [checklist, setChecklist] = useState({});
  // Exceções operacionais (S5 / S12 / S13)
  const [partialModal, setPartialModal] = useState(null);   // { index } entrega parcial
  const [partialForm, setPartialForm] = useState({ delivered_volumes: "", reason: "recusado" });
  const [absentModal, setAbsentModal] = useState(null);     // { index } destinatário ausente
  const [absentForm, setAbsentForm] = useState({ action: "retry", notes: "" });
  const [cargoModal, setCargoModal] = useState(null);       // { index } carga não pronta
  const [cargoNotes, setCargoNotes] = useState("");

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => base44.entities.Trip.filter({ id }),
    select: (d) => d[0],
  });

  const { data: driver } = useQuery({
    queryKey: ["my-driver", user?.id],
    queryFn: () => base44.entities.Driver.filter({ user_id: user.id }),
    select: (d) => d[0],
    enabled: !!user?.id,
  });

  // Ocorrências em aberto desta viagem (F1/F3) — o motorista acompanha e complementa.
  const { data: tripIncidents = [] } = useQuery({
    queryKey: ["trip-incidents", id],
    queryFn: () => base44.entities.Incident.filter({ trip_id: id }),
    select: (d) => d.filter(i => i.status !== "resolved"),
    enabled: !!id,
  });
  const [incidentNote, setIncidentNote] = useState({});
  const addDriverNote = async (inc) => {
    const text = (incidentNote[inc.id] || "").trim();
    if (!text) return;
    await base44.entities.Incident.update(inc.id, {
      timeline: [...(inc.timeline || []), { at: new Date().toISOString(), by: driver?.name || "Motorista", text, kind: "driver_note" }],
    });
    setIncidentNote(prev => ({ ...prev, [inc.id]: "" }));
    queryClient.invalidateQueries({ queryKey: ["trip-incidents", id] });
    toast({ title: "Informação adicionada à ocorrência" });
  };

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Trip.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", id] }),
  });

  if (isLoading || !trip) return (
    <div className="min-h-screen bg-velox-dark flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full animate-spin" />
    </div>
  );

  const driverName = driver?.name || user?.full_name || "Motorista";

  // Checklist de saída: gravado como evento da viagem (não exige migration)
  const checklistDone = (trip.events || []).some(e => e.type === "checklist");
  const allChecked = CHECKLIST_ITEMS.every(item => checklist[item.key]);
  const submitChecklist = () => {
    updateMutation.mutate({
      events: [...(trip.events || []), {
        type: "checklist",
        description: `Checklist de saída concluído: ${CHECKLIST_ITEMS.map(i => i.label).join("; ")}`,
        items: CHECKLIST_ITEMS.map(i => ({ key: i.key, label: i.label, ok: true })),
        timestamp: new Date().toISOString(),
        user: driverName,
      }],
    });
    toast({ title: "Checklist concluído!", description: "Boa viagem!" });
  };

  const handleArrived = (index) => {
    const stops = [...(trip.stops || [])];
    stops[index] = { ...stops[index], status: "arrived", arrived_at: new Date().toISOString() };
    updateMutation.mutate({
      stops,
      events: [...(trip.events || []), { type: "arrived", description: `Chegou em ${stops[index].recipient_name || stops[index].address}`, timestamp: new Date().toISOString(), user: driverName }]
    });
    toast({ title: "Chegada confirmada!" });
  };

  const handleComplete = async (index) => {
    const action = stopActions[index] || {};
    const stop = trip.stops[index];
    if (stop.type === "delivery" && !action.nf_url) {
      toast({ title: "NF obrigatória", description: "Faça o upload da NF assinada antes de confirmar.", variant: "destructive" });
      return;
    }
    if (stop.type === "delivery" && !action.signature_url) {
      toast({ title: "Assinatura obrigatória", description: "Capture a assinatura do recebedor antes de confirmar.", variant: "destructive" });
      return;
    }
    const stops = [...(trip.stops || [])];
    stops[index] = {
      ...stops[index], status: "completed", completed_at: new Date().toISOString(), awaiting_cargo: false,
      nf_signed_url: action.nf_url || undefined, notes: action.notes || undefined, photo_url: action.photo_url || undefined,
      signature_url: action.signature_url || undefined, receiver_name: action.receiver_name || undefined,
    };
    updateMutation.mutate({
      stops,
      events: [...(trip.events || []), { type: "completed", description: `Parada concluída: ${stop.recipient_name || stop.address}`, timestamp: new Date().toISOString(), user: driverName }]
    });

    // Sync order status
    if (stop.order_id) {
      try {
        const orders = await base44.entities.Order.filter({ id: stop.order_id });
        const order = orders[0];
        if (order) {
          if (stop.type === "collection") {
            await base44.entities.Order.update(stop.order_id, { status: "in_transit", status_history: [...(order.status_history || []), { status: "in_transit", timestamp: new Date().toISOString(), user: driverName, note: "Coleta concluída pelo motorista" }] });
          } else if (stop.type === "delivery") {
            const recipients = (order.recipients || []).map(r => r.name === stop.recipient_name ? { ...r, delivery_status: "delivered" } : r);
            const allDelivered = recipients.every(r => r.delivery_status === "delivered");
            // Salva NF + comprovante (assinatura/recebedor) no destinatário
            const updatedRecipients = recipients.map(r => {
              if (r.name !== stop.recipient_name) return r;
              return {
                ...r,
                ...(action.nf_url ? { nf_signed_url: action.nf_url } : {}),
                ...(action.signature_url ? { signature_url: action.signature_url } : {}),
                ...(action.receiver_name ? { receiver_name: action.receiver_name } : {}),
                delivered_at: new Date().toISOString(),
              };
            });
            await base44.entities.Order.update(stop.order_id, { recipients: updatedRecipients, status: allDelivered ? "delivered" : "in_transit", status_history: [...(order.status_history || []), { status: allDelivered ? "delivered" : "in_transit", timestamp: new Date().toISOString(), user: driverName, note: `Entrega para ${stop.recipient_name} concluída` }] });
          }
        }
      } catch (e) { /* silent */ }
    }

    setStopActions(prev => { const n = { ...prev }; delete n[index]; return n; });
    toast({ title: "Parada concluída!" });
  };

  const handleIncident = async () => {
    if (!incident.type || !incident.description) {
      toast({ title: "Preencha tipo e descrição.", variant: "destructive" });
      return;
    }

    // Determina order_id: da parada em andamento ou do primeiro pedido da viagem
    const activeOrderId = currentOrderId || (trip.order_ids?.[0]) || null;
    if (!activeOrderId) {
      toast({ title: "Nenhum pedido associado a esta viagem.", variant: "destructive" });
      return;
    }

    // 1. Salvar na entidade Incident (permanente e rastreável)
    await base44.entities.Incident.create({
      order_id:         activeOrderId,
      trip_id:          trip.id,
      type:             incident.type,
      description:      incident.description,
      photo_urls:       incident.photo_url ? [incident.photo_url] : [],
      reported_by_name: driverName,
      reported_by_role: "motorista",
      status:           "open",
    });

    // 2. Manter entrada no log da viagem (para timeline)
    updateMutation.mutate({
      events: [...(trip.events || []), {
        type: "incident",
        description: `[${incident.type}] ${incident.description}`,
        timestamp: new Date().toISOString(),
        user: driverName,
        photo_url: incident.photo_url || undefined,
      }]
    });

    setIncidentModal(false);
    setIncident({ type: "", description: "", photo_url: "" });
    toast({ title: "Ocorrência registrada!" });
  };

  // Cria um alerta para o gestor (torre de controle). Falha em silêncio se a entidade não existir.
  const notifyManager = async ({ type, level = "warning", message, reference_id }) => {
    try {
      await base44.entities.Alert.create({ type, level, message, reference_id, reference_type: "order", read: false, resolved: false });
    } catch { /* alerta é best-effort */ }
  };

  // S12 — Entrega parcial: parte dos volumes foi entregue, o restante volta.
  const handlePartial = async (index) => {
    const action = stopActions[index] || {};
    const stop = trip.stops[index];
    if (!action.nf_url || !action.signature_url) {
      toast({ title: "NF e assinatura obrigatórias", description: "Anexe a NF e capture a assinatura do que foi entregue.", variant: "destructive" });
      return;
    }
    const delivered = Number(partialForm.delivered_volumes) || 0;
    const reasonLabel = { recusado: "recusado pelo cliente", avaria: "avaria", volume_errado: "volume errado", outro: "outro" }[partialForm.reason] || partialForm.reason;
    const stops = [...(trip.stops || [])];
    stops[index] = { ...stops[index], status: "completed", delivery_result: "partial", delivered_volumes: delivered, partial_reason: partialForm.reason, completed_at: new Date().toISOString(), nf_signed_url: action.nf_url, signature_url: action.signature_url, receiver_name: action.receiver_name || undefined, notes: action.notes || undefined };
    updateMutation.mutate({ stops, events: [...(trip.events || []), { type: "partial_delivery", description: `Entrega PARCIAL em ${stop.recipient_name || stop.address}: ${delivered} volume(s) entregue(s); restante ${reasonLabel}`, timestamp: new Date().toISOString(), user: driverName }] });

    if (stop.order_id) {
      try {
        const order = (await base44.entities.Order.filter({ id: stop.order_id }))[0];
        if (order) {
          const recipients = (order.recipients || []).map(r => r.name === stop.recipient_name
            ? { ...r, delivery_status: "partial", delivered_volumes: delivered, partial_reason: partialForm.reason, delivered_at: new Date().toISOString(), nf_signed_url: action.nf_url, signature_url: action.signature_url, receiver_name: action.receiver_name || r.receiver_name }
            : r);
          // pedido nunca fica 100% entregue se há parcial → status partially_delivered
          await base44.entities.Order.update(stop.order_id, { recipients, status: "partially_delivered", status_history: [...(order.status_history || []), { status: "partially_delivered", timestamp: new Date().toISOString(), user: driverName, note: `Entrega parcial p/ ${stop.recipient_name}: ${delivered} vol., restante ${reasonLabel}` }] });
          await base44.entities.Incident.create({ order_id: stop.order_id, trip_id: trip.id, type: "entrega_parcial", description: `${delivered} volume(s) entregue(s) a ${stop.recipient_name}. Restante: ${reasonLabel}.`, recipient_name: stop.recipient_name, reported_by_name: driverName, reported_by_role: "motorista", status: "open" });
          await notifyManager({ type: "delivery_attempt", message: `Entrega parcial — ${order.protocol} (${stop.recipient_name}): ${reasonLabel}`, reference_id: stop.order_id });
        }
      } catch { /* silent */ }
    }
    setPartialModal(null);
    setPartialForm({ delivered_volumes: "", reason: "recusado" });
    setStopActions(prev => { const n = { ...prev }; delete n[index]; return n; });
    toast({ title: "Entrega parcial registrada", description: "O gestor foi avisado do volume que retornou." });
  };

  // S13 — Destinatário ausente: define o que fazer com a carga.
  const handleAbsent = async (index) => {
    const stop = trip.stops[index];
    const actionLabel = { retry: "tentar novamente amanhã", wait: "aguardar instrução do gestor", return: "devolver ao remetente" }[absentForm.action];
    const stops = [...(trip.stops || [])];
    const nextAttempt = absentForm.action === "retry" ? new Date(Date.now() + 86400000).toISOString().slice(0, 10) : null;
    stops[index] = { ...stops[index], status: "completed", delivery_result: "failed", failure_action: absentForm.action, next_attempt_date: nextAttempt, completed_at: new Date().toISOString(), notes: absentForm.notes || undefined };
    updateMutation.mutate({ stops, events: [...(trip.events || []), { type: "recipient_absent", description: `Destinatário ausente em ${stop.recipient_name || stop.address}. Ação: ${actionLabel}.`, timestamp: new Date().toISOString(), user: driverName }] });

    if (stop.order_id) {
      try {
        const order = (await base44.entities.Order.filter({ id: stop.order_id }))[0];
        if (order) {
          const recipients = (order.recipients || []).map(r => {
            if (r.name !== stop.recipient_name) return r;
            const attempts = [...(r.attempts || []), { date: new Date().toISOString(), action: absentForm.action, notes: absentForm.notes || "", by: driverName }];
            return { ...r, delivery_status: "failed", failure_action: absentForm.action, next_attempt_date: nextAttempt, attempts };
          });
          await base44.entities.Order.update(stop.order_id, { recipients, status_history: [...(order.status_history || []), { status: order.status, timestamp: new Date().toISOString(), user: driverName, note: `Destinatário ${stop.recipient_name} ausente — ${actionLabel}` }] });
          await base44.entities.Incident.create({ order_id: stop.order_id, trip_id: trip.id, type: "destinatario_ausente", description: `Destinatário ${stop.recipient_name} ausente. Ação definida: ${actionLabel}.${absentForm.notes ? " Obs: " + absentForm.notes : ""}`, recipient_name: stop.recipient_name, reported_by_name: driverName, reported_by_role: "motorista", status: "open", due_date: nextAttempt });
          await notifyManager({ type: "delivery_attempt", level: absentForm.action === "wait" ? "critical" : "warning", message: `Destinatário ausente — ${order.protocol} (${stop.recipient_name}): ${actionLabel}`, reference_id: stop.order_id });
        }
      } catch { /* silent */ }
    }
    setAbsentModal(null);
    setAbsentForm({ action: "retry", notes: "" });
    toast({ title: "Ocorrência registrada", description: `Pode pular esta parada e seguir a rota. ${actionLabel}.` });
  };

  // S5 — Carga não estava pronta na coleta.
  const handleCargoNotReady = async (index) => {
    const stop = trip.stops[index];
    const arrivedAt = stop.arrived_at || new Date().toISOString();
    const stops = [...(trip.stops || [])];
    stops[index] = { ...stops[index], status: "arrived", awaiting_cargo: true, cargo_hold_notes: cargoNotes, cargo_hold_at: new Date().toISOString() };
    updateMutation.mutate({ stops, events: [...(trip.events || []), { type: "cargo_not_ready", description: `Carga não estava pronta em ${stop.recipient_name || stop.address}. ${cargoNotes || ""}`, timestamp: new Date().toISOString(), user: driverName }] });

    if (stop.order_id) {
      try {
        const order = (await base44.entities.Order.filter({ id: stop.order_id }))[0];
        if (order) {
          await base44.entities.Order.update(stop.order_id, { status: "awaiting_cargo", status_history: [...(order.status_history || []), { status: "awaiting_cargo", timestamp: new Date().toISOString(), user: driverName, note: `Carga não estava pronta (chegada ${new Date(arrivedAt).toLocaleString("pt-BR")}). ${cargoNotes || ""}` }] });
          await base44.entities.Incident.create({ order_id: stop.order_id, trip_id: trip.id, type: "carga_nao_pronta", description: `Carga não estava pronta no momento da coleta. Chegada às ${new Date(arrivedAt).toLocaleString("pt-BR")}. ${cargoNotes || ""}`, reported_by_name: driverName, reported_by_role: "motorista", status: "open" });
          await notifyManager({ type: "cargo_hold", level: "warning", message: `Carga não pronta — ${order.protocol} (${order.client_name})`, reference_id: stop.order_id });
        }
      } catch { /* silent */ }
    }
    setCargoModal(null);
    setCargoNotes("");
    toast({ title: "Registrado: carga não pronta", description: "Você pode seguir para a próxima parada e voltar depois." });
  };

  const setStopField = (index, field, value) => setStopActions(prev => ({ ...prev, [index]: { ...(prev[index] || {}), [field]: value } }));

  return (
    <div className="min-h-screen bg-velox-dark flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-velox-dark/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate("/motorista")} className="text-white/60 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-display font-bold text-white flex-1">Viagem</h1>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trip.status === "in_progress" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
          {trip.status === "in_progress" ? "Em Andamento" : "Planejada"}
        </span>
      </div>

      <div className="flex-1 px-4 py-4 max-w-sm mx-auto w-full space-y-3 pb-24">
        {/* Checklist de saída do veículo */}
        {!checklistDone && (trip.status === "planned" || trip.status === "in_progress") && (
          <div className="rounded-xl border border-velox-amber/40 bg-velox-amber/10 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="w-5 h-5 text-velox-amber" />
              <h2 className="font-semibold text-sm text-white">Checklist de saída</h2>
            </div>
            <div className="space-y-2">
              {CHECKLIST_ITEMS.map(item => (
                <label key={item.key} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!checklist[item.key]}
                    onChange={e => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="w-4 h-4 mt-0.5 accent-velox-amber"
                  />
                  <span className="text-xs text-white/80">{item.label}</span>
                </label>
              ))}
            </div>
            <Button
              size="sm"
              className="w-full mt-3 bg-velox-amber hover:bg-velox-amber/90 text-white font-bold text-xs"
              disabled={!allChecked || updateMutation.isPending}
              onClick={submitChecklist}
            >
              {allChecked ? "✓ Confirmar checklist" : "Marque todos os itens para confirmar"}
            </Button>
          </div>
        )}
        {checklistDone && (
          <div className="rounded-xl border border-green-500/20 bg-green-900/20 px-4 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400 font-medium">Checklist de saída concluído</span>
          </div>
        )}
        {/* Ocorrências em aberto desta viagem (F1/F3) */}
        {tripIncidents.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-900/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Ocorrências em aberto ({tripIncidents.length})
            </p>
            {tripIncidents.map(inc => (
              <div key={inc.id} className="rounded-lg bg-white/5 border border-white/10 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/90">{incidentTypeLabel(inc.type)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {inc.status === "in_progress" ? "Em tratativa" : "Aberta"}
                  </span>
                </div>
                <p className="text-xs text-white/60">{inc.description}</p>
                <div className="flex gap-1.5">
                  <input value={incidentNote[inc.id] || ""} onChange={e => setIncidentNote(prev => ({ ...prev, [inc.id]: e.target.value }))}
                    placeholder="Adicionar informação..." className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-2.5 text-xs" />
                  <Button size="sm" className="h-9 text-xs bg-velox-amber text-white" onClick={() => addDriverNote(inc)} disabled={!(incidentNote[inc.id] || "").trim()}>Enviar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {(trip.stops || []).map((stop, i) => {
          const action = stopActions[i] || {};
          return (
            <div key={i} className={`rounded-xl border p-4 ${stop.status === "completed" ? "bg-green-900/20 border-green-500/20 opacity-70" : stop.status === "arrived" ? "bg-amber-900/20 border-amber-500/30" : "bg-white/5 border-white/10"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${stop.status === "completed" ? "bg-green-500/20 text-green-400" : stop.status === "arrived" ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/40"}`}>
                  {stop.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : <span>{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${stop.type === "delivery" ? "bg-green-500/20 text-green-400" : stop.type === "collection" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {stop.type === "delivery" ? "Entrega" : stop.type === "collection" ? "Coleta" : "Partida"}
                    </span>
                    {stop.recipient_name && <span className="font-semibold text-sm text-white">{stop.recipient_name}</span>}
                  </div>
                  <p className={`text-xs mt-1 ${stop.address_changed ? "text-amber-300 font-semibold" : "text-white/40"}`}>{stop.address}</p>
                  {stop.address_changed && stop.status !== "completed" && (
                    <p className="text-[11px] text-amber-300 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Endereço de entrega ATUALIZADO</p>
                  )}
                  {stop.awaiting_cargo && stop.status !== "completed" && (
                    <p className="text-xs text-orange-300 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Aguardando liberação de carga — você pode voltar depois</p>
                  )}
                  {stop.delivery_result === "partial" && <p className="text-xs text-teal-300 mt-1">Entrega parcial: {stop.delivered_volumes} volume(s)</p>}
                  {stop.delivery_result === "failed" && <p className="text-xs text-orange-300 mt-1">Destinatário ausente</p>}
                  {stop.completed_at && <p className="text-xs text-green-400 mt-1">✓ {format(new Date(stop.completed_at), "dd/MM HH:mm")}</p>}

                  {/* Actions */}
                  {trip.status === "in_progress" && stop.status !== "completed" && (
                    <div className="mt-3 space-y-2">
                      {stop.status === "pending" && (
                        <Button className="w-full h-12 text-sm border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-semibold" onClick={() => handleArrived(i)}>
                          ▶ Confirmar Chegada
                        </Button>
                      )}
                      {stop.status === "arrived" && (
                        <>
                          {stop.type === "delivery" && (
                            <>
                              <div>
                                <p className="text-xs text-white/50 mb-1">NF Assinada (obrigatório)</p>
                                {action.nf_url
                                  ? <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> NF anexada</p>
                                  : <FileUploadButton label="Fotografar NF Assinada" accept="image/*,application/pdf" capture="environment" onUpload={(url) => setStopField(i, "nf_url", url)} className="w-full" />}
                              </div>
                              <div>
                                <p className="text-xs text-white/50 mb-1">Nome do recebedor</p>
                                <input
                                  value={action.receiver_name || ""}
                                  onChange={e => setStopField(i, "receiver_name", e.target.value)}
                                  placeholder="Quem recebeu a carga"
                                  className="w-full h-11 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-3 text-sm"
                                />
                              </div>
                              <div>
                                <p className="text-xs text-white/50 mb-1">Comprovante de entrega (assinatura) <span className="text-amber-400">obrigatório</span></p>
                                {action.signature_url ? (
                                  <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Assinatura capturada</p>
                                ) : (
                                  <SignaturePad
                                    saving={!!action.sig_saving}
                                    onSave={async (blob) => {
                                      setStopField(i, "sig_saving", true);
                                      try {
                                        const file = new File([blob], `assinatura-${Date.now()}.png`, { type: "image/png" });
                                        const { file_url } = await storage.uploadFile(file);
                                        setStopField(i, "signature_url", file_url);
                                        toast({ title: "Assinatura salva!" });
                                      } catch {
                                        toast({ title: "Erro ao salvar assinatura", variant: "destructive" });
                                      } finally {
                                        setStopField(i, "sig_saving", false);
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            </>
                          )}
                          {stop.type === "collection" && (
                            <div>
                              <p className="text-xs text-white/50 mb-1">Foto (opcional)</p>
                              <FileUploadButton label="Tirar Foto" accept="image/*" capture="environment" onUpload={(url) => setStopField(i, "photo_url", url)} className="w-full" />
                            </div>
                          )}
                          <Textarea placeholder="Observações (opcional)" rows={2} value={action.notes || ""} onChange={e => setStopField(i, "notes", e.target.value)} className="text-xs resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                          <Button className="w-full h-14 text-base bg-green-600 hover:bg-green-700 text-white font-bold"
                            disabled={stop.type === "delivery" && (!action.nf_url || !action.signature_url)}
                            onClick={() => handleComplete(i)}>
                            ✓ {stop.type === "delivery" ? "Confirmar Entrega" : "Confirmar Coleta"}
                          </Button>
                          {stop.type === "delivery" && (!action.nf_url || !action.signature_url) && (
                            <p className="text-xs text-amber-400 text-center">
                              {!action.nf_url ? "Anexe a NF" : "Capture a assinatura"} para confirmar a entrega
                            </p>
                          )}
                          {/* Exceções (S5 / S12 / S13) */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {stop.type === "delivery" && (
                              <>
                                <Button variant="outline" className="h-11 text-xs border-teal-500/40 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 gap-1"
                                  onClick={() => { setPartialModal({ index: i }); setPartialForm({ delivered_volumes: "", reason: "recusado" }); }}>
                                  <PackageX className="w-3.5 h-3.5" /> Entrega parcial
                                </Button>
                                <Button variant="outline" className="h-11 text-xs border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 gap-1"
                                  onClick={() => { setAbsentModal({ index: i }); setAbsentForm({ action: "retry", notes: "" }); }}>
                                  <UserX className="w-3.5 h-3.5" /> Destinatário ausente
                                </Button>
                              </>
                            )}
                            {stop.type === "collection" && !stop.awaiting_cargo && (
                              <Button variant="outline" className="h-11 text-xs col-span-2 border-orange-500/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 gap-1"
                                onClick={() => { setCargoModal({ index: i }); setCargoNotes(""); }}>
                                <Clock className="w-3.5 h-3.5" /> Carga não estava pronta
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {trip.status === "in_progress" && (
        <div className="fixed bottom-0 left-0 right-0 bg-velox-dark/95 border-t border-white/10 p-4">
          <div className="max-w-sm mx-auto">
            <Button variant="outline" className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 gap-2" onClick={() => setIncidentModal(true)}>
              <AlertTriangle className="w-4 h-4" /> Registrar Ocorrência
            </Button>
          </div>
        </div>
      )}

      {/* S12 — Entrega parcial */}
      <Dialog open={!!partialModal} onOpenChange={o => !o && setPartialModal(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PackageX className="w-4 h-4 text-teal-600" /> Entrega parcial</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Anexe a NF e a assinatura do que foi entregue (nos botões da parada), depois registre aqui.</p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Volumes entregues</label>
              <input type="number" min="0" value={partialForm.delivered_volumes}
                onChange={e => setPartialForm(p => ({ ...p, delivered_volumes: e.target.value }))}
                className="w-full h-11 rounded-lg border px-3 text-sm" placeholder="ex: 8" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motivo dos demais</label>
              <Select value={partialForm.reason} onValueChange={v => setPartialForm(p => ({ ...p, reason: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recusado">Recusado pelo cliente</SelectItem>
                  <SelectItem value="avaria">Avaria</SelectItem>
                  <SelectItem value="volume_errado">Volume errado</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold" onClick={() => handlePartial(partialModal.index)}>
              Registrar entrega parcial
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* S13 — Destinatário ausente */}
      <Dialog open={!!absentModal} onOpenChange={o => !o && setAbsentModal(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserX className="w-4 h-4 text-orange-600" /> Destinatário ausente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">O que fazer com a carga?</label>
              <Select value={absentForm.action} onValueChange={v => setAbsentForm(p => ({ ...p, action: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retry">Tentar novamente amanhã</SelectItem>
                  <SelectItem value="wait">Aguardar instrução do gestor</SelectItem>
                  <SelectItem value="return">Devolver ao remetente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Observações (opcional)" rows={2} value={absentForm.notes}
              onChange={e => setAbsentForm(p => ({ ...p, notes: e.target.value }))} className="resize-none" />
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold" onClick={() => handleAbsent(absentModal.index)}>
              Registrar e seguir rota
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* S5 — Carga não estava pronta */}
      <Dialog open={!!cargoModal} onOpenChange={o => !o && setCargoModal(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-orange-600" /> Carga não estava pronta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">A hora da sua chegada é registrada automaticamente. O gestor será avisado e você pode seguir para a próxima parada.</p>
            <Textarea placeholder="O que aconteceu? (ex: ainda em produção, separação incompleta)" rows={3} value={cargoNotes}
              onChange={e => setCargoNotes(e.target.value)} className="resize-none" />
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold" onClick={() => handleCargoNotReady(cargoModal.index)}>
              Registrar e continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident modal */}
      <Dialog open={incidentModal} onOpenChange={setIncidentModal}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader><DialogTitle>Registrar Ocorrência</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo de ocorrência <span className="text-red-500">*</span>
              </label>
              <Select value={incident.type} onValueChange={v => setIncident(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="avaria">Avaria na carga</SelectItem>
                  <SelectItem value="atraso">Atraso</SelectItem>
                  <SelectItem value="tentativa_entrega">Tentativa sem sucesso</SelectItem>
                  <SelectItem value="carga_recusada">Carga recusada pelo destinatário</SelectItem>
                  <SelectItem value="roubo">Roubo / furto</SelectItem>
                  <SelectItem value="acidente">Acidente</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Descrição <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Descreva o que aconteceu..."
                rows={3}
                value={incident.description}
                onChange={e => setIncident(p => ({ ...p, description: e.target.value }))}
                className="resize-none"
              />
            </div>
            <FileUploadButton
              label="Foto (opcional)"
              accept="image/*"
              capture="environment"
              onUpload={(url) => setIncident(p => ({ ...p, photo_url: url }))}
            />
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleIncident}>
              Registrar Ocorrência
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, MapPin, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import FileUploadButton from "@/components/shared/FileUploadButton";
import { useToast } from "@/components/ui/use-toast";

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
    const stops = [...(trip.stops || [])];
    stops[index] = { ...stops[index], status: "completed", completed_at: new Date().toISOString(), nf_signed_url: action.nf_url || undefined, notes: action.notes || undefined, photo_url: action.photo_url || undefined };
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
            // Save NF to item if available
            const updatedRecipients = action.nf_url ? recipients.map(r => {
              if (r.name !== stop.recipient_name) return r;
              return { ...r, nf_signed_url: action.nf_url };
            }) : recipients;
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
                  <p className="text-xs text-white/40 mt-1">{stop.address}</p>
                  {stop.completed_at && <p className="text-xs text-green-400 mt-1">✓ {format(new Date(stop.completed_at), "dd/MM HH:mm")}</p>}

                  {/* Actions */}
                  {trip.status === "in_progress" && stop.status !== "completed" && (
                    <div className="mt-3 space-y-2">
                      {stop.status === "pending" && (
                        <Button size="sm" variant="outline" className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs" onClick={() => handleArrived(i)}>
                          ▶ Confirmar Chegada
                        </Button>
                      )}
                      {stop.status === "arrived" && (
                        <>
                          {stop.type === "delivery" && (
                            <div>
                              <p className="text-xs text-white/50 mb-1">NF Assinada (obrigatório)</p>
                              <FileUploadButton label="Fotografar NF Assinada" accept="image/*,application/pdf" capture="environment" onUpload={(url) => setStopField(i, "nf_url", url)} className="w-full" />
                            </div>
                          )}
                          {stop.type === "collection" && (
                            <div>
                              <p className="text-xs text-white/50 mb-1">Foto (opcional)</p>
                              <FileUploadButton label="Tirar Foto" accept="image/*" capture="environment" onUpload={(url) => setStopField(i, "photo_url", url)} className="w-full" />
                            </div>
                          )}
                          <Textarea placeholder="Observações (opcional)" rows={2} value={action.notes || ""} onChange={e => setStopField(i, "notes", e.target.value)} className="text-xs resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
                            disabled={stop.type === "delivery" && !action.nf_url}
                            onClick={() => handleComplete(i)}>
                            ✓ {stop.type === "delivery" ? "Confirmar Entrega" : "Confirmar Coleta"}
                          </Button>
                          {stop.type === "delivery" && !action.nf_url && <p className="text-xs text-amber-400 text-center">Faça o upload da NF para continuar</p>}
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
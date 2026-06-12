import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge, { orderStatusConfig } from "@/components/admin/StatusBadge";
import {
  ArrowLeft, Package, User, MapPin, Truck, DollarSign,
  ChevronDown, ChevronUp, CheckCircle2, Circle, AlertCircle, FileText, Paperclip,
  FileDown, AlertTriangle, Navigation
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateDeliveryReceipt } from "@/utils/generateDeliveryReceipt";
import FileUploadButton from "@/components/shared/FileUploadButton";
import { calculateFreight, calculateFreightFull, getDeliveryDaysByState } from "@/utils/freightCalculator";
import { FreightBreakdown } from "@/components/shared/FreightBreakdown";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_FLOW = ["new", "confirmed", "collecting", "in_transit", "delivered"];
const STATUS_LABELS = {
  new: "Novo", confirmed: "Confirmado", collecting: "Em Coleta",
  in_transit: "Em Trânsito", delivered: "Entregue", cancelled: "Cancelado"
};
const NEXT_ACTION = {
  new: { label: "Confirmar Pedido", next: "confirmed" },
  confirmed: { label: "Marcar Em Coleta", next: "collecting" },
  collecting: { label: "Marcar Em Trânsito", next: "in_transit" },
  in_transit: { label: "Confirmar Entrega", next: "delivered" },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openRecipient, setOpenRecipient] = useState(null);
  const [freightValue, setFreightValue] = useState(null);
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("after_delivery");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cte, setCte] = useState("");
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const { settings } = useCompanySettings();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => base44.entities.Order.filter({ id }),
    select: (data) => data[0],
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => base44.entities.Driver.list(),
  });
  const { data: trucks = [] } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => base44.entities.Truck.list(),
  });
  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents", id],
    queryFn: () => base44.entities.Incident.filter({ order_id: id }),
    enabled: !!id,
  });
  const { data: trip } = useQuery({
    queryKey: ["trip-for-order", order?.trip_id],
    queryFn: () => base44.entities.Trip.filter({ id: order.trip_id }),
    select: d => d[0],
    enabled: !!order?.trip_id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Pedido atualizado!" });
    },
  });

  React.useEffect(() => {
    if (order) {
      setFreightValue(order.freight_value != null ? order.freight_value : "");
      setNotes(order.general_notes || "");
      setCte(order.cte_number || "");
      setPaymentTerms(order.payment_terms || "after_delivery");
      setPaymentMethod(order.payment_method || "pix");
    }
  }, [order]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full" /></div>;
  if (!order) return <div className="text-center py-12 text-muted-foreground">Pedido não encontrado.</div>;

  const currentStep = STATUS_FLOW.indexOf(order.status);
  const nextAction = NEXT_ACTION[order.status];

  const handleStatusChange = async (newStatus) => {
    const history = order.status_history || [];
    await updateMutation.mutateAsync({
      status: newStatus,
      status_history: [...history, {
        status: newStatus,
        timestamp: new Date().toISOString(),
        user: "Admin",
        note: `Status alterado para ${STATUS_LABELS[newStatus]}`,
      }],
    });
    // Calcular distância real ao confirmar pedido (se API key configurada)
    if (newStatus === "confirmed" && settings?.google_maps_api_key) {
      try {
        const result = await base44.functions.invoke("calculateDistance", {
          origin_cep: order.origin?.cep,
          dest_ceps: (order.recipients || []).map(r => r.cep).filter(Boolean),
        });
        if (result?.data?.distance_km) {
          const allItems = (order.recipients || []).flatMap(r => r.items || []);
          const nfCount = allItems.filter(i => i.nf_number).length || 1;
          const firstDestState = (order.recipients || [])[0]?.state || null;
          const newBreakdown = calculateFreightFull({
            items: allItems,
            distanceKm: result.data.distance_km,
            nfCount,
            pricing: settings?.pricing,
            settings,
            originState: order.origin?.state || null,
            destState: firstDestState,
          });
          if (newBreakdown) {
            setDistanceInfo({ km: result.data.distance_km, newTotal: newBreakdown.total, breakdown: newBreakdown });
            setShowDistanceModal(true);
          }
        }
      } catch (e) {
        // Silently fail — não bloquear a confirmação
      }
    }

    // Criar receita automaticamente ao confirmar pedido
    if (newStatus === "confirmed") {
      const freightVal = Number(freightValue) || Number(order.freight_value) || 0;
      if (freightVal >= 0) {
        try {
          await base44.entities.Revenue.create({
            description: `Frete ${order.protocol} — ${order.client_name}`,
            amount: freightVal,
            due_date: order.collection_date || new Date().toISOString().split("T")[0],
            payment_method: paymentMethod || order.payment_method || "pix",
            status: "receivable",
            order_id: order.id,
          });
          queryClient.invalidateQueries({ queryKey: ["revenues"] });
          toast({
            title: "Receita criada",
            description: freightVal > 0
              ? `R$ ${freightVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} adicionado em Financeiro → Receitas`
              : "Receita criada (valor R$ 0 — atualize o frete)",
            duration: 4000,
          });
        } catch (e) {
          console.error("Falha ao criar receita automática:", e);
        }
      }
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      freight_value: Number(freightValue) || undefined,
      payment_terms: paymentTerms,
      payment_method: paymentMethod,
      general_notes: notes,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/coletas")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-extrabold text-foreground font-mono">{order.protocol}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Criado em {order.created_date ? format(new Date(order.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {order.status === "delivered" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const blob = generateDeliveryReceipt(order, trip, settings);
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Comprovante-${order.protocol}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileDown className="w-4 h-4" />
              Comprovante PDF
            </Button>
          )}
          {nextAction && order.status !== "cancelled" && (
            <Button
              className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold"
              onClick={() => handleStatusChange(nextAction.next)}
              disabled={updateMutation.isPending}
            >
              {nextAction.label}
            </Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {STATUS_FLOW.map((s, i) => {
              const done = i <= currentStep && order.status !== "cancelled";
              const active = i === currentStep && order.status !== "cancelled";
              return (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1 min-w-[70px]">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done ? "bg-velox-amber border-velox-amber text-velox-dark" : "bg-background border-border text-muted-foreground"
                    } ${active ? "ring-4 ring-velox-amber/20" : ""}`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] font-medium text-center leading-tight ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {STATUS_LABELS[s]}
                    </span>
                  </div>
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < currentStep && order.status !== "cancelled" ? "bg-velox-amber" : "bg-border"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {order.status === "cancelled" && (
            <div className="mt-3 text-center">
              <span className="text-xs font-semibold px-3 py-1 bg-red-100 text-red-700 rounded-full">Cancelado</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Client */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-velox-amber" /> Solicitante
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Nome / Razão Social</p><p className="font-medium">{order.client_name || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">CPF / CNPJ</p><p className="font-mono">{order.client_cpf_cnpj || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Telefone</p><p>{order.client_phone || "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">E-mail</p><p>{order.client_email || "—"}</p></div>
              {order.requester_name && (
                <div className="col-span-2 border-t border-border/40 pt-2 mt-1">
                  <p className="text-muted-foreground text-xs">Responsável pelo agendamento</p>
                  <p className="font-medium">{order.requester_name}{order.requester_role && ` · ${order.requester_role}`}</p>
                </div>
              )}
              {order.freight_payer && (
                <div><p className="text-muted-foreground text-xs">Modalidade</p>
                  <p className="font-medium">{order.freight_payer === "cif" ? "CIF (remetente paga)" : "FOB (destinatário paga)"}</p>
                </div>
              )}
              {order.transport_modal && (
                <div><p className="text-muted-foreground text-xs">Modal</p>
                  <p>{order.transport_modal === "road" ? "Rodoviário" : order.transport_modal === "urgent_road" ? "Rodoaéreo" : "Aéreo"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Origin */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-velox-amber" /> Origem da Coleta
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Endereço</p>
                <p className="font-medium">
                  {[order.origin?.street, order.origin?.number, order.origin?.complement,
                    order.origin?.neighborhood, order.origin?.city, order.origin?.state]
                    .filter(Boolean).join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">CT-e</p>
                <div className="flex gap-2 mt-0.5">
                  <Input placeholder="ex: 00123456" value={cte} onChange={e => setCte(e.target.value)} className="h-7 text-xs font-mono" />
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => updateMutation.mutate({ cte_number: cte })}>Salvar</Button>
                </div>
              </div>
              <div><p className="text-muted-foreground text-xs">Data Coleta</p><p>{order.collection_date ? format(new Date(order.collection_date), "dd/MM/yyyy") : "—"}</p></div>
              <div><p className="text-muted-foreground text-xs">Período</p>
                <p>{order.collection_time === "morning" ? "Manhã" : order.collection_time === "afternoon" ? "Tarde" : "A combinar"}</p>
              </div>
              {order.collection_notes && <div className="col-span-2"><p className="text-muted-foreground text-xs">Observações</p><p>{order.collection_notes}</p></div>}
            </CardContent>
          </Card>

          {/* Recipients */}
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-velox-amber" />
              Destinatários e Cargas
              <span className="text-muted-foreground font-normal">({order.recipients?.length || 0} dest.)</span>
            </h3>
            <div className="space-y-3">
              {(order.recipients || []).map((r, ri) => (
                <Card key={ri} className="overflow-hidden">
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                    onClick={() => setOpenRecipient(openRecipient === ri ? null : ri)}
                  >
                    <div>
                      <p className="font-semibold text-sm">{r.name || `Destinatário ${ri + 1}`}</p>
                      <p className="text-xs text-muted-foreground">{[r.city, r.state].filter(Boolean).join(" - ")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.delivery_status === "delivered" ? "bg-green-100 text-green-700" :
                        r.delivery_status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {r.delivery_status === "delivered" ? "Entregue" : r.delivery_status === "failed" ? "Falhou" : "Pendente"}
                      </span>
                      {openRecipient === ri ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>
                  {openRecipient === ri && (
                    <div className="border-t border-border p-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        {[r.street, r.number, r.complement, r.neighborhood, r.city, r.state].filter(Boolean).join(", ")}
                      </p>
                      {r.items && r.items.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 text-muted-foreground font-medium">Descrição</th>
                                <th className="text-right py-2 text-muted-foreground font-medium">Volumes</th>
                                <th className="text-right py-2 text-muted-foreground font-medium">Peso (kg)</th>
                                <th className="text-right py-2 text-muted-foreground font-medium">Valor</th>
                                <th className="text-right py-2 text-muted-foreground font-medium">NF Assinada</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.items.map((item, ii) => (
                                <tr key={ii} className="border-b border-border/40">
                                  <td className="py-2">{item.description || "—"}</td>
                                  <td className="py-2 text-right">{item.volumes || 0}</td>
                                  <td className="py-2 text-right">{item.weight_kg || 0}</td>
                                  <td className="py-2 text-right">{item.declared_value ? `R$ ${Number(item.declared_value).toFixed(2)}` : "—"}</td>
                                  <td className="py-2 text-right">
                                    {item.nf_signed_url
                                      ? <a href={item.nf_signed_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline"><FileText className="w-3 h-3" /> Ver</a>
                                      : <FileUploadButton label="Anexar" accept="image/*,application/pdf" onUpload={async (url) => {
                                          if (!url) return;
                                          const updatedRecipients = order.recipients.map((rec, rIdx) => {
                                            if (rIdx !== ri) return rec;
                                            return { ...rec, items: rec.items.map((it, iIdx) => iIdx !== ii ? it : { ...it, nf_signed_url: url }) };
                                          });
                                          updateMutation.mutate({ recipients: updatedRecipients });
                                        }} />
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Nenhum item cadastrado.</p>}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Incidents */}
          {incidents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Ocorrências ({incidents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {incidents.map(inc => (
                  <div key={inc.id} className={`p-3 rounded-xl border ${
                    inc.status === "resolved"
                      ? "bg-green-50 border-green-200"
                      : inc.type === "roubo" || inc.type === "acidente"
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold uppercase text-amber-700">
                            {inc.type.replace(/_/g, " ")}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            inc.status === "resolved"
                              ? "bg-green-100 text-green-700"
                              : inc.status === "in_progress"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {inc.status === "resolved" ? "Resolvida"
                              : inc.status === "in_progress" ? "Em tratativa"
                              : "Aberta"}
                          </span>
                        </div>
                        <p className="text-sm">{inc.description}</p>
                        {inc.reported_by_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Por: {inc.reported_by_name} · {inc.created_date ? new Date(inc.created_date).toLocaleString("pt-BR") : ""}
                          </p>
                        )}
                        {inc.photo_urls?.length > 0 && (
                          <a href={inc.photo_urls[0]} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                            <FileText className="w-3 h-3" /> Ver foto
                          </a>
                        )}
                        {inc.resolution_notes && (
                          <p className="text-xs text-green-700 mt-1 italic">Resolução: {inc.resolution_notes}</p>
                        )}
                      </div>
                      {inc.status !== "resolved" && (
                        <Button size="sm" variant="outline" className="text-xs flex-shrink-0"
                          onClick={() => {
                            const notes = prompt("Descrição da resolução:");
                            if (notes) {
                              base44.entities.Incident.update(inc.id, {
                                status: "resolved",
                                resolution_notes: notes,
                                resolved_at: new Date().toISOString(),
                              }).then(() => queryClient.invalidateQueries({ queryKey: ["incidents", id] }));
                            }
                          }}>
                          Resolver
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* History */}
          {order.status_history && order.status_history.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Histórico de Eventos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.status_history.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-velox-amber mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-foreground">{h.note}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.user} • {h.timestamp ? format(new Date(h.timestamp), "dd/MM/yyyy 'às' HH:mm") : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-velox-amber" /> Atribuição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Motorista</p>
                <Select
                  value={order.driver_id || "none"}
                  onValueChange={(v) => updateMutation.mutate({ driver_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar motorista" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {drivers.filter(d => d.status === "active").map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Caminhão</p>
                <Select
                  value={order.truck_id || "none"}
                  onValueChange={(v) => updateMutation.mutate({ truck_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar caminhão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {trucks.filter(t => t.status === "available" || t.status === "on_route").map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Freight value */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-velox-amber" /> Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Valor do Frete (R$)</p>
                <Input
                  type="number"
                  step="0.01"
                  value={freightValue}
                  onChange={(e) => setFreightValue(e.target.value)}
                  placeholder="0,00"
                  className="h-9 text-sm font-mono"
                />
                {(() => {
                  const allItems = (order.recipients || []).flatMap(r => r.items || []);
                  const nfCount = allItems.filter(i => i.nf_number).length || 1;
                  const firstDestState = (order.recipients || [])[0]?.state || null;
                  const breakdown = calculateFreightFull({
                    items: allItems, distanceKm: null, nfCount,
                    pricing: settings?.pricing,
                    settings,
                    originState: order.origin?.state || null,
                    destState: firstDestState,
                  });
                  if (!breakdown) return null;
                  return (
                    <div className="mt-2 space-y-2">
                      <div className="p-2 bg-muted/40 rounded text-xs">
                        <p className="text-muted-foreground">Estimativa: <span className="font-mono font-semibold text-foreground">R$ {breakdown.total.toFixed(2)}</span></p>
                        <button className="text-velox-amber hover:underline font-medium mt-0.5" onClick={() => setFreightValue(breakdown.total.toFixed(2))}>Usar este valor</button>
                      </div>
                      <FreightBreakdown breakdown={breakdown} compact />
                    </div>
                  );
                })()}
                {/* Prazo estimado */}
                {(() => {
                  const destStates = [...new Set((order.recipients || []).map(r => r.state).filter(Boolean))];
                  const rows = destStates.map(s => ({ state: s, days: getDeliveryDaysByState(s, settings) })).filter(r => r.days);
                  if (rows.length === 0) return null;
                  return (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Prazo estimado</p>
                      {rows.map(r => (
                        <p key={r.state} className="text-xs text-blue-600">{r.state}: {r.days} dia{r.days !== 1 ? "s" : ""} útil{r.days !== 1 ? "eis" : ""} após coleta</p>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-1">Forma de pagamento</p>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-1">Condições de pagamento</p>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="after_delivery">Após entrega</SelectItem>
                    <SelectItem value="7_days">7 dias após entrega</SelectItem>
                    <SelectItem value="15_days">15 dias após entrega</SelectItem>
                    <SelectItem value="30_days">30 dias após entrega</SelectItem>
                    <SelectItem value="monthly">Faturamento mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Peso total</span>
                <span className="font-mono font-medium">{order.total_weight_kg || 0} kg</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Volumes</span>
                <span className="font-mono font-medium">{order.total_volumes || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pagamento</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  order.payment_status === "paid" ? "bg-green-100 text-green-700" :
                  order.payment_status === "overdue" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {order.payment_status === "paid" ? "Pago" : order.payment_status === "overdue" ? "Atrasado" : "Pendente"}
                </span>
              </div>
              {order.payment_status !== "paid" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => updateMutation.mutate({ payment_status: "paid" })}
                >
                  Marcar como Pago
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Observações Internas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas..."
                rows={3}
                className="text-sm resize-none"
              />
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="w-full bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold text-xs">
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </CardContent>
          </Card>

          {/* Cancel */}
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <div>
              {!cancelConfirm ? (
                <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelConfirm(true)}>
                  <AlertCircle className="w-4 h-4 mr-1" /> Cancelar Pedido
                </Button>
              ) : (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-sm font-medium text-red-700">Confirmar cancelamento?</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setCancelConfirm(false)}>Não</Button>
                      <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => { handleStatusChange("cancelled"); setCancelConfirm(false); }}>Cancelar</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Distance Modal */}
      <Dialog open={showDistanceModal} onOpenChange={setShowDistanceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-4 h-4 text-velox-amber" />
              Distância calculada
            </DialogTitle>
          </DialogHeader>
          {distanceInfo && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800">
                  Distância total calculada: {distanceInfo.km.toLocaleString("pt-BR")} km
                </p>
                <p className="text-xs text-blue-600 mt-1">Valor com distância real vs estimativa sem km</p>
              </div>
              <FreightBreakdown breakdown={distanceInfo.breakdown} />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDistanceModal(false)} className="flex-1">
                  Usar valor anterior
                </Button>
                <Button
                  onClick={() => {
                    setFreightValue(distanceInfo.newTotal.toFixed(2));
                    setShowDistanceModal(false);
                  }}
                  className="flex-1 bg-velox-amber text-velox-dark font-bold hover:bg-velox-amber/90"
                >
                  Usar R$ {distanceInfo.newTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
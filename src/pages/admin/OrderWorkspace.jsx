import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PriorityBadge from "@/components/shared/PriorityBadge";
import { normalizePriority, priorityMeta } from "@/utils/priority";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/admin/StatusBadge";
import FileUploadButton from "@/components/shared/FileUploadButton";
import { AddressFields } from "@/components/shared/AddressFields";
import { FreightBreakdown } from "@/components/shared/FreightBreakdown";
import CollapsibleSection from "@/components/shared/CollapsibleSection";
import { generateDeliveryReceipt } from "@/utils/generateDeliveryReceipt";
import { generateShipmentDoc } from "@/utils/generateShipmentDoc";
import { generateVolumeLabels } from "@/utils/generateVolumeLabels";
import { calculateFreightFull, getDeliveryDaysByState } from "@/utils/freightCalculator";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { todayLocalISO, formatDateBR, toLocalISO, formatDateTimeBR } from "@/utils/dateUtils";
import { ensureRevenueForOrder, cancelRevenuesForOrder } from "@/utils/revenueHelper";
import { suggestTrucks } from "@/utils/replanner";
import { slaStatus, slaDeadline } from "@/utils/sla";
import { addDays } from "date-fns";
import {
  ArrowLeft, Package, User, MapPin, Truck, DollarSign, CheckCircle2, Circle,
  FileText, FileDown, AlertTriangle, Copy, MoreHorizontal, XCircle, ArrowRight
} from "lucide-react";

const STATUS_FLOW = ["new", "confirmed", "collecting", "in_transit", "delivered"];
const STATUS_LABELS = {
  awaiting_approval: "Aguardando aprovação",
  new: "Novo", confirmed: "Confirmado", collecting: "Em Coleta",
  in_transit: "Em Trânsito", delivered: "Entregue", cancelled: "Cancelado",
};
const NEXT_ACTION = {
  awaiting_approval: { label: "Aprovar Pedido", next: "new" },
  new: { label: "Confirmar Pedido", next: "confirmed" },
  confirmed: { label: "Marcar Em Coleta", next: "collecting" },
  collecting: { label: "Marcar Em Trânsito", next: "in_transit" },
  in_transit: { label: "Confirmar Entrega", next: "delivered" },
};

/**
 * WORKSPACE DO PEDIDO — página única com seções colapsáveis (padrão TMS).
 * Ação primária por etapa no topo; contexto em seções empilhadas.
 * Mantém 100% da lógica do detalhe antigo (receita, estorno, motivo, NF, incidentes).
 */
export default function OrderWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useCompanySettings();

  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [unproductiveFee, setUnproductiveFee] = useState("");
  const [resolvingIncident, setResolvingIncident] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [freightValue, setFreightValue] = useState("");
  const [notes, setNotes] = useState("");
  const [cte, setCte] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentTerms, setPaymentTerms] = useState("after_delivery");
  const [cubageFactor, setCubageFactor] = useState("");
  const [editAddr, setEditAddr] = useState(null); // { ri }
  const [addrForm, setAddrForm] = useState({});

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => base44.entities.Order.filter({ id }),
    select: d => d[0],
  });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: allOrders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 500) });
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
  const { data: orderClient } = useQuery({
    queryKey: ["client", order?.client_id],
    queryFn: () => base44.entities.Client.filter({ id: order.client_id }),
    select: d => d[0],
    enabled: !!order?.client_id,
  });
  const { data: orderRevenues = [] } = useQuery({
    queryKey: ["revenues-for-order", id],
    queryFn: () => base44.entities.Revenue.filter({ order_id: id }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });

  React.useEffect(() => {
    if (order) {
      setFreightValue(order.freight_value != null ? order.freight_value : "");
      setNotes(order.general_notes || "");
      setCte(order.cte_number || "");
      setPaymentMethod(order.payment_method || "pix");
      setPaymentTerms(order.payment_terms || "after_delivery");
      setCubageFactor(order.cubage_factor != null ? order.cubage_factor : "");
    }
  }, [order]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full" /></div>;
  if (!order) return <div className="text-center py-12 text-muted-foreground">Pedido não encontrado.</div>;

  // Inclui a etapa "Aguardando aprovação" no fluxo visual apenas para pedidos
  // que passaram por aprovação (não polui o stepper quando o fluxo está desligado).
  const wentThroughApproval = order.status === "awaiting_approval"
    || (order.status_history || []).some(h => h.status === "awaiting_approval");
  const flow = wentThroughApproval ? ["awaiting_approval", ...STATUS_FLOW] : STATUS_FLOW;
  const currentStep = flow.indexOf(order.status);
  const nextAction = NEXT_ACTION[order.status];
  const isCancelled = order.status === "cancelled";

  // Tabela negociada do cliente (prioridade máxima)
  const clientPricing = (() => {
    const cp = orderClient?.custom_pricing;
    if (cp && Object.keys(cp).some(k => cp[k] != null && cp[k] !== "")) {
      return { ...(settings?.pricing || {}), ...cp };
    }
    return null;
  })();

  const allItems = (order.recipients || []).flatMap(r => r.items || []);
  const nfCount = allItems.filter(i => i.nf_number).length || 1;
  const firstDestState = (order.recipients || [])[0]?.state || null;
  const breakdown = calculateFreightFull({
    items: allItems, distanceKm: null, nfCount,
    pricing: settings?.pricing, clientPricing, settings,
    originState: order.origin?.state || null, destState: firstDestState,
    freightType: order.freight_type, refDate: order.collection_date,
    cubageFactor: order.cubage_factor, extraCharges: order.extra_charges || [],
  });

  // ── Avanço de status (mesma lógica de negócio) ───────────────
  const handleStatusChange = async (newStatus, note) => {
    // Confirmar: caminho ATÔMICO (atualiza status + cria receita numa transação)
    if (newStatus === "confirmed") {
      const fv = Number(freightValue) || Number(order.freight_value) || 0;
      try {
        const { error } = await supabase.rpc("confirm_order", {
          p_order_id: order.id, p_amount: fv,
          p_due_date: order.collection_date || todayLocalISO(),
          p_payment_method: paymentMethod || order.payment_method || "pix", p_user: "Admin",
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["order", id] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["revenues"] });
        queryClient.invalidateQueries({ queryKey: ["revenues-for-order", id] });
        toast({ title: "Pedido confirmado" });
        if (fv <= 0) toast({ title: "Receita não criada", description: "Defina o valor do frete na aba Financeiro." });
        return;
      } catch { /* fallback cliente abaixo */ }
    }

    await updateMutation.mutateAsync({
      status: newStatus,
      status_history: [...(order.status_history || []), {
        status: newStatus,
        timestamp: new Date().toISOString(),
        user: "Admin",
        note: note || `Status alterado para ${STATUS_LABELS[newStatus]}`,
      }],
    });

    if (newStatus === "cancelled") {
      try {
        const n = await cancelRevenuesForOrder(order.id);
        queryClient.invalidateQueries({ queryKey: ["revenues"] });
        queryClient.invalidateQueries({ queryKey: ["revenues-for-order", id] });
        if (n > 0) toast({ title: "Receita estornada", description: `${n} receita(s) pendente(s) cancelada(s).` });
      } catch (e) { console.error(e); }
    }

    if (newStatus === "confirmed") {
      const fv = Number(freightValue) || Number(order.freight_value) || 0;
      try {
        const { created } = await ensureRevenueForOrder(order, {
          amount: fv,
          dueDate: order.collection_date || todayLocalISO(),
          paymentMethod: paymentMethod || order.payment_method || "pix",
        });
        if (created) {
          queryClient.invalidateQueries({ queryKey: ["revenues"] });
          queryClient.invalidateQueries({ queryKey: ["revenues-for-order", id] });
          toast({ title: "Receita criada", description: `R$ ${fv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em Financeiro → Receitas` });
        } else if (fv <= 0) {
          toast({ title: "Receita não criada", description: "Defina o valor do frete na aba Financeiro." });
        }
      } catch (e) { console.error(e); }
    }
    toast({ title: `Pedido ${STATUS_LABELS[newStatus]?.toLowerCase()}` });
  };

  const tripLive = trip && ["planned", "in_progress"].includes(trip.status);

  // S10 — cancelamento com viagem em andamento: remove paradas do roteiro,
  // recalcula a receita da viagem, registra taxa improdutiva e avisa o motorista.
  const confirmCancel = async () => {
    const reason = cancelReason.trim();
    const fee = Number(unproductiveFee) || 0;

    // Caminho ATÔMICO: cancela, estorna receita, remove a parada e lança a taxa numa transação
    try {
      const { error } = await supabase.rpc("cancel_order", {
        p_order_id: order.id, p_reason: `Cancelado — motivo: ${reason}${fee > 0 ? ` · taxa improdutiva R$ ${fee.toFixed(2)}` : ""}`,
        p_fee: fee, p_user: "Admin",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      queryClient.invalidateQueries({ queryKey: ["revenues-for-order", id] });
      queryClient.invalidateQueries({ queryKey: ["trip-for-order", order.trip_id] });
      toast({ title: "Pedido cancelado" });
      setCancelOpen(false); setCancelReason(""); setUnproductiveFee("");
      return;
    } catch { /* fallback cliente abaixo */ }

    // 1) Remover este pedido do roteiro da viagem (marca paradas como puladas) + avisa motorista
    if (tripLive) {
      try {
        const stops = (trip.stops || []).map(s =>
          s.order_id === order.id ? { ...s, status: "skipped", skip_reason: "Pedido cancelado", skipped_at: new Date().toISOString() } : s
        );
        const newRevenue = Math.max(0, (trip.total_revenue || 0) - (order.freight_value || 0));
        await base44.entities.Trip.update(trip.id, {
          stops,
          total_revenue: newRevenue,
          order_ids: (trip.order_ids || []).filter(oid => oid !== order.id),
          events: [...(trip.events || []), {
            type: "order_cancelled",
            description: `Pedido ${order.protocol} (${order.client_name}) cancelado — pule esta parada e continue a rota.`,
            timestamp: new Date().toISOString(), user: "Admin",
          }],
        });
        queryClient.invalidateQueries({ queryKey: ["trip-for-order", order.trip_id] });
        await base44.entities.Alert.create({
          type: "order_cancelled_in_trip", level: "warning",
          message: `${order.protocol} cancelado durante a viagem ${trip.truck_plate || ""} — motorista avisado`,
          reference_id: order.id, reference_type: "order", read: false, resolved: false,
        }).catch(() => {});
      } catch (e) { console.error(e); }
    }

    // 2) Taxa de deslocamento improdutivo (vira receita a cobrar)
    if (fee > 0) {
      await updateMutation.mutateAsync({ unproductive_fee: fee });
      try {
        await base44.entities.Revenue.create({
          order_id: order.id, client_id: order.client_id || undefined,
          description: `Taxa de deslocamento improdutivo — ${order.protocol}`,
          amount: fee, due_date: todayLocalISO(), status: "receivable",
        });
        queryClient.invalidateQueries({ queryKey: ["revenues"] });
      } catch (e) { console.error(e); }
    }

    // 3) Cancela o pedido (estorna a receita do frete)
    await handleStatusChange("cancelled", `Cancelado — motivo: ${reason}${fee > 0 ? ` · taxa improdutiva R$ ${fee.toFixed(2)}` : ""}`);
    setCancelOpen(false);
    setCancelReason("");
    setUnproductiveFee("");
  };

  // S4 — endereço de entrega alterado depois da viagem criada.
  const openEditAddr = (ri) => {
    const r = order.recipients[ri] || {};
    setAddrForm({ cep: r.cep || "", street: r.street || "", number: r.number || "", complement: r.complement || "", neighborhood: r.neighborhood || "", city: r.city || "", state: r.state || "" });
    setEditAddr({ ri });
  };
  const saveAddress = async () => {
    const ri = editAddr.ri;
    const recName = order.recipients[ri]?.name;
    const recipients = order.recipients.map((r, i) => i !== ri ? r : { ...r, ...addrForm });
    await updateMutation.mutateAsync({
      recipients,
      status_history: [...(order.status_history || []), { status: order.status, timestamp: new Date().toISOString(), user: "Admin", note: `Endereço de entrega de ${recName} alterado` }],
    });
    if (order.trip_id && trip && ["planned", "in_progress"].includes(trip.status)) {
      const newAddr = [addrForm.street, addrForm.number, addrForm.city, addrForm.state].filter(Boolean).join(", ");
      const stops = (trip.stops || []).map(s =>
        (s.type === "delivery" && s.order_id === order.id && s.recipient_name === recName)
          ? { ...s, address: newAddr, cep: addrForm.cep, address_changed: true, address_changed_at: new Date().toISOString() } : s
      );
      await base44.entities.Trip.update(trip.id, {
        stops,
        events: [...(trip.events || []), { type: "address_changed", description: `Endereço de entrega de ${recName} alterado para ${newAddr}`, timestamp: new Date().toISOString(), user: "Admin" }],
      });
      queryClient.invalidateQueries({ queryKey: ["trip-for-order", order.trip_id] });
      await base44.entities.Alert.create({ type: "address_changed", level: "warning", message: `Endereço de entrega alterado — ${order.protocol} (${recName})`, reference_id: order.id, reference_type: "order", read: false, resolved: false }).catch(() => {});
      toast({ title: "Endereço atualizado", description: "A rota do motorista foi atualizada." });
    } else {
      toast({ title: "Endereço atualizado" });
    }
    setEditAddr(null);
  };

  // Cobranças adicionais do pedido (espera, devolução, emergência, avulsa).
  const addCharge = (charge) => {
    const list = [...(order.extra_charges || []), charge];
    updateMutation.mutate({ extra_charges: list });
    toast({ title: "Cobrança adicionada", description: `${charge.label}: R$ ${Number(charge.amount).toFixed(2)}` });
  };
  const removeCharge = (idx) => {
    const list = (order.extra_charges || []).filter((_, i) => i !== idx);
    updateMutation.mutate({ extra_charges: list });
  };
  const pricingCfg = settings?.pricing || {};

  const saveFinancial = () => {
    updateMutation.mutate({
      freight_value: Number(freightValue) || undefined,
      payment_method: paymentMethod,
      payment_terms: paymentTerms,
      cubage_factor: cubageFactor === "" ? null : Number(cubageFactor),
      general_notes: notes,
    });
    toast({ title: "Dados salvos!" });
  };

  const downloadReceipt = async () => {
    try {
      const blob = await generateDeliveryReceipt(order, trip, settings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Comprovante-${order.protocol}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao gerar comprovante", variant: "destructive" });
    }
  };

  const downloadShipmentDoc = () => {
    try {
      const blob = generateShipmentDoc(order, settings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DocTransporte-${order.protocol}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao gerar documento", variant: "destructive" });
    }
  };

  const downloadLabels = () => {
    try {
      const blob = generateVolumeLabels(order, settings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Etiquetas-${order.protocol}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Erro ao gerar etiquetas", variant: "destructive" });
    }
  };

  // Anexos gerais do pedido (Pe-2)
  const addAttachment = (url, name) => {
    if (!url) return;
    updateMutation.mutate({ attachments: [...(order.attachments || []), { url, name: name || "Anexo", at: new Date().toISOString() }] });
  };
  const removeAttachment = (idx) => {
    updateMutation.mutate({ attachments: (order.attachments || []).filter((_, i) => i !== idx) });
  };

  const activeRevenue = orderRevenues.find(r => r.status !== "cancelled");

  // Limite de crédito do cliente: exposição = fretes em aberto (não pagos/não cancelados).
  const creditInfo = (() => {
    const limit = Number(orderClient?.credit_limit) || 0;
    if (limit <= 0) return null;
    const used = allOrders
      .filter(o => o.client_id === order.client_id && o.status !== "cancelled" && o.payment_status !== "paid")
      .reduce((s, o) => s + (o.freight_value || 0), 0);
    return { limit, used, over: used > limit, pct: Math.min((used / limit) * 100, 100) };
  })();

  return (
    <div className="space-y-5 max-w-6xl">
      {/* ── HEADER: identidade + stepper + ação primária ── */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/coletas")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-xl font-extrabold font-mono">{order.protocol}</h1>
            <StatusBadge status={order.status} />
            {order.freight_type === "urgent" && (
              <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full uppercase">Frete urgente</span>
            )}
            {!isCancelled && order.status !== "delivered" ? (
              <Select
                value={normalizePriority(order.priority)}
                onValueChange={(v) => updateMutation.mutate({
                  priority: v,
                  status_history: [...(order.status_history || []), { status: order.status, timestamp: new Date().toISOString(), user: "Admin", note: `Prioridade alterada para ${priorityMeta(v).label}` }],
                })}
              >
                <SelectTrigger className="h-6 w-auto gap-1 px-2 py-0 text-[10px] font-bold uppercase border-dashed"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Prioridade: Normal</SelectItem>
                  <SelectItem value="high">Prioridade: Urgente</SelectItem>
                  <SelectItem value="critical">Prioridade: Crítica</SelectItem>
                </SelectContent>
              </Select>
            ) : <PriorityBadge priority={order.priority} />}
            {!isCancelled && (() => {
              const st = slaStatus(order, settings);
              const dl = slaDeadline(order, settings);
              const meta = { on_time: ["No prazo", "bg-green-100 text-green-700"], late: ["Atrasado", "bg-red-100 text-red-700"], at_risk: ["Prazo em risco", "bg-amber-100 text-amber-700"], pending: [null, ""] }[st];
              if (!meta[0]) return null;
              return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${meta[1]}`} title={dl ? `Prazo: ${dl.toLocaleDateString("pt-BR")}` : ""}>{meta[0]}</span>;
            })()}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {order.client_name} · criado {formatDateTimeBR(order.created_date, "—")}
          </p>
        </div>

        {/* Ação primária + menu */}
        <div className="flex items-center gap-2 relative">
          {nextAction && !isCancelled && (
            <Button className="font-bold gap-2"
              onClick={() => handleStatusChange(nextAction.next, order.status === "awaiting_approval" ? "Pedido aprovado — liberado para operação" : undefined)}
              disabled={updateMutation.isPending}>
              {nextAction.label} <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setMenuOpen(o => !o)}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden py-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 text-left"
                  onClick={() => { setMenuOpen(false); navigate("/admin/coletas/nova", { state: { duplicate: order } }); }}>
                  <Copy className="w-4 h-4 text-muted-foreground" /> Duplicar pedido
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 text-left"
                  onClick={() => { setMenuOpen(false); downloadShipmentDoc(); }}>
                  <FileText className="w-4 h-4 text-muted-foreground" /> Doc. de transporte (PDF)
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 text-left"
                  onClick={() => { setMenuOpen(false); downloadLabels(); }}>
                  <FileDown className="w-4 h-4 text-muted-foreground" /> Etiquetas de volumes (PDF)
                </button>
                {order.status === "delivered" && (
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 text-left"
                    onClick={() => { setMenuOpen(false); downloadReceipt(); }}>
                    <FileDown className="w-4 h-4 text-muted-foreground" /> Comprovante PDF
                  </button>
                )}
                {order.trip_id && (
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 text-left"
                    onClick={() => { setMenuOpen(false); navigate(`/admin/viagens/${order.trip_id}`); }}>
                    <Truck className="w-4 h-4 text-muted-foreground" /> Ver viagem
                  </button>
                )}
                {!isCancelled && order.status !== "delivered" && (
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-50 text-red-600 text-left border-t border-border/50"
                    onClick={() => { setMenuOpen(false); setCancelOpen(true); }}>
                    <XCircle className="w-4 h-4" /> Cancelar pedido
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between overflow-x-auto">
            {flow.map((s, i) => {
              const done = i <= currentStep && !isCancelled;
              const active = i === currentStep && !isCancelled;
              const hist = (order.status_history || []).find(h => h.status === s);
              return (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1 min-w-[80px]">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done ? "bg-velox-amber border-velox-amber text-white" : "bg-background border-border text-muted-foreground"
                    } ${active ? "ring-4 ring-velox-amber/20" : ""}`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </div>
                    <span className={`text-[10px] font-medium text-center leading-tight ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {STATUS_LABELS[s]}
                    </span>
                    {hist?.timestamp && (
                      <span className="text-[9px] text-muted-foreground">{formatDateTimeBR(hist.timestamp)}</span>
                    )}
                  </div>
                  {i < flow.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < currentStep && !isCancelled ? "bg-velox-amber" : "bg-border"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {isCancelled && (
            <p className="mt-3 text-center">
              <span className="text-xs font-semibold px-3 py-1 bg-red-100 text-red-700 rounded-full">
                Cancelado — {(order.status_history || []).slice().reverse().find(h => h.status === "cancelled")?.note || ""}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* ── CORPO EM SEÇÕES COLAPSÁVEIS (uma página só) ── */}
        <div className="space-y-3">
          {/* SEÇÃO RESUMO */}
          <CollapsibleSection title="Resumo do pedido" icon={Package} defaultOpen>
            <div className="space-y-4">
              {/* Rota visual */}
              <Card>
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-3 h-3 rounded-full bg-velox-amber" />
                      <div className="w-0.5 flex-1 min-h-[24px] bg-border my-1" />
                      {(order.recipients || []).map((_, i) => (
                        <React.Fragment key={i}>
                          <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-background" />
                          {i < (order.recipients || []).length - 1 && <div className="w-0.5 flex-1 min-h-[24px] bg-border my-1" />}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-[11px] font-bold text-velox-amber uppercase tracking-wide">Coleta — {formatDateBR(order.scheduled_date || order.collection_date)} ({order.collection_time === "morning" ? "Manhã" : order.collection_time === "afternoon" ? "Tarde" : "A combinar"})</p>
                        {order.collection_date_desired && order.collection_date_desired !== (order.scheduled_date || order.collection_date) && (
                          <p className="text-[10px] text-muted-foreground">Desejada pelo cliente: {formatDateBR(order.collection_date_desired)}</p>
                        )}
                        <p className="text-sm font-medium">
                          {[order.origin?.street, order.origin?.number, order.origin?.city, order.origin?.state].filter(Boolean).join(", ") || "—"}
                        </p>
                        {order.collection_notes && <p className="text-xs text-muted-foreground mt-0.5">Obs: {order.collection_notes}</p>}
                        {(order.origins || []).length > 1 && (
                          <div className="mt-1.5 space-y-1">
                            <p className="text-[10px] font-bold text-velox-amber uppercase tracking-wide">Coleta consolidada — {order.origins.length} pontos</p>
                            {order.origins.slice(1).map((p, i) => (
                              <p key={i} className="text-xs text-muted-foreground">
                                {i + 2}. {[p.street, p.number, p.city, p.state].filter(Boolean).join(", ")}{p.contact_name ? ` · ${p.contact_name}` : ""}{p.collection_notes ? ` — ${p.collection_notes}` : ""}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      {(order.recipients || []).map((r, i) => (
                        <div key={i}>
                          <p className="text-[11px] font-bold text-green-600 uppercase tracking-wide">
                            Entrega {((order.recipients || []).length > 1) ? i + 1 : ""} — {r.name || "—"}
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-semibold normal-case ${
                              r.delivery_status === "delivered" ? "bg-green-100 text-green-700" :
                              r.delivery_status === "failed" ? "bg-red-100 text-red-700" :
              r.delivery_status === "partial" ? "bg-teal-100 text-teal-700" : "bg-muted text-muted-foreground"
                            }`}>
                              {r.delivery_status === "delivered" ? "Entregue" : r.delivery_status === "failed" ? "Falhou" : r.delivery_status === "partial" ? "Parcial" : "Pendente"}
                            </span>
                          </p>
                          <p className="text-sm">{[r.street, r.number, r.city, r.state].filter(Boolean).join(", ") || "—"}</p>
                          {r.delivery_notes && <p className="text-xs text-muted-foreground mt-0.5">Obs: {r.delivery_notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Solicitante + totais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 text-sm space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                      <User className="w-3.5 h-3.5 text-velox-amber" /> Solicitante
                    </p>
                    <p className="font-medium">{order.client_name || "—"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{order.client_cpf_cnpj || "—"}</p>
                    <p className="text-xs text-muted-foreground">{[order.client_phone, order.client_email].filter(Boolean).join(" · ") || "—"}</p>
                    {order.freight_payer && (
                      <p className="text-xs"><span className="text-muted-foreground">Modalidade:</span> {order.freight_payer === "cif" ? "CIF (remetente paga)" : "FOB (destinatário paga)"}</p>
                    )}
                    {clientPricing && <p className="text-[11px] text-velox-amber">★ Cliente com tabela de frete negociada</p>}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                      <Package className="w-3.5 h-3.5 text-velox-amber" /> Carga
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/30 rounded-lg py-2">
                        <p className="text-lg font-bold font-mono">{order.total_volumes || 0}</p>
                        <p className="text-[10px] text-muted-foreground">volumes</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg py-2">
                        <p className="text-lg font-bold font-mono">{(order.total_weight_kg || 0).toLocaleString("pt-BR")}</p>
                        <p className="text-[10px] text-muted-foreground">kg</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg py-2">
                        <p className="text-lg font-bold font-mono">{nfCount}</p>
                        <p className="text-[10px] text-muted-foreground">NF(s)</p>
                      </div>
                    </div>
                    {(() => {
                      const destStates = [...new Set((order.recipients || []).map(r => r.state).filter(Boolean))];
                      const rows = destStates.map(s => ({ state: s, days: getDeliveryDaysByState(s, settings, order.origin?.state) })).filter(r => r.days);
                      if (rows.length === 0) return null;
                      return (
                        <p className="text-xs text-blue-600 mt-2">
                          Prazo: {rows.map(r => `${r.state} ${r.days}d úteis`).join(" · ")}
                        </p>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CollapsibleSection>

          {/* SEÇÃO CARGAS */}
          <CollapsibleSection title="Cargas e destinatários" icon={Package} count={(order.recipients || []).length} defaultOpen>
            <div className="space-y-3">
              {(order.recipients || []).map((r, ri) => (
                <Card key={ri}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm">{r.name || `Destinatário ${ri + 1}`} <span className="text-muted-foreground font-normal text-xs">· {[r.city, r.state].filter(Boolean).join("/")}</span></p>
                      <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground" onClick={() => openEditAddr(ri)}>
                        <MapPin className="w-3 h-3" /> Alterar endereço
                      </Button>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.delivery_status === "delivered" ? "bg-green-100 text-green-700" :
                        r.delivery_status === "failed" ? "bg-red-100 text-red-700" :
              r.delivery_status === "partial" ? "bg-teal-100 text-teal-700" : "bg-muted text-muted-foreground"
                      }`}>
                        {r.delivery_status === "delivered" ? "Entregue" : r.delivery_status === "failed" ? "Falhou" : "Pendente"}
                      </span>
                      </div>
                    </div>
                    {(r.items || []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum item.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground">
                              <th className="text-left py-2 font-medium">Nº NF</th>
                              <th className="text-left py-2 font-medium">NCM</th>
                              <th className="text-left py-2 font-medium">Descrição</th>
                              <th className="text-right py-2 font-medium">Vol.</th>
                              <th className="text-right py-2 font-medium">Peso</th>
                              <th className="text-right py-2 font-medium">Dim. (cm)</th>
                              <th className="text-right py-2 font-medium">Valor decl.</th>
                              <th className="text-right py-2 font-medium">NF assinada</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.items.map((item, ii) => (
                              <tr key={ii} className="border-b border-border/40">
                                <td className="py-2 font-mono" title={item.nf_key ? `Chave: ${item.nf_key}` : undefined}>
                                  {item.nf_number || "—"}{item.nf_key && <span className="ml-1 text-green-600">🔑</span>}
                                </td>
                                <td className="py-2 font-mono">{item.ncm || "—"}</td>
                                <td className="py-2">
                                  {item.description || "—"}
                                  {item.fragile && <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-semibold">Frágil</span>}
                                  {item.dangerous && <span className="ml-1 text-[9px] bg-red-100 text-red-700 px-1 rounded font-semibold">Perigoso</span>}
                                </td>
                                <td className="py-2 text-right">{item.volumes || 0}</td>
                                <td className="py-2 text-right">{item.weight_kg || 0} kg</td>
                                <td className="py-2 text-right text-muted-foreground">
                                  {(item.height_cm || item.width_cm || item.length_cm) ? `${item.height_cm || "?"}×${item.width_cm || "?"}×${item.length_cm || "?"}` : "—"}
                                </td>
                                <td className="py-2 text-right">{item.declared_value ? `R$ ${Number(item.declared_value).toFixed(2)}` : "—"}</td>
                                <td className="py-2 text-right">
                                  {item.nf_signed_url
                                    ? <a href={item.nf_signed_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline"><FileText className="w-3 h-3" /> Ver</a>
                                    : <FileUploadButton label="Anexar" accept="image/*,application/pdf" onUpload={async (url) => {
                                        if (!url) return;
                                        const updated = order.recipients.map((rec, rIdx) =>
                                          rIdx !== ri ? rec : { ...rec, items: rec.items.map((it, iIdx) => iIdx !== ii ? it : { ...it, nf_signed_url: url }) }
                                        );
                                        updateMutation.mutate({ recipients: updated });
                                      }} />}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleSection>

          {/* SEÇÃO FINANCEIRO */}
          <CollapsibleSection title="Financeiro" icon={DollarSign} defaultOpen>
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor do frete (R$)</label>
                      <Input type="number" step="0.01" value={freightValue} onChange={e => setFreightValue(e.target.value)} className="font-mono" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Forma de pagamento</label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="transfer">Transferência</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Condições</label>
                      <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="after_delivery">Após entrega</SelectItem>
                          <SelectItem value="7_days">7 dias</SelectItem>
                          <SelectItem value="15_days">15 dias</SelectItem>
                          <SelectItem value="30_days">30 dias</SelectItem>
                          <SelectItem value="monthly">Faturamento mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Fator de cubagem deste pedido (opcional)</label>
                    <Input type="number" step="1" value={cubageFactor} onChange={e => setCubageFactor(e.target.value)}
                      placeholder="padrão 6000" className="h-8 w-32 font-mono text-sm" />
                    <span className="text-[11px] text-muted-foreground">cm³/kg — vazio usa rota/global</span>
                  </div>
                  {breakdown && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">
                          Estimativa{clientPricing ? " (tabela do cliente)" : ""}:{" "}
                          <span className="font-mono font-semibold text-foreground">R$ {breakdown.total.toFixed(2)}</span>
                        </p>
                        <button className="text-velox-amber hover:underline text-xs font-medium" onClick={() => setFreightValue(breakdown.total.toFixed(2))}>
                          Usar este valor
                        </button>
                      </div>
                      <FreightBreakdown breakdown={breakdown} compact />
                    </div>
                  )}
                  {/* Cobranças adicionais (espera/devolução/emergência) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cobranças adicionais</label>
                      <div className="flex gap-1 flex-wrap">
                        {Number(pricingCfg.waiting_fee_hour) > 0 && (
                          <button className="text-[11px] border border-border rounded px-1.5 py-0.5 hover:bg-muted" onClick={() => { const h = Number(window.prompt("Horas de espera?")); if (h > 0) addCharge({ type: "waiting", label: `Espera ${h}h`, amount: +(h * Number(pricingCfg.waiting_fee_hour)).toFixed(2) }); }}>+ Espera</button>
                        )}
                        {Number(pricingCfg.return_fee) > 0 && (
                          <button className="text-[11px] border border-border rounded px-1.5 py-0.5 hover:bg-muted" onClick={() => addCharge({ type: "return", label: "Devolução", amount: Number(pricingCfg.return_fee) })}>+ Devolução</button>
                        )}
                        {Number(pricingCfg.emergency_percent) > 0 && (
                          <button className="text-[11px] border border-border rounded px-1.5 py-0.5 hover:bg-muted" onClick={() => { const base = Number(freightValue) || breakdown?.total || 0; addCharge({ type: "emergency", label: `Emergência ${pricingCfg.emergency_percent}%`, amount: +(base * Number(pricingCfg.emergency_percent) / 100).toFixed(2) }); }}>+ Emergência</button>
                        )}
                        <button className="text-[11px] border border-border rounded px-1.5 py-0.5 hover:bg-muted" onClick={() => { const label = window.prompt("Descrição da cobrança:"); if (!label) return; const amount = Number(window.prompt("Valor (R$):")); if (amount > 0) addCharge({ type: "other", label, amount }); }}>+ Avulsa</button>
                      </div>
                    </div>
                    {(order.extra_charges || []).length > 0 && (
                      <div className="space-y-1">
                        {(order.extra_charges || []).map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                            <span>{c.label}</span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono">R$ {Number(c.amount).toFixed(2)}</span>
                              <button className="text-red-400 hover:text-red-600" onClick={() => removeCharge(i)}><XCircle className="w-3.5 h-3.5" /></button>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-muted-foreground text-xs">Receita vinculada: </span>
                      {activeRevenue ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          activeRevenue.status === "received" ? "bg-green-100 text-green-700" :
                          activeRevenue.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          R$ {(activeRevenue.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · {
                            activeRevenue.status === "received" ? "Recebida" : activeRevenue.status === "overdue" ? "Em atraso" : "A receber"
                          } · vence {formatDateBR(activeRevenue.due_date)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">nenhuma (criada na confirmação)</span>
                      )}
                    </div>
                    <Button size="sm" onClick={saveFinancial} disabled={updateMutation.isPending}
                      className="font-bold text-xs">
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações internas</label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 resize-none text-sm" placeholder="Notas internas — não aparecem ao cliente" />
                </CardContent>
              </Card>
            </div>
          </CollapsibleSection>

          {/* SEÇÃO OCORRÊNCIAS */}
          <CollapsibleSection title="Ocorrências" icon={AlertTriangle} count={incidents.length} defaultOpen={incidents.length > 0}>
            <div className="space-y-3 pt-1">
              {incidents.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" /> Nenhuma ocorrência neste pedido.
                </CardContent></Card>
              ) : incidents.map(inc => (
                <div key={inc.id} className={`p-4 rounded-xl border ${
                  inc.status === "resolved" ? "bg-green-50 border-green-200" :
                  inc.type === "roubo" || inc.type === "acidente" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold uppercase text-amber-700">{(inc.type || "").replace(/_/g, " ")}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          inc.status === "resolved" ? "bg-green-100 text-green-700" :
                          inc.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {inc.status === "resolved" ? "Resolvida" : inc.status === "in_progress" ? "Em tratativa" : "Aberta"}
                        </span>
                      </div>
                      <p className="text-sm">{inc.description}</p>
                      {inc.reported_by_name && (
                        <p className="text-xs text-muted-foreground mt-1">Por: {inc.reported_by_name} · {inc.created_date ? new Date(inc.created_date).toLocaleString("pt-BR") : ""}</p>
                      )}
                      {inc.photo_urls?.length > 0 && (
                        <a href={inc.photo_urls[0]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                          <FileText className="w-3 h-3" /> Ver foto
                        </a>
                      )}
                      {inc.resolution_notes && <p className="text-xs text-green-700 mt-1 italic">Resolução: {inc.resolution_notes}</p>}
                    </div>
                    {inc.status !== "resolved" && (
                      <Button size="sm" variant="outline" className="text-xs flex-shrink-0"
                        onClick={() => { setResolvingIncident(inc); setResolutionNotes(""); }}>
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* SEÇÃO ANEXOS */}
          <CollapsibleSection title="Anexos" icon={FileText} count={(order.attachments || []).length} defaultOpen={(order.attachments || []).length > 0}>
            <Card>
              <CardContent className="pt-4 space-y-3">
                <FileUploadButton label="Adicionar anexo (foto da carga, documento)" accept="image/*,application/pdf"
                  onUpload={(url) => addAttachment(url, "Anexo do pedido")} />
                {(order.attachments || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum anexo. Use para fotos da carga, comprovantes ou documentos do pedido.</p>
                ) : (
                  <div className="space-y-1.5">
                    {(order.attachments || []).map((a, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2">
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline min-w-0">
                          <FileText className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{a.name || "Anexo"}</span>
                        </a>
                        <button onClick={() => removeAttachment(i)} className="text-red-400 hover:text-red-600 flex-shrink-0"><XCircle className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleSection>

          {/* SEÇÃO HISTÓRICO */}
          <CollapsibleSection title="Histórico de eventos" icon={FileText} count={(order.status_history || []).length} defaultOpen={false}>
            <div className="pt-2">
                {(order.status_history || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Sem eventos.</p>
                ) : (
                  <div className="space-y-3">
                    {[...(order.status_history || [])].reverse().map((h, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div>
                          <p>{h.note}</p>
                          <p className="text-xs text-muted-foreground">{h.user} • {formatDateTimeBR(h.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </CollapsibleSection>
        </div>

        {/* ── RAIL DIREITO: atribuição operacional ── */}
        <div className="space-y-4">
          {/* Limite de crédito do cliente */}
          {creditInfo && (
            <Card className={creditInfo.over ? "border-red-300 bg-red-50/60" : ""}>
              <CardContent className="pt-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-velox-amber" /> Limite de crédito
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Em aberto</span>
                  <span className={`font-mono font-semibold ${creditInfo.over ? "text-red-600" : ""}`}>R$ {creditInfo.used.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Limite</span>
                  <span className="font-mono">R$ {creditInfo.limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${creditInfo.over ? "bg-red-500" : creditInfo.pct > 80 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${creditInfo.pct}%` }} />
                </div>
                {creditInfo.over && <p className="text-[11px] text-red-600 font-medium">Cliente acima do limite de crédito.</p>}
              </CardContent>
            </Card>
          )}
          {/* Encaixe rápido de URGENTE (S3) */}
          {order.freight_type === "urgent" && order.status === "confirmed" && !order.trip_id && (
            <Card className="border-red-200 bg-red-50/60">
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Urgente — encaixe rápido
                </p>
                <p className="text-[11px] text-muted-foreground">Caminhões com espaço nos próximos 2 dias. Clique para programar direto.</p>
                {[0, 1].map(offset => {
                  const dateStr = toLocalISO(addDays(new Date(), offset));
                  const opts = suggestTrucks(trucks, allOrders, null, dateStr).slice(0, 4);
                  const need = order.total_weight_kg || 0;
                  return (
                    <div key={offset} className="space-y-1">
                      <p className="text-[11px] font-medium text-foreground">{offset === 0 ? "Hoje" : "Amanhã"} · {formatDateBR(dateStr)}</p>
                      {opts.length === 0 ? <p className="text-[11px] text-muted-foreground">Nenhum caminhão disponível.</p> :
                        opts.map(({ truck: t, free }) => (
                          <button key={t.id}
                            onClick={() => { updateMutation.mutate({ scheduled_truck_id: t.id, scheduled_date: dateStr, status_history: [...(order.status_history || []), { status: order.status, timestamp: new Date().toISOString(), user: "Admin", note: `Encaixe urgente em ${t.plate} (${formatDateBR(dateStr)})` }] }); toast({ title: `Programado em ${t.plate}`, description: formatDateBR(dateStr) }); }}
                            className={`w-full flex items-center justify-between text-xs rounded-lg border p-2 transition-colors ${free >= need ? "border-green-300 bg-green-50 hover:bg-green-100" : "border-border hover:bg-muted/40"}`}>
                            <span className="font-mono font-semibold">{t.plate}</span>
                            <span className={`font-mono ${free >= need ? "text-green-700" : "text-amber-600"}`}>{free.toLocaleString("pt-BR")} kg livres</span>
                          </button>
                        ))}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-velox-amber" /> Operacional
              </p>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Motorista</p>
                <Select value={order.driver_id || "none"} onValueChange={v => updateMutation.mutate({ driver_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Caminhão</p>
                <Select value={order.truck_id || "none"} onValueChange={v => updateMutation.mutate({ truck_id: v === "none" ? "" : v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não atribuído</SelectItem>
                    {trucks.filter(t => t.status === "available" || t.status === "on_route").map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">CT-e</p>
                <div className="flex gap-2">
                  <Input placeholder="nº CT-e" value={cte} onChange={e => setCte(e.target.value)} className="h-8 text-xs font-mono" />
                  <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => { updateMutation.mutate({ cte_number: cte }); toast({ title: "CT-e salvo" }); }}>OK</Button>
                </div>
              </div>
              {order.scheduled_date && (
                <div className="text-xs bg-muted/30 rounded-lg p-2">
                  <span className="text-muted-foreground">Programado: </span>
                  <span className="font-medium">{formatDateBR(order.scheduled_date)}</span>
                  {order.scheduled_truck_id && (() => {
                    const t = trucks.find(t => t.id === order.scheduled_truck_id);
                    return t ? <span className="font-mono"> · {t.plate}</span> : null;
                  })()}
                </div>
              )}
              {order.status === "confirmed" && !order.trip_id && (
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => navigate("/admin/despacho")}>
                  <MapPin className="w-3.5 h-3.5" /> Programar no Despacho
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-2 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-velox-amber" /> Pagamento
              </p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Status</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  order.payment_status === "paid" ? "bg-green-100 text-green-700" :
                  order.payment_status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {order.payment_status === "paid" ? "Pago" : order.payment_status === "overdue" ? "Atrasado" : "Pendente"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Frete</span>
                <span className="font-mono font-semibold">
                  {order.freight_value ? `R$ ${Number(order.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                </span>
              </div>
              {order.payment_status !== "paid" && (
                <Button variant="outline" size="sm" className="w-full text-xs"
                  onClick={() => { updateMutation.mutate({ payment_status: "paid" }); toast({ title: "Marcado como pago" }); }}>
                  Marcar como Pago
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Modal: cancelar com motivo ── */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" /> Cancelar Pedido {order.protocol}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="Motivo do cancelamento (obrigatório)" rows={3} className="resize-none" />
            {tripLive && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Este pedido está em uma viagem em andamento
                </p>
                <p className="text-[11px] text-amber-700">A parada será removida do roteiro e o motorista será avisado. Deseja cobrar taxa de deslocamento improdutivo?</p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-amber-800">Taxa improdutiva (R$)</label>
                  <Input type="number" step="0.01" value={unproductiveFee} onChange={e => setUnproductiveFee(e.target.value)}
                    placeholder="0,00" className="h-8 w-28 font-mono text-sm" />
                </div>
              </div>
            )}
            <p className="text-xs text-red-600">Receitas pendentes do frete deste pedido serão estornadas.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setCancelOpen(false); setCancelReason(""); setUnproductiveFee(""); }}>Voltar</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold"
                disabled={!cancelReason.trim()}
                onClick={confirmCancel}>
                Cancelar Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: alterar endereço de entrega (S4) ── */}
      <Dialog open={!!editAddr} onOpenChange={o => !o && setEditAddr(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MapPin className="w-4 h-4 text-velox-amber" /> Alterar endereço de entrega</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {order.trip_id && trip && ["planned", "in_progress"].includes(trip.status) && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Este pedido já tem viagem. Ao salvar, a parada do motorista será atualizada e ele verá o novo endereço destacado.
              </p>
            )}
            <AddressFields value={addrForm} onChange={(addr) => setAddrForm(a => ({ ...a, ...addr }))} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setEditAddr(null)}>Cancelar</Button>
              <Button size="sm" className="font-bold" onClick={saveAddress} disabled={updateMutation.isPending}>
                Salvar endereço
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: resolver ocorrência ── */}
      <Dialog open={!!resolvingIncident} onOpenChange={open => !open && setResolvingIncident(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Resolver Ocorrência
            </DialogTitle>
          </DialogHeader>
          {resolvingIncident && (
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg text-sm">
                <p className="text-xs font-bold uppercase text-amber-700 mb-1">{(resolvingIncident.type || "").replace(/_/g, " ")}</p>
                <p>{resolvingIncident.description}</p>
              </div>
              <Textarea placeholder="O que foi feito para resolver..." rows={3}
                value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} className="resize-none" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setResolvingIncident(null)}>Cancelar</Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold"
                  disabled={!resolutionNotes.trim()}
                  onClick={async () => {
                    await base44.entities.Incident.update(resolvingIncident.id, {
                      status: "resolved",
                      resolution_notes: resolutionNotes.trim(),
                      resolved_at: new Date().toISOString(),
                      timeline: [...(resolvingIncident.timeline || []), { at: new Date().toISOString(), by: "Gestão", text: `Resolvida: ${resolutionNotes.trim()}`, kind: "resolved" }],
                    });
                    queryClient.invalidateQueries({ queryKey: ["incidents", id] });
                    queryClient.invalidateQueries({ queryKey: ["incidents-all"] });
                    setResolvingIncident(null);
                    toast({ title: "Ocorrência resolvida!" });
                  }}>
                  Marcar como Resolvida
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

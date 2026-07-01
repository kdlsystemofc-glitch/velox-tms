import React, { useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { db } from "@/repositories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, ArrowRight, Plus, Trash2, MapPin, User, Package, DollarSign, AlertCircle, Search, FileUp, Calculator, Check, Repeat, Truck as TruckIcon, ClipboardPaste, Clock } from "lucide-react";
import DeliveryWindowEditor from "@/components/shared/DeliveryWindowEditor";
import { NumericInput } from "@/components/shared/NumericInput";
import { AddressFields } from "@/components/shared/AddressFields";
import { useFormValidation } from "@/hooks/useFormValidation";
import { calculateFreight, getDeliveryDaysByState } from "@/utils/freightCalculator";
import { quoteFreight } from "@/services/pricing";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { todayLocalISO } from "@/utils/dateUtils";
import { isAddressInCoverage } from "@/utils/coverageChecker";
import { validateNFeKey, nfNumberFromKey } from "@/utils/nfeUtils";
import { parseNFeXML } from "@/utils/nfeXml";

const emptyItem = {
  nf_number: "", nf_key: "", description: "", package_type: "caixa", volumes: 1,
  weight_kg: "", height_cm: "", width_cm: "", length_cm: "",
  declared_value: "", ncm: "", fragile: false, dangerous: false,
};
const emptyRecipient = {
  name: "", cnpj_cpf: "", phone: "", cep: "", street: "", number: "",
  complement: "", neighborhood: "", city: "", state: "", delivery_notes: "",
  items: [{ ...emptyItem }],
};

const STEPS = [
  { n: 1, label: "Remetente e coleta", icon: User },
  { n: 2, label: "Cargas e notas", icon: Package },
  { n: 3, label: "Cotação e pagamento", icon: DollarSign },
  { n: 4, label: "Atribuição e revisão", icon: Check },
];

const PACKAGE_TYPES = [
  ["caixa", "Caixa"], ["palete", "Palete"], ["tambor", "Tambor"], ["bobina", "Bobina"],
  ["fardo", "Fardo"], ["saco", "Saco"], ["engradado", "Engradado"], ["bag", "Big Bag"],
  ["rolo", "Rolo"], ["peca", "Peça solta"], ["outro", "Outro"],
];

function parseNum(v) {
  if (v === "" || v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).trim();
  if (s.includes(",") && s.includes(".")) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  if (s.includes(",")) return parseFloat(s.replace(",", ".")) || 0;
  return parseFloat(s) || 0;
}

function FL({ label, required, children, error, hint, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-[12px] font-medium text-foreground/80 block">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error ? <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle size={11} />{error}</p>
        : hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { errors, validate, clearAll } = useFormValidation();
  const submittingRef = useRef(false);

  const dup = location.state?.duplicate;
  const fromMessage = location.state?.fromMessage;
  const fromQuote = location.state?.fromQuote;

  const [step, setStep] = useState(1);

  const [form, setForm] = useState(() => {
    const base = {
      client_id: undefined,
      client_name: "", client_cpf_cnpj: "", client_phone: "", client_email: "",
      requester_name: "", requester_role: "", preferred_contact: "whatsapp",
      freight_type: "shared", priority: "normal",
      origin: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
      extra_origins: [], // coleta consolidada: pontos de coleta adicionais
      collection_date: "", collection_time: "morning", collection_notes: "",
      recipients: [{ ...emptyRecipient, items: [{ ...emptyItem }] }],
      simple: { volumes: "", weight_kg: "", declared_value: "" },
      freight_value: "", freight_payer: "cif", payment_method: "pix", payment_terms: "after_delivery", payment_status: "pending",
      driver_id: "", truck_id: "", general_notes: "",
    };
    if (fromMessage) return { ...base, ...fromMessage };
    if (fromQuote) {
      const it = fromQuote.item || {};
      return {
        ...base,
        freight_type: fromQuote.freight_type || base.freight_type,
        freight_value: fromQuote.freight_value != null ? String(fromQuote.freight_value) : "",
        origin: { ...base.origin, ...(fromQuote.origin || {}) },
        recipients: [{
          ...emptyRecipient,
          ...(fromQuote.recipient || {}),
          items: [{ ...emptyItem,
            weight_kg: it.weight_kg ?? "", height_cm: it.height_cm ?? "", width_cm: it.width_cm ?? "",
            length_cm: it.length_cm ?? "", volumes: it.volumes ?? 1, declared_value: it.declared_value ?? "",
            description: it.description || "",
          }],
        }],
      };
    }
    if (!dup) return base;
    return {
      ...base,
      client_id: dup.client_id || undefined,
      client_name: dup.client_name || "", client_cpf_cnpj: dup.client_cpf_cnpj || "",
      client_phone: dup.client_phone || "", client_email: dup.client_email || "",
      preferred_contact: dup.preferred_contact || "whatsapp",
      freight_type: dup.freight_type || "shared",
      origin: { ...base.origin, ...(dup.origin || {}) },
      collection_time: dup.collection_time || "morning", collection_notes: dup.collection_notes || "",
      recipients: (dup.recipients || []).map(r => ({
        ...emptyRecipient,
        name: r.name || "", cnpj_cpf: r.cpf_cnpj || r.cnpj_cpf || "", phone: r.phone || "",
        cep: r.cep || "", street: r.street || "", number: r.number || "",
        complement: r.complement || "", neighborhood: r.neighborhood || "",
        city: r.city || "", state: r.state || "", delivery_notes: r.delivery_notes || "",
        items: (r.items || [{ ...emptyItem }]).map(it => ({
          ...emptyItem,
          description: it.description || "", package_type: it.package_type || "caixa",
          volumes: it.volumes || 1, weight_kg: it.weight_kg || "",
          height_cm: it.height_cm || "", width_cm: it.width_cm || "", length_cm: it.length_cm || "",
          declared_value: it.declared_value || "", ncm: it.ncm || "",
          fragile: !!it.fragile, dangerous: !!it.dangerous,
        })),
      })),
      freight_value: dup.freight_value || "", freight_payer: dup.freight_payer || "cif",
      payment_method: dup.payment_method || "pix", payment_terms: dup.payment_terms || "after_delivery",
      general_notes: dup.general_notes || "",
    };
  });

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => db.Driver.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => db.Truck.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => db.Client.list() });
  const { data: templates = [] } = useQuery({ queryKey: ["order-templates"], queryFn: () => db.OrderTemplate.list("-created_at", 100) });
  const { data: recipientBook = [] } = useQuery({ queryKey: ["recipients"], queryFn: () => db.Recipient.list("-created_date") });
  // Histórico do cliente p/ autofill inteligente (5.1)
  const { data: clientPastOrders = [] } = useQuery({
    queryKey: ["client-past-orders", form.client_id],
    queryFn: () => db.Order.filter({ client_id: form.client_id }, "-created_at", 50),
    enabled: !!form.client_id,
  });
  // Sugestões a partir do histórico: destinatários frequentes + valor médio declarado.
  const clientInsights = React.useMemo(() => {
    const past = (clientPastOrders || []).filter(o => o.status !== "cancelled");
    if (past.length === 0) return null;
    const freq = {};
    past.forEach(o => (o.recipients || []).forEach(r => {
      if (!r.name) return;
      freq[r.name] = freq[r.name] || { ...r, count: 0 };
      freq[r.name].count += 1;
    }));
    const topRecipients = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 5);
    const declaredVals = past.map(o => o.total_declared_value).filter(v => v > 0);
    const avgDeclared = declaredVals.length ? declaredVals.reduce((s, v) => s + v, 0) / declaredVals.length : 0;
    return { count: past.length, topRecipients, avgDeclared };
  }, [clientPastOrders]);
  const addSuggestedRecipient = (r) => {
    setForm(f => {
      const recipients = [...f.recipients];
      const blankIdx = recipients.findIndex(isBlankRecipient);
      const rec = {
        ...emptyRecipient, name: r.name || "", cnpj_cpf: r.cpf_cnpj || r.cnpj_cpf || "", phone: r.phone || "",
        cep: r.cep || "", street: r.street || "", number: r.number || "", complement: r.complement || "",
        neighborhood: r.neighborhood || "", city: r.city || "", state: r.state || "", delivery_notes: r.delivery_notes || "",
        delivery_window: r.delivery_window, items: [{ ...emptyItem }],
      };
      if (blankIdx >= 0) recipients[blankIdx] = rec; else recipients.push(rec);
      return { ...f, recipients };
    });
    toast({ title: `Destinatário "${r.name}" adicionado` });
  };
  const { settings } = useCompanySettings();

  const [clientSearch, setClientSearch] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [chaveInput, setChaveInput] = useState("");
  const [repeating, setRepeating] = useState(false);
  // Modo de captação (Fase 3): "detailed" (item por NF) ou "simple" (volume/peso total)
  const [captureMode, setCaptureMode] = useState(settings?.collection_model === "simple" ? "simple" : "detailed");
  const isSimple = captureMode === "simple";
  const clientSuggestions = clientSearch.length >= 2
    ? clients.filter(c => c.company_name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.cpf_cnpj?.includes(clientSearch)).slice(0, 6)
    : [];

  const [createClientPrompt, setCreateClientPrompt] = useState(null);

  const finishAndNavigate = (protocol) => {
    toast({ title: "Coleta criada!", description: `Protocolo: ${protocol}` });
    navigate("/admin/coletas");
  };

  const createMutation = useMutation({
    mutationFn: (data) => db.Order.create(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      submittingRef.current = false;
      // Lead → pedido: marca a mensagem de origem como convertida (Msg-2)
      if (fromMessage?.message_id) {
        db.ContactMessage.update(fromMessage.message_id, {
          status: "convertido", read: true, converted_order_id: order.id, converted_order_protocol: order.protocol,
        }).then(() => queryClient.invalidateQueries({ queryKey: ["contact-messages"] })).catch(() => {});
      }
      if (!form.client_id && form.client_name?.trim()) setCreateClientPrompt({ protocol: order.protocol });
      else finishAndNavigate(order.protocol);
    },
    onError: (e) => {
      submittingRef.current = false;
      toast({ title: "Erro ao criar coleta", description: e?.message || "Tente novamente.", variant: "destructive" });
    },
  });

  // ───────── Setters ─────────
  const setOrigin = (addr) => setForm(f => ({ ...f, origin: { ...f.origin, ...addr } }));
  // Coleta consolidada — pontos de coleta adicionais
  const emptyOrigin = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", contact_name: "", collection_notes: "" };
  const addExtraOrigin = () => setForm(f => ({ ...f, extra_origins: [...(f.extra_origins || []), { ...emptyOrigin }] }));
  const setExtraOrigin = (i, addr) => setForm(f => ({ ...f, extra_origins: (f.extra_origins || []).map((o, j) => j === i ? { ...o, ...addr } : o) }));
  const removeExtraOrigin = (i) => setForm(f => ({ ...f, extra_origins: (f.extra_origins || []).filter((_, j) => j !== i) }));
  const setRecipient = (ri, field, value) =>
    setForm(prev => ({ ...prev, recipients: prev.recipients.map((r, i) => i === ri ? { ...r, [field]: value } : r) }));
  const setRecipientAddress = (ri, addr) =>
    setForm(prev => ({ ...prev, recipients: prev.recipients.map((r, i) => i === ri ? { ...r, ...addr } : r) }));
  const setItem = (ri, ii, field, value) =>
    setForm(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => i !== ri ? r : {
        ...r, items: r.items.map((it, j) => j === ii ? { ...it, [field]: value } : it),
      }),
    }));

  const addRecipient = () => setForm(f => ({ ...f, recipients: [...f.recipients, { ...emptyRecipient, items: [{ ...emptyItem }] }] }));
  const removeRecipient = (ri) => setForm(f => ({ ...f, recipients: f.recipients.filter((_, i) => i !== ri) }));
  const addItem = (ri) => setForm(prev => ({ ...prev, recipients: prev.recipients.map((r, i) => i === ri ? { ...r, items: [...r.items, { ...emptyItem }] } : r) }));
  const removeItem = (ri, ii) => setForm(prev => ({ ...prev, recipients: prev.recipients.map((r, i) => i === ri ? { ...r, items: r.items.filter((_, j) => j !== ii) } : r) }));

  // ───────── Defaults do cliente ─────────
  const paymentTermsFromClient = (c) => {
    if (c.billing_type === "monthly") return "monthly";
    if (c.payment_term_days === 7) return "7_days";
    if (c.payment_term_days === 15) return "15_days";
    if (c.payment_term_days === 30) return "30_days";
    return "after_delivery";
  };
  const selectClient = (c) => {
    setForm(f => ({
      ...f,
      client_id: c.id, client_name: c.company_name || "", client_cpf_cnpj: c.cpf_cnpj || "",
      client_phone: c.phone || "", client_email: c.email || "",
      origin: c.address?.cep
        ? { cep: c.address.cep, street: c.address.street || "", number: c.address.number || "", complement: c.address.complement || "", neighborhood: c.address.neighborhood || "", city: c.address.city || "", state: c.address.state || "" }
        : f.origin,
      collection_notes: c.notes || f.collection_notes,
      payment_terms: paymentTermsFromClient(c),
    }));
    setClientSearch(c.company_name || "");
    setShowClientSuggestions(false);
    toast({ title: "Cliente selecionado", description: "Endereço de coleta, condição de pagamento e tabela negociada aplicados." });
  };

  // ───────── Repetir último pedido ─────────
  const repeatLastOrder = async () => {
    if (!form.client_id) { toast({ title: "Selecione um cliente cadastrado primeiro", variant: "destructive" }); return; }
    setRepeating(true);
    try {
      const orders = await db.Order.filter({ client_id: form.client_id }, "-created_at", 1);
      const last = orders?.[0];
      if (!last) { toast({ title: "Este cliente ainda não tem pedidos", variant: "destructive" }); return; }
      setForm(f => ({
        ...f,
        freight_type: last.freight_type || f.freight_type,
        freight_payer: last.freight_payer || "cif",
        payment_method: last.payment_method || f.payment_method,
        payment_terms: last.payment_terms || f.payment_terms,
        recipients: (last.recipients || []).map(r => ({
          ...emptyRecipient,
          name: r.name || "", cnpj_cpf: r.cpf_cnpj || r.cnpj_cpf || "", phone: r.phone || "",
          cep: r.cep || "", street: r.street || "", number: r.number || "", complement: r.complement || "",
          neighborhood: r.neighborhood || "", city: r.city || "", state: r.state || "", delivery_notes: r.delivery_notes || "",
          items: (r.items || [{ ...emptyItem }]).map(it => ({
            ...emptyItem, description: it.description || "", package_type: it.package_type || "caixa",
            volumes: it.volumes || 1, weight_kg: it.weight_kg || "", height_cm: it.height_cm || "",
            width_cm: it.width_cm || "", length_cm: it.length_cm || "", declared_value: it.declared_value || "",
            ncm: it.ncm || "", fragile: !!it.fragile, dangerous: !!it.dangerous,
          })),
        })),
      }));
      toast({ title: `Último pedido de ${last.client_name} replicado`, description: `Base: ${last.protocol}. Ajuste as NFs e a data de coleta.` });
    } catch {
      toast({ title: "Erro ao buscar o último pedido", variant: "destructive" });
    } finally {
      setRepeating(false);
    }
  };

  // ───────── Modelos de pedido (S11) ─────────
  const templateData = () => ({
    freight_type: form.freight_type, freight_payer: form.freight_payer,
    payment_method: form.payment_method, payment_terms: form.payment_terms,
    origin: form.origin, collection_notes: form.collection_notes,
    recipients: form.recipients,
  });
  const saveTemplate = async () => {
    const name = window.prompt("Nome do modelo (ex: Remessa mensal Curitiba):");
    if (!name?.trim()) return;
    try {
      await db.OrderTemplate.create({
        name: name.trim(), client_id: form.client_id || null, client_name: form.client_name || null,
        data: templateData(),
      });
      queryClient.invalidateQueries({ queryKey: ["order-templates"] });
      toast({ title: "Modelo salvo!", description: `"${name.trim()}" pode ser reutilizado a qualquer momento.` });
    } catch (e) {
      toast({ title: "Erro ao salvar modelo", description: e?.message, variant: "destructive" });
    }
  };
  const applyTemplate = (t) => {
    const d = t.data || {};
    setForm(f => ({
      ...f,
      freight_type: d.freight_type || f.freight_type,
      freight_payer: d.freight_payer || f.freight_payer,
      payment_method: d.payment_method || f.payment_method,
      payment_terms: d.payment_terms || f.payment_terms,
      origin: d.origin || f.origin,
      collection_notes: d.collection_notes || f.collection_notes,
      recipients: (d.recipients || []).length ? d.recipients : f.recipients,
    }));
    toast({ title: `Modelo "${t.name}" aplicado`, description: "Ajuste a data de coleta e as NFs e envie." });
  };

  // ───────── Importar múltiplas NF-e (XML) ─────────
  const isBlankRecipient = (r) => !r.name && !r.cnpj_cpf && (r.items || []).every(it => !it.nf_number && !it.weight_kg && !it.description);
  const onlyDigits = (s) => (s || "").replace(/\D/g, "");

  const importMultipleNFe = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    let recipients = [...form.recipients];
    let added = 0;
    for (const file of files) {
      try {
        const parsed = parseNFeXML(await file.text());
        if (!parsed) continue;
        const item = { ...emptyItem, ...parsed.item, nf_number: parsed.nf_number || parsed.item?.nf_number || "" };
        const cnpj = onlyDigits(parsed.recipient?.cnpj_cpf);
        const idx = cnpj ? recipients.findIndex(r => onlyDigits(r.cnpj_cpf) === cnpj && cnpj.length > 0) : -1;
        if (idx >= 0) {
          recipients[idx] = { ...recipients[idx], items: [...recipients[idx].items, item] };
        } else {
          recipients.push({
            ...emptyRecipient,
            name: parsed.recipient?.name || "", cnpj_cpf: parsed.recipient?.cnpj_cpf || "", phone: parsed.recipient?.phone || "",
            cep: parsed.recipient?.cep || "", street: parsed.recipient?.street || "", number: parsed.recipient?.number || "",
            complement: parsed.recipient?.complement || "", neighborhood: parsed.recipient?.neighborhood || "",
            city: parsed.recipient?.city || "", state: parsed.recipient?.state || "", items: [item],
          });
        }
        added++;
      } catch { /* ignora arquivo inválido */ }
    }
    if (added > 0) {
      // remove o destinatário-rascunho vazio inicial
      recipients = recipients.filter(r => !(isBlankRecipient(r)) || recipients.length === 1);
      if (recipients.length > 1) recipients = recipients.filter(r => !isBlankRecipient(r));
      setForm(f => ({ ...f, recipients }));
    }
    toast({
      title: added ? `${added} NF-e importada(s)!` : "Nenhuma NF-e válida",
      description: added ? "Destinatários e itens preenchidos e agrupados por CNPJ." : "Verifique os arquivos XML.",
      variant: added ? undefined : "destructive",
    });
  };

  // ───────── Colar chaves de NF-e (44 dígitos) ─────────
  const addChaves = () => {
    const keys = (chaveInput.match(/\d{44}/g) || []);
    if (!keys.length) { toast({ title: "Nenhuma chave de 44 dígitos encontrada", variant: "destructive" }); return; }
    setForm(prev => {
      const recipients = [...prev.recipients];
      const targetIdx = 0; // chaves sem XML vão para o 1º destinatário (operador completa endereço)
      const base = recipients[targetIdx] || { ...emptyRecipient };
      const existingBlank = base.items.length === 1 && !base.items[0].nf_number && !base.items[0].weight_kg && !base.items[0].description;
      const newItems = keys.map(k => ({ ...emptyItem, nf_key: k, nf_number: nfNumberFromKey(k) || "" }));
      recipients[targetIdx] = { ...base, items: existingBlank ? newItems : [...base.items, ...newItems] };
      return { ...prev, recipients };
    });
    setChaveInput("");
    toast({ title: `${keys.length} chave(s) adicionada(s)`, description: "Complete peso, dimensões e endereço de cada item." });
  };

  // ───────── Cotação / totais ─────────
  const freightBreakdown = useMemo(() => {
    const selectedClient = clients.find(c => c.id === form.client_id);
    const cp = selectedClient?.custom_pricing;
    const clientPricing = cp && Object.keys(cp).some(k => cp[k] != null && cp[k] !== "") ? { ...(settings?.pricing || {}), ...cp } : null;

    // Modo simplificado: estima pelo peso total informado (sem cubagem/itens)
    if (isSimple) {
      const kg = parseNum(form.simple?.weight_kg);
      if (!kg) return null;
      const total = calculateFreight(kg, null, settings, clientPricing) || 0;
      return { taxableKg: kg, usedCubic: false, total, freightByWeight: total, grisValue: 0, adValoremValue: 0, tdeValue: 0, tdaValue: 0, tollValue: 0, fixedFee: 0 };
    }

    const allItems = form.recipients.flatMap(r => r.items || []);
    const nfCount = allItems.filter(i => i.nf_number).length || 1;
    const firstDestState = form.recipients[0]?.state || null;
    return quoteFreight({
      items: allItems, distanceKm: null, nfCount, clientPricing, settings,
      originState: form.origin?.state || null, destState: firstDestState,
      freightType: form.freight_type, refDate: form.collection_date || undefined,
    });
  }, [isSimple, form.simple, form.recipients, form.origin?.state, form.client_id, form.freight_type, form.collection_date, clients, settings?.pricing]);

  const totals = useMemo(() => {
    if (isSimple) {
      return {
        recipients: form.recipients.length,
        volumes: parseInt(form.simple?.volumes) || 0,
        weight: parseNum(form.simple?.weight_kg),
        declared: parseNum(form.simple?.declared_value),
        nfCount: 0,
        freightValue: parseNum(form.freight_value),
      };
    }
    const items = form.recipients.flatMap(r => r.items || []);
    return {
      recipients: form.recipients.length,
      volumes: items.reduce((s, i) => s + (parseInt(i.volumes) || 0), 0),
      weight: items.reduce((s, i) => s + parseNum(i.weight_kg), 0),
      declared: items.reduce((s, i) => s + parseNum(i.declared_value), 0),
      nfCount: items.filter(i => i.nf_number || i.nf_key).length,
      freightValue: parseNum(form.freight_value),
    };
  }, [isSimple, form.simple, form.recipients, form.freight_value]);

  // Prazo estimado (maior prazo entre os destinos) e capacidade do veículo
  const destStates = [...new Set(form.recipients.map(r => r.state).filter(Boolean))];
  const prazoDias = destStates.length
    ? Math.max(...destStates.map(s => getDeliveryDaysByState(s, settings, form.origin?.state) || 0))
    : 0;
  const selectedTruck = trucks.find(t => t.id === form.truck_id);
  const taxableKg = freightBreakdown?.taxableKg || totals.weight;
  const capacityPct = selectedTruck?.capacity_kg ? Math.round((taxableKg / selectedTruck.capacity_kg) * 100) : null;

  // Cobertura: destinos (e origem) fora da área atendida (Pe-1)
  const coverageWarnings = useMemo(() => {
    if (!settings?.coverage_type) return [];
    const out = [];
    if (form.origin?.cep && !isAddressInCoverage(form.origin.cep, form.origin.state, form.origin.city, settings)) {
      out.push(`Origem (${form.origin.city || form.origin.cep})`);
    }
    form.recipients.forEach(r => {
      if (r.cep && !isAddressInCoverage(r.cep, r.state, r.city, settings)) {
        out.push(`${r.name || "Destino"} (${r.city || r.cep})`);
      }
    });
    return out;
  }, [settings, form.origin?.cep, form.origin?.state, form.origin?.city, form.recipients]);

  // Possível duplicado: mesmo cliente, mesma origem e mesma data de coleta (Pe-1)
  const duplicateOf = useMemo(() => {
    if (!form.client_id || !form.collection_date) return null;
    const originCep = (form.origin?.cep || "").replace(/\D/g, "");
    const dup = (clientPastOrders || []).find(o =>
      o.status !== "cancelled" &&
      o.collection_date === form.collection_date &&
      (o.origin?.cep || "").replace(/\D/g, "") === originCep && originCep
    );
    return dup?.protocol || null;
  }, [form.client_id, form.collection_date, form.origin?.cep, clientPastOrders]);

  // ───────── Submit ─────────
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    clearAll();
    const today = todayLocalISO();
    const isValid = validate({
      client_name: { condition: !form.client_name.trim() || form.client_name.trim().length < 3, message: "Nome obrigatório (mínimo 3 caracteres)" },
      origin_cep: { condition: (form.origin.cep || "").replace(/\D/g, "").length !== 8, message: "CEP inválido (8 dígitos)" },
      origin_street: { condition: !form.origin.street.trim(), message: "Endereço obrigatório" },
      origin_number: { condition: !form.origin.number.trim(), message: "Número obrigatório" },
      collection_date: { condition: !form.collection_date || form.collection_date < today, message: "Data de coleta deve ser hoje ou futura" },
      payment_method: { condition: !form.payment_method, message: "Forma de pagamento é obrigatória" },
      freight_payer: { condition: !form.freight_payer, message: "Defina quem paga o frete (CIF ou FOB)" },
    });
    if (!isValid) {
      submittingRef.current = false;
      toast({ title: "Revise os campos obrigatórios", variant: "destructive" });
      return;
    }
    // Revalida destinatários/cargas no envio (não só na navegação por etapas)
    const recipientsOk = isSimple
      ? (parseNum(form.simple?.weight_kg) > 0 && (parseInt(form.simple?.volumes) || 0) > 0 && form.recipients.length > 0 && form.recipients.every(r => r.name.trim()))
      : (form.recipients.length > 0 && form.recipients.every(r => r.name.trim() && (r.items || []).some(it => String(it.weight_kg).trim() || Number(it.volumes))));
    if (!recipientsOk) {
      submittingRef.current = false;
      toast({ title: "Cargas/destinatários incompletos", description: "Cada destinatário precisa de nome e carga (peso/volumes).", variant: "destructive" });
      return;
    }
    let protocol;
    try {
      const { data } = await base44.functions.invoke("generateProtocol", {});
      protocol = data?.protocol;
      if (!protocol) throw new Error("Protocolo vazio");
    } catch {
      submittingRef.current = false;
      toast({ title: "Erro ao gerar protocolo", description: "Verifique sua conexão e tente novamente.", variant: "destructive" });
      return;
    }
    const cleanedRecipients = form.recipients.map(r => {
      const { cnpj_cpf, _search, items, ...rest } = r;
      return {
        ...rest, cpf_cnpj: cnpj_cpf || "",
        // No modo simplificado os destinatários não têm itens (NFs entram depois)
        items: isSimple ? [] : (items || []).map(item => ({
          nf_number: item.nf_number || undefined, nf_key: item.nf_key || undefined, ncm: item.ncm || undefined,
          description: item.description || undefined, package_type: item.package_type || undefined,
          fragile: !!item.fragile, dangerous: !!item.dangerous, volumes: Number(item.volumes) || 0,
          weight_kg: parseNum(item.weight_kg) || undefined, height_cm: parseNum(item.height_cm) || undefined,
          width_cm: parseNum(item.width_cm) || undefined, length_cm: parseNum(item.length_cm) || undefined,
          declared_value: parseNum(item.declared_value) || undefined,
        })),
      };
    });
    const totVol = isSimple ? (parseInt(form.simple?.volumes) || 0) : cleanedRecipients.reduce((s, r) => s + r.items.reduce((ss, i) => ss + i.volumes, 0), 0);
    const totKg  = isSimple ? parseNum(form.simple?.weight_kg)     : cleanedRecipients.reduce((s, r) => s + r.items.reduce((ss, i) => ss + (i.weight_kg || 0), 0), 0);
    const totVal = isSimple ? parseNum(form.simple?.declared_value) : cleanedRecipients.reduce((s, r) => s + r.items.reduce((ss, i) => ss + (i.declared_value || 0), 0), 0);
    const payload = {
      protocol, client_name: form.client_name,
      requester_name: form.requester_name || undefined, requester_role: form.requester_role || undefined,
      client_cpf_cnpj: form.client_cpf_cnpj || undefined, client_phone: form.client_phone || undefined,
      client_email: form.client_email || undefined, preferred_contact: form.preferred_contact || "whatsapp",
      freight_type: form.freight_type, priority: form.priority || "normal",
      origin: form.origin, collection_date: form.collection_date,
      collection_date_desired: form.collection_date,
      ...(() => {
        const validExtra = (form.extra_origins || []).filter(o => (o.cep || "").replace(/\D/g, "").length === 8 || (o.street || "").trim());
        return validExtra.length ? { origins: [{ ...form.origin, collection_notes: form.collection_notes || undefined }, ...validExtra] } : {};
      })(),
      collection_time: form.collection_time, collection_notes: form.collection_notes || undefined,
      recipients: cleanedRecipients, total_volumes: totVol, total_weight_kg: totKg, total_declared_value: totVal,
      freight_value: parseNum(form.freight_value), freight_payer: form.freight_payer || "cif",
      payment_method: form.payment_method || undefined, payment_terms: form.payment_terms || undefined,
      payment_status: "pending", general_notes: form.general_notes || undefined,
      // Fluxo de aprovação (item 46): com o toggle ligado, o pedido aguarda liberação.
      status: settings?.require_order_approval ? "awaiting_approval" : "new",
      status_history: [{
        status: settings?.require_order_approval ? "awaiting_approval" : "new",
        timestamp: new Date().toISOString(), user: "Admin",
        note: settings?.require_order_approval ? "Coleta criada — aguardando aprovação" : "Coleta criada pelo painel",
      }],
      ...(form.client_id ? { client_id: form.client_id } : {}),
      ...(form.driver_id ? { driver_id: form.driver_id } : {}),
      ...(form.truck_id ? { truck_id: form.truck_id } : {}),
    };
    createMutation.mutate(payload);
  };

  // ───────── Validação por etapa ─────────
  const validateStep = (n) => {
    clearAll();
    const today = todayLocalISO();
    if (n === 1) {
      return validate({
        client_name: { condition: !form.client_name.trim() || form.client_name.trim().length < 3, message: "Nome obrigatório (mín. 3)" },
        origin_cep: { condition: (form.origin.cep || "").replace(/\D/g, "").length !== 8, message: "CEP inválido (8 dígitos)" },
        origin_street: { condition: !form.origin.street.trim(), message: "Endereço de coleta obrigatório" },
        origin_number: { condition: !form.origin.number.trim(), message: "Número obrigatório" },
        collection_date: { condition: !form.collection_date || form.collection_date < today, message: "Data de coleta hoje ou futura" },
      });
    }
    if (n === 2) {
      if (isSimple) {
        const okS = parseNum(form.simple?.weight_kg) > 0 && (parseInt(form.simple?.volumes) || 0) > 0
          && form.recipients.length > 0 && form.recipients.every(r => r.name.trim());
        if (!okS) toast({ title: "Carga incompleta", description: "Informe volumes e peso total, e ao menos um destinatário com nome.", variant: "destructive" });
        return okS;
      }
      const ok = form.recipients.length > 0 && form.recipients.every(r => r.name.trim() && (r.items || []).some(it => String(it.weight_kg).trim() || Number(it.volumes)));
      if (!ok) toast({ title: "Cargas incompletas", description: "Cada destinatário precisa de nome e ao menos um item com peso/volumes.", variant: "destructive" });
      return ok;
    }
    if (n === 3) {
      return validate({
        payment_method: { condition: !form.payment_method, message: "Forma de pagamento obrigatória" },
        freight_payer: { condition: !form.freight_payer, message: "Defina CIF ou FOB" },
      });
    }
    return true;
  };
  const goNext = () => { if (validateStep(step)) setStep(s => Math.min(4, s + 1)); };
  const goBack = () => setStep(s => Math.max(1, s - 1));

  const sectionCard = (icon, title, children, desc, action) => (
    <section className="bg-card border border-border rounded-md">
      <header className="flex items-start justify-between gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-start gap-2.5">
          {React.createElement(icon, { className: "w-4 h-4 text-primary mt-0.5 flex-shrink-0" })}
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
            {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );

  return (
    <div className="pb-10">
      {/* Barra fixa + stepper */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/coletas")}><ArrowLeft className="w-5 h-5" /></Button>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground leading-tight">Nova Coleta</h1>
              <p className="text-muted-foreground text-xs truncate">
                {dup ? <>Duplicado de <span className="font-mono font-semibold">{dup.protocol}</span></> : "Assistente de cadastro de frete fracionado"}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin/coletas")} className="flex-shrink-0">Cancelar</Button>
        </div>
        {/* Stepper */}
        <div className="flex items-center gap-2 pb-3">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <button type="button" onClick={() => s.n < step && setStep(s.n)}
                className={`flex items-center gap-2 ${s.n < step ? "cursor-pointer" : "cursor-default"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  step > s.n ? "bg-emerald-600 text-white" : step === s.n ? "bg-velox-amber text-white" : "bg-muted text-muted-foreground"
                }`}>{step > s.n ? <Check className="w-3.5 h-3.5" /> : s.n}</span>
                <span className={`text-xs font-medium hidden md:inline ${step === s.n ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ${step > s.n ? "bg-emerald-600" : "bg-border"}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Avisos: cobertura e duplicado (Pe-1) */}
      {(coverageWarnings.length > 0 || duplicateOf) && (
        <div className="mt-3 space-y-2">
          {coverageWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>Fora da área de cobertura:</strong> {coverageWarnings.join(", ")}. Confirme se a operação atende esta(s) região(ões).</span>
            </div>
          )}
          {duplicateOf && (
            <div className="rounded-lg border border-orange-300 bg-orange-500/10 p-3 text-xs text-orange-800 dark:text-orange-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span><strong>Possível duplicado:</strong> já existe o pedido <span className="font-mono font-semibold">{duplicateOf}</span> para este cliente, mesma origem e data. Verifique antes de criar.</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 mt-5 items-start">
        {/* ===== Coluna do passo ===== */}
        <div className="space-y-5 min-w-0">

          {/* PASSO 1 — Remetente e coleta */}
          {step === 1 && (
            <>
              {sectionCard(User, "Remetente (cliente)",
                <>
                  <div className="space-y-1 relative">
                    <label className="text-[12px] font-medium text-foreground/80 block">Buscar cliente cadastrado</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar por nome ou CNPJ..." value={clientSearch} className="pl-9"
                        onChange={e => { setClientSearch(e.target.value); setShowClientSuggestions(true); }}
                        onFocus={() => setShowClientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)} />
                    </div>
                    {showClientSuggestions && clientSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                        {clientSuggestions.map(c => (
                          <button key={c.id} type="button" className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0"
                            onClick={() => selectClient(c)}>
                            <p className="font-medium text-sm">{c.company_name}</p>
                            <p className="text-xs text-muted-foreground">{c.cpf_cnpj}{c.phone && ` · ${c.phone}`}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[11px] text-muted-foreground">Selecionar traz endereço de coleta, condição de pagamento e tabela negociada.</p>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {templates.length > 0 && (
                          <select defaultValue="" onChange={e => { const t = templates.find(x => x.id === e.target.value); if (t) applyTemplate(t); e.target.value = ""; }}
                            className="text-xs border border-border rounded-md h-7 px-2 bg-background text-foreground max-w-[180px]">
                            <option value="" disabled>Usar modelo…</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        )}
                        <button type="button" onClick={saveTemplate}
                          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                          <FileUp className="w-3 h-3" /> Salvar como modelo
                        </button>
                        {form.client_id && (
                          <button type="button" onClick={repeatLastOrder} disabled={repeating}
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                            <Repeat className="w-3 h-3" /> {repeating ? "Buscando..." : "Repetir último pedido"}
                          </button>
                        )}
                      </div>
                    </div>
                    {clientInsights && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10/60 p-3 space-y-2">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                          Este cliente tem {clientInsights.count} pedido(s) anterior(es).
                          {clientInsights.avgDeclared > 0 && <span className="font-normal"> Valor médio declarado: R$ {clientInsights.avgDeclared.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.</span>}
                        </p>
                        {clientInsights.topRecipients.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-[11px] text-blue-700 dark:text-blue-300">Destinatários frequentes:</span>
                            {clientInsights.topRecipients.map((r, i) => (
                              <button key={i} type="button" onClick={() => addSuggestedRecipient(r)}
                                className="text-[11px] bg-card border border-blue-500/30 rounded-full px-2 py-0.5 hover:bg-blue-500/15 text-blue-800 dark:text-blue-300">
                                + {r.name} {r.count > 1 && <span className="text-blue-400">({r.count}x)</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FL label="Razão Social / Nome" required error={errors.client_name}>
                      <Input placeholder="ex: Distribuidora Brasil Ltda" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={errors.client_name ? "border-red-500" : ""} />
                    </FL>
                    <FL label="CPF / CNPJ">
                      <Input placeholder="ex: 00.000.000/0001-00" value={form.client_cpf_cnpj} onChange={e => setForm(f => ({ ...f, client_cpf_cnpj: e.target.value }))} />
                    </FL>
                    <FL label="Responsável pelo agendamento">
                      <Input placeholder="Quem está solicitando" value={form.requester_name || ""} onChange={e => setForm(f => ({ ...f, requester_name: e.target.value }))} />
                    </FL>
                    <FL label="Cargo / Setor">
                      <Input placeholder="ex: Logística" value={form.requester_role || ""} onChange={e => setForm(f => ({ ...f, requester_role: e.target.value }))} />
                    </FL>
                    <FL label="Telefone / WhatsApp">
                      <Input placeholder="ex: (11) 98765-4321" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
                    </FL>
                    <FL label="E-mail">
                      <Input type="email" placeholder="ex: contato@empresa.com.br" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
                    </FL>
                  </div>
                </>
              )}

              {sectionCard(MapPin, "Coleta (origem)",
                <>
                  <AddressFields value={form.origin} onChange={setOrigin} />
                  {(errors.origin_cep || errors.origin_street || errors.origin_number) && (
                    <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle size={11} />{errors.origin_cep || errors.origin_street || errors.origin_number}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FL label="Data de coleta" required error={errors.collection_date}>
                      <Input type="date" value={form.collection_date} onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} className={errors.collection_date ? "border-red-500" : ""} />
                    </FL>
                    <FL label="Período preferencial">
                      <Select value={form.collection_time} onValueChange={v => setForm(f => ({ ...f, collection_time: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Manhã</SelectItem>
                          <SelectItem value="afternoon">Tarde</SelectItem>
                          <SelectItem value="to_arrange">A combinar</SelectItem>
                        </SelectContent>
                      </Select>
                    </FL>
                    <FL label="Prioridade da operação" hint="Define a ordem de atendimento na fila de programação. Não altera o preço do frete.">
                      <Select value={form.priority || "normal"} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">Urgente</SelectItem>
                          <SelectItem value="critical">Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </FL>
                  </div>
                  <FL label="Observações de coleta">
                    <Textarea placeholder="ex: Portaria fecha às 18h, acesso pela rua lateral" rows={2} value={form.collection_notes} onChange={e => setForm(f => ({ ...f, collection_notes: e.target.value }))} className="resize-none" />
                  </FL>
                </>
              )}

              {sectionCard(MapPin, "Pontos de coleta adicionais (coleta consolidada)",
                <div className="space-y-4">
                  <p className="text-[11px] text-muted-foreground">Opcional. Use quando a mesma OS recolhe carga em mais de um remetente. O motorista fará uma parada de coleta em cada ponto.</p>
                  {(form.extra_origins || []).map((o, i) => (
                    <div key={i} className="border border-border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Ponto de coleta {i + 2}</span>
                        <button type="button" onClick={() => removeExtraOrigin(i)} className="text-red-400 hover:text-red-600 dark:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <AddressFields value={o} onChange={(addr) => setExtraOrigin(i, addr)} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FL label="Contato no local"><Input placeholder="Nome / responsável" value={o.contact_name || ""} onChange={e => setExtraOrigin(i, { contact_name: e.target.value })} /></FL>
                        <FL label="Observações deste ponto"><Input placeholder="ex: coletar 10 caixas no setor B" value={o.collection_notes || ""} onChange={e => setExtraOrigin(i, { collection_notes: e.target.value })} /></FL>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addExtraOrigin} className="gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar ponto de coleta</Button>
                </div>
              )}
            </>
          )}

          {/* PASSO 2 — Cargas e notas */}
          {step === 2 && (
            <>
              {/* Modo de captação (Fase 3) */}
              <div className="bg-card border border-border rounded-md p-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-xs font-medium text-muted-foreground">Modo de captação:</span>
                <div className="flex gap-1">
                  {[["detailed", "Detalhada (por NF)"], ["simple", "Simplificada (volume/peso total)"]].map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setCaptureMode(v)}
                      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${captureMode === v ? "border-velox-amber bg-velox-amber/10 font-semibold text-foreground" : "border-border text-muted-foreground hover:bg-muted/50"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground basis-full">
                  {isSimple ? "Coleta simplificada: informe o total das notas (sem detalhar item por item) e os destinatários. As NF-es podem ser vinculadas depois." : "Detalhada: cada destinatário com suas NFs/itens (cubagem por item)."}
                </span>
              </div>

              {!isSimple && (<>
              {sectionCard(FileUp, "Importar NF-e", (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-border rounded-lg py-5 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                      <FileUp className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Importar XML(s) da NF-e</span>
                      <span className="text-[11px] text-muted-foreground">Selecione um ou vários arquivos — agrupa por destinatário</span>
                      <input type="file" accept=".xml,text/xml,application/xml" multiple className="hidden"
                        onChange={(e) => { importMultipleNFe(e.target.files); e.target.value = ""; }} />
                    </label>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-medium text-foreground/80 flex items-center gap-1.5"><ClipboardPaste className="w-3.5 h-3.5" /> Colar chave(s) de NF-e (44 dígitos)</label>
                    <Textarea rows={2} placeholder="Cole uma ou mais chaves (44 dígitos cada). Cria itens com a NF; complete peso/dimensões depois." value={chaveInput} onChange={e => setChaveInput(e.target.value)} className="resize-none font-mono text-xs" />
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={addChaves} className="gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar chaves</Button>
                    </div>
                  </div>
                </div>
              ), "Caminho rápido (padrão TMS) — ou cadastre manualmente abaixo")}

              {sectionCard(Package, "Destinatários e cargas",
                <div className="space-y-6">
                  {form.recipients.map((r, ri) => (
                    <div key={ri} className="border border-border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Destinatário {ri + 1}</span>
                        {form.recipients.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeRecipient(ri)} className="text-red-500 h-7 px-2"><Trash2 className="w-3 h-3" /></Button>
                        )}
                      </div>
                      {/* Busca de destinatário */}
                      <div className="space-y-1 relative">
                        <label className="text-[12px] font-medium text-foreground/80">Buscar destinatário na base</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input placeholder="Buscar por nome ou CNPJ..." className="pl-9" value={r._search || ""}
                            onChange={e => setRecipient(ri, "_search", e.target.value)} />
                        </div>
                        {(r._search || "").length >= 2 && (() => {
                          const q = (r._search || "").toLowerCase();
                          // Prioridade: cadastro de destinatários; depois clientes.
                          const recs = recipientBook
                            .filter(rc => rc.name?.toLowerCase().includes(q) || rc.cpf_cnpj?.includes(r._search || ""))
                            .slice(0, 5)
                            .map(rc => ({ id: "r-" + rc.id, kind: "dest", name: rc.name, cpf: rc.cpf_cnpj, phone: rc.phone, address: rc.address, notes: rc.notes, window: rc.delivery_window }));
                          const cls = clients
                            .filter(c => c.company_name?.toLowerCase().includes(q) || c.cpf_cnpj?.includes(r._search || ""))
                            .slice(0, 5)
                            .map(c => ({ id: "c-" + c.id, kind: "cli", name: c.company_name, cpf: c.cpf_cnpj, phone: c.phone, address: c.address, notes: c.notes, window: c.delivery_window }));
                          const sugs = [...recs, ...cls].slice(0, 6);
                          return sugs.length > 0 ? (
                            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                              {sugs.map(c => (
                                <button key={c.id} type="button" className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0"
                                  onClick={() => setForm(prev => ({ ...prev, recipients: prev.recipients.map((rec, i) => i !== ri ? rec : {
                                    ...rec, name: c.name || "", cnpj_cpf: c.cpf || "", phone: c.phone || "",
                                    cep: c.address?.cep || rec.cep, street: c.address?.street || rec.street, number: c.address?.number || rec.number,
                                    complement: c.address?.complement || rec.complement, neighborhood: c.address?.neighborhood || rec.neighborhood,
                                    city: c.address?.city || rec.city, state: c.address?.state || rec.state, delivery_notes: c.notes || rec.delivery_notes,
                                    delivery_window: c.window || rec.delivery_window, _search: "",
                                  }) }))}>
                                  <p className="font-medium text-sm flex items-center gap-1.5">
                                    {c.name}
                                    <span className={`text-[9px] px-1 rounded ${c.kind === "dest" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : "bg-muted text-muted-foreground"}`}>{c.kind === "dest" ? "destinatário" : "cliente"}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">{c.cpf}{c.address?.city && ` · ${c.address.city}/${c.address.state}`}</p>
                                </button>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FL label="Nome do destinatário" required><Input placeholder="ex: Comércio Central Ltda" value={r.name} onChange={e => setRecipient(ri, "name", e.target.value)} /></FL>
                        <FL label="CNPJ / CPF"><Input placeholder="ex: 12.345.678/0001-90" value={r.cnpj_cpf || ""} onChange={e => setRecipient(ri, "cnpj_cpf", e.target.value)} /></FL>
                      </div>
                      <AddressFields value={r} onChange={(addr) => setRecipientAddress(ri, addr)} />
                      <DeliveryWindowEditor value={r.delivery_window} onChange={(w) => setRecipient(ri, "delivery_window", w)} />
                      <FL label="Observações de entrega"><Textarea placeholder="ex: Entregar somente ao gerente. Portaria fecha às 17h." rows={2} value={r.delivery_notes || ""} onChange={e => setRecipient(ri, "delivery_notes", e.target.value)} className="resize-none" /></FL>

                      {/* Itens / NFs */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens / NFs</span>
                          <Button variant="ghost" size="sm" onClick={() => addItem(ri)} className="h-6 text-xs gap-1"><Plus className="w-3 h-3" /> Item</Button>
                        </div>
                        {r.items.map((item, ii) => (
                          <div key={ii} className="border border-border rounded-lg p-3 space-y-3 bg-background">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item {ii + 1}</span>
                              {r.items.length > 1 && (<Button variant="ghost" size="sm" onClick={() => removeItem(ri, ii)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600 dark:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>)}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Nº da NF</label><Input placeholder="ex: 001234" value={item.nf_number} onChange={e => setItem(ri, ii, "nf_number", e.target.value)} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">NCM</label><Input placeholder="ex: 8471.30" value={item.ncm || ""} onChange={e => setItem(ri, ii, "ncm", e.target.value)} className="h-8 text-sm" maxLength={10} /></div>
                              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Embalagem</label>
                                <Select value={item.package_type || "caixa"} onValueChange={v => setItem(ri, ii, "package_type", v)}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>{PACKAGE_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Volumes <span className="text-red-500">*</span></label><Input type="text" inputMode="numeric" placeholder="ex: 12" value={item.volumes} onChange={e => setItem(ri, ii, "volumes", e.target.value.replace(/\D/g, ""))} className="h-8 text-sm" /></div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">Chave de acesso NF-e (44 dígitos, opcional)</label>
                              <Input placeholder="44 dígitos" value={item.nf_key || ""}
                                onChange={e => { const d = e.target.value.replace(/\D/g, "").slice(0, 44); setItem(ri, ii, "nf_key", d); if (d.length === 44 && !item.nf_number) { const num = nfNumberFromKey(d); if (num) setItem(ri, ii, "nf_number", num); } }}
                                className={`h-8 text-xs font-mono ${item.nf_key ? (validateNFeKey(item.nf_key).valid ? "border-green-400" : "border-red-400") : ""}`} />
                              {item.nf_key && !validateNFeKey(item.nf_key).valid && <p className="text-[11px] text-red-500">Chave inválida — {validateNFeKey(item.nf_key).reason}</p>}
                              {item.nf_key && validateNFeKey(item.nf_key).valid && <p className="text-[11px] text-green-600 dark:text-green-300">✓ Chave válida</p>}
                            </div>
                            <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Descrição da mercadoria <span className="text-red-500">*</span></label><Input placeholder="ex: Caixas de produtos eletrônicos" value={item.description} onChange={e => setItem(ri, ii, "description", e.target.value)} className="text-sm" /></div>
                            <div className="grid grid-cols-4 gap-2">
                              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Peso (kg) <span className="text-red-500">*</span></label><Input type="text" inputMode="decimal" placeholder="ex: 480" value={item.weight_kg} onChange={e => setItem(ri, ii, "weight_kg", e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Alt. (cm)</label><Input type="text" inputMode="decimal" placeholder="40" value={item.height_cm} onChange={e => setItem(ri, ii, "height_cm", e.target.value.replace(/[^0-9.]/g, ""))} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Larg. (cm)</label><Input type="text" inputMode="decimal" placeholder="30" value={item.width_cm} onChange={e => setItem(ri, ii, "width_cm", e.target.value.replace(/[^0-9.]/g, ""))} className="h-8 text-sm" /></div>
                              <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Comp. (cm)</label><Input type="text" inputMode="decimal" placeholder="50" value={item.length_cm} onChange={e => setItem(ri, ii, "length_cm", e.target.value.replace(/[^0-9.]/g, ""))} className="h-8 text-sm" /></div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="space-y-1 w-40"><label className="text-xs font-medium text-muted-foreground">Valor declarado (R$)</label><Input type="text" inputMode="decimal" placeholder="ex: 28.500,00" value={item.declared_value} onChange={e => setItem(ri, ii, "declared_value", e.target.value.replace(/[^0-9.,]/g, ""))} className="h-8 text-sm" /></div>
                              <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer"><input type="checkbox" checked={item.fragile} onChange={e => setItem(ri, ii, "fragile", e.target.checked)} className="w-4 h-4 accent-velox-amber" /> Frágil</label>
                              <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer"><input type="checkbox" checked={item.dangerous} onChange={e => setItem(ri, ii, "dangerous", e.target.checked)} className="w-4 h-4 accent-red-500" /> Produto perigoso</label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addRecipient} className="gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar destinatário</Button>
                </div>
              )}
              </>)}

              {isSimple && (
                <>
                  {sectionCard(Package, "Carga total (coleta simplificada)", (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FL label="Total de volumes" required>
                        <Input type="text" inputMode="numeric" placeholder="ex: 20" value={form.simple.volumes} onChange={e => setForm(f => ({ ...f, simple: { ...f.simple, volumes: e.target.value.replace(/\D/g, "") } }))} />
                      </FL>
                      <FL label="Peso total (kg)" required>
                        <NumericInput value={form.simple.weight_kg} onChange={v => setForm(f => ({ ...f, simple: { ...f.simple, weight_kg: v } }))} placeholder="ex: 850" />
                      </FL>
                      <FL label="Valor declarado total (R$)">
                        <NumericInput currency value={form.simple.declared_value} onChange={v => setForm(f => ({ ...f, simple: { ...f.simple, declared_value: v } }))} placeholder="ex: 40.000,00" />
                      </FL>
                    </div>
                  ), "Informe o total das notas — o detalhamento por NF entra depois (na coleta/CD)")}

                  {sectionCard(MapPin, "Destinatários", (
                    <div className="space-y-4">
                      {form.recipients.map((r, ri) => (
                        <div key={ri} className="border border-border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">Destinatário {ri + 1}</span>
                            {form.recipients.length > 1 && (
                              <Button variant="ghost" size="sm" onClick={() => removeRecipient(ri)} className="text-red-500 h-7 px-2"><Trash2 className="w-3 h-3" /></Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <FL label="Nome do destinatário" required><Input placeholder="ex: Comércio Central Ltda" value={r.name} onChange={e => setRecipient(ri, "name", e.target.value)} /></FL>
                            <FL label="CNPJ / CPF"><Input placeholder="ex: 12.345.678/0001-90" value={r.cnpj_cpf || ""} onChange={e => setRecipient(ri, "cnpj_cpf", e.target.value)} /></FL>
                          </div>
                          <AddressFields value={r} onChange={(addr) => setRecipientAddress(ri, addr)} />
                          <FL label="Observações de entrega"><Textarea rows={2} className="resize-none" placeholder="ex: Portaria fecha às 17h." value={r.delivery_notes || ""} onChange={e => setRecipient(ri, "delivery_notes", e.target.value)} /></FL>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addRecipient} className="gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar destinatário</Button>
                    </div>
                  ), "Sem detalhar NF — só para onde a carga vai")}
                </>
              )}
            </>
          )}

          {/* PASSO 3 — Cotação e pagamento */}
          {step === 3 && (
            <>
              {sectionCard(DollarSign, "Frete e pagamento",
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FL label="Valor do frete cobrado (R$)" hint='Use "Usar estimativa" no resumo ao lado ou informe manualmente.'>
                    <NumericInput currency placeholder="ex: 150,00" value={form.freight_value} onChange={v => setForm(f => ({ ...f, freight_value: v }))} />
                  </FL>
                  <FL label="Tipo de frete">
                    <Select value={form.freight_type} onValueChange={v => setForm(f => ({ ...f, freight_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shared">Fracionado</SelectItem>
                        <SelectItem value="dedicated">Dedicado</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </FL>
                  <FL label="Responsabilidade pelo frete" required error={errors.freight_payer} className="md:col-span-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[{ value: "cif", label: "CIF — Remetente paga", desc: "Mais comum" }, { value: "fob", label: "FOB — Destinatário paga", desc: "" }].map(opt => (
                        <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, freight_payer: opt.value }))}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${form.freight_payer === opt.value ? "border-velox-amber bg-velox-amber/5" : "border-border hover:border-velox-amber/40"}`}>
                          <p className="text-xs font-semibold">{opt.label}</p>{opt.desc && <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>}
                        </button>
                      ))}
                    </div>
                  </FL>
                  <FL label="Forma de pagamento" required error={errors.payment_method}>
                    <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                      <SelectTrigger className={errors.payment_method ? "border-red-500" : ""}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem><SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="transfer">Transferência Bancária</SelectItem><SelectItem value="cash">Dinheiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FL>
                  <FL label="Condições de pagamento">
                    <Select value={form.payment_terms || "after_delivery"} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="after_delivery">Após entrega (padrão)</SelectItem>
                        <SelectItem value="monthly">Faturamento mensal (contrato)</SelectItem>
                        <SelectItem value="7_days">7 dias após entrega</SelectItem>
                        <SelectItem value="15_days">15 dias após entrega</SelectItem>
                        <SelectItem value="30_days">30 dias após entrega</SelectItem>
                      </SelectContent>
                    </Select>
                  </FL>
                </div>
              , "A cotação detalhada está no resumo ao lado")}
            </>
          )}

          {/* PASSO 4 — Atribuição e revisão */}
          {step === 4 && (
            <>
              {sectionCard(TruckIcon, "Atribuição operacional",
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FL label="Motorista" hint="Opcional — pode ser definido no Despacho">
                    <Select value={form.driver_id || "none"} onValueChange={v => setForm(f => ({ ...f, driver_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent><SelectItem value="none">— Não atribuído —</SelectItem>{drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </FL>
                  <FL label="Caminhão" hint="Opcional — o resumo checa a capacidade">
                    <Select value={form.truck_id || "none"} onValueChange={v => setForm(f => ({ ...f, truck_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent><SelectItem value="none">— Não atribuído —</SelectItem>{trucks.filter(t => t.status === "available").map(t => <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model} ({(t.capacity_kg || 0).toLocaleString("pt-BR")} kg)</SelectItem>)}</SelectContent>
                    </Select>
                  </FL>
                  <FL label="Observações internas" className="md:col-span-2">
                    <Textarea placeholder="Notas para uso interno — não aparecem para o cliente" rows={2} value={form.general_notes} onChange={e => setForm(f => ({ ...f, general_notes: e.target.value }))} className="resize-none" />
                  </FL>
                </div>
              )}

              {sectionCard(Check, "Revisão",
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Remetente</span><span className="font-medium text-right">{form.client_name || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Coleta</span><span className="font-medium text-right">{form.origin.city ? `${form.origin.city}/${form.origin.state}` : "—"} · {form.collection_date || "sem data"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Destinatários / NFs / Volumes</span><span className="font-medium">{totals.recipients} / {totals.nfCount} / {totals.volumes}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Peso real / taxável</span><span className="font-medium font-mono">{totals.weight.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} / {taxableKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Valor a cobrar</span><span className="font-bold font-mono text-primary">R$ {totals.freightValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                  {prazoDias > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Prazo estimado</span><span className="font-medium">{prazoDias} dia(s) útil(eis)</span></div>}
                </div>
              , "Confira antes de criar a coleta")}
            </>
          )}

          {/* Navegação do wizard */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="outline" onClick={step === 1 ? () => navigate("/admin/coletas") : goBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> {step === 1 ? "Cancelar" : "Voltar"}
            </Button>
            {step < 4 ? (
              <Button onClick={goNext} className="font-bold gap-2">
                Próximo <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={createMutation.isPending} className="font-bold gap-2">
                <Package className="w-4 h-4" /> {createMutation.isPending ? "Criando..." : "Criar Coleta"}
              </Button>
            )}
          </div>
        </div>

        {/* ===== Painel de cotação ao vivo (sticky) ===== */}
        <aside className="lg:sticky lg:top-32 space-y-4">
          <section className="bg-card border border-border rounded-md overflow-hidden">
            <header className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
              <Calculator className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Resumo da cotação</h3>
            </header>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-3">
                <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Destinatários</p><p className="font-semibold text-sm">{totals.recipients}</p></div>
                <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">NFs</p><p className="font-semibold text-sm">{totals.nfCount}</p></div>
                <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Volumes</p><p className="font-semibold text-sm">{totals.volumes}</p></div>
                <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Peso real</p><p className="font-semibold text-sm font-mono">{totals.weight.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg</p></div>
                {freightBreakdown && (
                  <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Peso taxável</p><p className="font-semibold text-sm font-mono">{freightBreakdown.taxableKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg {freightBreakdown.usedCubic && <span className="text-[10px] text-amber-600 dark:text-amber-300 font-sans">cubado</span>}</p></div>
                )}
                <div><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Valor declarado</p><p className="font-semibold text-sm font-mono">R$ {totals.declared.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
              </div>

              {freightBreakdown ? (
                <>
                  <div className="border-t border-border pt-3 space-y-1 text-xs">
                    {freightBreakdown.freightByWeight > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Frete por peso</span><span className="font-mono">R$ {freightBreakdown.freightByWeight.toFixed(2)}</span></div>}
                    {freightBreakdown.grisValue > 0 && <div className="flex justify-between"><span className="text-muted-foreground">GRIS</span><span className="font-mono">R$ {freightBreakdown.grisValue.toFixed(2)}</span></div>}
                    {freightBreakdown.adValoremValue > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Ad valorem</span><span className="font-mono">R$ {freightBreakdown.adValoremValue.toFixed(2)}</span></div>}
                    {freightBreakdown.tdeValue > 0 && <div className="flex justify-between"><span className="text-muted-foreground">TDE</span><span className="font-mono">R$ {freightBreakdown.tdeValue.toFixed(2)}</span></div>}
                    {freightBreakdown.tdaValue > 0 && <div className="flex justify-between"><span className="text-muted-foreground">TDA</span><span className="font-mono">R$ {freightBreakdown.tdaValue.toFixed(2)}</span></div>}
                    {freightBreakdown.tollValue > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Pedágio</span><span className="font-mono">R$ {freightBreakdown.tollValue.toFixed(2)}</span></div>}
                    {freightBreakdown.fixedFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa fixa</span><span className="font-mono">R$ {freightBreakdown.fixedFee.toFixed(2)}</span></div>}
                    {freightBreakdown.pickupFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa de coleta</span><span className="font-mono">R$ {freightBreakdown.pickupFee.toFixed(2)}</span></div>}
                    {freightBreakdown.surchargeValue > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Adicional {form.freight_type === "urgent" ? "urgente" : "dedicado"} ({freightBreakdown.surchargePct}%)</span><span className="font-mono">R$ {freightBreakdown.surchargeValue.toFixed(2)}</span></div>}
                  </div>
                  <div className="border-t border-border pt-3 flex items-end justify-between gap-2">
                    <div className="min-w-0"><p className="text-[11px] text-muted-foreground uppercase tracking-wide">Frete estimado</p><p className="text-2xl font-bold font-mono text-foreground leading-tight">R$ {freightBreakdown.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
                    <Button size="sm" variant="outline" className="flex-shrink-0" onClick={() => setForm(f => ({ ...f, freight_value: freightBreakdown.total }))}>Usar estimativa</Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground border-t border-border pt-3">Informe peso e dimensões dos itens (Passo 2) para calcular a cotação.</p>
              )}

              <div className="border-t border-border pt-3 flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Valor a cobrar</p>
                <p className="text-lg font-bold font-mono text-primary">R$ {totals.freightValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Prazo + capacidade */}
              {(prazoDias > 0 || capacityPct != null) && (
                <div className="border-t border-border pt-3 space-y-2">
                  {prazoDias > 0 && (
                    <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Prazo estimado</span><span className="font-semibold">{prazoDias} dia(s) útil(eis)</span></div>
                  )}
                  {capacityPct != null && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground flex items-center gap-1"><TruckIcon className="w-3 h-3" /> Ocupação do veículo</span><span className={`font-semibold ${capacityPct > 100 ? "text-red-600 dark:text-red-300" : "text-foreground"}`}>{capacityPct}%</span></div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full ${capacityPct > 100 ? "bg-red-500" : capacityPct > 85 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(capacityPct, 100)}%` }} /></div>
                      {capacityPct > 100 && <p className="text-[11px] text-red-600 dark:text-red-300">Carga acima da capacidade do veículo selecionado.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
            {step === 4 && (
              <div className="p-4 border-t border-border bg-muted/20">
                <Button className="w-full font-bold gap-2" onClick={handleSubmit} disabled={createMutation.isPending}>
                  <Package className="w-4 h-4" /> {createMutation.isPending ? "Criando..." : "Criar Coleta"}
                </Button>
              </div>
            )}
          </section>
          <p className="text-[11px] text-muted-foreground px-1">A cotação atualiza conforme você adiciona cargas. O valor cobrado pode ser ajustado manualmente.</p>
        </aside>
      </div>

      {/* Dialog: criar cadastro do cliente novo */}
      <Dialog open={!!createClientPrompt} onOpenChange={(open) => { if (!open && createClientPrompt) { finishAndNavigate(createClientPrompt.protocol); setCreateClientPrompt(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Criar cadastro de cliente?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground"><strong>"{form.client_name}"</strong> não está na base de clientes. Deseja criar o cadastro automaticamente com os dados informados?</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => { const p = createClientPrompt?.protocol; setCreateClientPrompt(null); finishAndNavigate(p); }}>Não, só o pedido</Button>
            <Button size="sm" className="font-bold" onClick={async () => {
              const p = createClientPrompt?.protocol;
              try {
                await db.Client.create({ company_name: form.client_name, cpf_cnpj: form.client_cpf_cnpj || "", phone: form.client_phone || "", email: form.client_email || "", client_type: "eventual", status: "active" });
                queryClient.invalidateQueries({ queryKey: ["clients"] });
                toast({ title: "Cliente cadastrado!" });
              } catch { toast({ title: "Erro ao cadastrar cliente", variant: "destructive" }); }
              setCreateClientPrompt(null); finishAndNavigate(p);
            }}>Criar cadastro</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

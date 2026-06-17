import React, { useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, Trash2, MapPin, User, Package, DollarSign, AlertCircle, Search, FileUp } from "lucide-react";
import { NumericInput } from "@/components/shared/NumericInput";
import { useFormValidation } from "@/hooks/useFormValidation";
import { calculateFreightFull } from "@/utils/freightCalculator";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { todayLocalISO } from "@/utils/dateUtils";
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

async function fetchCEP(cep) {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
  const data = await res.json();
  return data.erro ? null : data;
}

function fmtCep(digits) {
  return digits.length > 5 ? digits.slice(0, 5) + "-" + digits.slice(5) : digits;
}

function FL({ label, required, children, error }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700 block">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
      <AlertCircle size={14} />
      {message}
    </p>
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { errors, validate, clearAll } = useFormValidation();
  const submittingRef = useRef(false);

  // Duplicação de pedido: vem de OrderDetailPage via location.state
  const dup = location.state?.duplicate;
  // Pré-preenchimento a partir de uma mensagem do site
  const fromMessage = location.state?.fromMessage;

  const [form, setForm] = useState(() => {
    const base = {
      client_name: "", client_cpf_cnpj: "", client_phone: "", client_email: "",
      preferred_contact: "whatsapp",
      freight_type: "shared",
      origin: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
      collection_date: "", collection_time: "morning", collection_notes: "",
      recipients: [{ ...emptyRecipient, items: [{ ...emptyItem }] }],
      freight_value: "", freight_payer: "cif", payment_method: "pix", payment_status: "pending",
      driver_id: "", truck_id: "", general_notes: "",
    };
    if (fromMessage) return { ...base, ...fromMessage };
    if (!dup) return base;
    // Copia dados do pedido original, zerando o que é específico (datas, NFs assinadas, status de entrega)
    return {
      ...base,
      client_id: dup.client_id || undefined,
      client_name: dup.client_name || "",
      client_cpf_cnpj: dup.client_cpf_cnpj || "",
      client_phone: dup.client_phone || "",
      client_email: dup.client_email || "",
      preferred_contact: dup.preferred_contact || "whatsapp",
      freight_type: dup.freight_type || "shared",
      origin: { ...base.origin, ...(dup.origin || {}) },
      collection_time: dup.collection_time || "morning",
      collection_notes: dup.collection_notes || "",
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
      freight_value: dup.freight_value || "",
      freight_payer: dup.freight_payer || "cif",
      payment_method: dup.payment_method || "pix",
      general_notes: dup.general_notes || "",
    };
  });

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });
  const { settings } = useCompanySettings();

  const [clientSearch, setClientSearch] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientSuggestions = clientSearch.length >= 2
    ? clients.filter(c => c.company_name?.toLowerCase().includes(clientSearch.toLowerCase()) || c.cpf_cnpj?.includes(clientSearch)).slice(0, 5)
    : [];

  const [createClientPrompt, setCreateClientPrompt] = useState(null); // { protocol } quando cliente não cadastrado

  const finishAndNavigate = (protocol) => {
    toast({ title: "Pedido criado!", description: `Protocolo: ${protocol}` });
    navigate("/admin/coletas");
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      submittingRef.current = false;
      // Cliente não cadastrado → pergunta via dialog (não bloqueia com window.confirm)
      if (!form.client_id && form.client_name?.trim()) {
        setCreateClientPrompt({ protocol: order.protocol });
      } else {
        finishAndNavigate(order.protocol);
      }
    },
    onError: (e) => {
      submittingRef.current = false;
      toast({ title: "Erro ao criar pedido", description: e?.message || "Tente novamente.", variant: "destructive" });
    },
  });

  const setOrigin = (field, value) => setForm(f => ({ ...f, origin: { ...f.origin, [field]: value } }));
  const setRecipient = (ri, field, value) => {
    setForm(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) =>
        i === ri ? { ...r, [field]: value } : r
      ),
    }));
  };

  const applyRecipientAddress = (ri, data) => {
    setForm(prev => ({
      ...prev,
      recipients: prev.recipients.map((rec, i) =>
        i !== ri ? rec : {
          ...rec,
          street:       data.logradouro || "",
          neighborhood: data.bairro     || "",
          city:         data.localidade || "",
          state:        data.uf         || "",
        }
      ),
    }));
  };
  const setItem = (ri, ii, field, value) => {
    const r = [...form.recipients];
    r[ri].items[ii] = { ...r[ri].items[ii], [field]: value };
    setForm(f => ({ ...f, recipients: r }));
  };
  const importNFe = async (ri, file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseNFeXML(text);
      if (!parsed) {
        toast({ title: "XML inválido", description: "Não foi possível ler o XML da NF-e. Verifique o arquivo.", variant: "destructive" });
        return;
      }
      setForm(prev => ({
        ...prev,
        recipients: prev.recipients.map((rec, i) => i !== ri ? rec : {
          ...rec,
          name: parsed.recipient.name || rec.name,
          cnpj_cpf: parsed.recipient.cnpj_cpf || rec.cnpj_cpf,
          phone: parsed.recipient.phone || rec.phone,
          cep: parsed.recipient.cep || rec.cep,
          street: parsed.recipient.street || rec.street,
          number: parsed.recipient.number || rec.number,
          complement: parsed.recipient.complement || rec.complement,
          neighborhood: parsed.recipient.neighborhood || rec.neighborhood,
          city: parsed.recipient.city || rec.city,
          state: parsed.recipient.state || rec.state,
          items: [{ ...emptyItem, ...parsed.item }],
        }),
      }));
      toast({
        title: "NF-e importada!",
        description: `NF ${parsed.nf_number || "?"} · ${parsed.totals.volumes || 0} vol · ${parsed.totals.weight_kg || 0} kg · R$ ${(parsed.totals.declared_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });
    } catch {
      toast({ title: "Erro ao ler XML", description: "Tente novamente.", variant: "destructive" });
    }
  };

  const addRecipient = () => setForm(f => ({ ...f, recipients: [...f.recipients, { ...emptyRecipient, items: [{ ...emptyItem }] }] }));
  const removeRecipient = (ri) => setForm(f => ({ ...f, recipients: f.recipients.filter((_, i) => i !== ri) }));
  const addItem = (ri) => {
    const r = [...form.recipients];
    r[ri].items.push({ ...emptyItem });
    setForm(f => ({ ...f, recipients: r }));
  };
  const removeItem = (ri, ii) => {
    const r = [...form.recipients];
    r[ri].items = r[ri].items.filter((_, i) => i !== ii);
    setForm(f => ({ ...f, recipients: r }));
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    clearAll();
    const today = todayLocalISO();
    const isValid = validate({
      client_name: {
        condition: !form.client_name.trim() || form.client_name.trim().length < 3,
        message: "Nome obrigatório (mínimo 3 caracteres)",
      },
      origin_cep: {
        condition: (form.origin.cep || "").replace(/\D/g, "").length !== 8,
        message: "CEP inválido (8 dígitos)",
      },
      origin_street: {
        condition: !form.origin.street.trim(),
        message: "Endereço obrigatório",
      },
      origin_number: {
        condition: !form.origin.number.trim(),
        message: "Número obrigatório",
      },
      collection_date: {
        condition: !form.collection_date || form.collection_date < today,
        message: "Data de coleta deve ser hoje ou futura",
      },
      payment_method: {
        condition: !form.payment_method,
        message: "Forma de pagamento é obrigatória",
      },
      freight_payer: {
        condition: !form.freight_payer,
        message: "Defina quem paga o frete (CIF ou FOB)",
      },
    });
    if (!isValid) { submittingRef.current = false; return; }

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

    // Helper: converte string pt-BR "1.234,56" OU en-US "1114.50" para número
    const parseBR = (v) => {
      if (v === "" || v == null) return 0;
      if (typeof v === "number") return v;
      const s = String(v).trim();
      // pt-BR com milhar E decimal: "1.234,56"
      if (s.includes(",") && s.includes(".")) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
      // só vírgula: "1114,50" → decimal pt-BR
      if (s.includes(",") && !s.includes(".")) return parseFloat(s.replace(",", ".")) || 0;
      // só ponto ou sem separador: "1114.50" / "1114" → en-US / inteiro
      return parseFloat(s) || 0;
    };

    const cleanedRecipients = form.recipients.map(r => {
      // remap cnpj_cpf → cpf_cnpj para bater com o schema da entidade
      const { cnpj_cpf, ...rest } = r;
      return {
        ...rest,
        cpf_cnpj: cnpj_cpf || "",
        items: r.items.map(item => ({
          nf_number:      item.nf_number     || undefined,
          nf_key:         item.nf_key        || undefined,
          ncm:            item.ncm           || undefined,
          description:    item.description   || undefined,
          package_type:   item.package_type  || undefined,
          fragile:        !!item.fragile,
          dangerous:      !!item.dangerous,
          volumes:        Number(item.volumes)   || 0,
          weight_kg:      parseBR(item.weight_kg)    || undefined,
          height_cm:      parseBR(item.height_cm)    || undefined,
          width_cm:       parseBR(item.width_cm)     || undefined,
          length_cm:      parseBR(item.length_cm)    || undefined,
          declared_value: parseBR(item.declared_value) || undefined,
        })),
      };
    });

    const totVol = cleanedRecipients.reduce((s, r) => s + r.items.reduce((ss, i) => ss + i.volumes, 0), 0);
    const totKg  = cleanedRecipients.reduce((s, r) => s + r.items.reduce((ss, i) => ss + i.weight_kg, 0), 0);
    const totVal = cleanedRecipients.reduce((s, r) => s + r.items.reduce((ss, i) => ss + i.declared_value, 0), 0);

    const payload = {
      protocol,
      client_name:      form.client_name,
      requester_name:   form.requester_name    || undefined,
      requester_role:   form.requester_role    || undefined,
      client_cpf_cnpj:  form.client_cpf_cnpj  || undefined,
      client_phone:     form.client_phone      || undefined,
      client_email:     form.client_email      || undefined,
      preferred_contact: form.preferred_contact || "whatsapp",
      freight_type:     form.freight_type,
      origin:           form.origin,
      collection_date:  form.collection_date,
      collection_time:  form.collection_time,
      collection_notes: form.collection_notes  || undefined,
      recipients:       cleanedRecipients,
      total_volumes:    totVol,
      total_weight_kg:  totKg,
      total_declared_value: totVal,
      freight_value:    parseBR(form.freight_value),
      freight_payer:    form.freight_payer     || "cif",
      payment_method:   form.payment_method    || undefined,
      payment_status:   "pending",
      general_notes:    form.general_notes     || undefined,
      status:           "new",
      status_history:   [{ status: "new", timestamp: new Date().toISOString(), user: "Admin", note: "Pedido criado pelo painel" }],
    };
    if (form.driver_id) payload.driver_id = form.driver_id;
    if (form.truck_id)  payload.truck_id  = form.truck_id;

    createMutation.mutate(payload);
  };

  const freightBreakdown = useMemo(() => {
    const allItems = form.recipients.flatMap(r => r.items || []);
    const nfCount = allItems.filter(i => i.nf_number).length || 1;
    const firstDestState = form.recipients[0]?.state || null;
    // Tabela negociada do cliente tem prioridade máxima (se preenchida)
    const selectedClient = clients.find(c => c.id === form.client_id);
    const cp = selectedClient?.custom_pricing;
    const clientPricing = cp && Object.keys(cp).some(k => cp[k] != null && cp[k] !== "")
      ? { ...(settings?.pricing || {}), ...cp }
      : null;
    return calculateFreightFull({
      items: allItems, distanceKm: null, nfCount,
      pricing: settings?.pricing,
      clientPricing,
      settings,
      originState: form.origin?.state || null,
      destState: firstDestState,
    });
  }, [form.recipients, form.origin?.state, form.client_id, clients, settings?.pricing]);

  const section = (icon, title, children, desc) => (
    <section className="bg-card border border-border rounded-md">
      <header className="flex items-start gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
        {React.createElement(icon, { className: "w-4 h-4 text-primary mt-0.5 flex-shrink-0" })}
        <div>
          <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </header>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );

  const inputRow = (cols) => <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-3`} />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/coletas")}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Nova Coleta</h1>
          <p className="text-muted-foreground text-xs">
            {dup ? <>Duplicado de <span className="font-mono font-semibold">{dup.protocol}</span> — confira os dados e defina a data de coleta</> : "Cadastro interno de frete"}
          </p>
        </div>
      </div>

      {section(User, "Solicitante",
        <>
          <div className="space-y-1 relative">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Buscar cliente cadastrado</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={clientSearch}
                className="pl-9"
                onChange={e => { setClientSearch(e.target.value); setShowClientSuggestions(true); }}
                onFocus={() => setShowClientSuggestions(true)}
                onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
              />
            </div>
            {showClientSuggestions && clientSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                {clientSuggestions.map(c => (
                  <button key={c.id} type="button" className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        client_name: c.company_name || "", client_cpf_cnpj: c.cpf_cnpj || "",
                        client_phone: c.phone || "", client_email: c.email || "", client_id: c.id,
                        ...(c.address?.cep ? {
                          origin: {
                            cep: c.address.cep, street: c.address.street || "",
                            number: c.address.number || "", complement: c.address.complement || "",
                            neighborhood: c.address.neighborhood || "",
                            city: c.address.city || "", state: c.address.state || "",
                          }
                        } : {}),
                        ...(c.notes ? { collection_notes: c.notes } : {}),
                      }));
                      setClientSearch(c.company_name || "");
                      setShowClientSuggestions(false);
                    }}>
                    <p className="font-medium text-sm">{c.company_name}</p>
                    <p className="text-xs text-muted-foreground">{c.cpf_cnpj}{c.phone && ` · ${c.phone}`}</p>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Ou preencha manualmente abaixo</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FL label="Razão Social / Nome" required error={errors.client_name}>
              <Input placeholder="ex: Distribuidora Brasil Ltda" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} className={errors.client_name ? "border-red-500" : ""} />
            </FL>
            <FL label="CPF / CNPJ">
              <Input placeholder="ex: 00.000.000/0001-00" value={form.client_cpf_cnpj} onChange={e => setForm(f => ({ ...f, client_cpf_cnpj: e.target.value }))} />
            </FL>
            <FL label="Responsável pelo agendamento">
              <Input placeholder="Nome de quem está criando este pedido" value={form.requester_name || ""} onChange={e => setForm(f => ({ ...f, requester_name: e.target.value }))} />
            </FL>
            <FL label="Cargo / Setor">
              <Input placeholder="ex: Expedição, Logística" value={form.requester_role || ""} onChange={e => setForm(f => ({ ...f, requester_role: e.target.value }))} />
            </FL>
            <FL label="Telefone / WhatsApp">
              <Input placeholder="ex: (11) 98765-4321" value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))} />
            </FL>
            <FL label="E-mail">
              <Input type="email" placeholder="ex: contato@empresa.com.br" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} />
            </FL>
            <FL label="Tipo de frete" required>
              <Select value={form.freight_type} onValueChange={v => setForm(f => ({ ...f, freight_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dedicated">Dedicado</SelectItem>
                  <SelectItem value="shared">Fracionado</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </FL>
          </div>
        </>
      )}

      {section(MapPin, "Origem da Coleta",
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FL label="CEP" required error={errors.origin_cep}>
              <Input
                placeholder="ex: 01310-100"
                value={form.origin.cep}
                maxLength={9}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                  const formatted = fmtCep(digits);
                  setForm(prev => ({ ...prev, origin: { ...prev.origin, cep: formatted } }));
                  if (digits.length === 8) {
                    fetchCEP(digits).then(data => {
                      if (!data) return;
                      setForm(prev => ({ ...prev, origin: { ...prev.origin, street: data.logradouro || "", neighborhood: data.bairro || "", city: data.localidade || "", state: data.uf || "" } }));
                    });
                  }
                }}
                onPaste={e => {
                  e.preventDefault();
                  const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
                  const formatted = fmtCep(digits);
                  setForm(prev => ({ ...prev, origin: { ...prev.origin, cep: formatted } }));
                  if (digits.length === 8) {
                    fetchCEP(digits).then(data => {
                      if (!data) return;
                      setForm(prev => ({ ...prev, origin: { ...prev.origin, street: data.logradouro || "", neighborhood: data.bairro || "", city: data.localidade || "", state: data.uf || "" } }));
                    });
                  }
                }}
                className={errors.origin_cep ? "border-red-500" : ""}
              />
            </FL>
            <FL label="Número" required error={errors.origin_number}>
              <Input placeholder="ex: 123" value={form.origin.number} onChange={e => setOrigin("number", e.target.value)} className={errors.origin_number ? "border-red-500" : ""} />
            </FL>
            <FL label="Complemento">
              <Input placeholder="ex: Apto 42, Bloco B" value={form.origin.complement} onChange={e => setOrigin("complement", e.target.value)} />
            </FL>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FL label="Rua / Logradouro" required error={errors.origin_street}>
              <Input placeholder="ex: Av. Paulista" value={form.origin.street} onChange={e => setOrigin("street", e.target.value)} className={errors.origin_street ? "border-red-500" : ""} />
            </FL>
            <FL label="Bairro">
              <Input placeholder="ex: Bela Vista" value={form.origin.neighborhood} onChange={e => setOrigin("neighborhood", e.target.value)} />
            </FL>
            <FL label="Cidade">
              <Input placeholder="ex: São Paulo" value={form.origin.city} onChange={e => setOrigin("city", e.target.value)} />
            </FL>
            <FL label="Estado (UF)">
              <Input placeholder="ex: SP" maxLength={2} value={form.origin.state} onChange={e => setOrigin("state", e.target.value.toUpperCase())} />
            </FL>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FL label="Data de coleta" required error={errors.collection_date}>
              <Input type="date" value={form.collection_date} onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))} className={errors.collection_date ? "border-red-500" : ""} />
            </FL>
            <FL label="Horário preferencial">
              <Select value={form.collection_time} onValueChange={v => setForm(f => ({ ...f, collection_time: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Manhã</SelectItem>
                  <SelectItem value="afternoon">Tarde</SelectItem>
                  <SelectItem value="to_arrange">A combinar</SelectItem>
                </SelectContent>
              </Select>
            </FL>
          </div>
          <FL label="Observações de coleta">
            <Textarea placeholder="ex: Portaria fecha às 18h, acesso pela rua lateral" rows={2} value={form.collection_notes} onChange={e => setForm(f => ({ ...f, collection_notes: e.target.value }))} className="resize-none" />
          </FL>
        </>
      )}

      <section className="bg-card border border-border rounded-md">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Destinatários e Cargas
          </h3>
          <Button variant="outline" size="sm" onClick={addRecipient} className="gap-1 h-7">
            <Plus className="w-3 h-3" /> Destinatário
          </Button>
        </header>
        <div className="space-y-6 p-4">
          {form.recipients.map((r, ri) => (
            <div key={ri} className="border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Destinatário {ri + 1}</span>
                <div className="flex items-center gap-1.5">
                  <label className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border text-xs font-medium cursor-pointer hover:bg-muted/50 transition-colors">
                    <FileUp className="w-3.5 h-3.5 text-primary" /> Importar XML da NF-e
                    <input type="file" accept=".xml,text/xml,application/xml" className="hidden"
                      onChange={(e) => { importNFe(ri, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {form.recipients.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeRecipient(ri)} className="text-red-500 h-7 px-2">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              {/* Busca de destinatário */}
              <div className="space-y-1 relative">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Buscar destinatário na base de clientes</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou CNPJ..."
                    className="pl-9"
                    value={r._search || ""}
                    onChange={e => setForm(prev => ({ ...prev, recipients: prev.recipients.map((rec, i) => i === ri ? { ...rec, _search: e.target.value } : rec) }))}
                  />
                </div>
                {(r._search || "").length >= 2 && (() => {
                  const sugs = clients.filter(c => c.company_name?.toLowerCase().includes((r._search||"").toLowerCase()) || c.cpf_cnpj?.includes(r._search||"")).slice(0, 5);
                  return sugs.length > 0 ? (
                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                      {sugs.map(c => (
                        <button key={c.id} type="button" className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                          onClick={() => setForm(prev => ({ ...prev, recipients: prev.recipients.map((rec, i) => i !== ri ? rec : {
                            ...rec,
                            name: c.company_name || "", cnpj_cpf: c.cpf_cnpj || "", phone: c.phone || "",
                            cep: c.address?.cep || rec.cep, street: c.address?.street || rec.street,
                            number: c.address?.number || rec.number, complement: c.address?.complement || rec.complement,
                            neighborhood: c.address?.neighborhood || rec.neighborhood, city: c.address?.city || rec.city,
                            state: c.address?.state || rec.state, delivery_notes: c.notes || rec.delivery_notes,
                            _search: "", client_id: c.id,
                          })}))}>
                          <p className="font-medium text-sm">{c.company_name}</p>
                          <p className="text-xs text-muted-foreground">{c.cpf_cnpj}{c.address?.city && ` · ${c.address.city}/${c.address.state}`}</p>
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
                <p className="text-xs text-muted-foreground">Ou preencha manualmente abaixo</p>
              </div>

              <FL label="Nome do destinatário" required>
                <Input placeholder="ex: Comércio Central Ltda" value={r.name} onChange={e => setRecipient(ri, "name", e.target.value)} />
              </FL>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FL label="CNPJ / CPF do destinatário">
                  <Input placeholder="ex: 12.345.678/0001-90" value={r.cnpj_cpf || ""} onChange={e => setRecipient(ri, "cnpj_cpf", e.target.value)} />
                </FL>
                <FL label="Telefone">
                  <Input placeholder="ex: (11) 3000-1234" value={r.phone} onChange={e => setRecipient(ri, "phone", e.target.value)} />
                </FL>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FL label="CEP" required>
                  <Input
                    placeholder="ex: 01310-100"
                    value={r.cep}
                    maxLength={9}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                      const formatted = fmtCep(digits);
                      setForm(prev => ({
                        ...prev,
                        recipients: prev.recipients.map((rec, i) =>
                          i === ri ? { ...rec, cep: formatted } : rec
                        ),
                      }));
                      if (digits.length === 8) {
                        fetchCEP(digits).then(data => {
                          if (data) applyRecipientAddress(ri, data);
                        });
                      }
                    }}
                    onPaste={e => {
                      e.preventDefault();
                      const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
                      const formatted = fmtCep(digits);
                      setForm(prev => ({
                        ...prev,
                        recipients: prev.recipients.map((rec, i) =>
                          i === ri ? { ...rec, cep: formatted } : rec
                        ),
                      }));
                      if (digits.length === 8) {
                        fetchCEP(digits).then(data => {
                          if (data) applyRecipientAddress(ri, data);
                        });
                      }
                    }}
                  />
                </FL>
                <FL label="Número">
                  <Input placeholder="ex: 500" value={r.number} onChange={e => setRecipient(ri, "number", e.target.value)} />
                </FL>
                <FL label="Complemento">
                  <Input placeholder="ex: Galpão 3" value={r.complement} onChange={e => setRecipient(ri, "complement", e.target.value)} />
                </FL>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FL label="Rua / Logradouro">
                  <Input placeholder="Preenchido pelo CEP (editável)" value={r.street} onChange={e => setRecipient(ri, "street", e.target.value)} />
                </FL>
                <FL label="Bairro">
                  <Input placeholder="Preenchido pelo CEP" value={r.neighborhood || ""} onChange={e => setRecipient(ri, "neighborhood", e.target.value)} />
                </FL>
                <FL label="Cidade">
                  <Input placeholder="ex: Campinas" value={r.city || ""} onChange={e => setRecipient(ri, "city", e.target.value)} />
                </FL>
                <FL label="Estado (UF)">
                  <Input placeholder="ex: SP" maxLength={2} value={r.state || ""} onChange={e => setRecipient(ri, "state", e.target.value.toUpperCase())} />
                </FL>
              </div>
              <FL label="Observações de entrega">
                <Textarea placeholder="ex: Entregar somente ao gerente. Portaria fecha às 17h." rows={2} value={r.delivery_notes || ""} onChange={e => setRecipient(ri, "delivery_notes", e.target.value)} className="resize-none" />
              </FL>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens / NFs</span>
                  <Button variant="ghost" size="sm" onClick={() => addItem(ri)} className="h-6 text-xs gap-1">
                    <Plus className="w-3 h-3" /> Item
                  </Button>
                </div>
                {r.items.map((item, ii) => (
                  <div key={ii} className="border border-border rounded-lg p-3 space-y-3 bg-background">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item {ii + 1}</span>
                      {r.items.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeItem(ri, ii)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    {/* Linha 1: NF + NCM + Tipo + Volumes */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Nº da NF</label>
                        <Input placeholder="ex: 001234" value={item.nf_number} onChange={e => setItem(ri, ii, "nf_number", e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">NCM</label>
                        <Input placeholder="ex: 8471.30" value={item.ncm || ""} onChange={e => setItem(ri, ii, "ncm", e.target.value)} className="h-8 text-sm" maxLength={10} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Tipo de embalagem</label>
                        <Select value={item.package_type || "caixa"} onValueChange={v => setItem(ri, ii, "package_type", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="caixa">Caixa</SelectItem>
                            <SelectItem value="palete">Palete</SelectItem>
                            <SelectItem value="tambor">Tambor</SelectItem>
                            <SelectItem value="bobina">Bobina</SelectItem>
                            <SelectItem value="fardo">Fardo</SelectItem>
                            <SelectItem value="saco">Saco</SelectItem>
                            <SelectItem value="engradado">Engradado</SelectItem>
                            <SelectItem value="bag">Big Bag</SelectItem>
                            <SelectItem value="rolo">Rolo</SelectItem>
                            <SelectItem value="peca">Peça solta</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Volumes <span className="text-red-500">*</span></label>
                        <Input type="text" inputMode="numeric" placeholder="ex: 12" value={item.volumes} onChange={e => setItem(ri, ii, "volumes", e.target.value.replace(/\D/g, ""))} className="h-8 text-sm" />
                      </div>
                    </div>
                    {/* Linha 1b: Chave NF-e (opcional, com validação) */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Chave de acesso NF-e (44 dígitos, opcional)</label>
                      <Input
                        placeholder="ex: 3526 0612 3456 7800 0190 5500 1000 0012 3410 0012 3456"
                        value={item.nf_key || ""}
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 44);
                          setItem(ri, ii, "nf_key", digits);
                          if (digits.length === 44 && !item.nf_number) {
                            const num = nfNumberFromKey(digits);
                            if (num) setItem(ri, ii, "nf_number", num);
                          }
                        }}
                        className={`h-8 text-xs font-mono ${item.nf_key && item.nf_key.length > 0 ? (validateNFeKey(item.nf_key).valid ? "border-green-400" : "border-red-400") : ""}`}
                      />
                      {item.nf_key && item.nf_key.length > 0 && !validateNFeKey(item.nf_key).valid && (
                        <p className="text-[11px] text-red-500">Chave inválida — {validateNFeKey(item.nf_key).reason}</p>
                      )}
                      {item.nf_key && validateNFeKey(item.nf_key).valid && (
                        <p className="text-[11px] text-green-600">✓ Chave válida</p>
                      )}
                    </div>
                    {/* Linha 2: Descrição */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Descrição da mercadoria <span className="text-red-500">*</span></label>
                      <Input placeholder="ex: Caixas de produtos eletrônicos" value={item.description} onChange={e => setItem(ri, ii, "description", e.target.value)} className="text-sm" />
                    </div>
                    {/* Linha 3: Peso + Dimensões */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Peso total (kg) <span className="text-red-500">*</span></label>
                        <Input type="text" inputMode="decimal" placeholder="ex: 480" value={item.weight_kg} onChange={e => setItem(ri, ii, "weight_kg", e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Alt. (cm)</label>
                        <Input type="text" inputMode="decimal" placeholder="ex: 40" value={item.height_cm} onChange={e => setItem(ri, ii, "height_cm", e.target.value.replace(/[^0-9.]/g, ""))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Larg. (cm)</label>
                        <Input type="text" inputMode="decimal" placeholder="ex: 30" value={item.width_cm} onChange={e => setItem(ri, ii, "width_cm", e.target.value.replace(/[^0-9.]/g, ""))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Comp. (cm)</label>
                        <Input type="text" inputMode="decimal" placeholder="ex: 50" value={item.length_cm} onChange={e => setItem(ri, ii, "length_cm", e.target.value.replace(/[^0-9.]/g, ""))} className="h-8 text-sm" />
                      </div>
                    </div>
                    {/* Linha 4: Valor + Frágil + Perigoso */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="space-y-1 w-36">
                        <label className="text-xs font-medium text-muted-foreground">Valor declarado (R$)</label>
                        <Input type="text" inputMode="decimal" placeholder="ex: 28.500,00" value={item.declared_value} onChange={e => setItem(ri, ii, "declared_value", e.target.value.replace(/[^0-9.,]/g, ""))} className="h-8 text-sm" />
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <input type="checkbox" id={`fragile-${ri}-${ii}`} checked={item.fragile} onChange={e => setItem(ri, ii, "fragile", e.target.checked)} className="w-4 h-4 accent-velox-amber cursor-pointer" />
                        <label htmlFor={`fragile-${ri}-${ii}`} className="text-sm text-foreground cursor-pointer select-none">Frágil</label>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <input type="checkbox" id={`dangerous-${ri}-${ii}`} checked={item.dangerous} onChange={e => setItem(ri, ii, "dangerous", e.target.checked)} className="w-4 h-4 accent-red-500 cursor-pointer" />
                        <label htmlFor={`dangerous-${ri}-${ii}`} className="text-sm text-foreground cursor-pointer select-none">Produto perigoso</label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {section(DollarSign, "Valor e Atribuição",
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor do Frete (R$)</label>
            {(() => {
              const breakdown = freightBreakdown;
              if (!breakdown) return null;
              return (
                <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-700">
                      Estimativa completa:
                      <span className="font-mono font-semibold ml-1">R$ {breakdown.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </span>
                    <button type="button" className="text-velox-amber hover:underline text-xs font-medium flex-shrink-0"
                      onClick={() => setForm(f => ({ ...f, freight_value: freightBreakdown?.total || 0 }))}>
                      Usar este valor
                    </button>
                  </div>
                  <div className="text-[10px] text-amber-600 space-y-0.5">
                    <div className="flex justify-between"><span>Peso taxável: {breakdown.taxableKg.toFixed(1)} kg {breakdown.usedCubic ? "(cubado)" : "(real)"}</span></div>
                    {breakdown.freightByWeight > 0 && <div className="flex justify-between"><span>Frete por peso</span><span className="font-mono">R$ {breakdown.freightByWeight.toFixed(2)}</span></div>}
                    {breakdown.grisValue > 0 && <div className="flex justify-between"><span>GRIS</span><span className="font-mono">R$ {breakdown.grisValue.toFixed(2)}</span></div>}
                    {breakdown.adValoremValue > 0 && <div className="flex justify-between"><span>Ad Valorem</span><span className="font-mono">R$ {breakdown.adValoremValue.toFixed(2)}</span></div>}
                    {breakdown.tdeValue > 0 && <div className="flex justify-between"><span>TDE</span><span className="font-mono">R$ {breakdown.tdeValue.toFixed(2)}</span></div>}
                    {breakdown.tdaValue > 0 && <div className="flex justify-between"><span>TDA</span><span className="font-mono">R$ {breakdown.tdaValue.toFixed(2)}</span></div>}
                    {breakdown.tollValue > 0 && <div className="flex justify-between"><span>Pedágio</span><span className="font-mono">R$ {breakdown.tollValue.toFixed(2)}</span></div>}
                    {breakdown.fixedFee > 0 && <div className="flex justify-between"><span>Taxa fixa</span><span className="font-mono">R$ {breakdown.fixedFee.toFixed(2)}</span></div>}
                  </div>
                </div>
              );
            })()}
            <NumericInput currency placeholder="ex: 2.150,00" value={form.freight_value} onChange={v => setForm(f => ({ ...f, freight_value: v }))} />
            <p className="text-xs text-muted-foreground">Sem distância — baseado no peso e taxas configuradas.</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsabilidade pelo Frete (CIF/FOB) <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "cif", label: "CIF — Remetente paga", desc: "Mais comum" },
                { value: "fob", label: "FOB — Destinatário paga", desc: "" },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(f => ({ ...f, freight_payer: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.freight_payer === opt.value
                      ? "border-velox-amber bg-velox-amber/5"
                      : errors.freight_payer ? "border-red-300" : "border-border hover:border-velox-amber/40"
                  }`}>
                  <p className="text-xs font-semibold">{opt.label}</p>
                  {opt.desc && <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>}
                </button>
              ))}
            </div>
            {errors.freight_payer && <p className="text-xs text-red-500 mt-1">{errors.freight_payer}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Forma de Pagamento <span className="text-red-500">*</span></label>
            <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
              <SelectTrigger className={errors.payment_method ? "border-red-500" : ""}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="transfer">Transferência Bancária</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
            {errors.payment_method && <p className="text-xs text-red-500 mt-1">{errors.payment_method}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Condições de Pagamento</label>
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
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motorista</label>
            <Select value={form.driver_id || "none"} onValueChange={v => setForm(f => ({ ...f, driver_id: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar motorista..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Não atribuído —</SelectItem>
                {drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caminhão</label>
            <Select value={form.truck_id || "none"} onValueChange={v => setForm(f => ({ ...f, truck_id: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar caminhão..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Não atribuído —</SelectItem>
                {trucks.filter(t => t.status === "available").map(t => <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model} ({(t.capacity_kg || 0).toLocaleString("pt-BR")} kg)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações Internas</label>
            <Textarea placeholder="Notas para uso interno — não aparecem para o cliente" rows={2} value={form.general_notes} onChange={e => setForm(f => ({ ...f, general_notes: e.target.value }))} className="resize-none" />
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pb-8">
        <Button variant="outline" onClick={() => navigate("/admin/coletas")}>Cancelar</Button>
        <Button
          className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold px-8"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Criando..." : "Criar Coleta"}
        </Button>
      </div>

      {/* Dialog: criar cadastro do cliente novo */}
      <Dialog open={!!createClientPrompt} onOpenChange={(open) => {
        if (!open && createClientPrompt) { finishAndNavigate(createClientPrompt.protocol); setCreateClientPrompt(null); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar cadastro de cliente?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>"{form.client_name}"</strong> não está na base de clientes. Deseja criar o cadastro automaticamente com os dados informados?
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => {
              const proto = createClientPrompt?.protocol;
              setCreateClientPrompt(null);
              finishAndNavigate(proto);
            }}>Não, só o pedido</Button>
            <Button size="sm" className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" onClick={async () => {
              const proto = createClientPrompt?.protocol;
              try {
                await base44.entities.Client.create({
                  company_name: form.client_name,
                  cpf_cnpj: form.client_cpf_cnpj || "",
                  phone: form.client_phone || "",
                  email: form.client_email || "",
                  client_type: "eventual",
                  status: "active",
                });
                queryClient.invalidateQueries({ queryKey: ["clients"] });
                toast({ title: "Cliente cadastrado!" });
              } catch {
                toast({ title: "Erro ao cadastrar cliente", variant: "destructive" });
              }
              setCreateClientPrompt(null);
              finishAndNavigate(proto);
            }}>Criar cadastro</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
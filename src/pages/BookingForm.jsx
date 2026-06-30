import React, { useState, useEffect } from "react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { todayLocalISO } from "@/utils/dateUtils";
import { isAddressInCoverage } from "@/utils/coverageChecker";
import { parseBRNumber } from "@/utils/number";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import WhatsAppButton from "@/components/public/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle2, AlertCircle, MapPinOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLocation } from "react-router-dom";
import VeloxDatePicker from "@/components/public/VeloxDatePicker";
import { motion, AnimatePresence } from "framer-motion";
import { useFormValidation } from "@/hooks/useFormValidation";
import { calculateFreightFull, getDeliveryDaysByState } from "@/utils/freightCalculator";
import { FreightBreakdown } from "@/components/shared/FreightBreakdown";
import { validateNFeKey, nfNumberFromKey } from "@/utils/nfeUtils";

const INITIAL_ITEM = {
  nf_number: "", nf_key: "", description: "", package_type: "caixa", volumes: 1,
  weight_kg: "", height_cm: "", width_cm: "", length_cm: "",
  declared_value: "", ncm: "", fragile: false, dangerous: false,
};

const INITIAL_RECIPIENT = {
  name: "", cnpj_cpf: "", phone: "", cep: "",
  street: "", number: "", complement: "", neighborhood: "",
  city: "", state: "", delivery_notes: "", items: [{ ...INITIAL_ITEM }],
};

export default function BookingForm() {
  const location = useLocation();
  const prefill = location.state?.prefill;
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [protocol, setProtocol] = useState("");
  const [originCoverageError, setOriginCoverageError] = useState(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const { errors, validate, clearError, clearAll } = useFormValidation();
  const { settings } = useCompanySettings();
  const [submitError, setSubmitError] = useState(null);

  const [clientFoundFeedback, setClientFoundFeedback] = useState(false);

  const [form, setForm] = useState({
    client_name: "", cpf_cnpj: "", phone: "", email: "",
    requester_name: "", requester_role: "",
    preferred_contact: "whatsapp",
    origin_cep: "", origin_street: "", origin_number: "",
    origin_complement: "", origin_neighborhood: "", origin_city: "",
    origin_state: "", collection_date: "", collection_time: "morning",
    collection_notes: "",
    recipients: [{ ...INITIAL_RECIPIENT }],
    freight_type: "shared", general_notes: "",
    freight_payer: "cif",
    transport_modal: "road",
    payment_terms: "after_delivery",
  });

  const updateField = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    clearError(field);
  };

  // Auto-fetch CEP de origem quando atingir 8 dígitos
  useEffect(() => {
    const clean = form.origin_cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    let cancelled = false;
    const run = async () => {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (cancelled) return;
        if (data.erro) {
          setOriginCoverageError({ type: "cep_not_found", message: "CEP não encontrado. Verifique o número digitado." });
          return;
        }
        setForm((f) => ({
          ...f,
          origin_street: data.logradouro || f.origin_street,
          origin_neighborhood: data.bairro || f.origin_neighborhood,
          origin_city: data.localidade || "",
          origin_state: data.uf || "",
        }));
        clearError("origin_street");
        clearError("origin_cep");
        // Verificar cobertura só se settings já carregou do banco
        if (settings && settings.coverage_type) {
          const inCoverage = isAddressInCoverage(clean, data.uf, data.localidade, settings);
          if (!inCoverage) {
            setOriginCoverageError({
              type: "out_of_coverage",
              message: settings.coverage_message ||
                "Infelizmente não atendemos esta região no momento. Entre em contato para verificar possibilidades.",
            });
          } else {
            setOriginCoverageError(null);
          }
        } else {
          setOriginCoverageError(null);
        }
      } catch {
        if (!cancelled) {
          setOriginCoverageError({ type: "fetch_error", message: "Erro ao buscar CEP. Verifique sua conexão." });
        }
      } finally {
        if (!cancelled) setLoadingCep(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [form.origin_cep, settings]); // settings como dependência para re-verificar cobertura ao carregar

  const fetchCep = async (cep, prefix) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (!data.erro) {
      if (prefix === "origin") {
        setForm((f) => ({
          ...f,
          origin_street: data.logradouro || "",
          origin_neighborhood: data.bairro || "",
          origin_city: data.localidade || "",
          origin_state: data.uf || "",
        }));
        clearError("origin_street");
        const inCoverage = isAddressInCoverage(clean, data.uf, data.localidade, settings);
        if (!inCoverage) {
          setOriginCoverageError({
            type: "out_of_coverage",
            message: settings?.coverage_message ||
              "Infelizmente não atendemos esta região no momento. Entre em contato para verificar possibilidades.",
          });
        } else {
          setOriginCoverageError(null);
        }
      }
    }
  };

  const fetchRecipientCep = async (index, cep) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (!data.erro) {
      updateRecipient(index, {
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        cep: clean,
      });
    }
  };

  const updateRecipient = (index, updates) => {
    setForm((f) => {
      const r = [...f.recipients];
      r[index] = { ...r[index], ...updates };
      return { ...f, recipients: r };
    });
  };

  const addRecipient = () => {
    setForm((f) => ({ ...f, recipients: [...f.recipients, { ...INITIAL_RECIPIENT, items: [{ ...INITIAL_ITEM }] }] }));
  };

  const removeRecipient = (index) => {
    if (form.recipients.length === 1) return;
    setForm((f) => ({ ...f, recipients: f.recipients.filter((_, i) => i !== index) }));
  };

  const updateItem = (rIndex, iIndex, updates) => {
    setForm((f) => {
      const r = [...f.recipients];
      const items = [...r[rIndex].items];
      items[iIndex] = { ...items[iIndex], ...updates };
      r[rIndex] = { ...r[rIndex], items };
      return { ...f, recipients: r };
    });
  };

  const addItem = (rIndex) => {
    setForm((f) => {
      const r = [...f.recipients];
      r[rIndex] = { ...r[rIndex], items: [...r[rIndex].items, { ...INITIAL_ITEM }] };
      return { ...f, recipients: r };
    });
  };

  const removeItem = (rIndex, iIndex) => {
    if (form.recipients[rIndex].items.length === 1) return;
    setForm((f) => {
      const r = [...f.recipients];
      r[rIndex] = { ...r[rIndex], items: r[rIndex].items.filter((_, i) => i !== iIndex) };
      return { ...f, recipients: r };
    });
  };

  // Soma os totais usando o parser BR compartilhado (C2 — antes era local).
  const getTotals = () => {
    let volumes = 0, weight = 0, value = 0;
    form.recipients.forEach((r) => {
      r.items.forEach((item) => {
        volumes += parseBRNumber(item.volumes);
        weight += parseBRNumber(item.weight_kg);
        value += parseBRNumber(item.declared_value);
      });
    });
    return { volumes, weight, value, recipients: form.recipients.length };
  };

  const validateStep = (currentStep) => {
    clearAll();
    if (currentStep === 1) {
      return validate({
        client_name: {
          value: form.client_name.trim(),
          condition: !form.client_name.trim() || form.client_name.trim().length < 3,
          message: "Nome obrigatório (mínimo 3 caracteres)",
        },
        contact: {
          condition: !form.phone.trim() && !form.email.trim(),
          message: "Informe pelo menos telefone ou e-mail",
        },
      });
    }
    if (currentStep === 2) {
      const today = todayLocalISO();
      const rules = {
        origin_cep: {
          condition: form.origin_cep.replace(/\D/g, "").length !== 8,
          message: "CEP inválido (8 dígitos numéricos)",
        },
        origin_street: {
          condition: !form.origin_street.trim(),
          message: "Endereço obrigatório",
        },
        origin_number: {
          condition: !form.origin_number.trim(),
          message: "Número obrigatório",
        },
        collection_date: {
          condition: !form.collection_date || form.collection_date < today,
          message: "A data de coleta deve ser hoje ou futura",
        },
      };
      return validate(rules);
    }
    if (currentStep === 3) {
      const newErrors = {};
      form.recipients.forEach((r, ri) => {
        if (!r.name.trim()) newErrors[`recipient_${ri}_name`] = "Nome do destinatário obrigatório";
        if (r.cep.replace(/\D/g, "").length !== 8) newErrors[`recipient_${ri}_cep`] = "CEP inválido";
        if (!r.items || r.items.length === 0) {
          newErrors[`recipient_${ri}_items`] = "Adicione pelo menos 1 item";
        } else {
          r.items.forEach((item, ii) => {
            if (!item.description.trim()) newErrors[`recipient_${ri}_item_${ii}_desc`] = "Descrição obrigatória";
            if (!Number(item.volumes) || Number(item.volumes) <= 0) newErrors[`recipient_${ri}_item_${ii}_vol`] = "Volumes deve ser > 0";
            if (!Number(item.weight_kg) || Number(item.weight_kg) <= 0) newErrors[`recipient_${ri}_item_${ii}_kg`] = "Peso deve ser > 0";
          });
        }
      });
      if (Object.keys(newErrors).length > 0) {
        // use validate with custom errors by setting them directly
        setTimeout(() => {
          const el = document.querySelector("[data-error='true']");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        // set errors via a workaround — call validate with conditions
        const rules = {};
        Object.entries(newErrors).forEach(([k, v]) => {
          rules[k] = { condition: true, message: v };
        });
        validate(rules);
        return false;
      }
      return true;
    }
    return true;
  };

  // Bloqueia avançar do passo 2 quando o CEP de origem está FORA da cobertura
  // ou é INVÁLIDO (não encontrado). Falha de rede (fetch_error) não bloqueia,
  // para uma indisponibilidade do ViaCEP não travar todos os agendamentos.
  const originBlocked = !!originCoverageError && originCoverageError.type !== "fetch_error";

  const handleNext = () => {
    if (step === 2 && originBlocked) return;
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const totals = getTotals();

    // Frete estimado (BUG-05): o resumo já mostrava o valor, mas ele não era
    // gravado no pedido. Calcula igual ao passo 5 e persiste em freight_value.
    const allItems = form.recipients.flatMap(r => r.items || []);
    const estimate = calculateFreightFull({
      items: allItems, distanceKm: null,
      nfCount: allItems.filter(i => i.nf_number).length || 1,
      pricing: settings?.pricing, settings,
      originState: form.origin_state || null,
      destState: form.recipients[0]?.state || null,
    });

    try {
    const { data } = await base44.functions.invoke("generateProtocol", {});
    const proto = data?.protocol;
    if (!proto) throw new Error("Não foi possível gerar o protocolo. Tente novamente.");

    await base44.entities.Order.create({
      protocol: proto,
      requester_name: form.requester_name || undefined,
      requester_role: form.requester_role || undefined,
      client_name: form.client_name,
      client_cpf_cnpj: form.cpf_cnpj,
      client_phone: form.phone,
      client_email: form.email,
      preferred_contact: form.preferred_contact,
      status: settings?.require_order_approval ? "awaiting_approval" : "new",
      freight_type: form.freight_type,
      freight_value: estimate?.total || undefined,
      origin: {
        cep: form.origin_cep,
        street: form.origin_street,
        number: form.origin_number,
        complement: form.origin_complement,
        neighborhood: form.origin_neighborhood,
        city: form.origin_city,
        state: form.origin_state,
      },
      collection_date: form.collection_date,
      collection_time: form.collection_time,
      collection_notes: form.collection_notes,
      recipients: form.recipients,
      total_volumes: totals.volumes,
      total_weight_kg: totals.weight,
      total_declared_value: totals.value,
      general_notes: form.general_notes,
      freight_payer: form.freight_payer || "cif",
      transport_modal: form.transport_modal || "road",
      payment_terms: form.payment_terms || "after_delivery",
      status_history: [{ status: settings?.require_order_approval ? "awaiting_approval" : "new", timestamp: new Date().toISOString(), user: form.client_name, note: "Solicitação via site" }],
    });

    setProtocol(proto);
    setSuccess(true);
    } catch (e) {
      setSubmitError(e?.message || "Erro ao enviar a solicitação. Verifique sua conexão e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: "Solicitante" },
    { num: 2, label: "Origem" },
    { num: 3, label: "Destinatários" },
    { num: 4, label: "Serviço" },
    { num: 5, label: "Resumo" },
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="pt-32 pb-24 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center px-4"
          >
            <div className="w-20 h-20 bg-velox-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-velox-success" />
            </div>
            <h2 className="font-display text-3xl font-extrabold text-velox-dark mb-3">Solicitação Enviada!</h2>
            <p className="text-gray-500 mb-6">Seu protocolo é:</p>
            <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
              <p className="font-mono text-2xl font-bold text-velox-dark">{protocol}</p>
            </div>
            <p className="text-gray-500 text-sm mb-8">
              Você receberá uma confirmação por e-mail. Use o protocolo para rastrear sua carga.
            </p>
            <Button
              onClick={() => window.location.href = "/rastrear"}
              className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold rounded-full px-8"
            >
              Rastrear Carga
            </Button>
          </motion.div>
        </div>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="pt-28 pb-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl font-extrabold text-velox-dark mb-2">
              Solicitar Frete
            </h1>
            {prefill ? (
              <div className="inline-flex items-center gap-2 bg-velox-amber/10 border border-velox-amber/30 rounded-full px-4 py-1.5 mt-2">
                <span className="text-sm font-medium text-velox-dark">
                  ✓ Cotação importada — valor estimado:{" "}
                  <strong>{Number(prefill.quoteResult?.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </span>
              </div>
            ) : (
              <p className="text-gray-500">Preencha os dados para cotação ou agendamento de coleta.</p>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center justify-between mb-10 max-w-xl mx-auto">
            {steps.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      step >= s.num
                        ? "bg-velox-amber text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {s.num}
                  </div>
                  <span className="text-[10px] mt-1.5 text-gray-500 hidden sm:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? "bg-velox-amber" : "bg-gray-200"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <Card className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && <Step1 form={form} updateField={updateField} errors={errors} clientFoundFeedback={clientFoundFeedback} setClientFoundFeedback={setClientFoundFeedback} />}
                {step === 2 && <Step2 form={form} updateField={updateField} fetchCep={fetchCep} errors={errors} coverageError={originCoverageError} settings={settings} loadingCep={loadingCep} />}
                {step === 3 && (
                  <Step3
                    form={form}
                    updateRecipient={updateRecipient}
                    addRecipient={addRecipient}
                    removeRecipient={removeRecipient}
                    updateItem={updateItem}
                    addItem={addItem}
                    removeItem={removeItem}
                    fetchRecipientCep={fetchRecipientCep}
                    errors={errors}
                  />
                )}
                {step === 4 && <Step4 form={form} updateField={updateField} serviceType={settings?.service_type} />}
                {step === 5 && <Step5 form={form} totals={getTotals()} settings={settings} />}
              </motion.div>
            </AnimatePresence>

            {/* Erro de envio */}
            {submitError && step === 5 && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
              ) : <div />}
              {step < 5 ? (
                <Button
                  onClick={handleNext}
                  disabled={step === 2 && originBlocked}
                  className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2 disabled:opacity-50"
                >
                  Próximo <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2"
                >
                  {submitting ? "Enviando..." : "Solicitar Cotação"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
      <PublicFooter />
      <WhatsAppButton />
    </div>
  );
}

function FieldRow({ label, children, error }) {
  return (
    <div data-error={!!error ? "true" : undefined}>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
      {children}
      <FieldError message={error} />
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

function Step1({ form, updateField, errors, clientFoundFeedback, setClientFoundFeedback }) {
  const handleCnpjBlur = async (e) => {
    const cnpj = e.target.value.replace(/\D/g, "");
    if (cnpj.length !== 14 && cnpj.length !== 11) return;
    try {
      const { data: result } = await base44.functions.invoke("getClientByCnpj", { cnpj });
      if (result?.found) {
        updateField("client_name",  result.company_name || "");
        updateField("phone",        result.phone || "");
        updateField("email",        result.email || "");
        updateField("client_id",    result.client_id);
        setClientFoundFeedback(true);
      } else {
        setClientFoundFeedback(false);
      }
    } catch {
      setClientFoundFeedback(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl font-bold text-velox-dark mb-4">Dados do Solicitante</h3>
      <FieldRow label="Nome Completo / Razão Social *" error={errors.client_name}>
        <Input
          value={form.client_name}
          onChange={(e) => updateField("client_name", e.target.value)}
          placeholder="Nome ou razão social"
          className={errors.client_name ? "border-red-500 focus-visible:ring-red-500" : ""}
        />
      </FieldRow>
      <FieldRow label="CPF / CNPJ">
        <Input value={form.cpf_cnpj} onChange={(e) => { updateField("cpf_cnpj", e.target.value); setClientFoundFeedback(false); }} onBlur={handleCnpjBlur} placeholder="000.000.000-00 / 00.000.000/0000-00" />
        {clientFoundFeedback && (
          <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
            <CheckCircle2 size={12} /> Cliente encontrado — dados preenchidos automaticamente
          </p>
        )}
      </FieldRow>
      <FieldRow label="Responsável pelo agendamento *" error={errors.requester_name}>
        <Input value={form.requester_name || ""} onChange={(e) => updateField("requester_name", e.target.value)} placeholder="Nome de quem está solicitando" className={errors.requester_name ? "border-red-500 focus-visible:ring-red-500" : ""} />
      </FieldRow>
      <FieldRow label="Cargo / Setor">
        <Input value={form.requester_role || ""} onChange={(e) => updateField("requester_role", e.target.value)} placeholder="ex: Expedição, Logística, Compras" />
      </FieldRow>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Telefone" error={errors.contact}>
          <Input
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="(00) 00000-0000"
            className={errors.contact ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
        </FieldRow>
        <FieldRow label="E-mail" error={!errors.contact ? undefined : ""}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="seu@email.com"
            className={errors.contact ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
        </FieldRow>
      </div>
      {errors.contact && (
        <p className="text-red-500 text-sm flex items-center gap-1 -mt-2">
          <AlertCircle size={14} /> {errors.contact}
        </p>
      )}
      <FieldRow label="Preferência de contato">
        <Select value={form.preferred_contact} onValueChange={(v) => updateField("preferred_contact", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">Telefone</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
    </div>
  );
}

function Step2({ form, updateField, fetchCep, errors, coverageError, settings, loadingCep }) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-xl font-bold text-velox-dark mb-4">Origem da Coleta</h3>
      <FieldRow label="CEP *" error={errors.origin_cep}>
        <div className="relative">
          <Input
            value={form.origin_cep}
            onChange={(e) => updateField("origin_cep", e.target.value)}
            onBlur={() => fetchCep(form.origin_cep, "origin")}
            placeholder="00000-000"
            className={errors.origin_cep ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          {loadingCep && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-velox-amber border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        {coverageError?.type === "cep_not_found" && (
          <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
            <AlertCircle size={14} /> {coverageError.message}
          </p>
        )}
        {coverageError?.type === "fetch_error" && (
          <p className="text-red-500 text-sm flex items-center gap-1 mt-1">
            <AlertCircle size={14} /> {coverageError.message}
          </p>
        )}
      </FieldRow>
      {coverageError?.type === "out_of_coverage" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPinOff size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Região não atendida</p>
              <p className="text-amber-700 text-sm mt-1">{coverageError.message}</p>
              <a href="#contato" className="text-amber-600 text-sm underline mt-2 inline-block">
                Entre em contato →
              </a>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <FieldRow label="Endereço *" error={errors.origin_street}>
            <Input
              value={form.origin_street}
              onChange={(e) => updateField("origin_street", e.target.value)}
              className={errors.origin_street ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
          </FieldRow>
        </div>
        <FieldRow label="Número *" error={errors.origin_number}>
          <Input
            value={form.origin_number}
            onChange={(e) => updateField("origin_number", e.target.value)}
            className={errors.origin_number ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
        </FieldRow>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FieldRow label="Complemento">
          <Input value={form.origin_complement} onChange={(e) => updateField("origin_complement", e.target.value)} />
        </FieldRow>
        <FieldRow label="Bairro">
          <Input value={form.origin_neighborhood} onChange={(e) => updateField("origin_neighborhood", e.target.value)} />
        </FieldRow>
        <FieldRow label="Cidade / UF">
          <Input value={`${form.origin_city}${form.origin_state ? " / " + form.origin_state : ""}`} readOnly className="bg-muted/50" />
        </FieldRow>
      </div>
      <FieldRow label="Data desejada para coleta *" error={errors.collection_date}>
        <VeloxDatePicker
          settings={settings}
          selectedDate={form.collection_date}
          onSelectDate={(date) => updateField("collection_date", date)}
        />
        {errors.collection_date && (
          <p className="text-red-500 text-sm mt-1">{errors.collection_date}</p>
        )}
      </FieldRow>
      <FieldRow label="Horário preferencial">
        <Select value={form.collection_time} onValueChange={(v) => updateField("collection_time", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="morning">Manhã</SelectItem>
            <SelectItem value="afternoon">Tarde</SelectItem>
            <SelectItem value="to_arrange">A combinar</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Observações de coleta">
        <Textarea value={form.collection_notes} onChange={(e) => updateField("collection_notes", e.target.value)} placeholder="Portaria, restrições de acesso..." rows={3} />
      </FieldRow>
    </div>
  );
}

function Step3({ form, updateRecipient, addRecipient, removeRecipient, updateItem, addItem, removeItem, fetchRecipientCep, errors }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl font-bold text-velox-dark">Destinatários e Cargas</h3>
        <Button variant="outline" size="sm" onClick={addRecipient} className="gap-1.5">
          <Plus className="w-4 h-4" /> Destinatário
        </Button>
      </div>

      {form.recipients.map((recipient, rIndex) => (
        <div key={rIndex} className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <h4 className="font-heading font-semibold text-velox-dark">Destinatário {rIndex + 1}</h4>
            {form.recipients.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeRecipient(rIndex)} className="text-velox-danger">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div data-error={errors[`recipient_${rIndex}_name`] ? "true" : undefined}>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nome / Razão Social *</label>
            <Input
              placeholder="ex: Comércio Central Ltda"
              value={recipient.name}
              onChange={(e) => updateRecipient(rIndex, { name: e.target.value })}
              className={errors[`recipient_${rIndex}_name`] ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {errors[`recipient_${rIndex}_name`] && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{errors[`recipient_${rIndex}_name`]}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">CNPJ / CPF do destinatário</label>
              <Input
                placeholder="ex: 12.345.678/0001-90"
                value={recipient.cnpj_cpf || ""}
                onChange={(e) => updateRecipient(rIndex, { cnpj_cpf: e.target.value })}
                onBlur={async (e) => {
                  const cnpj = e.target.value.replace(/\D/g, "");
                  if (cnpj.length !== 14 && cnpj.length !== 11) return;
                  try {
                    const { data: result } = await base44.functions.invoke("getClientByCnpj", { cnpj });
                    if (result?.found) {
                      updateRecipient(rIndex, {
                        name: result.company_name || recipient.name,
                        phone: result.phone || recipient.phone,
                        ...(result.address?.cep ? {
                          cep: result.address.cep.replace(/\D/g, ""),
                          street: result.address.street || "",
                          number: result.address.number || "",
                          complement: result.address.complement || "",
                          neighborhood: result.address.neighborhood || "",
                          city: result.address.city || "",
                          state: result.address.state || "",
                        } : {}),
                      });
                    }
                  } catch { /* silently fail */ }
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Telefone do destinatário</label>
              <Input placeholder="ex: (11) 99999-0000" value={recipient.phone || ""} onChange={(e) => updateRecipient(rIndex, { phone: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-error={errors[`recipient_${rIndex}_cep`] ? "true" : undefined}>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">CEP de destino *</label>
              <Input
                value={(() => { const d = (recipient.cep || "").replace(/\D/g,""); return d.length <= 5 ? d : `${d.slice(0,5)}-${d.slice(5,8)}`; })()}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                  updateRecipient(rIndex, { cep: digits });
                  if (digits.length === 8) fetchRecipientCep(rIndex, digits);
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
                  updateRecipient(rIndex, { cep: digits });
                  if (digits.length === 8) fetchRecipientCep(rIndex, digits);
                }}
                placeholder="ex: 01310-100"
                className={errors[`recipient_${rIndex}_cep`] ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors[`recipient_${rIndex}_cep`] && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1"><AlertCircle size={14} />{errors[`recipient_${rIndex}_cep`]}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Cidade / UF</label>
              <Input value={`${recipient.city}${recipient.state ? " / " + recipient.state : ""}`} readOnly className="bg-muted/50" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Endereço *</label>
              <Input placeholder="ex: Av. Brasil" value={recipient.street} onChange={(e) => updateRecipient(rIndex, { street: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Número *</label>
              <Input placeholder="ex: 500" value={recipient.number} onChange={(e) => updateRecipient(rIndex, { number: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Complemento</label>
              <Input placeholder="ex: Apto 42, Galpão 3" value={recipient.complement || ""} onChange={(e) => updateRecipient(rIndex, { complement: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Bairro</label>
              <Input placeholder="ex: Centro" value={recipient.neighborhood || ""} onChange={(e) => updateRecipient(rIndex, { neighborhood: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Observações de entrega</label>
            <p className="text-xs text-gray-500 mb-1">Horário de recebimento, restrições de acesso, pessoa responsável, etc.</p>
            <textarea
              placeholder="ex: Entregar somente ao gerente João. Portaria fecha às 17h."
              value={recipient.delivery_notes || ""}
              onChange={(e) => updateRecipient(rIndex, { delivery_notes: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Items */}
          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600">Itens / NFs</p>
              <Button variant="ghost" size="sm" onClick={() => addItem(rIndex)} className="gap-1 text-xs">
                <Plus className="w-3 h-3" /> Item
              </Button>
            </div>
            {recipient.items.map((item, iIndex) => (
              <div key={iIndex} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                {/* Cabeçalho */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Item {iIndex + 1}</span>
                  {recipient.items.length > 1 && (
                    <button onClick={() => removeItem(rIndex, iIndex)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                      <Trash2 size={14} /> Remover
                    </button>
                  )}
                </div>
                {/* Linha 1: NF + NCM + Tipo + Volumes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-1">Nº da Nota Fiscal</label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50" placeholder="ex: 001234" value={item.nf_number} onChange={e => updateItem(rIndex, iIndex, { nf_number: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-1">NCM</label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50" placeholder="ex: 8471.30.12" value={item.ncm || ""} onChange={e => updateItem(rIndex, iIndex, { ncm: e.target.value })} maxLength={10} />
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Código da mercadoria — encontrado na NF</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-1">Tipo de embalagem</label>
                    <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50 bg-white" value={item.package_type || "caixa"} onChange={e => updateItem(rIndex, iIndex, { package_type: e.target.value })}>
                      <option value="caixa">Caixa</option>
                      <option value="palete">Palete</option>
                      <option value="tambor">Tambor</option>
                      <option value="bobina">Bobina</option>
                      <option value="fardo">Fardo</option>
                      <option value="saco">Saco</option>
                      <option value="engradado">Engradado</option>
                      <option value="bag">Big Bag</option>
                      <option value="rolo">Rolo</option>
                      <option value="peca">Peça solta</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-1">Quantidade de volumes <span className="text-red-500">*</span></label>
                    <input
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50 ${errors[`recipient_${rIndex}_item_${iIndex}_vol`] ? "border-red-500" : "border-gray-300"}`}
                      placeholder="ex: 12" inputMode="numeric" value={item.volumes || ""}
                      onChange={e => updateItem(rIndex, iIndex, { volumes: e.target.value.replace(/\D/g, "") })}
                    />
                    {errors[`recipient_${rIndex}_item_${iIndex}_vol`] && <p className="text-red-500 text-xs mt-1">{errors[`recipient_${rIndex}_item_${iIndex}_vol`]}</p>}
                  </div>
                </div>
                {/* Chave NF-e (opcional, com validação) */}
                <div>
                  <label className="block text-sm font-semibold text-velox-dark mb-1">Chave de acesso da NF-e <span className="text-gray-400 font-normal text-xs">44 dígitos, opcional</span></label>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-velox-amber/50 ${
                      item.nf_key ? (validateNFeKey(item.nf_key).valid ? "border-green-400" : "border-red-400") : "border-gray-300"
                    }`}
                    placeholder="Código de barras da DANFE (44 números)"
                    inputMode="numeric"
                    value={item.nf_key || ""}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, "").slice(0, 44);
                      const updates = { nf_key: digits };
                      if (digits.length === 44 && !item.nf_number) {
                        const num = nfNumberFromKey(digits);
                        if (num) updates.nf_number = num;
                      }
                      updateItem(rIndex, iIndex, updates);
                    }}
                  />
                  {item.nf_key && !validateNFeKey(item.nf_key).valid && (
                    <p className="text-red-500 text-xs mt-1">Chave inválida — {validateNFeKey(item.nf_key).reason}</p>
                  )}
                  {item.nf_key && validateNFeKey(item.nf_key).valid && (
                    <p className="text-green-600 text-xs mt-1">✓ Chave válida — nº da NF preenchido automaticamente</p>
                  )}
                </div>
                {/* Linha 2: Descrição */}
                <div>
                  <label className="block text-sm font-semibold text-velox-dark mb-1">Descrição da mercadoria <span className="text-red-500">*</span></label>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50 ${errors[`recipient_${rIndex}_item_${iIndex}_desc`] ? "border-red-500" : "border-gray-300"}`}
                    placeholder="ex: Caixas de produtos eletrônicos, peças automotivas"
                    value={item.description} onChange={e => updateItem(rIndex, iIndex, { description: e.target.value })}
                  />
                  {errors[`recipient_${rIndex}_item_${iIndex}_desc`] && <p className="text-red-500 text-xs mt-1">{errors[`recipient_${rIndex}_item_${iIndex}_desc`]}</p>}
                </div>
                {/* Linha 3: Peso + Dimensões */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-1">Peso total (kg) <span className="text-red-500">*</span></label>
                    <input
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50 ${errors[`recipient_${rIndex}_item_${iIndex}_kg`] ? "border-red-500" : "border-gray-300"}`}
                      placeholder="ex: 480" inputMode="decimal" value={item.weight_kg || ""}
                      onChange={e => updateItem(rIndex, iIndex, { weight_kg: e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".") })}
                    />
                    {errors[`recipient_${rIndex}_item_${iIndex}_kg`] && <p className="text-red-500 text-xs mt-1">{errors[`recipient_${rIndex}_item_${iIndex}_kg`]}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-1">Altura (cm) <span className="text-gray-400 font-normal text-xs">opcional</span></label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50" placeholder="ex: 40" inputMode="decimal" value={item.height_cm || ""} onChange={e => updateItem(rIndex, iIndex, { height_cm: e.target.value.replace(/[^0-9.]/g, "") })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-1">Largura (cm) <span className="text-gray-400 font-normal text-xs">opcional</span></label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50" placeholder="ex: 30" inputMode="decimal" value={item.width_cm || ""} onChange={e => updateItem(rIndex, iIndex, { width_cm: e.target.value.replace(/[^0-9.]/g, "") })} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-1">Comprimento (cm) <span className="text-gray-400 font-normal text-xs">opcional</span></label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50" placeholder="ex: 50" inputMode="decimal" value={item.length_cm || ""} onChange={e => updateItem(rIndex, iIndex, { length_cm: e.target.value.replace(/[^0-9.]/g, "") })} />
                  </div>
                </div>
                {/* Feedback de cubagem em tempo real */}
                {(() => {
                  const h = parseFloat(item.height_cm) || 0;
                  const w = parseFloat(item.width_cm)  || 0;
                  const l = parseFloat(item.length_cm) || 0;
                  const vols = parseInt(item.volumes)  || 1;
                  const real = parseFloat(item.weight_kg) || 0;
                  if (!h || !w || !l || !real) return null;
                  const cubic = (h * w * l / 6000) * vols;
                  const taxable = cubic > real ? cubic : real;
                  const usingCubic = cubic > real;
                  return (
                    <div className={`mt-1 p-3 rounded-xl text-xs flex items-start gap-2 ${usingCubic ? "bg-amber-50 border border-amber-200" : "bg-green-50 border border-green-200"}`}>
                      <span className="text-base mt-0.5">{usingCubic ? "⚠️" : "✓"}</span>
                      <div>
                        <p className={`font-semibold ${usingCubic ? "text-amber-800" : "text-green-800"}`}>
                          {usingCubic ? "Peso cubado é maior — cobrança pelo cubado" : "Peso real é maior — cobrança pelo peso real"}
                        </p>
                        <p className={usingCubic ? "text-amber-700" : "text-green-700"}>
                          Peso cubado: {vols} × ({h}×{w}×{l} ÷ 6.000) = <strong>{cubic.toFixed(2)} kg</strong>
                        </p>
                        <p className={`font-bold mt-0.5 ${usingCubic ? "text-amber-800" : "text-green-800"}`}>
                          Peso taxável: <strong>{taxable.toFixed(2)} kg</strong>
                        </p>
                      </div>
                    </div>
                  );
                })()}
                {/* Linha 4: Valor + Frágil + Perigoso */}
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-sm font-semibold text-velox-dark mb-1">Valor declarado (R$) <span className="text-gray-400 font-normal text-xs">para seguro</span></label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50" placeholder="ex: 28.500,00" inputMode="decimal" value={item.declared_value || ""} onChange={e => updateItem(rIndex, iIndex, { declared_value: e.target.value.replace(/[^0-9.,]/g, "") })} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input type="checkbox" checked={item.fragile} onChange={e => updateItem(rIndex, iIndex, { fragile: e.target.checked })} className="w-4 h-4 accent-velox-amber" />
                    <span className="text-sm font-medium text-velox-dark">Frágil</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input type="checkbox" checked={item.dangerous} onChange={e => updateItem(rIndex, iIndex, { dangerous: e.target.checked })} className="w-4 h-4 accent-red-500" />
                    <span className="text-sm font-medium text-velox-dark">Produto perigoso</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Step4({ form, updateField, serviceType }) {
  const freightOptions = [
    { value: "dedicated", label: "Dedicado", desc: "Caminhão exclusivo para sua carga", icon: "🚛" },
    { value: "shared", label: "Fracionado", desc: "Carga dividida com outros clientes", icon: "📦" },
    { value: "urgent", label: "Urgente", desc: "Prioridade máxima, entrega rápida", icon: "⚡" },
  ].filter(opt => {
    if (serviceType === "dedicated_only") return opt.value === "dedicated";
    if (serviceType === "fractional") return opt.value === "shared";
    return true;
  });

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-xl font-bold text-velox-dark">Tipo de Serviço</h3>

      {/* Tipo de frete */}
      <div>
        <label className="block text-sm font-semibold text-velox-dark mb-3">Tipo de frete <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {freightOptions.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => updateField("freight_type", opt.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.freight_type === opt.value ? "border-velox-amber bg-velox-amber/5" : "border-gray-200 hover:border-velox-amber/50"
              }`}>
              <div className="text-2xl mb-2">{opt.icon}</div>
              <p className="font-semibold text-velox-dark text-sm">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CIF / FOB */}
      <div>
        <label className="block text-sm font-semibold text-velox-dark mb-1">Quem paga o frete? <span className="text-red-500">*</span></label>
        <p className="text-xs text-gray-500 mb-3">Define a responsabilidade pelo pagamento do serviço de transporte.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { value: "cif", label: "CIF — Remetente paga", desc: "Quem envia é responsável pelo frete. Mais comum no Brasil.", badge: "Mais comum" },
            { value: "fob", label: "FOB — Destinatário paga", desc: "Quem recebe é responsável pelo pagamento do frete.", badge: null },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => updateField("freight_payer", opt.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                form.freight_payer === opt.value ? "border-velox-amber bg-velox-amber/5" : "border-gray-200 hover:border-velox-amber/50"
              }`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-velox-dark text-sm">{opt.label}</p>
                {opt.badge && <span className="text-[10px] bg-velox-amber/20 text-white font-semibold px-2 py-0.5 rounded-full">{opt.badge}</span>}
              </div>
              <p className="text-xs text-gray-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Modal de transporte */}
      <div>
        <label className="block text-sm font-semibold text-velox-dark mb-3">Modal de transporte</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { value: "road", label: "Rodoviário", desc: "Padrão — caminhão direto", icon: "🛣️" },
            { value: "urgent_road", label: "Rodoaéreo", desc: "Mais rápido, tarifa maior", icon: "🚀" },
            { value: "air", label: "Aéreo", desc: "Máxima velocidade", icon: "✈️" },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => updateField("transport_modal", opt.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                form.transport_modal === opt.value ? "border-velox-amber bg-velox-amber/5" : "border-gray-200 hover:border-velox-amber/50"
              }`}>
              <div className="text-xl mb-1">{opt.icon}</div>
              <p className="font-semibold text-velox-dark text-xs">{opt.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Observações */}
      <div>
        <label className="block text-sm font-semibold text-velox-dark mb-1">Observações gerais</label>
        <Textarea className="resize-none" rows={3}
          placeholder="Instruções especiais, restrições de horário..."
          value={form.general_notes || ""}
          onChange={e => updateField("general_notes", e.target.value)}
        />
      </div>
    </div>
  );
}

function Step5({ form, totals, settings }) {
  const allItems = form.recipients.flatMap(r => r.items || []);
  const nfCount = allItems.filter(i => i.nf_number).length || 1;
  const firstDestState = form.recipients[0]?.state || null;
  const breakdown = calculateFreightFull({
    items: allItems, distanceKm: null, nfCount,
    pricing: settings?.pricing,
    settings,
    originState: form.origin_state || null,
    destState: firstDestState,
  });
  const destStates = [...new Set(form.recipients.map(r => r.state).filter(Boolean))];

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-xl font-bold text-velox-dark mb-4">Resumo da Solicitação</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-velox-amber/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-velox-dark font-mono">{totals.recipients}</p>
          <p className="text-xs text-gray-500">Destinatários</p>
        </div>
        <div className="bg-velox-amber/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-velox-dark font-mono">{totals.volumes}</p>
          <p className="text-xs text-gray-500">Volumes</p>
        </div>
        <div className="bg-velox-amber/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-velox-dark font-mono">{totals.weight.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Peso (kg)</p>
        </div>
        <div className="bg-velox-amber/10 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-velox-dark font-mono">R$ {totals.value.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Valor Declarado</p>
        </div>
      </div>

      {/* Prazo estimado por destino */}
      {destStates.length > 0 && settings?.delivery_days_table?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">🕐 Prazo estimado de entrega</p>
          {destStates.map(state => {
            const days = getDeliveryDaysByState(state, settings);
            return days ? (
              <p key={state} className="text-sm text-blue-700">
                → <strong>{state}</strong>: {days} dia{days !== 1 ? "s" : ""} útil{days !== 1 ? "eis" : ""} após a coleta
              </p>
            ) : null;
          })}
        </div>
      )}

      {/* CIF/FOB */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm">
        <p className="font-semibold mb-1">Responsabilidade pelo frete</p>
        {form.freight_payer === "cif"
          ? <p className="text-gray-600"><strong>CIF</strong> — O remetente é responsável pelo pagamento do frete.</p>
          : <p className="text-gray-600"><strong>FOB</strong> — O destinatário é responsável pelo pagamento do frete.</p>
        }
        <p className="text-gray-500 text-xs mt-1">Modal: {form.transport_modal === "road" ? "Rodoviário" : form.transport_modal === "urgent_road" ? "Rodoaéreo" : "Aéreo"}</p>
      </div>

      {/* Breakdown do frete */}
      {breakdown && <FreightBreakdown breakdown={breakdown} compact />}

      <div className="space-y-3">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Solicitante</p>
          <p className="font-semibold text-velox-dark">{form.client_name}</p>
          <p className="text-sm text-gray-500">{form.cpf_cnpj} · {form.phone}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Origem</p>
          <p className="text-sm text-gray-700">{form.origin_street}, {form.origin_number} — {form.origin_city}/{form.origin_state}</p>
          <p className="text-sm text-gray-500">Coleta: {form.collection_date} ({form.collection_time === "morning" ? "Manhã" : form.collection_time === "afternoon" ? "Tarde" : "A combinar"})</p>
        </div>
        {form.recipients.map((r, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Destinatário {i + 1}</p>
            <p className="font-medium text-velox-dark">{r.name}</p>
            <p className="text-sm text-gray-500">{r.street}, {r.number} — {r.city}/{r.state}</p>
            <div className="mt-2 space-y-1">
              {r.items.map((item, ii) => (
                <div key={ii} className="text-xs text-gray-600 space-y-0.5 bg-white rounded-lg p-2 border border-gray-100">
                  <p><span className="font-medium">{item.volumes}x {item.package_type || "caixa"}</span>{" — "}{item.description}</p>
                  <p className="text-gray-500">
                    {item.weight_kg} kg
                    {(item.height_cm || item.width_cm || item.length_cm) && ` · ${item.height_cm || "?"}×${item.width_cm || "?"}×${item.length_cm || "?"}cm`}
                    {item.declared_value && ` · R$ ${item.declared_value} declarado`}
                    {item.nf_number && ` · NF: ${item.nf_number}`}
                    {item.ncm && ` · NCM: ${item.ncm}`}
                    {item.fragile && " · ⚠ Frágil"}{item.dangerous && " · ☣ Perigoso"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        * Valores estimados. O frete final será confirmado pela equipe Velox.
      </p>
    </div>
  );
}
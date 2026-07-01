import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { getDeliveryDaysByState } from "@/utils/freightCalculator";
import { quoteFreight } from "@/services/pricing";
import { FreightBreakdown } from "@/components/shared/FreightBreakdown";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import WhatsAppButton from "@/components/public/WhatsAppButton";

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const EMPTY_ITEM = {
  volumes: 1, weight_kg: "", height_cm: "", width_cm: "",
  length_cm: "", declared_value: "", nf_count: 1
};

const INITIAL_FORM = {
  origin_state: "",
  dest_state:   "",
  items: [{ ...EMPTY_ITEM }],
};

export default function QuoteForm() {
  const navigate = useNavigate();
  const { settings } = useCompanySettings();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    const nfCount = form.items.reduce((s, i) => s + (Number(i.nf_count) || 1), 0);
    const items = form.items.map(i => ({
      weight_kg: parseFloat(String(i.weight_kg).replace(",", ".")) || 0,
      height_cm: parseFloat(String(i.height_cm).replace(",", ".")) || 0,
      width_cm:  parseFloat(String(i.width_cm).replace(",", "."))  || 0,
      length_cm: parseFloat(String(i.length_cm).replace(",", ".")) || 0,
      volumes:   parseInt(i.volumes) || 1,
      declared_value: parseFloat(String(i.declared_value).replace(",", ".")) || 0,
    }));
    const breakdown = quoteFreight({
      items,
      distanceKm: null,
      nfCount,
      settings,
      originState: form.origin_state,
      destState: form.dest_state,
    });
    const deliveryDays = getDeliveryDaysByState(form.dest_state, settings);
    setResult({ breakdown, deliveryDays });
    setStep(3);
  };

  const updateItem = (i, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: value };
      return { ...f, items };
    });
  };

  const canProceedStep1 = form.origin_state && form.dest_state;
  const canCalculate = form.items.some(i => parseFloat(String(i.weight_kg).replace(",", ".")) > 0);

  const steps = [
    { n: 1, label: "Rota" },
    { n: 2, label: "Carga" },
    { n: 3, label: "Resultado" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />
      <main className="flex-1 flex items-start justify-center py-12 px-4 pt-28">
        <div className="w-full max-w-xl">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl font-extrabold text-velox-dark">Cotar Frete</h1>
            <p className="text-gray-500 mt-2">
              Simule o valor do frete sem compromisso em menos de 1 minuto.
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {steps.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= s.n ? "bg-velox-amber text-white" : "bg-gray-200 text-gray-400"
                  }`}>{s.n}</div>
                  <span className={`text-sm ${step >= s.n ? "text-velox-dark font-medium" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-gray-200 max-w-[60px]" />}
              </React.Fragment>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

            {/* PASSO 1 — ROTA */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-velox-dark">De onde para onde?</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-2">
                      Estado de origem <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50 bg-white"
                      value={form.origin_state}
                      onChange={e => setForm(f => ({ ...f, origin_state: e.target.value }))}>
                      <option value="">Selecione</option>
                      {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-velox-dark mb-2">
                      Estado de destino <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50 bg-white"
                      value={form.dest_state}
                      onChange={e => setForm(f => ({ ...f, dest_state: e.target.value }))}>
                      <option value="">Selecione</option>
                      {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className="w-full bg-velox-amber text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-velox-amber/90 transition-colors">
                  Próximo →
                </button>
              </div>
            )}

            {/* PASSO 2 — CARGA */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold text-velox-dark">Dados da carga</h2>
                {form.items.map((item, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-4">
                    {form.items.length > 1 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Lote {i + 1}</span>
                        <button
                          onClick={() => setForm(f => ({ ...f, items: f.items.filter((_,j) => j !== i) }))}
                          className="text-xs text-red-400 hover:text-red-600">
                          Remover
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-velox-dark mb-1">
                          Volumes <span className="text-red-500">*</span>
                        </label>
                        <input type="text" inputMode="numeric" placeholder="ex: 10"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50"
                          value={item.volumes}
                          onChange={e => updateItem(i, "volumes", e.target.value.replace(/\D/g,""))} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-velox-dark mb-1">
                          Peso total (kg) <span className="text-red-500">*</span>
                        </label>
                        <input type="text" inputMode="decimal" placeholder="ex: 500"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50"
                          value={item.weight_kg}
                          onChange={e => updateItem(i, "weight_kg", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "height_cm", label: "Altura (cm)" },
                        { key: "width_cm",  label: "Largura (cm)" },
                        { key: "length_cm", label: "Comp. (cm)" },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-sm font-semibold text-velox-dark mb-1">
                            {label} <span className="text-gray-400 font-normal text-xs">opcional</span>
                          </label>
                          <input type="text" inputMode="decimal" placeholder="cm"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50"
                            value={item[key]}
                            onChange={e => updateItem(i, key, e.target.value)} />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-velox-dark mb-1">
                          Valor declarado (R$) <span className="text-gray-400 font-normal text-xs">para seguro</span>
                        </label>
                        <input type="text" inputMode="decimal" placeholder="ex: 50.000"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50"
                          value={item.declared_value}
                          onChange={e => updateItem(i, "declared_value", e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-velox-dark mb-1">
                          Quantidade de NFs
                        </label>
                        <input type="text" inputMode="numeric" placeholder="ex: 2"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-velox-amber/50"
                          value={item.nf_count}
                          onChange={e => updateItem(i, "nf_count", e.target.value.replace(/\D/g,""))} />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))}
                  className="text-sm text-velox-amber hover:underline flex items-center gap-1">
                  + Adicionar outro lote
                </button>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                    ← Voltar
                  </button>
                  <button
                    disabled={!canCalculate}
                    onClick={handleCalculate}
                    className="flex-1 bg-velox-amber text-white font-bold py-3 rounded-xl disabled:opacity-40 hover:bg-velox-amber/90 transition-colors">
                    Calcular frete
                  </button>
                </div>
              </div>
            )}

            {/* PASSO 3 — RESULTADO */}
            {step === 3 && result && (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Valor estimado do frete</p>
                  <p className="text-4xl font-bold font-mono text-velox-amber mt-1">
                    {Number(result.breakdown?.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  {result.deliveryDays && (
                    <p className="text-sm text-gray-600 mt-2">
                      🕐 Prazo estimado para {form.dest_state}:{" "}
                      <strong>{result.deliveryDays} dia{result.deliveryDays !== 1 ? "s" : ""} útil{result.deliveryDays !== 1 ? "eis" : ""}</strong>
                    </p>
                  )}
                </div>

                {result.breakdown && <FreightBreakdown breakdown={result.breakdown} />}

                <p className="text-xs text-gray-400 text-center">
                  * Estimativa sem distância real. Valor final confirmado pela equipe.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => navigate("/agendar", {
                      state: { prefill: { origin_state: form.origin_state, dest_state: form.dest_state, items: form.items, quoteResult: result.breakdown } }
                    })}
                    className="w-full bg-velox-amber text-white font-bold py-3 rounded-xl hover:bg-velox-amber/90 transition-colors">
                    Agendar coleta com este frete →
                  </button>
                  <button
                    onClick={() => { setStep(1); setResult(null); setForm(INITIAL_FORM); }}
                    className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                    Nova cotação
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <PublicFooter />
      <WhatsAppButton />
    </div>
  );
}
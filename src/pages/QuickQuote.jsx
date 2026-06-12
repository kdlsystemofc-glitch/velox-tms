import React, { useState } from "react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import WhatsAppButton from "@/components/public/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/shared/NumericInput";
import { FreightBreakdown } from "@/components/shared/FreightBreakdown";
import { calculateFreightFull, getDeliveryDaysByState } from "@/utils/freightCalculator";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, ArrowRight, RotateCcw } from "lucide-react";

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const INITIAL_FORM = {
  weight_kg: "",
  height_cm: "",
  width_cm: "",
  length_cm: "",
  declared_value: "",
  volumes: 1,
  nf_count: 1,
  dest_state: "",
  distance_km: "",
};

export default function QuickQuote() {
  const { settings } = useCompanySettings();
  const [form, setForm] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [calculated, setCalculated] = useState(false);

  const setF = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleCalculate = () => {
    const weight = parseFloat(String(form.weight_kg).replace(",", ".")) || 0;
    const h = parseFloat(String(form.height_cm).replace(",", ".")) || 0;
    const w = parseFloat(String(form.width_cm).replace(",", ".")) || 0;
    const l = parseFloat(String(form.length_cm).replace(",", ".")) || 0;
    const volumes = parseInt(form.volumes) || 1;
    const declaredValue = parseFloat(String(form.declared_value).replace(",", ".")) || 0;
    const distanceKm = parseFloat(String(form.distance_km).replace(",", ".")) || null;

    const cubicWeight = (h && w && l) ? (h * w * l / 6000) * volumes : 0;
    const taxableWeight = cubicWeight > weight ? cubicWeight : weight;

    const items = [{
      weight_kg: taxableWeight,
      declared_value: declaredValue,
      height_cm: h,
      width_cm: w,
      length_cm: l,
      volumes,
    }];

    const breakdown = calculateFreightFull({
      items,
      distanceKm,
      nfCount: parseInt(form.nf_count) || 1,
      pricing: settings?.pricing,
      settings,
      destState: form.dest_state || null,
    });

    const deliveryDays = form.dest_state
      ? getDeliveryDaysByState(form.dest_state, settings)
      : null;

    setResult({ breakdown, deliveryDays, cubicWeight, taxableWeight, weight, usingCubic: cubicWeight > weight });
    setCalculated(true);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setResult(null);
    setCalculated(false);
  };

  const isValid = parseFloat(String(form.weight_kg).replace(",", ".")) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="pt-28 pb-24">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-velox-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8 text-velox-amber" />
            </div>
            <h1 className="font-display text-4xl font-extrabold text-velox-dark mb-2">
              Cotação Rápida
            </h1>
            <p className="text-gray-500">
              Calcule o frete estimado para sua carga em segundos.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">

            {/* Carga */}
            <div>
              <p className="text-sm font-semibold text-velox-dark uppercase tracking-wider mb-4">Dados da carga</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Peso total (kg) *</label>
                  <NumericInput
                    value={form.weight_kg}
                    onChange={v => setF("weight_kg", v)}
                    placeholder="ex: 480"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Quantidade de volumes</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.volumes}
                    onChange={e => setF("volumes", e.target.value.replace(/\D/g, ""))}
                    placeholder="ex: 12"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Valor declarado (R$)</label>
                  <NumericInput
                    currency
                    value={form.declared_value}
                    onChange={v => setF("declared_value", v)}
                    placeholder="ex: 15.000,00"
                  />
                  <p className="text-[11px] text-gray-400">Para cálculo de GRIS e Ad valorem</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Nº de NFs</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={form.nf_count}
                    onChange={e => setF("nf_count", e.target.value.replace(/\D/g, ""))}
                    placeholder="ex: 3"
                  />
                  <p className="text-[11px] text-gray-400">Para cálculo de TDE/TDA por nota</p>
                </div>
              </div>
            </div>

            {/* Dimensões (opcional) */}
            <div>
              <p className="text-sm font-semibold text-velox-dark uppercase tracking-wider mb-1">Dimensões por volume <span className="text-gray-400 font-normal normal-case">(opcional — para calcular peso cubado)</span></p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Altura (cm)</label>
                  <Input inputMode="decimal" placeholder="ex: 40" value={form.height_cm} onChange={e => setF("height_cm", e.target.value.replace(/[^0-9.,]/g, ""))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Largura (cm)</label>
                  <Input inputMode="decimal" placeholder="ex: 30" value={form.width_cm} onChange={e => setF("width_cm", e.target.value.replace(/[^0-9.,]/g, ""))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600">Comprimento (cm)</label>
                  <Input inputMode="decimal" placeholder="ex: 50" value={form.length_cm} onChange={e => setF("length_cm", e.target.value.replace(/[^0-9.,]/g, ""))} />
                </div>
              </div>
            </div>

            {/* Destino */}
            <div>
              <p className="text-sm font-semibold text-velox-dark uppercase tracking-wider mb-4">Destino <span className="text-gray-400 font-normal normal-case">(opcional — para prazo estimado)</span></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Estado de destino</label>
                  <Select value={form.dest_state} onValueChange={v => setF("dest_state", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione a UF" /></SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Distância estimada (km)</label>
                  <Input inputMode="decimal" placeholder="ex: 850" value={form.distance_km} onChange={e => setF("distance_km", e.target.value.replace(/[^0-9.,]/g, ""))} />
                  <p className="text-[11px] text-gray-400">Influencia o custo por km</p>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-3 pt-2">
              {calculated && (
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCcw className="w-4 h-4" /> Limpar
                </Button>
              )}
              <Button
                onClick={handleCalculate}
                disabled={!isValid}
                className="flex-1 bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2"
              >
                <Calculator className="w-4 h-4" />
                Calcular frete estimado
              </Button>
            </div>
          </div>

          {/* Resultado */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6 space-y-4"
              >
                {/* Peso taxável */}
                <div className={`rounded-xl p-4 text-sm border ${result.usingCubic ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                  <p className={`font-semibold ${result.usingCubic ? "text-amber-800" : "text-green-800"}`}>
                    {result.usingCubic ? "⚠️ Peso cubado é maior — cobrança pelo cubado" : "✓ Peso real é maior — cobrança pelo peso real"}
                  </p>
                  {result.usingCubic && (
                    <p className="text-amber-700 mt-1">
                      Peso real: {result.weight.toFixed(2)} kg · Peso cubado: {result.cubicWeight.toFixed(2)} kg
                    </p>
                  )}
                  <p className={`font-bold mt-1 ${result.usingCubic ? "text-amber-800" : "text-green-800"}`}>
                    Peso taxável: {result.taxableWeight.toFixed(2)} kg
                  </p>
                </div>

                {/* Prazo estimado */}
                {result.deliveryDays && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-800">
                      🕐 Prazo estimado para {form.dest_state}: {result.deliveryDays} dia{result.deliveryDays !== 1 ? "s" : ""} útil{result.deliveryDays !== 1 ? "eis" : ""} após a coleta
                    </p>
                  </div>
                )}

                {/* Breakdown */}
                {result.breakdown && <FreightBreakdown breakdown={result.breakdown} />}

                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-500 text-center">
                  * Estimativa baseada na tabela de preços vigente. O valor final será confirmado pela equipe Velox.
                </div>

                {/* CTA */}
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600 mb-3">Gostou? Solicite a coleta agora mesmo.</p>
                  <a href="/agendar">
                    <Button className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2 rounded-full px-8">
                      Solicitar coleta <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <PublicFooter />
      <WhatsAppButton />
    </div>
  );
}
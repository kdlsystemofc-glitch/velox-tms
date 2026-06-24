import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Plus, X, Save } from "lucide-react";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function CoverageSettings({ form, setF, onSave, saving }) {
  const [cityInput, setCityInput] = useState({ city: "", state: "" });
  const [cepInput, setCepInput] = useState({ from: "", to: "", label: "" });

  const serviceType = form.service_type || "dedicated_only";
  const coverageType = form.coverage_type || "";
  const coverageStates = form.coverage_states || [];
  const coverageCities = form.coverage_cities || [];
  const coverageRanges = form.coverage_cep_ranges || [];

  const toggleState = (uf) => {
    const updated = coverageStates.includes(uf)
      ? coverageStates.filter(s => s !== uf)
      : [...coverageStates, uf];
    setF("coverage_states", updated);
  };

  const addCity = () => {
    if (!cityInput.city.trim() || !cityInput.state) return;
    setF("coverage_cities", [...coverageCities, { city: cityInput.city.trim(), state: cityInput.state }]);
    setCityInput({ city: "", state: "" });
  };

  const removeCity = (i) => setF("coverage_cities", coverageCities.filter((_, idx) => idx !== i));

  const addRange = () => {
    if (!cepInput.from || !cepInput.to) return;
    setF("coverage_cep_ranges", [...coverageRanges, { ...cepInput }]);
    setCepInput({ from: "", to: "", label: "" });
  };

  const removeRange = (i) => setF("coverage_cep_ranges", coverageRanges.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-velox-amber" /> Área de Atuação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Tipo de serviço */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Tipo de serviço prestado</p>
          <div className="flex flex-col gap-2">
            {[
              { value: "dedicated_only", label: "Somente frete dedicado" },
              { value: "fractional", label: "Somente frete fracionado" },
              { value: "both", label: "Ambos" },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="service_type"
                  value={opt.value}
                  checked={serviceType === opt.value}
                  onChange={() => setF("service_type", opt.value)}
                  className="accent-amber-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Modelo de captação de coleta */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Modelo de captação de coleta</p>
          <div className="flex flex-col gap-2">
            {[
              { value: "detailed", label: "Detalhada — item por NF (cubagem)" },
              { value: "simple", label: "Simplificada — só volume/peso total + destinatários" },
              { value: "both", label: "Ambos — operador escolhe em cada coleta" },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="collection_model"
                  value={opt.value}
                  checked={(form.collection_model || "both") === opt.value}
                  onChange={() => setF("collection_model", opt.value)}
                  className="accent-amber-500"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Define como começa a tela "Nova Coleta". "Simplificada" é o padrão de grandes transportadoras (NFs vinculadas depois).</p>
        </div>

        {/* Como define a área */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Como você define sua área?</p>
          <Select value={coverageType} onValueChange={v => setF("coverage_type", v)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="states">Por estados (UF)</SelectItem>
              <SelectItem value="cities">Por cidades específicas</SelectItem>
              <SelectItem value="cep_range">Por faixa de CEP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Por estados */}
        {coverageType === "states" && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Selecione os estados atendidos</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {ESTADOS_BR.map(uf => (
                <label key={uf} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={coverageStates.includes(uf)}
                    onCheckedChange={() => toggleState(uf)}
                  />
                  <span className="text-sm font-mono font-medium">{uf}</span>
                </label>
              ))}
            </div>
            {coverageStates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {coverageStates.map(uf => (
                  <span key={uf} className="bg-velox-amber/10 text-velox-amber text-xs font-bold px-2 py-0.5 rounded-full">{uf}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Por cidades */}
        {coverageType === "cities" && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Cidades atendidas</p>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Nome da cidade"
                value={cityInput.city}
                onChange={e => setCityInput(c => ({ ...c, city: e.target.value }))}
                className="w-40"
              />
              <Select value={cityInput.state} onValueChange={v => setCityInput(c => ({ ...c, state: v }))}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" variant="outline" onClick={addCity} className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {coverageCities.map((c, i) => (
                <span key={i} className="flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-0.5 rounded-full">
                  {c.city} - {c.state}
                  <button onClick={() => removeCity(i)} className="ml-1 text-muted-foreground hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {coverageCities.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma cidade adicionada.</p>}
            </div>
          </div>
        )}

        {/* Por faixa de CEP */}
        {coverageType === "cep_range" && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Faixas de CEP atendidas</p>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">CEP Inicial</p>
                <Input placeholder="00000-000" value={cepInput.from} onChange={e => setCepInput(c => ({ ...c, from: e.target.value }))} className="w-32" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">CEP Final</p>
                <Input placeholder="99999-999" value={cepInput.to} onChange={e => setCepInput(c => ({ ...c, to: e.target.value }))} className="w-32" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-1">Rótulo (opcional)</p>
                <Input placeholder="Ex: Grande SP" value={cepInput.label} onChange={e => setCepInput(c => ({ ...c, label: e.target.value }))} className="w-36" />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addRange} className="gap-1 mb-0">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-1.5 mt-3">
              {coverageRanges.map((r, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                  <span className="font-mono">{r.from}</span>
                  <span className="text-muted-foreground">até</span>
                  <span className="font-mono">{r.to}</span>
                  {r.label && <span className="text-muted-foreground">— {r.label}</span>}
                  <button onClick={() => removeRange(i)} className="ml-auto text-muted-foreground hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {coverageRanges.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma faixa adicionada.</p>}
            </div>
          </div>
        )}

        {/* Mensagem fora da área */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Mensagem para clientes fora da área</p>
          <Textarea
            rows={3}
            value={form.coverage_message || ""}
            onChange={e => setF("coverage_message", e.target.value)}
            placeholder="Infelizmente não atendemos esta região no momento. Entre em contato para verificar possibilidades."
            className="resize-none"
          />
        </div>

        <div className="flex justify-end">
          <Button className="font-bold gap-2" onClick={onSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar configurações de área"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
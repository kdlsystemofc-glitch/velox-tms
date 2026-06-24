import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Building2, DollarSign, Bell, Globe, MessageSquare, Save, MapPin, CalendarDays, Shield, Clock, Plus, BarChart3, Package, Route, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/shared/NumericInput";
import { Checkbox } from "@/components/ui/checkbox";
import CoverageSettings from "@/components/admin/CoverageSettings";
import { useAuth } from "@/lib/AuthContext";
import { resetSettingsCache } from "@/hooks/useCompanySettings";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/utils/validators";

// Campos da config geridos por OUTROS módulos — nunca sobrescrever ao salvar aqui (Cfg-1).
const EXTERNAL_KEYS = ["opening_cash_balance", "opening_cash_date", "documents"];

export default function AdminSettings({ only = null }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // `only` (array de chaves de aba) limita quais grupos de parâmetros renderizar.
  // Usado pelo ConfigPage para distribuir os parâmetros em categorias laterais.
  const allow = (key) => !only || only.includes(key);
  const firstTab = only ? only[0] : "company";

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: () => base44.entities.CompanySettings.list(),
    select: (d) => d[0] || {},
  });

  const [form, setForm] = useState({});
  // Semeia o form UMA vez (Cfg-1): refetches em background (ex.: outro módulo
  // invalida a config) não apagam mais a edição em andamento.
  const seeded = useRef(false);
  useEffect(() => {
    if (settings && settings.id && !seeded.current) {
      const cleaned = { ...settings };
      if (cleaned.working_days) cleaned.working_days = cleaned.working_days.map(d => parseInt(d, 10));
      if (cleaned.min_advance_days != null) cleaned.min_advance_days = parseInt(cleaned.min_advance_days, 10);
      setForm(cleaned);
      seeded.current = true;
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      // Garantir que working_days é array de inteiros ao salvar
      const cleanData = { ...data };
      if (cleanData.working_days) {
        cleanData.working_days = cleanData.working_days.map(d => parseInt(d, 10)).sort((a, b) => a - b);
      }
      if (cleanData.min_advance_days != null) {
        cleanData.min_advance_days = parseInt(cleanData.min_advance_days, 10);
      }
      // Não toca em campos geridos por outros módulos (saldo, documentos) — evita clobber.
      EXTERNAL_KEYS.forEach(k => delete cleanData[k]);
      return settings?.id
        ? base44.entities.CompanySettings.update(settings.id, cleanData)
        : base44.entities.CompanySettings.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      resetSettingsCache(); // invalida o cache do módulo para que o site público leia os novos valores
      toast({ title: "Configurações salvas!", description: "As alterações já estão valendo." });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
    },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message || "Tente novamente.", variant: "destructive" }),
  });
  const [justSaved, setJustSaved] = useState(false);

  const setF = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setNested = (parent, field, value) => setForm(f => ({ ...f, [parent]: { ...(f[parent] || {}), [field]: value } }));

  const SaveBtn = ({ children = "Salvar" }) => (
    <Button
      className={`font-bold gap-2 text-white transition-colors ${justSaved ? "bg-emerald-600 hover:bg-emerald-600" : "bg-velox-amber hover:bg-velox-amber/90"}`}
      onClick={() => saveMutation.mutate(form)}
      disabled={saveMutation.isPending}
    >
      {justSaved
        ? <><Check className="w-4 h-4" /> Salvo!</>
        : <><Save className="w-4 h-4" /> {saveMutation.isPending ? "Salvando..." : children}</>}
    </Button>
  );

  // Abas visíveis conforme o grupo (`only`)
  const tabDefs = [
    { v: "company",    label: "Empresa",         icon: Building2 },
    { v: "site",       label: "Site Público",    icon: Globe },
    { v: "pricing",    label: "Preços",          icon: DollarSign },
    { v: "routes",     label: "Tabela de Rotas", icon: Route },
    { v: "coverage",   label: "Área de Atuação", icon: MapPin },
    { v: "scheduling", label: "Agendamento",     icon: CalendarDays },
    { v: "alerts",     label: "Alertas",         icon: Bell },
  ].filter(t => allow(t.v));

  return (
    <div className="space-y-5 max-w-4xl">
      {/* key força remount ao trocar o grupo (`only`): sem isso o Radix Tabs
          mantém o estado interno e mostra a aba errada (ex.: Alertas exibindo Rotas). */}
      <Tabs key={only ? only.join(",") : "all"} defaultValue={firstTab}>
        {tabDefs.length > 1 && (
          <TabsList className="flex-wrap h-auto gap-1">
            {tabDefs.map(t => (
              <TabsTrigger key={t.v} value={t.v} className="gap-2"><t.icon className="w-3.5 h-3.5" /> {t.label}</TabsTrigger>
            ))}
          </TabsList>
        )}

        {/* Company */}
        <TabsContent value="company" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Building2 className="w-4 h-4 text-velox-amber" /> Dados da Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Nome da empresa" value={form.company_name || ""} onChange={e => setF("company_name", e.target.value)} />
                <div className="space-y-1">
                  <Input placeholder="CNPJ" value={form.cnpj || ""} onChange={e => setF("cnpj", formatCpfCnpj(e.target.value))}
                    className={onlyDigits(form.cnpj).length > 0 && !isValidCpfCnpj(form.cnpj) ? "border-red-400 focus-visible:ring-red-400" : ""} />
                  {onlyDigits(form.cnpj).length > 0 && !isValidCpfCnpj(form.cnpj) && <p className="text-[11px] text-red-500">CNPJ/CPF inválido</p>}
                </div>
                <Input placeholder="Telefone" value={form.phone || ""} onChange={e => setF("phone", e.target.value)} />
                <div className="space-y-1">
                  <Input placeholder="E-mail" value={form.email || ""} onChange={e => setF("email", e.target.value)}
                    className={form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "border-red-400 focus-visible:ring-red-400" : ""} />
                  {form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && <p className="text-[11px] text-red-500">E-mail inválido</p>}
                </div>
                <Input placeholder="WhatsApp" value={form.whatsapp || ""} onChange={e => setF("whatsapp", e.target.value)} />
                <Input placeholder="Região de atuação" value={form.region || ""} onChange={e => setF("region", e.target.value)} />
              </div>
              <Input placeholder="Endereço completo da sede" value={form.address || ""} onChange={e => setF("address", e.target.value)} />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Missão</p>
                <Textarea rows={2} value={form.mission || ""} onChange={e => setF("mission", e.target.value)} className="resize-none" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Visão</p>
                <Textarea rows={2} value={form.vision || ""} onChange={e => setF("vision", e.target.value)} className="resize-none" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Valores</p>
                <Input placeholder="Pontualidade, Responsabilidade, ..." value={form.values || ""} onChange={e => setF("values", e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">Redes Sociais</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Instagram (link)" value={form.social_instagram || ""} onChange={e => setF("social_instagram", e.target.value)} />
                <Input placeholder="LinkedIn (link)" value={form.social_linkedin || ""} onChange={e => setF("social_linkedin", e.target.value)} />
                <Input placeholder="Facebook (link)" value={form.social_facebook || ""} onChange={e => setF("social_facebook", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Google Maps API Key
                </label>
                <Input
                  type="password"
                  placeholder="AIzaSy..."
                  value={form.google_maps_api_key || ""}
                  onChange={e => setF("google_maps_api_key", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Usada para calcular distância real entre origem e destinos.
                  <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
                     className="text-velox-amber hover:underline ml-1">
                    Obter chave →
                  </a>
                </p>
              </div>
              <div className="flex justify-end"><SaveBtn /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage */}
        <TabsContent value="coverage" className="mt-6">
          <CoverageSettings
            form={form}
            setF={setF}
            onSave={() => saveMutation.mutate(form)}
            saving={saveMutation.isPending}
          />
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-velox-amber" /> Tabela de Preços</CardTitle></CardHeader>
            <CardContent className="space-y-8">

              {/* Frete base */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-velox-amber" /> Frete base
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preço por kg (R$)</label>
                    <NumericInput currency value={form.pricing?.price_per_kg || ""} onChange={v => setNested("pricing", "price_per_kg", v)} placeholder="ex: 0,85" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preço por km (R$)</label>
                    <NumericInput currency value={form.pricing?.price_per_km || ""} onChange={v => setNested("pricing", "price_per_km", v)} placeholder="ex: 3,20" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa fixa por pedido (R$)</label>
                    <NumericInput currency value={form.pricing?.fixed_fee || ""} onChange={v => setNested("pricing", "fixed_fee", v)} placeholder="ex: 120,00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frete mínimo (R$)</label>
                    <NumericInput currency value={form.pricing?.minimum_freight || ""} onChange={v => setNested("pricing", "minimum_freight", v)} placeholder="ex: 450,00" />
                  </div>
                </div>
              </div>

              {/* Taxas adicionais */}
              <div>
                <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-velox-amber" /> Taxas adicionais
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Aplicadas automaticamente no cálculo do frete</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">GRIS — % sobre valor declarado</label>
                    <div className="relative">
                      <NumericInput value={form.pricing?.gris_percent || ""} onChange={v => setNested("pricing", "gris_percent", v)} placeholder="ex: 0,30" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Gerenciamento de Risco e Seguro — obrigatório</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad valorem — % sobre valor declarado</label>
                    <div className="relative">
                      <NumericInput value={form.pricing?.ad_valorem_percent || ""} onChange={v => setNested("pricing", "ad_valorem_percent", v)} placeholder="ex: 0,20" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Seguro adicional sobre o valor da NF</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TDE — Despacho de entrega por NF (R$)</label>
                    <NumericInput currency value={form.pricing?.tde_per_nf || ""} onChange={v => setNested("pricing", "tde_per_nf", v)} placeholder="ex: 8,00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TDA — Despacho de coleta por NF (R$)</label>
                    <NumericInput currency value={form.pricing?.tda_per_nf || ""} onChange={v => setNested("pricing", "tda_per_nf", v)} placeholder="ex: 8,00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pedágio — R$ por kg taxável</label>
                    <NumericInput currency value={form.pricing?.toll_per_kg || ""} onChange={v => setNested("pricing", "toll_per_kg", v)} placeholder="ex: 0,05" />
                    <p className="text-[10px] text-muted-foreground">Estimativa proporcional ao peso da carga</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa de coleta (R$)</label>
                    <NumericInput currency value={form.pricing?.pickup_fee || ""} onChange={v => setNested("pricing", "pickup_fee", v)} placeholder="ex: 15,00" />
                    <p className="text-[10px] text-muted-foreground">Cobrança da coleta, separada da entrega (fracionado)</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa de entrega (R$)</label>
                    <NumericInput currency value={form.pricing?.delivery_fee || ""} onChange={v => setNested("pricing", "delivery_fee", v)} placeholder="ex: 12,00" />
                    <p className="text-[10px] text-muted-foreground">Cobrança da entrega (door-to-door)</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">TRT por NF (R$)</label>
                    <NumericInput currency value={form.pricing?.trt_per_nf || ""} onChange={v => setNested("pricing", "trt_per_nf", v)} placeholder="ex: 6,00" />
                    <p className="text-[10px] text-muted-foreground">Taxa de Restrição de Trânsito (centros urbanos)</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa de espera (R$/hora)</label>
                    <NumericInput currency value={form.pricing?.waiting_fee_hour || ""} onChange={v => setNested("pricing", "waiting_fee_hour", v)} placeholder="ex: 60,00" />
                    <p className="text-[10px] text-muted-foreground">Aplicada por hora parada (estadia)</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa de devolução (R$)</label>
                    <NumericInput currency value={form.pricing?.return_fee || ""} onChange={v => setNested("pricing", "return_fee", v)} placeholder="ex: 80,00" />
                    <p className="text-[10px] text-muted-foreground">Reentrega / devolução ao remetente</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa de emergência (%)</label>
                    <div className="relative">
                      <NumericInput value={form.pricing?.emergency_percent || ""} onChange={v => setNested("pricing", "emergency_percent", v)} placeholder="ex: 20" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Acionamento emergencial fora de operação</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fator de cubagem (cm³ por kg)</label>
                    <NumericInput integer value={form.pricing?.cubage_factor ?? 6000} onChange={v => setNested("pricing", "cubage_factor", v)} placeholder="6000" />
                    <p className="text-[10px] text-muted-foreground">Padrão 6.000 (= 166,7 kg/m³). Menor = volume "pesa" mais.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicional frete urgente (%)</label>
                    <div className="relative">
                      <NumericInput value={form.pricing?.urgent_percent || ""} onChange={v => setNested("pricing", "urgent_percent", v)} placeholder="ex: 50" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adicional frete dedicado (%)</label>
                    <div className="relative">
                      <NumericInput value={form.pricing?.dedicated_percent || ""} onChange={v => setNested("pricing", "dedicated_percent", v)} placeholder="ex: 20" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prazo de entrega */}
              <div>
                <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-velox-amber" /> Prazo de entrega
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Usado para calcular e exibir o prazo estimado ao cliente</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Velocidade média (km/dia)</label>
                    <NumericInput integer value={form.km_per_day || ""} onChange={v => setF("km_per_day", v)} placeholder="ex: 600" />
                    <p className="text-[10px] text-muted-foreground">Fallback quando não há tabela por estado. Padrão: 600 km/dia.</p>
                  </div>
                </div>
                {/* Tabela por estado */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tabela de prazo por estado de destino (dias úteis)</label>
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Estado (UF)</th>
                          <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Dias úteis</th>
                          <th className="p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(form.delivery_days_table || []).map((row, i) => (
                          <tr key={i} className="border-t border-border/40">
                            <td className="p-3">
                              <Select
                                value={row.state || ""}
                                onValueChange={val => {
                                  const t = [...(form.delivery_days_table || [])];
                                  t[i] = { ...t[i], state: val };
                                  setF("delivery_days_table", t);
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-20">
                                  <SelectValue placeholder="UF" />
                                </SelectTrigger>
                                <SelectContent>
                                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                                    <SelectItem key={uf} value={uf} className="text-xs">{uf}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-3">
                              <Input type="number" value={row.days || ""} placeholder="ex: 3"
                                className="h-7 text-xs w-20"
                                onChange={e => {
                                  const t = [...(form.delivery_days_table || [])];
                                  t[i] = { ...t[i], days: Number(e.target.value) };
                                  setF("delivery_days_table", t);
                                }} />
                            </td>
                            <td className="p-3">
                              <button onClick={() => {
                                const t = [...(form.delivery_days_table || [])];
                                t.splice(i, 1);
                                setF("delivery_days_table", t);
                              }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 border-t border-border/40">
                      <button
                        onClick={() => setF("delivery_days_table", [...(form.delivery_days_table || []), { state: "", days: 1 }])}
                        className="text-xs text-velox-amber hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Adicionar estado
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* DRE */}
              <div>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-velox-amber" /> Parâmetros financeiros
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alíquota fiscal (%)</label>
                    <NumericInput value={form.tax_rate_percent ?? 5} onChange={v => setF("tax_rate_percent", v)} placeholder="ex: 4,5" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Depreciação mensal da frota (R$)</label>
                    <NumericInput currency value={form.monthly_depreciation ?? 800} onChange={v => setF("monthly_depreciation", v)} placeholder="ex: 1.200,00" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end"><SaveBtn /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts */}
        <TabsContent value="alerts" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-velox-amber" /> Antecedência de Alertas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "CNH do motorista", field: "alert_days_cnh", default: 60 },
                { label: "CRLV do caminhão", field: "alert_days_crlv", default: 60 },
                { label: "Seguro do caminhão", field: "alert_days_insurance", default: 30 },
              ].map(item => (
                <div key={item.field} className="flex items-center justify-between">
                  <p className="text-sm">{item.label}</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 text-center"
                      value={form[item.field] || item.default}
                      onChange={e => setF(item.field, Number(e.target.value))}
                    />
                    <span className="text-sm text-muted-foreground">dias antes</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-4">
                Os alertas de quilometragem (óleo, revisão, pneus) são configurados individualmente em cada caminhão — acesse <strong>Frota → [Caminhão] → Alertas por quilometragem</strong>.
              </p>
              <div className="flex justify-end"><SaveBtn /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduling */}
        <TabsContent value="scheduling" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-velox-amber" /> Regras de Agendamento</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Antecedência mínima</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    className="w-20 text-center"
                    value={form.min_advance_days ?? 2}
                    onChange={e => setF("min_advance_days", Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">dias úteis antes da coleta</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clientes não poderão agendar coletas com menos de {form.min_advance_days ?? 2} dia(s) útil(eis) de antecedência.
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Dias de operação</p>
                <div className="flex flex-wrap gap-4">
                  {[
                    { num: 1, label: "Seg" },
                    { num: 2, label: "Ter" },
                    { num: 3, label: "Qua" },
                    { num: 4, label: "Qui" },
                    { num: 5, label: "Sex" },
                    { num: 6, label: "Sáb" },
                    { num: 0, label: "Dom" },
                  ].map(({ num, label }) => {
                    const workingDays = form.working_days || [1, 2, 3, 4, 5];
                    const checked = workingDays.includes(num);
                    return (
                      <div key={num} className="flex items-center gap-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const current = form.working_days || [1, 2, 3, 4, 5];
                            const next = v ? [...current, num] : current.filter(d => d !== num);
                            setF("working_days", next.sort());
                          }}
                        />
                        <span className="text-sm">{label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Dias não selecionados aparecem como "indisponível" no formulário público.
                </p>
              </div>

              <div className="flex justify-end"><SaveBtn /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Route Pricing */}
        <TabsContent value="routes" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Route className="w-4 h-4 text-velox-amber" /> Preços por Corredor</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Quando definido, o preço do corredor tem prioridade sobre a tabela padrão.
                Deixe campos em branco para herdar o valor padrão da aba Preços.
                <strong> Vigência</strong> (de/até): o corredor só é aplicado se a <strong>data de coleta</strong> do pedido estiver no intervalo — em branco = sempre vigente. Permite reajustes sem quebrar pedidos antigos.
              </p>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[900px]">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 font-semibold">Origem</th>
                        <th className="text-left p-3 font-semibold">Destino</th>
                        <th className="text-left p-3 font-semibold">R$/kg</th>
                        <th className="text-left p-3 font-semibold">R$/km</th>
                        <th className="text-left p-3 font-semibold">Taxa fixa</th>
                        <th className="text-left p-3 font-semibold">Mínimo</th>
                        <th className="text-left p-3 font-semibold">Prazo (d)</th>
                        <th className="text-left p-3 font-semibold">Vigente de</th>
                        <th className="text-left p-3 font-semibold">até</th>
                        <th className="p-3 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.route_pricing || []).map((row, i) => (
                        <tr key={i} className="border-t border-border/40">
                          {["origin_state", "dest_state"].map(field => (
                            <td key={field} className="p-2">
                              <Select value={row[field] || ""} onValueChange={val => {
                                const t = [...(form.route_pricing || [])];
                                t[i] = { ...t[i], [field]: val };
                                setF("route_pricing", t);
                              }}>
                                <SelectTrigger className="h-7 text-xs w-16"><SelectValue placeholder="UF" /></SelectTrigger>
                                <SelectContent>
                                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                                    <SelectItem key={uf} value={uf} className="text-xs">{uf}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          ))}
                          {["price_per_kg","price_per_km","fixed_fee","minimum_freight","delivery_days"].map(field => (
                            <td key={field} className="p-2">
                              <Input type="number" step="0.01" value={row[field] ?? ""} className="h-7 text-xs w-20"
                                onChange={e => {
                                  const t = [...(form.route_pricing || [])];
                                  t[i] = { ...t[i], [field]: e.target.value === "" ? "" : Number(e.target.value) };
                                  setF("route_pricing", t);
                                }} />
                            </td>
                          ))}
                          {["valid_from", "valid_until"].map(field => (
                            <td key={field} className="p-2">
                              <Input type="date" value={row[field] || ""} className="h-7 text-xs w-32"
                                onChange={e => {
                                  const t = [...(form.route_pricing || [])];
                                  t[i] = { ...t[i], [field]: e.target.value };
                                  setF("route_pricing", t);
                                }} />
                            </td>
                          ))}
                          <td className="p-2">
                            <button onClick={() => {
                              const t = [...(form.route_pricing || [])];
                              t.splice(i, 1);
                              setF("route_pricing", t);
                            }} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 border-t border-border/40">
                  <button
                    onClick={() => setF("route_pricing", [...(form.route_pricing || []), {
                      origin_state: "", dest_state: "", price_per_kg: "", price_per_km: "",
                      fixed_fee: "", minimum_freight: "", delivery_days: "", active: true
                    }])}
                    className="text-xs text-velox-amber hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Adicionar corredor
                  </button>
                </div>
              </div>
              <div className="flex justify-end"><SaveBtn /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site content */}
        <TabsContent value="site" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-velox-amber" /> Conteúdo do Site Público</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Título do Hero</p>
                <Input value={form.hero_title || ""} onChange={e => setF("hero_title", e.target.value)} placeholder="Ex: Sua carga, no prazo certo." />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Subtítulo do Hero</p>
                <Input value={form.hero_subtitle || ""} onChange={e => setF("hero_subtitle", e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Texto "Sobre Nós"</p>
                <Textarea rows={4} value={form.about_text || ""} onChange={e => setF("about_text", e.target.value)} className="resize-none" placeholder="Escreva sobre a história e diferenciais da empresa..." />
              </div>
              <div className="flex justify-end"><SaveBtn /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
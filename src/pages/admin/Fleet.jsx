import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Truck, AlertTriangle, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays, parseISO } from "date-fns";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { FormSection, Field } from "@/components/shared/FormSection";
import { NumericInput } from "@/components/shared/NumericInput";
import { Textarea } from "@/components/ui/textarea";
import { IdCard, Ruler, FileCheck2, Gauge } from "lucide-react";
import { normalizePlate, formatPlate, isValidPlate } from "@/utils/validators";
import { truckVolumeM3, fmtM3 } from "@/utils/cargoVolume";

const statusConfig = {
  available: { label: "Disponível", color: "bg-green-100 text-green-700" },
  on_route: { label: "Em Rota", color: "bg-amber-100 text-amber-700" },
  maintenance: { label: "Manutenção", color: "bg-red-100 text-red-700" },
  inactive: { label: "Inativo", color: "bg-muted text-muted-foreground" },
};

const truckStatusConfig = {
  available:   { label: "Disponível", dot: "bg-green-600", cls: "text-green-700 bg-green-50 border-green-200" },
  on_route:    { label: "Em rota",    dot: "bg-amber-500", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  maintenance: { label: "Manutenção", dot: "bg-red-500",   cls: "text-red-700 bg-red-50 border-red-200" },
  inactive:    { label: "Inativo",    dot: "bg-gray-400",  cls: "text-muted-foreground bg-muted border-border" },
};

const truckTypeLabel = { carreta: "Carreta", truck: "Truck", vuc: "VUC", toco: "Toco", bitruck: "Bitruck", outro: "Outro" };

function hasDocAlert(truck) {
  const dates = [truck.crlv_expiry, truck.insurance_expiry, truck.tachograph_next].filter(Boolean);
  return dates.some(d => differenceInDays(parseISO(d), new Date()) <= 60);
}

export default function Fleet({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const EMPTY_FORM = { plate: "", model: "", manufacturer: "", year: "", truck_type: "truck", capacity_kg: "", status: "available", color: "", renavam: "", chassis: "", dimensions: { length_m: "", width_m: "", height_m: "" }, axles: "", tare_weight: "", body_type: "", ownership: "proprio", owner_name: "", tracker_provider: "", tracker_id: "", crlv_expiry: "", insurance_expiry: "", tachograph_last: "", tachograph_next: "", total_km: "", km_alert_oil: "", km_alert_review: "", km_alert_tires: "", notes: "" };
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Truck.create(data),
    onSuccess: (truck) => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      toast({ title: "Caminhão cadastrado!" });
      navigate(`/admin/frota/${truck.id}`);
    },
    onError: (e) => {
      const dup = /duplicate|unique/i.test(e?.message || "");
      toast({ title: dup ? "Placa já cadastrada" : "Erro ao cadastrar", description: dup ? "Já existe um veículo com essa placa." : e?.message, variant: "destructive" });
    },
  });

  // Validação de placa (formato + duplicidade) antes de salvar.
  const plateNorm = normalizePlate(form.plate);
  const plateDuplicate = plateNorm.length > 0 && trucks.some(t => normalizePlate(t.plate) === plateNorm);
  const plateInvalid = plateNorm.length > 0 && !isValidPlate(plateNorm);
  const formVolumeM3 = truckVolumeM3({ dimensions: form.dimensions });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle ? (
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Frota</h1>
            <p className="text-muted-foreground text-xs mt-0.5">{trucks.length} veículo(s) cadastrado(s)</p>
          </div>
        ) : <p className="text-xs text-muted-foreground">{trucks.length} veículo(s) cadastrado(s)</p>}
        <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setForm(EMPTY_FORM); }}>
          <DialogTrigger asChild>
            <Button className="font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Caminhão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
              <DialogTitle className="flex items-center gap-2 text-base"><Truck className="w-4.5 h-4.5 text-primary" /> Cadastrar Caminhão</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 p-5">
              <FormSection title="Identificação" description="Dados do veículo e documento" icon={IdCard} cols={2}>
                <Field label="Placa" required hint={plateDuplicate ? "⚠ Placa já cadastrada" : plateInvalid ? "⚠ Formato inválido (ABC-1234 ou ABC1D23)" : "Antiga ou Mercosul"}>
                  <Input
                    placeholder="ABC-1234"
                    value={form.plate}
                    onChange={e => setForm(f => ({ ...f, plate: normalizePlate(e.target.value) }))}
                    onBlur={() => setForm(f => ({ ...f, plate: formatPlate(f.plate) }))}
                    className={plateDuplicate || plateInvalid ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                </Field>
                <Field label="Tipo">
                  <Select value={form.truck_type} onValueChange={v => setForm(f => ({ ...f, truck_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {[["carreta","Carreta"],["truck","Truck"],["vuc","VUC"],["toco","Toco"],["bitruck","Bitruck"],["outro","Outro"]].map(([v,l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fabricante">
                  <Input placeholder="Ex: Mercedes-Benz" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
                </Field>
                <Field label="Modelo">
                  <Input placeholder="Ex: Actros 2651" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
                </Field>
                <Field label="Ano">
                  <Input type="text" inputMode="numeric" placeholder="Ex: 2022" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
                </Field>
                <Field label="Cor">
                  <Input placeholder="Ex: Branco" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </Field>
                <Field label="RENAVAM">
                  <Input placeholder="Ex: 01234567890" value={form.renavam} onChange={e => setForm(f => ({ ...f, renavam: e.target.value }))} />
                </Field>
                <Field label="Chassi">
                  <Input placeholder="Ex: 9BWZZZ377VT004251" value={form.chassis} onChange={e => setForm(f => ({ ...f, chassis: e.target.value.toUpperCase() }))} />
                </Field>
              </FormSection>

              <FormSection title="Capacidade e dimensões" icon={Ruler} cols={2}>
                <Field label="Capacidade (kg)">
                  <NumericInput integer value={form.capacity_kg} onChange={v => setForm(f => ({ ...f, capacity_kg: v }))} placeholder="Ex: 25000" />
                </Field>
                <Field label="Dimensões do baú (m)" hint={formVolumeM3 > 0 ? `Volume útil: ${fmtM3(formVolumeM3)}` : "Comprimento · Largura · Altura — aceita vírgula ou ponto"} colSpan={2}>
                  <div className="grid grid-cols-3 gap-2">
                    <NumericInput value={form.dimensions?.length_m ?? ""} onChange={v => setForm(f => ({ ...f, dimensions: { ...f.dimensions, length_m: v } }))} placeholder="Comp." />
                    <NumericInput value={form.dimensions?.width_m ?? ""} onChange={v => setForm(f => ({ ...f, dimensions: { ...f.dimensions, width_m: v } }))} placeholder="Larg." />
                    <NumericInput value={form.dimensions?.height_m ?? ""} onChange={v => setForm(f => ({ ...f, dimensions: { ...f.dimensions, height_m: v } }))} placeholder="Alt." />
                  </div>
                </Field>
              </FormSection>

              <FormSection title="Especificações e propriedade" icon={Ruler} cols={2}>
                <Field label="Nº de eixos" hint="Usado no pedágio (ANTT)">
                  <NumericInput integer value={form.axles} onChange={v => setForm(f => ({ ...f, axles: v }))} placeholder="Ex: 6" />
                </Field>
                <Field label="Tara (kg)">
                  <NumericInput integer value={form.tare_weight} onChange={v => setForm(f => ({ ...f, tare_weight: v }))} placeholder="Ex: 9000" />
                </Field>
                <Field label="Carroceria">
                  <Select value={form.body_type || ""} onValueChange={v => setForm(f => ({ ...f, body_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {["Baú", "Sider", "Graneleiro", "Frigorífico", "Carga seca", "Tanque", "Caçamba", "Prancha", "Outro"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Propriedade">
                  <Select value={form.ownership || "proprio"} onValueChange={v => setForm(f => ({ ...f, ownership: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proprio">Próprio</SelectItem>
                      <SelectItem value="agregado">Agregado</SelectItem>
                      <SelectItem value="terceiro">Terceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {form.ownership !== "proprio" && (
                  <Field label="Proprietário (agregado/terceiro)" colSpan={2}>
                    <Input placeholder="Nome do proprietário do veículo" value={form.owner_name} onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))} />
                  </Field>
                )}
                <Field label="Rastreador (provedor)">
                  <Input placeholder="Ex: Sascar, Omnilink" value={form.tracker_provider} onChange={e => setForm(f => ({ ...f, tracker_provider: e.target.value }))} />
                </Field>
                <Field label="ID do rastreador">
                  <Input placeholder="Identificador / nº do equipamento" value={form.tracker_id} onChange={e => setForm(f => ({ ...f, tracker_id: e.target.value }))} />
                </Field>
              </FormSection>

              <FormSection title="Documentação" description="Datas de vencimento — geram alertas automáticos" icon={FileCheck2} cols={2}>
                <Field label="Vencimento CRLV">
                  <Input type="date" value={form.crlv_expiry} onChange={e => setForm(f => ({ ...f, crlv_expiry: e.target.value }))} />
                </Field>
                <Field label="Vencimento do seguro">
                  <Input type="date" value={form.insurance_expiry} onChange={e => setForm(f => ({ ...f, insurance_expiry: e.target.value }))} />
                </Field>
                <Field label="Última aferição do tacógrafo">
                  <Input type="date" value={form.tachograph_last} onChange={e => setForm(f => ({ ...f, tachograph_last: e.target.value }))} />
                </Field>
                <Field label="Próxima aferição do tacógrafo">
                  <Input type="date" value={form.tachograph_next} onChange={e => setForm(f => ({ ...f, tachograph_next: e.target.value }))} />
                </Field>
              </FormSection>

              <FormSection title="Quilometragem e manutenção" description="Alertas em branco usam o padrão global das Configurações" icon={Gauge} cols={2}>
                <Field label="Km atual (odômetro)" colSpan={2}>
                  <NumericInput integer value={form.total_km} onChange={v => setForm(f => ({ ...f, total_km: v }))} placeholder="Ex: 147832" />
                </Field>
                <Field label="Alerta — troca de óleo (km)">
                  <NumericInput integer value={form.km_alert_oil} onChange={v => setForm(f => ({ ...f, km_alert_oil: v }))} placeholder="20000" />
                </Field>
                <Field label="Alerta — revisão geral (km)">
                  <NumericInput integer value={form.km_alert_review} onChange={v => setForm(f => ({ ...f, km_alert_review: v }))} placeholder="40000" />
                </Field>
                <Field label="Alerta — troca de pneus (km)" colSpan={2}>
                  <NumericInput integer value={form.km_alert_tires} onChange={v => setForm(f => ({ ...f, km_alert_tires: v }))} placeholder="60000" />
                </Field>
              </FormSection>

              <FormSection title="Observações" cols={1}>
                <Field label="Anotações internas" optional>
                  <Textarea rows={2} className="resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Detalhes adicionais sobre o veículo..." />
                </Field>
              </FormSection>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border sticky bottom-0 bg-background z-10">
              <Button variant="outline" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate({
                  ...form,
                  plate: formatPlate(form.plate),
                  year: Number(form.year) || undefined,
                  capacity_kg: Number(form.capacity_kg) || undefined,
                  axles: Number(form.axles) || undefined,
                  tare_weight: Number(form.tare_weight) || undefined,
                  crlv_expiry: form.crlv_expiry || undefined,
                  insurance_expiry: form.insurance_expiry || undefined,
                  tachograph_last: form.tachograph_last || undefined,
                  tachograph_next: form.tachograph_next || undefined,
                  total_km: Number(form.total_km) || undefined,
                  km_alert_oil: Number(form.km_alert_oil) || undefined,
                  km_alert_review: Number(form.km_alert_review) || undefined,
                  km_alert_tires: Number(form.km_alert_tires) || undefined,
                  dimensions: {
                    length_m: Number(form.dimensions?.length_m) || undefined,
                    width_m: Number(form.dimensions?.width_m) || undefined,
                    height_m: Number(form.dimensions?.height_m) || undefined,
                  }
                })}
                disabled={!form.plate || plateInvalid || plateDuplicate || createMutation.isPending}
                className="font-bold gap-2"
              >
                <Plus className="w-4 h-4" /> {createMutation.isPending ? "Salvando..." : "Cadastrar caminhão"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={trucks}
        searchKeys={["plate", "model", "manufacturer", "renavam"]}
        searchPlaceholder="Buscar por placa, modelo ou fabricante..."
        initialSort={{ key: "plate", dir: "asc" }}
        onRowClick={(t) => navigate(`/admin/frota/${t.id}`)}
        emptyMessage="Nenhum caminhão cadastrado."
        columns={[
          { key: "plate", label: "Placa", sortable: true, className: "font-mono font-bold", render: t => (
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded bg-velox-dark flex items-center justify-center flex-shrink-0"><Truck className="w-3.5 h-3.5 text-white" /></span>
              {t.plate}
            </div>
          )},
          { key: "vehicle", label: "Veículo", sortable: true, value: t => `${t.manufacturer || ""} ${t.model || ""}`, render: t => (
            <span><span className="font-medium">{t.manufacturer} {t.model}</span><span className="block text-xs text-muted-foreground">{t.year || "—"}</span></span>
          )},
          { key: "truck_type", label: "Tipo", sortable: true, className: "text-xs", render: t => truckTypeLabel[t.truck_type] || t.truck_type || "—" },
          { key: "capacity_kg", label: "Capacidade", sortable: true, align: "right", className: "font-mono text-xs", render: t => t.capacity_kg ? `${t.capacity_kg.toLocaleString("pt-BR")} kg` : "—" },
          { key: "volume_m3", label: "Volume útil", align: "right", className: "font-mono text-xs", value: t => truckVolumeM3(t), render: t => { const v = truckVolumeM3(t); return v > 0 ? fmtM3(v) : "—"; } },
          { key: "docs", label: "Documentos", render: t => hasDocAlert(t)
            ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded"><AlertTriangle className="w-3 h-3" /> Vencendo</span>
            : <span className="text-[11px] text-green-700">Em dia</span>
          },
          { key: "status", label: "Status", sortable: true, value: t => t.status, render: t => <StatusBadge status={t.status} config={truckStatusConfig} /> },
          { key: "actions", label: "", align: "right", stopPropagation: true, width: 50, render: t => (
            <Link to={`/admin/frota/${t.id}`}><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button></Link>
          )},
        ]}
      />
    </div>
  );
}
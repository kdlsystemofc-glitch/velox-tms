import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { todayLocalISO } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Truck, FileText, Wrench, Plus, AlertTriangle, CheckCircle, AlertCircle, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { NumericInput } from "@/components/shared/NumericInput";

function docStatus(expiry) {
  if (!expiry) return null;
  const days = differenceInDays(parseISO(expiry), new Date());
  if (days < 0) return { label: "Vencido", color: "bg-red-100 text-red-700", icon: AlertCircle, days };
  if (days <= 30) return { label: `${days}d`, color: "bg-red-100 text-red-700", icon: AlertTriangle, days };
  if (days <= 60) return { label: `${days}d`, color: "bg-amber-100 text-amber-700", icon: AlertTriangle, days };
  return { label: "OK", color: "bg-green-100 text-green-700", icon: CheckCircle, days };
}

const EMPTY_MAINT = { type: "preventiva", date: "", km: "", description: "", amount: "", provider: "", provider_id: "", next_date: "", _providerSelected: false, _editIndex: undefined };

export default function TruckDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintForm, setMaintForm] = useState(EMPTY_MAINT);
  const [form, setForm] = useState({});

  const { data: truck } = useQuery({
    queryKey: ["truck", id],
    queryFn: () => base44.entities.Truck.filter({ id }),
    select: (d) => d[0],
  });

  React.useEffect(() => {
    if (truck) {
      setForm({
        ...truck,
        dimensions: {
          length_m: truck.dimensions?.length_m ?? "",
          width_m:  truck.dimensions?.width_m  ?? "",
          height_m: truck.dimensions?.height_m ?? "",
        },
      });
    }
  }, [truck]);

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: () => base44.entities.Supplier.list() });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Truck.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["truck", id] });
      queryClient.invalidateQueries({ queryKey: ["trucks"] }); // reflete status/dados na lista da Frota
      setEditing(false);
      toast({ title: "Caminhão atualizado!" });
    },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message || "Tente novamente.", variant: "destructive" }),
  });

  const addMaintenance = async () => {
    const existing = [...(truck?.maintenance_history || [])];
    const newEntry = {
      type: maintForm.type,
      date: maintForm.date,
      km: Number(maintForm.km) || undefined,
      description: maintForm.description,
      amount: Number(maintForm.amount) || 0,
      provider: maintForm.provider || undefined,
      provider_id: maintForm.provider_id || undefined,
      next_date: maintForm.next_date || undefined,
    };

    if (maintForm._editIndex !== undefined) {
      const realIndex = existing.length - 1 - maintForm._editIndex;
      existing[realIndex] = { ...newEntry, created_at: existing[realIndex]?.created_at };
    } else {
      existing.push({ ...newEntry, created_at: new Date().toISOString() });
    }

    await updateMutation.mutateAsync({ maintenance_history: existing });

    // Criar despesa apenas em criação (não em edição)
    if (maintForm._editIndex === undefined) {
      const maintAmount = Number(maintForm.amount) || 0;
      if (maintAmount > 0) {
        await base44.entities.Expense.create({
          category: "maintenance",
          description: `Manutenção (${maintForm.type}) — ${truck.plate}: ${maintForm.description || ""}`.trim(),
          amount: maintAmount,
          date: maintForm.date || todayLocalISO(),
          status: "pending",
          truck_id: truck.id,
          notes: `Fornecedor: ${maintForm.provider || "não informado"}. Confirme a forma de pagamento em Financeiro → Despesas.`,
        });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
      }
    }

    setShowMaintModal(false);
    setMaintForm(EMPTY_MAINT);
    toast({ title: maintForm._editIndex !== undefined ? "Manutenção atualizada!" : "Manutenção registrada!" });
  };

  if (!truck) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full" /></div>;

  const crlvSt = docStatus(truck.crlv_expiry);
  const insSt = docStatus(truck.insurance_expiry);
  const mainDriver = drivers.find(d => d.id === truck.main_driver_id);

  const documents = [
    { name: "CRLV", expiry: truck.crlv_expiry, st: crlvSt },
    { name: "Seguro", expiry: truck.insurance_expiry, st: insSt },
    { name: "Tacógrafo (última)", expiry: truck.tachograph_next, st: docStatus(truck.tachograph_next) },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/frota")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold font-mono">{truck.plate}</h1>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              truck.status === "available" ? "bg-green-100 text-green-700" :
              truck.status === "on_route" ? "bg-amber-100 text-amber-700" :
              truck.status === "maintenance" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}>
              {truck.status === "available" ? "Disponível" : truck.status === "on_route" ? "Em Rota" : truck.status === "maintenance" ? "Manutenção" : "Inativo"}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{truck.manufacturer} {truck.model} {truck.year}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
          {editing ? "Cancelar" : "Editar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Dados do Veículo */}
          <Card>
            <CardHeader className="py-3 border-b border-border bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-velox-amber" /> Dados do Veículo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Placa</label>
                    <Input placeholder="ABC-1234" value={form.plate || ""} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fabricante</label>
                    <Input placeholder="Mercedes, Volvo..." value={form.manufacturer || ""} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modelo</label>
                    <Input placeholder="Actros, FH..." value={form.model || ""} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ano</label>
                    <Input type="number" placeholder="2022" value={form.year || ""} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
                    <Select value={form.truck_type || "truck"} onValueChange={v => setForm(f => ({ ...f, truck_type: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[["carreta","Carreta"],["truck","Truck"],["vuc","VUC"],["toco","Toco"],["bitruck","Bitruck"],["outro","Outro"]].map(([v,l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cor</label>
                    <Input placeholder="Branco, Cinza..." value={form.color || ""} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">RENAVAM</label>
                    <Input placeholder="00000000000" value={form.renavam || ""} onChange={e => setForm(f => ({ ...f, renavam: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capacidade (kg)</label>
                    <Input type="text" inputMode="numeric" placeholder="15000" value={form.capacity_kg || ""} onChange={e => setForm(f => ({ ...f, capacity_kg: e.target.value.replace(/\D/g, "") }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quilometragem atual (km)</label>
                    <Input type="text" inputMode="numeric" placeholder="ex: 147832" value={form.total_km || ""} onChange={e => setForm(f => ({ ...f, total_km: e.target.value.replace(/\D/g, "") }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Disponível</SelectItem>
                        <SelectItem value="on_route">Em Rota</SelectItem>
                        <SelectItem value="maintenance">Manutenção</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões da carroceria (m): comprimento · largura · altura</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <Input type="text" inputMode="decimal" placeholder="Comprimento" value={form.dimensions?.length_m || ""} onChange={e => setForm(f => ({ ...f, dimensions: { ...f.dimensions, length_m: e.target.value } }))} />
                      <Input type="text" inputMode="decimal" placeholder="Largura" value={form.dimensions?.width_m || ""} onChange={e => setForm(f => ({ ...f, dimensions: { ...f.dimensions, width_m: e.target.value } }))} />
                      <Input type="text" inputMode="decimal" placeholder="Altura" value={form.dimensions?.height_m || ""} onChange={e => setForm(f => ({ ...f, dimensions: { ...f.dimensions, height_m: e.target.value } }))} />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motorista titular</label>
                    <Select value={form.main_driver_id || "none"} onValueChange={v => setForm(f => ({ ...f, main_driver_id: v === "none" ? "" : v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Sem titular" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem titular</SelectItem>
                        {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Alertas por km */}
                  <div className="col-span-2 border-t border-border/40 pt-3 mt-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Alertas por quilometragem</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "km_alert_oil",    label: "Troca de óleo (km)",  placeholder: "20000" },
                        { key: "km_alert_review", label: "Revisão geral (km)",  placeholder: "40000" },
                        { key: "km_alert_tires",  label: "Troca de pneus (km)", placeholder: "60000" },
                      ].map(({ key, label, placeholder }) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
                          <Input type="text" inputMode="numeric" placeholder={placeholder}
                            value={form[key] || ""}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value.replace(/\D/g, "") }))}
                            className="mt-1" />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Deixe em branco para usar os padrões globais (Configurações → Alertas)</p>
                  </div>

                  <Button className="col-span-2 bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" onClick={() => {
                      const payload = {
                        plate: form.plate, manufacturer: form.manufacturer, model: form.model,
                        year: Number(form.year) || undefined, truck_type: form.truck_type,
                        capacity_kg: Number(String(form.capacity_kg).replace(/\D/g, "")) || undefined,
                        color: form.color, renavam: form.renavam, status: form.status,
                        main_driver_id: form.main_driver_id || undefined,
                        crlv_expiry: form.crlv_expiry || undefined,
                        insurance_expiry: form.insurance_expiry || undefined,
                        tachograph_next: form.tachograph_next || undefined,
                        km_alert_oil:    Number(form.km_alert_oil)    || undefined,
                        km_alert_review: Number(form.km_alert_review) || undefined,
                        km_alert_tires:  Number(form.km_alert_tires)  || undefined,
                        total_km: Number(String(form.total_km).replace(/\D/g, "")) || undefined,
                        dimensions: {
                          ...(parseFloat(form.dimensions?.length_m) ? { length_m: parseFloat(form.dimensions.length_m) } : {}),
                          ...(parseFloat(form.dimensions?.width_m)  ? { width_m:  parseFloat(form.dimensions.width_m)  } : {}),
                          ...(parseFloat(form.dimensions?.height_m) ? { height_m: parseFloat(form.dimensions.height_m) } : {}),
                        },
                      };
                      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
                      updateMutation.mutate(payload);
                    }} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {[
                    ["Placa", <span className="font-mono font-bold">{truck.plate}</span>],
                    ["Modelo", `${truck.manufacturer || ""} ${truck.model || ""}`.trim()],
                    ["Ano", truck.year],
                    ["Tipo", truck.truck_type],
                    ["Capacidade", truck.capacity_kg ? `${truck.capacity_kg.toLocaleString()} kg` : "—"],
                    ["Quilometragem atual (odômetro)", truck.total_km ? `${Number(truck.total_km).toLocaleString("pt-BR")} km` : "—"],
                    ["Motorista titular", mainDriver?.name || "—"],
                    ["Cor", truck.color || "—"],
                    ["RENAVAM", truck.renavam || "—"],
                    ["Dimensões (C×L×A)", truck.dimensions?.length_m ? `${truck.dimensions.length_m}m × ${truck.dimensions.width_m}m × ${truck.dimensions.height_m}m` : "—"],
                    ["Status", truck.status === "available" ? "Disponível" : truck.status === "on_route" ? "Em Rota" : truck.status === "maintenance" ? "Manutenção" : "Inativo"],
                    ["CRLV — vencimento", truck.crlv_expiry ? new Date(truck.crlv_expiry + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"],
                    ["Seguro — vencimento", truck.insurance_expiry ? new Date(truck.insurance_expiry + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"],
                    ["Tacógrafo — próx. aferição", truck.tachograph_next ? new Date(truck.tachograph_next + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"],
                    ["Alerta óleo (km)",    truck.km_alert_oil    ? `A cada ${Number(truck.km_alert_oil).toLocaleString("pt-BR")} km`    : "Padrão global"],
                    ["Alerta revisão (km)", truck.km_alert_review ? `A cada ${Number(truck.km_alert_review).toLocaleString("pt-BR")} km` : "Padrão global"],
                    ["Alerta pneus (km)",   truck.km_alert_tires  ? `A cada ${Number(truck.km_alert_tires).toLocaleString("pt-BR")} km`  : "Padrão global"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{val}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manutenções */}
          <Card>
            <CardHeader className="py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-velox-amber" /> Manutenções
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => { setMaintForm(EMPTY_MAINT); setShowMaintModal(true); }} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Registrar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {!truck.maintenance_history || truck.maintenance_history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma manutenção registrada.</p>
              ) : (
                <div className="space-y-2">
                  {(truck.maintenance_history || []).slice().reverse().map((m, i) => (
                    <details key={i} className="group border border-border rounded-xl overflow-hidden">
                      <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors list-none">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            m.type === "óleo" ? "bg-amber-400" :
                            m.type === "revisão" ? "bg-blue-400" :
                            m.type === "pneu" ? "bg-green-400" : "bg-gray-400"
                          }`} />
                          <div>
                            <p className="text-sm font-medium capitalize">{m.type}</p>
                            <p className="text-xs text-muted-foreground">{m.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-mono text-sm font-semibold">
                            R$ {Number(m.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                          <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                        </div>
                      </summary>
                      <div className="px-4 pb-4 pt-2 bg-muted/10 space-y-2 border-t border-border/40">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Quilometragem</p>
                            <p className="font-medium">{m.km ? `${Number(m.km).toLocaleString("pt-BR")} km` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Fornecedor</p>
                            <p className="font-medium">{m.provider || "—"}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Descrição</p>
                            <p className="font-medium">{m.description}</p>
                          </div>
                          {m.next_date && (
                            <div>
                              <p className="text-muted-foreground">Próxima manutenção</p>
                              <p className="font-medium">{m.next_date}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="text-xs gap-1"
                            onClick={() => {
                              setMaintForm({
                                type:        m.type,
                                date:        m.date,
                                km:          String(m.km || ""),
                                description: m.description || "",
                                amount:      m.amount || "",
                                provider:    m.provider || "",
                                provider_id: m.provider_id || "",
                                next_date:   m.next_date || "",
                                _editIndex:  i,
                                _providerSelected: !!m.provider,
                              });
                              setShowMaintModal(true);
                            }}>
                            <Pencil className="w-3 h-3" /> Editar
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 gap-1"
                            onClick={() => {
                              if (!confirm("Remover esta manutenção?")) return;
                              const updated = [...(truck.maintenance_history || [])];
                              updated.splice(truck.maintenance_history.length - 1 - i, 1);
                              updateMutation.mutate({ maintenance_history: updated });
                            }}>
                            <Trash2 className="w-3 h-3" /> Remover
                          </Button>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Documentos */}
        <Card>
          <CardHeader className="py-3 border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-velox-amber" /> Documentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {documents.map(({ name, expiry, st }) => (
              <div key={name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{name}</p>
                  {st && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {expiry ? `Venc. ${format(parseISO(expiry), "dd/MM/yyyy")}` : "Não cadastrado"}
                </p>
                {editing && (
                  <Input
                    type="date"
                    value={
                      name === "CRLV" ? form.crlv_expiry || "" :
                      name === "Seguro" ? form.insurance_expiry || "" :
                      form.tachograph_next || ""
                    }
                    onChange={e => {
                      const field = name === "CRLV" ? "crlv_expiry" : name === "Seguro" ? "insurance_expiry" : "tachograph_next";
                      setForm(f => ({ ...f, [field]: e.target.value }));
                    }}
                    className="h-8 text-xs"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Manutenção */}
      <Dialog open={showMaintModal} onOpenChange={(v) => { if (!v) { setShowMaintModal(false); setMaintForm(EMPTY_MAINT); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{maintForm._editIndex !== undefined ? "Editar Manutenção" : "Registrar Manutenção"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de manutenção <span className="text-red-500">*</span></label>
              <Select value={maintForm.type} onValueChange={v => setMaintForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["preventiva", "corretiva", "revisão", "pneu", "óleo", "freios", "outro"].map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data <span className="text-red-500">*</span></label>
                <Input type="date" value={maintForm.date} onChange={e => setMaintForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quilometragem no momento</label>
                <Input type="text" inputMode="numeric" placeholder="ex: 147832" value={maintForm.km} onChange={e => setMaintForm(f => ({ ...f, km: e.target.value.replace(/\D/g, "") }))} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descrição <span className="text-red-500">*</span></label>
              <Textarea placeholder="ex: Troca de óleo motor e filtros. Óleo Mobil 15W40, 12L." rows={2} value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} className="resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor (R$)</label>
                <NumericInput currency value={maintForm.amount} onChange={v => setMaintForm(f => ({ ...f, amount: v }))} placeholder="0,00" />
              </div>
              <div className="space-y-1 relative">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fornecedor / Oficina</label>
                <Input
                  placeholder="Buscar fornecedor..."
                  value={maintForm.provider || ""}
                  onChange={e => setMaintForm(f => ({ ...f, provider: e.target.value, provider_id: "", _providerSelected: false }))}
                />
                {!maintForm._providerSelected && (maintForm.provider || "").length >= 2 && (() => {
                  const matches = suppliers.filter(s => s.name.toLowerCase().includes(maintForm.provider.toLowerCase())).slice(0, 4);
                  return matches.length > 0 ? (
                    <div className="absolute z-50 w-full bg-background border border-border rounded-lg shadow-lg mt-1 overflow-hidden" style={{top:"100%"}}>
                      {matches.map(s => (
                        <button key={s.id} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 border-b border-border/40 last:border-0"
                          onClick={() => setMaintForm(f => ({ ...f, provider: s.name, provider_id: s.id, _providerSelected: true }))}>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.phone}</p>
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Próxima manutenção prevista</label>
              <Input type="date" value={maintForm.next_date || ""} onChange={e => setMaintForm(f => ({ ...f, next_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowMaintModal(false); setMaintForm(EMPTY_MAINT); }} className="flex-1">Cancelar</Button>
            <Button className="flex-1 bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" onClick={addMaintenance} disabled={!maintForm.date || !maintForm.description || updateMutation.isPending}>
              {maintForm._editIndex !== undefined ? "Salvar edição" : "Registrar manutenção"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
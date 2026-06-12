import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Truck, Search, AlertTriangle, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays, parseISO } from "date-fns";

const statusConfig = {
  available: { label: "Disponível", color: "bg-green-100 text-green-700" },
  on_route: { label: "Em Rota", color: "bg-amber-100 text-amber-700" },
  maintenance: { label: "Manutenção", color: "bg-red-100 text-red-700" },
  inactive: { label: "Inativo", color: "bg-gray-100 text-gray-600" },
};

function hasDocAlert(truck) {
  const dates = [truck.crlv_expiry, truck.insurance_expiry, truck.tachograph_next].filter(Boolean);
  return dates.some(d => differenceInDays(parseISO(d), new Date()) <= 60);
}

export default function Fleet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const EMPTY_FORM = { plate: "", model: "", manufacturer: "", year: "", truck_type: "truck", capacity_kg: "", status: "available", color: "", renavam: "", dimensions: { length_m: "", width_m: "", height_m: "" }, crlv_expiry: "", insurance_expiry: "", tachograph_next: "", total_km: "", km_alert_oil: "", km_alert_review: "", km_alert_tires: "" };
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
  });

  const filtered = trucks.filter(t => !search || t.plate?.toLowerCase().includes(search.toLowerCase()) || t.model?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Frota</h1>
          <p className="text-muted-foreground text-sm mt-1">{trucks.length} veículo(s) cadastrado(s)</p>
        </div>
        <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setForm(EMPTY_FORM); }}>
          <DialogTrigger asChild>
            <Button className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Caminhão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cadastrar Caminhão</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {/* Coluna 1 */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Placa *</label>
                  <Input placeholder="ABC-1234" value={form.plate} onChange={e => setForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fabricante</label>
                  <Input placeholder="Ex: Mercedes-Benz" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Modelo</label>
                  <Input placeholder="Ex: Actros 2651" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ano</label>
                  <Input type="text" inputMode="numeric" placeholder="Ex: 2022" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
                  <Select value={form.truck_type} onValueChange={v => setForm(f => ({ ...f, truck_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      {[["carreta","Carreta"],["truck","Truck"],["vuc","VUC"],["toco","Toco"],["bitruck","Bitruck"],["outro","Outro"]].map(([v,l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cor</label>
                  <Input placeholder="Ex: Branco" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="mt-1" />
                </div>
              </div>
              {/* Coluna 2 */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capacidade (kg)</label>
                  <Input type="text" inputMode="numeric" placeholder="Ex: 25000" value={form.capacity_kg} onChange={e => setForm(f => ({ ...f, capacity_kg: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">RENAVAM</label>
                  <Input placeholder="Ex: 01234567890" value={form.renavam} onChange={e => setForm(f => ({ ...f, renavam: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensões (m): Comp · Larg · Alt</label>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    <Input type="text" inputMode="decimal" placeholder="Comp." value={form.dimensions?.length_m || ""} onChange={e => setForm(f => ({ ...f, dimensions: { ...f.dimensions, length_m: e.target.value } }))} />
                    <Input type="text" inputMode="decimal" placeholder="Larg." value={form.dimensions?.width_m || ""} onChange={e => setForm(f => ({ ...f, dimensions: { ...f.dimensions, width_m: e.target.value } }))} />
                    <Input type="text" inputMode="decimal" placeholder="Alt." value={form.dimensions?.height_m || ""} onChange={e => setForm(f => ({ ...f, dimensions: { ...f.dimensions, height_m: e.target.value } }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimento CRLV</label>
                  <Input type="date" value={form.crlv_expiry} onChange={e => setForm(f => ({ ...f, crlv_expiry: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimento Seguro</label>
                  <Input type="date" value={form.insurance_expiry} onChange={e => setForm(f => ({ ...f, insurance_expiry: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Próx. aferição Tacógrafo</label>
                  <Input type="date" value={form.tachograph_next} onChange={e => setForm(f => ({ ...f, tachograph_next: e.target.value }))} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Quilometragem */}
            <div className="col-span-2 border-t border-border/40 pt-3 mt-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quilometragem</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Km atual (odômetro)</label>
                  <Input type="text" inputMode="numeric" placeholder="ex: 147832" value={form.total_km} onChange={e => setForm(f => ({ ...f, total_km: e.target.value.replace(/\D/g, "") }))} className="mt-1" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Alertas por km (vazio = padrão global)</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "km_alert_oil",    label: "Troca de óleo",  ph: "20000" },
                  { key: "km_alert_review", label: "Revisão geral",  ph: "40000" },
                  { key: "km_alert_tires",  label: "Troca de pneus", ph: "60000" },
                ].map(({ key, label, ph }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-muted-foreground">{label} (km)</label>
                    <Input type="text" inputMode="numeric" placeholder={ph} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value.replace(/\D/g, "") }))} className="mt-1" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2">
              <Button
                onClick={() => createMutation.mutate({
                  ...form,
                  year: Number(form.year) || undefined,
                  capacity_kg: Number(form.capacity_kg) || undefined,
                  crlv_expiry: form.crlv_expiry || undefined,
                  insurance_expiry: form.insurance_expiry || undefined,
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
                disabled={!form.plate || createMutation.isPending}
                className="w-full bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold"
              >
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por placa ou modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />Nenhum caminhão cadastrado.
          </div>
        )}
        {filtered.map(truck => {
          const sc = statusConfig[truck.status] || statusConfig.available;
          const hasAlert = hasDocAlert(truck);
          return (
            <Card key={truck.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-velox-dark to-velox-blue flex items-center justify-center relative">
                <Truck className="w-16 h-16 text-white/20" />
                <span className="absolute top-3 left-3 font-mono font-bold text-white text-lg">{truck.plate}</span>
                <span className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                {hasAlert && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-red-500/90 text-white text-xs px-2 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Doc. vencendo
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <p className="font-semibold">{truck.manufacturer} {truck.model}</p>
                <p className="text-xs text-muted-foreground">{truck.year} · {truck.truck_type}</p>
                {truck.capacity_kg && <p className="text-xs text-muted-foreground mt-0.5">{truck.capacity_kg.toLocaleString()} kg capacidade</p>}
                <Link to={`/admin/frota/${truck.id}`} className="mt-3 block">
                  <Button variant="outline" size="sm" className="w-full gap-1 text-xs"><Eye className="w-3 h-3" /> Ver detalhes</Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
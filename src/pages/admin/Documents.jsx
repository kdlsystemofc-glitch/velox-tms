import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { storage } from "@/api/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ExternalLink, Truck, Users, Search, Building2, Trash2, Upload, AlertTriangle, Download, ShieldCheck, Clock } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { downloadCsv, csvDate } from "@/utils/exportCsv";
import { differenceInDays, parseISO, format } from "date-fns";

const COMPANY_DOC_CATEGORIES = ["Contrato social", "Cartão CNPJ", "Inscrição estadual", "Alvará", "Licença ANTT/RNTRC", "Apólice de seguro", "Certidão negativa", "Procuração", "Contrato comercial", "Outro"];

function docBadge(expiry) {
  if (!expiry) return null;
  const days = differenceInDays(parseISO(expiry), new Date());
  if (days < 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Vencido</span>;
  if (days <= 30) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{days}d</span>;
  if (days <= 60) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days}d</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">OK</span>;
}

function DocRow({ label, expiry, url, onUpload, onExpiry }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await storage.uploadFile(file);
      await onUpload(file_url);
      toast({ title: `${label} anexado!` });
    } catch {
      toast({ title: `Erro ao anexar ${label}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-sm font-medium w-32 flex-shrink-0">{label}</span>
        {onExpiry ? (
          <Input type="date" value={expiry ? expiry.slice(0, 10) : ""} onChange={e => onExpiry(e.target.value || null)} className="h-8 w-36 text-xs" />
        ) : (
          <span className="text-xs text-muted-foreground">{expiry ? format(parseISO(expiry), "dd/MM/yyyy") : "—"}</span>
        )}
        {expiry && docBadge(expiry)}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {url && (
          <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => window.open(url, "_blank")}>
            <ExternalLink className="w-3 h-3" /> Ver
          </Button>
        )}
        <label className={`inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border text-xs cursor-pointer hover:bg-muted ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
          <Upload className="w-3 h-3" /> {uploading ? "..." : url ? "Trocar" : "Anexar"}
          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
    </div>
  );
}

export default function Documents() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [newDocCategory, setNewDocCategory] = useState("Contrato social");
  const [newDocExpiry, setNewDocExpiry] = useState("");
  const [expFilter, setExpFilter] = useState("60");
  const [companyCatFilter, setCompanyCatFilter] = useState("all");

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 300) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: () => base44.entities.CompanySettings.list(), select: d => d[0] || {} });
  const companyDocs = settings.documents || [];

  const updateTruck = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Truck.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trucks"] }),
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });
  const updateDriver = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Driver.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" }),
  });
  const setTruck = (id, data) => updateTruck.mutate({ id, data });
  const setDriver = (id, data) => updateDriver.mutate({ id, data });

  const saveCompanyDocs = async (docs) => {
    if (!settings.id) { toast({ title: "Configure a empresa primeiro", variant: "destructive" }); return; }
    await base44.entities.CompanySettings.update(settings.id, { documents: docs });
    queryClient.invalidateQueries({ queryKey: ["settings"] });
  };

  const uploadCompanyDoc = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await storage.uploadFile(file);
      await saveCompanyDocs([
        ...companyDocs,
        { name: file.name, category: newDocCategory, url: file_url, expiry: newDocExpiry || null, uploaded_at: new Date().toISOString() },
      ]);
      setNewDocExpiry("");
      toast({ title: "Documento anexado!" });
    } catch {
      toast({ title: "Erro ao anexar documento", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeCompanyDoc = async (idx) => {
    await saveCompanyDocs(companyDocs.filter((_, i) => i !== idx));
    toast({ title: "Documento removido." });
  };

  // Build NF signed documents from orders
  const nfDocs = [];
  orders.forEach(order => {
    (order.recipients || []).forEach(rec => {
      (rec.items || []).forEach(item => {
        if (item.nf_signed_url) {
          nfDocs.push({
            protocol: order.protocol,
            client: order.client_name,
            recipient: rec.name,
            nf_number: item.nf_number,
            date: order.created_date,
            url: item.nf_signed_url,
          });
        }
      });
    });
  });

  const filteredNf = nfDocs.filter(d =>
    !search || d.protocol?.toLowerCase().includes(search.toLowerCase()) || d.nf_number?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTrucks = trucks.filter(t =>
    !search || t.plate?.toLowerCase().includes(search.toLowerCase()) || t.model?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDrivers = drivers.filter(d =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Central de vencimentos (Doc-2): consolida frota + motoristas + empresa ──
  const today = new Date();
  const expiryItems = [];
  const pushExp = (group, entity, doc, expiry, url, link) => {
    if (!expiry) return;
    expiryItems.push({ group, entity, doc, expiry, url, link, days: differenceInDays(parseISO(expiry), today) });
  };
  trucks.forEach(t => {
    pushExp("Frota", t.plate, "CRLV", t.crlv_expiry, t.crlv_url, "/admin/documentos");
    pushExp("Frota", t.plate, "Seguro", t.insurance_expiry, t.insurance_url);
    pushExp("Frota", t.plate, "Tacógrafo", t.tachograph_next, t.tachograph_url);
  });
  drivers.forEach(d => {
    pushExp("Motorista", d.name, "CNH", d.cnh_expiry, d.cnh_url);
    pushExp("Motorista", d.name, "ASO", d.exam_aso_expiry, d.aso_url);
    pushExp("Motorista", d.name, "Toxicológico", d.exam_toxic_expiry, d.toxic_url);
  });
  companyDocs.forEach(d => pushExp("Empresa", d.category, d.name, d.expiry, d.url));
  expiryItems.sort((a, b) => a.days - b.days);

  const expByStatus = { expired: expiryItems.filter(i => i.days < 0), soon: expiryItems.filter(i => i.days >= 0 && i.days <= 30), watch: expiryItems.filter(i => i.days > 30 && i.days <= 60) };
  const expWindow = (() => {
    if (expFilter === "expired") return expiryItems.filter(i => i.days < 0);
    if (expFilter === "30") return expiryItems.filter(i => i.days <= 30);
    if (expFilter === "60") return expiryItems.filter(i => i.days <= 60);
    return expiryItems;
  })().filter(i => !search || `${i.entity} ${i.doc} ${i.group}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <PageHeader icon={FileText} title="Documentos" subtitle="NFs assinadas, CRLV, CNH e seguros">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-56"
          />
        </div>
      </PageHeader>

      <Tabs defaultValue="vencimentos">
        <TabsList>
          <TabsTrigger value="vencimentos" className="gap-2">
            <AlertTriangle className="w-4 h-4" /> Vencimentos
            {expByStatus.expired.length + expByStatus.soon.length > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5">{expByStatus.expired.length + expByStatus.soon.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2"><FileText className="w-4 h-4" /> Pedidos e Viagens</TabsTrigger>
          <TabsTrigger value="fleet" className="gap-2"><Truck className="w-4 h-4" /> Frota</TabsTrigger>
          <TabsTrigger value="drivers" className="gap-2"><Users className="w-4 h-4" /> Motoristas</TabsTrigger>
          <TabsTrigger value="company" className="gap-2"><Building2 className="w-4 h-4" /> Empresa</TabsTrigger>
        </TabsList>

        {/* Tab 0: Central de vencimentos */}
        <TabsContent value="vencimentos" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={AlertTriangle} label="Vencidos" value={expByStatus.expired.length} tone="danger" />
            <StatCard icon={Clock} label="Vencem em 30 dias" value={expByStatus.soon.length} tone="warning" />
            <StatCard icon={ShieldCheck} label="Vencem em 60 dias" value={expByStatus.watch.length} tone="primary" />
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1.5">
              {[["expired", "Vencidos"], ["30", "≤ 30 dias"], ["60", "≤ 60 dias"], ["all", "Todos"]].map(([v, l]) => (
                <Button key={v} size="sm" variant={expFilter === v ? "default" : "outline"} className={expFilter === v ? "bg-velox-dark text-white" : ""} onClick={() => setExpFilter(v)}>{l}</Button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-2" disabled={expWindow.length === 0}
              onClick={() => downloadCsv(`vencimentos-${new Date().toISOString().slice(0,10)}`, expWindow, [
                { key: "group", label: "Grupo" },
                { key: "entity", label: "Item" },
                { key: "doc", label: "Documento" },
                { key: "expiry", label: "Vencimento", format: csvDate },
                { key: "days", label: "Dias restantes" },
                { key: "url", label: "Arquivo", format: v => v ? "Sim" : "Não" },
              ])}>
              <Download className="w-4 h-4" /> Exportar
            </Button>
          </div>
          <Card>
            <CardContent className="pt-4">
              {expWindow.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30 text-green-600" />
                  <p className="text-sm">Nenhum documento {expFilter === "expired" ? "vencido" : "vencendo nesse período"}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs">
                        <th className="text-left py-2 font-medium">Grupo</th>
                        <th className="text-left py-2 font-medium">Item</th>
                        <th className="text-left py-2 font-medium">Documento</th>
                        <th className="text-left py-2 font-medium">Vencimento</th>
                        <th className="text-left py-2 font-medium">Situação</th>
                        <th className="text-right py-2 font-medium">Arquivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expWindow.map((i, idx) => (
                        <tr key={idx} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="py-2 text-xs text-muted-foreground">{i.group}</td>
                          <td className="py-2 font-medium">{i.entity}</td>
                          <td className="py-2">{i.doc}</td>
                          <td className="py-2 text-xs">{format(parseISO(i.expiry), "dd/MM/yyyy")}</td>
                          <td className="py-2">{docBadge(i.expiry)}</td>
                          <td className="py-2 text-right">
                            {i.url
                              ? <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => window.open(i.url, "_blank")}><ExternalLink className="w-3 h-3" /> Ver</Button>
                              : <span className="text-xs text-amber-500 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> sem arquivo</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Orders / NFs */}
        <TabsContent value="orders" className="mt-4 space-y-3">
          {filteredNf.length > 0 && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2"
                onClick={() => downloadCsv(`nfs-assinadas-${new Date().toISOString().slice(0,10)}`, filteredNf, [
                  { key: "protocol", label: "Protocolo" },
                  { key: "client", label: "Cliente" },
                  { key: "recipient", label: "Destinatário" },
                  { key: "nf_number", label: "NF nº" },
                  { key: "date", label: "Data", format: csvDate },
                ])}>
                <Download className="w-4 h-4" /> Exportar NFs
              </Button>
            </div>
          )}
          <Card>
            <CardContent className="pt-4">
              {filteredNf.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma NF assinada encontrada.</p>
                  <p className="text-xs mt-1 opacity-60">As NFs assinadas aparecem aqui após a confirmação de entrega nas viagens.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground">Protocolo</th>
                        <th className="text-left py-2 text-muted-foreground">Cliente</th>
                        <th className="text-left py-2 text-muted-foreground hidden md:table-cell">Destinatário</th>
                        <th className="text-left py-2 text-muted-foreground hidden sm:table-cell">NF nº</th>
                        <th className="text-left py-2 text-muted-foreground hidden lg:table-cell">Data</th>
                        <th className="text-right py-2 text-muted-foreground">Arquivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredNf.map((d, i) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="py-2 font-mono font-semibold">{d.protocol}</td>
                          <td className="py-2">{d.client}</td>
                          <td className="py-2 hidden md:table-cell text-muted-foreground">{d.recipient}</td>
                          <td className="py-2 hidden sm:table-cell font-mono">{d.nf_number || "—"}</td>
                          <td className="py-2 hidden lg:table-cell text-muted-foreground">
                            {d.date ? format(new Date(d.date), "dd/MM/yyyy") : "—"}
                          </td>
                          <td className="py-2 text-right">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => window.open(d.url, "_blank")}>
                              <ExternalLink className="w-3 h-3" /> Visualizar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Fleet */}
        <TabsContent value="fleet" className="mt-4">
          <div className="space-y-4">
            {filteredTrucks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Truck className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Nenhum caminhão encontrado.</p></div>
            ) : filteredTrucks.map(truck => (
              <Card key={truck.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span className="font-mono text-velox-amber">{truck.plate}</span>
                    <span className="text-muted-foreground font-normal">{truck.manufacturer} {truck.model}</span>
                    {(() => { const n = [truck.crlv_url, truck.insurance_url, truck.tachograph_url].filter(Boolean).length; return <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${n === 3 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{n}/3 anexados</span>; })()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DocRow label="CRLV" expiry={truck.crlv_expiry} url={truck.crlv_url}
                    onUpload={url => setTruck(truck.id, { crlv_url: url })} onExpiry={d => setTruck(truck.id, { crlv_expiry: d })} />
                  <DocRow label="Seguro" expiry={truck.insurance_expiry} url={truck.insurance_url}
                    onUpload={url => setTruck(truck.id, { insurance_url: url })} onExpiry={d => setTruck(truck.id, { insurance_expiry: d })} />
                  <DocRow label="Tacógrafo" expiry={truck.tachograph_next} url={truck.tachograph_url}
                    onUpload={url => setTruck(truck.id, { tachograph_url: url })} onExpiry={d => setTruck(truck.id, { tachograph_next: d })} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Drivers */}
        <TabsContent value="drivers" className="mt-4">
          <div className="space-y-4">
            {filteredDrivers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Users className="w-10 h-10 mx-auto mb-2 opacity-20" /><p className="text-sm">Nenhum motorista encontrado.</p></div>
            ) : filteredDrivers.map(driver => (
              <Card key={driver.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span>{driver.name}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${driver.status === "active" ? "bg-green-100 text-green-700" : driver.status === "away" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {driver.status === "active" ? "Ativo" : driver.status === "away" ? "Afastado" : "Desligado"}
                    </span>
                    {(() => { const n = [driver.cnh_url, driver.aso_url, driver.toxic_url].filter(Boolean).length; return <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${n === 3 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{n}/3 anexados</span>; })()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DocRow label={`CNH (Cat. ${driver.cnh_category || "—"})`} expiry={driver.cnh_expiry} url={driver.cnh_url}
                    onUpload={url => setDriver(driver.id, { cnh_url: url })} onExpiry={d => setDriver(driver.id, { cnh_expiry: d })} />
                  <DocRow label="ASO" expiry={driver.exam_aso_expiry} url={driver.aso_url}
                    onUpload={url => setDriver(driver.id, { aso_url: url })} onExpiry={d => setDriver(driver.id, { exam_aso_expiry: d })} />
                  <DocRow label="Toxicológico" expiry={driver.exam_toxic_expiry} url={driver.toxic_url}
                    onUpload={url => setDriver(driver.id, { toxic_url: url })} onExpiry={d => setDriver(driver.id, { exam_toxic_expiry: d })} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: Documentos da empresa (upload manual) */}
        <TabsContent value="company" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Anexar novo */}
              <div className="flex flex-wrap items-end gap-3 p-3 rounded-md border border-dashed border-border bg-muted/20">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Select value={newDocCategory} onValueChange={setNewDocCategory}>
                    <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPANY_DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Vencimento (opcional)</label>
                  <Input type="date" value={newDocExpiry} onChange={e => setNewDocExpiry(e.target.value)} className="h-9 w-40" />
                </div>
                <label className={`inline-flex items-center gap-2 h-9 px-3 rounded-md bg-velox-amber text-white font-bold text-sm cursor-pointer hover:bg-velox-amber/90 ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <Upload className="w-4 h-4" /> {uploading ? "Enviando..." : "Anexar arquivo"}
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { uploadCompanyDoc(e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>

              {companyDocs.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Categoria:</span>
                  <Select value={companyCatFilter} onValueChange={setCompanyCatFilter}>
                    <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {COMPANY_DOC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {companyDocs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhum documento da empresa anexado.</p>
                  <p className="text-xs mt-1 opacity-60">Contrato social, alvará, licença ANTT, apólices, etc.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2">Documento</th>
                        <th className="text-left py-2">Categoria</th>
                        <th className="text-left py-2 hidden sm:table-cell">Vencimento</th>
                        <th className="text-left py-2 hidden md:table-cell">Anexado em</th>
                        <th className="text-right py-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companyDocs.map((d, i) => ({ d, i })).filter(({ d }) => companyCatFilter === "all" || d.category === companyCatFilter).map(({ d, i }) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="py-2 font-medium">{d.name}</td>
                          <td className="py-2">{d.category}{d.expiry && docBadge(d.expiry) ? <span className="ml-2">{docBadge(d.expiry)}</span> : null}</td>
                          <td className="py-2 hidden sm:table-cell text-muted-foreground">{d.expiry ? format(parseISO(d.expiry), "dd/MM/yyyy") : "—"}</td>
                          <td className="py-2 hidden md:table-cell text-muted-foreground">{d.uploaded_at ? format(parseISO(d.uploaded_at), "dd/MM/yyyy") : "—"}</td>
                          <td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => window.open(d.url, "_blank")}><ExternalLink className="w-3 h-3" /> Ver</Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeCompanyDoc(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
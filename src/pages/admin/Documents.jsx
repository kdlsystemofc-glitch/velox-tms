import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { storage } from "@/api/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ExternalLink, Truck, Users, Search, Building2, Trash2, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { differenceInDays, parseISO, format } from "date-fns";

const COMPANY_DOC_CATEGORIES = ["Contrato social", "Alvará", "Licença ANTT/RNTRC", "Apólice de seguro", "Certidão", "Outro"];

function docBadge(expiry) {
  if (!expiry) return null;
  const days = differenceInDays(parseISO(expiry), new Date());
  if (days < 0) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Vencido</span>;
  if (days <= 30) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{days}d</span>;
  if (days <= 60) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{days}d</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">OK</span>;
}

function DocRow({ label, expiry, url }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium w-32">{label}</span>
        <span className="text-xs text-muted-foreground">
          {expiry ? format(parseISO(expiry), "dd/MM/yyyy") : "—"}
        </span>
        {expiry && docBadge(expiry)}
      </div>
      {url ? (
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => window.open(url, "_blank")}>
          <ExternalLink className="w-3 h-3" /> Ver
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground/50">Sem arquivo</span>
      )}
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

  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 300) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: settings = {} } = useQuery({ queryKey: ["settings"], queryFn: () => base44.entities.CompanySettings.list(), select: d => d[0] || {} });
  const companyDocs = settings.documents || [];

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

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2"><FileText className="w-4 h-4" /> Pedidos e Viagens</TabsTrigger>
          <TabsTrigger value="fleet" className="gap-2"><Truck className="w-4 h-4" /> Frota</TabsTrigger>
          <TabsTrigger value="drivers" className="gap-2"><Users className="w-4 h-4" /> Motoristas</TabsTrigger>
          <TabsTrigger value="company" className="gap-2"><Building2 className="w-4 h-4" /> Empresa</TabsTrigger>
        </TabsList>

        {/* Tab 1: Orders / NFs */}
        <TabsContent value="orders" className="mt-4">
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
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DocRow label="CRLV" expiry={truck.crlv_expiry} url={truck.crlv_url} />
                  <DocRow label="Seguro" expiry={truck.insurance_expiry} url={truck.insurance_url} />
                  <DocRow label="Tacógrafo" expiry={truck.tachograph_next} url={null} />
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
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DocRow label={`CNH (Cat. ${driver.cnh_category || "—"})`} expiry={driver.cnh_expiry} url={null} />
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
                      {companyDocs.map((d, i) => (
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
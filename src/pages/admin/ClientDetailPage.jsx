import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, TrendingUp, Plus, Trash2, MessageCircle, FileText, Receipt, Pencil, DollarSign, Package } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/admin/StatusBadge";
import { toLocalISO } from "@/utils/dateUtils";

const PRICING_FIELDS = [
  { key: "price_per_kg", label: "R$ / kg", step: "0.01" },
  { key: "price_per_km", label: "R$ / km", step: "0.01" },
  { key: "fixed_fee", label: "Taxa fixa (R$)", step: "0.01" },
  { key: "minimum_freight", label: "Frete mínimo (R$)", step: "0.01" },
  { key: "gris_percent", label: "GRIS (%)", step: "0.01" },
  { key: "ad_valorem_percent", label: "Ad Valorem (%)", step: "0.01" },
  { key: "tde_per_nf", label: "TDE por NF (R$)", step: "0.01" },
  { key: "tda_per_nf", label: "TDA por NF (R$)", step: "0.01" },
  { key: "toll_per_kg", label: "Pedágio (R$/kg)", step: "0.001" },
];

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showContactModal, setShowContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", role: "", phone: "", whatsapp: "", email: "", is_primary: false });
  const [editingContactIndex, setEditingContactIndex] = useState(null);
  const [editContact, setEditContact] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState(false);
  const [pricingForm, setPricingForm] = useState({});

  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: () => base44.entities.Client.filter({ id }),
    select: (d) => d[0],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 200),
    select: (d) => d.filter(o => o.client_id === id || o.client_cpf_cnpj === (client?.cpf_cnpj || "")),
  });

  useEffect(() => { if (client) setForm(client); }, [client]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client", id] }); queryClient.invalidateQueries({ queryKey: ["clients"] }); setEditing(false); toast({ title: "Cliente atualizado!" }); },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message || "Tente novamente.", variant: "destructive" }),
  });

  const handleSaveContact = async () => {
    const contactForm = editingContactIndex !== null ? editContact : newContact;
    if (!contactForm?.name?.trim()) return;
    const updated = [...(client.contacts || [])];
    if (contactForm.is_primary) updated.forEach(c => { c.is_primary = false; });
    if (editingContactIndex !== null) {
      updated[editingContactIndex] = contactForm;
    } else {
      updated.push({ ...contactForm });
    }
    await base44.entities.Client.update(client.id, { contacts: updated });
    queryClient.invalidateQueries({ queryKey: ["client", id] });
    setShowContactModal(false);
    setNewContact({ name: "", role: "", phone: "", whatsapp: "", email: "", is_primary: false });
    setEditingContactIndex(null);
    setEditContact(null);
    toast({ title: editingContactIndex !== null ? "Contato atualizado!" : "Contato adicionado!" });
  };

  const handleRemoveContact = async (index) => {
    const updated = (client.contacts || []).filter((_, i) => i !== index);
    await base44.entities.Client.update(client.id, { contacts: updated });
    queryClient.invalidateQueries({ queryKey: ["client", id] });
  };

  if (!client) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full" /></div>;

  const totalRevenue = orders.reduce((s, o) => s + (o.freight_value || 0), 0);
  const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clientes")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center shadow-soft">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold">{client.company_name}</h1>
                {client.code && <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{client.code}</span>}
              </div>
              <p className="text-muted-foreground text-sm font-mono">{client.cpf_cnpj}</p>
            </div>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${client.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
          {client.status === "active" ? "Ativo" : "Inativo"}
        </span>
        {client.billing_type === "monthly" && !editing && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowInvoiceModal(true)}>
            <Receipt className="w-3.5 h-3.5" /> Fechar fatura
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>{editing ? "Cancelar" : "Editar"}</Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Package} label="Fretes Realizados" value={orders.length} tone="primary" />
        <StatCard icon={DollarSign} label="Total Faturado" value={`R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} tone="success" />
        <StatCard icon={TrendingUp} label="Ticket Médio" value={`R$ ${avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="py-3 border-b border-border bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-velox-amber" /> Dados Cadastrais
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Razão Social / Nome *</label>
                    <Input placeholder="Empresa Ltda" value={form.company_name || ""} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF / CNPJ *</label>
                    <Input placeholder="00.000.000/0001-00" value={form.cpf_cnpj || ""} onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de pessoa</label>
                    <Select value={form.type || "pj"} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                        <SelectItem value="pf">Pessoa Física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone</label>
                    <Input placeholder="(00) 00000-0000" value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</label>
                    <Input placeholder="contato@empresa.com" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Perfil de cliente</label>
                    <Select value={form.client_type || "eventual"} onValueChange={v => setForm(f => ({ ...f, client_type: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recorrente">Recorrente</SelectItem>
                        <SelectItem value="eventual">Eventual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                    <Select value={form.status || "active"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</label>
                    <Textarea placeholder="Informações adicionais..." rows={2} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de cobrança</label>
                    <Select value={form.billing_type || "per_trip"} onValueChange={v => setForm(f => ({ ...f, billing_type: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_trip">Por viagem (padrão)</SelectItem>
                        <SelectItem value="monthly">Faturamento mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.billing_type === "monthly" && (
                    <>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dia de fechamento (1-28)</label>
                        <Input type="number" min="1" max="28" placeholder="ex: 25" value={form.billing_day || ""} onChange={e => setForm(f => ({ ...f, billing_day: Number(e.target.value) }))} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo de pagamento (dias)</label>
                        <Input type="number" min="0" placeholder="ex: 30" value={form.payment_term_days || ""} onChange={e => setForm(f => ({ ...f, payment_term_days: Number(e.target.value) }))} className="mt-1" />
                      </div>
                    </>
                  )}
                  {/* Endereço no modo edição */}
                  <div className="col-span-2 border-t border-border/40 pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Endereço principal</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CEP</label>
                        <Input placeholder="00000-000" value={form.address?.cep || ""} className="mt-1" onChange={e => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                          const fmt = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits;
                          setForm(f => ({ ...f, address: { ...f.address, cep: fmt } }));
                          if (digits.length === 8) {
                            fetch(`https://viacep.com.br/ws/${digits}/json/`).then(r => r.json()).then(d => {
                              if (!d.erro) setForm(f => ({ ...f, address: { ...f.address, street: d.logradouro || "", neighborhood: d.bairro || "", city: d.localidade || "", state: d.uf || "" } }));
                            }).catch(() => {});
                          }
                        }} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número</label>
                        <Input placeholder="ex: 450" value={form.address?.number || ""} className="mt-1" onChange={e => setForm(f => ({ ...f, address: { ...f.address, number: e.target.value } }))} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rua / Logradouro</label>
                        <Input placeholder="Preenchido pelo CEP" value={form.address?.street || ""} className="mt-1" onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bairro</label>
                        <Input value={form.address?.neighborhood || ""} className="mt-1" onChange={e => setForm(f => ({ ...f, address: { ...f.address, neighborhood: e.target.value } }))} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cidade / UF</label>
                        <Input value={form.address?.city ? `${form.address.city} / ${form.address.state}` : ""} readOnly className="mt-1 bg-muted/30" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Complemento</label>
                        <Input placeholder="ex: Galpão 7" value={form.address?.complement || ""} className="mt-1" onChange={e => setForm(f => ({ ...f, address: { ...f.address, complement: e.target.value } }))} />
                      </div>
                    </div>
                  </div>
                  <Button className="col-span-2 font-bold" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {[
                    ["CPF/CNPJ", <span className="font-mono">{client.cpf_cnpj}</span>],
                    ["Tipo", client.type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"],
                    ["Telefone", client.phone || "—"],
                    ["E-mail", client.email || "—"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium">{val}</p>
                    </div>
                  ))}
                  {client.notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p>{client.notes}</p>
                    </div>
                  )}
                  {client.address?.cep && (
                    <div className="col-span-2 pt-3 border-t border-border/40">
                      <p className="text-xs text-muted-foreground mb-1">Endereço</p>
                      <p className="text-sm font-medium">{client.address.street}{client.address.number && `, ${client.address.number}`}{client.address.complement && ` — ${client.address.complement}`}</p>
                      <p className="text-sm text-muted-foreground">{client.address.neighborhood && `${client.address.neighborhood} · `}{client.address.city}/{client.address.state} · CEP {client.address.cep}</p>
                    </div>
                  )}
                  </div>
                  )}

                  {/* Contatos */}
                  <div className="mt-6 border-t border-border pt-5">
                  <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Contatos</h3>
                  <Button size="sm" variant="outline" onClick={() => setShowContactModal(true)}>
                   <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar contato
                  </Button>
                  </div>
                  {(client.contacts || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
                  ) : (
                  <div className="space-y-2">
                   {(client.contacts || []).map((c, i) => (
                     <div key={i} className={`flex items-start justify-between p-3 rounded-xl border ${c.is_primary ? "bg-velox-amber/5 border-velox-amber/30" : "border-border"}`}>
                       <div>
                         <div className="flex items-center gap-2">
                           <p className="font-medium text-sm">{c.name}</p>
                           {c.is_primary && <span className="text-[10px] bg-velox-amber/20 text-white font-bold px-1.5 py-0.5 rounded-full">Principal</span>}
                         </div>
                         <p className="text-xs text-muted-foreground">{c.role}</p>
                         <div className="flex gap-3 mt-1">
                           {c.phone && <p className="text-xs">{c.phone}</p>}
                           {c.email && <p className="text-xs text-blue-600">{c.email}</p>}
                         </div>
                       </div>
                       <div className="flex gap-1">
                         {c.whatsapp && (
                           <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                             <MessageCircle className="w-3.5 h-3.5" />
                           </a>
                         )}
                         <button onClick={() => { setEditingContactIndex(i); setEditContact({ ...c }); setShowContactModal(true); }} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg">
                           <Pencil className="w-3.5 h-3.5" />
                         </button>
                         <button onClick={() => handleRemoveContact(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                           <Trash2 className="w-3.5 h-3.5" />
                         </button>
                       </div>
                     </div>
                   ))}
                  </div>
                  )}
                  </div>
                  </CardContent>
                  </Card>

                  {/* Modal de contato */}
                  {showContactModal && (() => {
                    const contactForm = editingContactIndex !== null ? editContact : newContact;
                    const setContactForm = editingContactIndex !== null ? setEditContact : setNewContact;
                    return (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="bg-background rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                          <h3 className="font-semibold text-base">{editingContactIndex !== null ? "Editar Contato" : "Adicionar Contato"}</h3>
                          <div className="space-y-3">
                            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome *</label>
                              <Input placeholder="Nome completo" value={contactForm?.name || ""} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                            </div>
                            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Função</label>
                              <Select value={contactForm?.role || ""} onValueChange={v => setContactForm(f => ({ ...f, role: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                                <SelectContent>
                                  {["Financeiro","Logística","Compras","Diretor","Gerente","Outro"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone</label>
                                <Input placeholder="(00) 00000-0000" value={contactForm?.phone || ""} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                              </div>
                              <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">WhatsApp</label>
                                <Input placeholder="(00) 00000-0000" value={contactForm?.whatsapp || ""} onChange={e => setContactForm(f => ({ ...f, whatsapp: e.target.value }))} className="mt-1" />
                              </div>
                            </div>
                            <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</label>
                              <Input type="email" placeholder="contato@email.com" value={contactForm?.email || ""} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={contactForm?.is_primary || false} onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))} className="w-4 h-4 accent-velox-amber" />
                              <span className="text-sm">Contato principal</span>
                            </label>
                          </div>
                          <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" size="sm" onClick={() => { setShowContactModal(false); setEditingContactIndex(null); setEditContact(null); }}>Cancelar</Button>
                            <Button size="sm" className="font-bold" onClick={handleSaveContact} disabled={!contactForm?.name?.trim()}>Salvar</Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
        </div>

        <div className="space-y-4">
          {/* Tabela de frete personalizada (B3) */}
          <Card>
            <CardHeader className="py-3 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-velox-amber" /> Tabela de Frete
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                  setPricingForm(client.custom_pricing || {});
                  setEditingPricing(!editingPricing);
                }}>
                  {editingPricing ? "Cancelar" : "Editar"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {editingPricing ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">Campos em branco usam a tabela padrão da empresa. Esta tabela tem prioridade sobre rotas e padrão.</p>
                  {PRICING_FIELDS.map(f => (
                    <div key={f.key} className="flex items-center justify-between gap-2">
                      <label className="text-xs text-muted-foreground flex-1">{f.label}</label>
                      <Input
                        type="number"
                        step={f.step}
                        className="h-8 w-28 text-sm font-mono text-right"
                        value={pricingForm[f.key] ?? ""}
                        onChange={e => setPricingForm(p => ({ ...p, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs text-red-600" onClick={async () => {
                      await base44.entities.Client.update(client.id, { custom_pricing: {} });
                      queryClient.invalidateQueries({ queryKey: ["client", id] });
                      setEditingPricing(false);
                      toast({ title: "Tabela personalizada removida", description: "Cliente voltou a usar a tabela padrão." });
                    }}>Limpar</Button>
                    <Button size="sm" className="flex-1 font-bold text-xs" onClick={async () => {
                      const cleaned = {};
                      PRICING_FIELDS.forEach(f => {
                        const v = pricingForm[f.key];
                        if (v !== "" && v != null && !isNaN(Number(v))) cleaned[f.key] = Number(v);
                      });
                      await base44.entities.Client.update(client.id, { custom_pricing: cleaned });
                      queryClient.invalidateQueries({ queryKey: ["client", id] });
                      setEditingPricing(false);
                      toast({ title: "Tabela de frete salva!" });
                    }}>Salvar</Button>
                  </div>
                </div>
              ) : (
                (() => {
                  const cp = client.custom_pricing || {};
                  const hasCustom = Object.keys(cp).some(k => cp[k] !== "" && cp[k] != null);
                  if (!hasCustom) return <p className="text-sm text-muted-foreground">Usa a tabela padrão da empresa.</p>;
                  return (
                    <div className="space-y-1">
                      {PRICING_FIELDS.filter(f => cp[f.key] != null && cp[f.key] !== "").map(f => (
                        <div key={f.key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span className="font-mono font-medium">{Number(cp[f.key]).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <p className="text-[10px] text-velox-amber pt-1">★ Tabela negociada — prioridade sobre rotas e padrão</p>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
          {/* Billing info card */}
          {client.billing_type === "monthly" && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-700">Faturamento Mensal</span>
                </div>
                <p className="text-xs text-amber-600">
                  Fechamento dia {client.billing_day || "—"} · Prazo {client.payment_term_days || "—"} dias
                </p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="py-3 border-b border-border bg-muted/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-velox-amber" /> Últimos Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">Nenhum pedido ainda.</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 5).map(o => (
                    <div key={o.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold">{o.protocol}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    {/* Histórico de preços (5.6) */}
    <Card>
      <CardHeader className="py-3 border-b border-border bg-muted/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-velox-amber" /> Histórico de preços
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {(() => {
          const priced = orders.filter(o => o.status !== "cancelled" && (o.freight_value > 0 || o.total_weight_kg > 0));
          if (priced.length === 0) return <p className="text-sm text-muted-foreground text-center py-3">Nenhum pedido com valor ainda.</p>;
          const perKgList = priced.map(o => (o.total_weight_kg > 0 ? (o.freight_value || 0) / o.total_weight_kg : null)).filter(v => v != null);
          const avgPerKg = perKgList.length ? perKgList.reduce((s, v) => s + v, 0) / perKgList.length : 0;
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 font-medium">Data</th>
                    <th className="text-left py-2 font-medium">Protocolo</th>
                    <th className="text-right py-2 font-medium">Peso</th>
                    <th className="text-right py-2 font-medium">Valor decl.</th>
                    <th className="text-right py-2 font-medium">Frete</th>
                    <th className="text-right py-2 font-medium">R$/kg</th>
                  </tr>
                </thead>
                <tbody>
                  {priced.map(o => {
                    const perKg = o.total_weight_kg > 0 ? (o.freight_value || 0) / o.total_weight_kg : null;
                    const dev = perKg != null && avgPerKg > 0 ? (perKg - avgPerKg) / avgPerKg : 0;
                    const off = Math.abs(dev) > 0.3; // >30% fora da média
                    return (
                      <tr key={o.id} className="border-b border-border/40">
                        <td className="py-2 text-muted-foreground">{o.created_date ? new Date(o.created_date).toLocaleDateString("pt-BR") : "—"}</td>
                        <td className="py-2"><Link to={`/admin/coletas/${o.id}`} className="font-mono text-velox-amber hover:underline">{o.protocol}</Link></td>
                        <td className="py-2 text-right font-mono">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</td>
                        <td className="py-2 text-right font-mono">{o.total_declared_value ? `R$ ${Number(o.total_declared_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                        <td className="py-2 text-right font-mono">{o.freight_value ? `R$ ${Number(o.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                        <td className={`py-2 text-right font-mono font-semibold ${off ? (dev > 0 ? "text-red-600" : "text-amber-600") : "text-foreground"}`} title={off ? `${(dev * 100).toFixed(0)}% vs. média` : ""}>
                          {perKg != null ? `R$ ${perKg.toFixed(2)}` : "—"}{off && (dev > 0 ? " ▲" : " ▼")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border">
                    <td colSpan={5} className="py-2 text-right text-muted-foreground">Média R$/kg</td>
                    <td className="py-2 text-right font-mono font-bold">R$ {avgPerKg.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="text-[10px] text-muted-foreground mt-2">▲ acima / ▼ abaixo da média (desvio &gt; 30%) — ajuda a achar fretes fora do padrão.</p>
            </div>
          );
        })()}
      </CardContent>
    </Card>

    {/* Invoice modal */}
    <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-velox-amber" /> Fechar Fatura do Mês
          </DialogTitle>
        </DialogHeader>
        {(() => {
          const now = new Date();
          const monthOrders = orders.filter(o => {
            if (!o.created_date) return false;
            const d = new Date(o.created_date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
              && o.status !== "cancelled" && o.freight_value > 0;
          });
          const total = monthOrders.reduce((s, o) => s + (o.freight_value || 0), 0);
          const billingDay = client.billing_day || 25;
          const termDays = client.payment_term_days || 30;
          const closingDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
          const dueDate = new Date(closingDate.getTime() + termDays * 86400000);
          return (
            <div className="space-y-4">
              {monthOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhum frete no mês atual.</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {monthOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs">{o.protocol}</span>
                        <span className="font-medium">R$ {(o.freight_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-3 space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span>Total da fatura</span>
                      <span className="font-mono text-green-600">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fechamento</span>
                      <span>{closingDate.toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Vencimento ({termDays} dias)</span>
                      <span className="font-semibold text-amber-600">{dueDate.toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full font-bold"
                    onClick={async () => {
                      await base44.entities.Revenue.create({
                        description: `Fatura mensal — ${client.company_name} (${now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })})`,
                        amount: total,
                        due_date: toLocalISO(dueDate),
                        client_id: client.id,
                        status: "receivable",
                      });
                      setShowInvoiceModal(false);
                      toast({ title: "Fatura gerada!", description: `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} — vence em ${dueDate.toLocaleDateString("pt-BR")}` });
                    }}
                  >
                    Gerar fatura (R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                  </Button>
                </>
              )}
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
    </div>
  );
}
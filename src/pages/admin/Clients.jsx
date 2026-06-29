import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2, Eye, MessageCircle, DollarSign, Download } from "lucide-react";
import { downloadCsv, csvDate } from "@/utils/exportCsv";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import DataTable from "@/components/shared/DataTable";
import { FormSection, Field } from "@/components/shared/FormSection";
import { AddressFields } from "@/components/shared/AddressFields";
import DeliveryWindowEditor from "@/components/shared/DeliveryWindowEditor";
import ContactsEditor from "@/components/shared/ContactsEditor";
import { formatCpfCnpj, isValidCpfCnpj, onlyDigits } from "@/utils/validators";

const EMPTY_CLIENT = {
  company_name: "", cpf_cnpj: "", type: "pj", email: "", phone: "",
  client_type: "eventual", status: "active", notes: "", billing_type: "per_trip",
  trade_name: "", credit_limit: null,
  address: { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
  collection_window: { days: [], start: "", end: "", pause_start: "", pause_end: "" },
  delivery_window: { days: [], start: "", end: "", pause_start: "", pause_end: "" },
  contacts: [],
};

async function generateClientCode(clients) {
  const maxNum = clients.reduce((max, c) => {
    const match = c.code?.match(/CLI(\d+)/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);
  return `CLI${String(maxNum + 1).padStart(5, "0")}`;
}

export default function Clients({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [viewingClient, setViewingClient] = useState(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });

  // Uso por cliente: nº de pedidos + data do último (Cad-3).
  const usageByClient = {};
  for (const o of orders) {
    if (!o.client_id) continue;
    const u = (usageByClient[o.client_id] ||= { count: 0, last: null });
    u.count++;
    const d = o.created_date || o.created_at;
    if (d && (!u.last || d > u.last)) u.last = d;
  }

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const allClients = await base44.entities.Client.list("-created_date", 1000);
      const code = await generateClientCode(allClients);
      const { contacts: formContacts, ...rest } = data;
      const contacts = (formContacts || []).filter(c => c.name?.trim());
      return base44.entities.Client.create({ ...rest, code, contacts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAdd(false);
      setForm(EMPTY_CLIENT);
      toast({ title: "Cliente cadastrado!" });
    },
    onError: (e) => toast({ title: "Erro ao cadastrar", description: e?.message, variant: "destructive" }),
  });

  // Validação de CPF/CNPJ (formato + duplicidade).
  const docDigits = onlyDigits(form.cpf_cnpj);
  const docDuplicate = (docDigits.length === 11 || docDigits.length === 14) && clients.some(c => onlyDigits(c.cpf_cnpj) === docDigits);
  const docInvalid = docDigits.length > 0 && !isValidCpfCnpj(docDigits);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!hideTitle && (
          <div>
            <h1 className="font-display text-3xl font-extrabold text-foreground">Clientes</h1>
            <p className="text-muted-foreground text-sm mt-1">{clients.length} cliente(s) cadastrado(s)</p>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" className="gap-2" disabled={clients.length === 0}
          onClick={() => downloadCsv(`clientes-${new Date().toISOString().slice(0,10)}`, clients, [
            { key: "code", label: "Código" },
            { key: "company_name", label: "Razão Social / Nome" },
            { key: "trade_name", label: "Nome fantasia" },
            { key: "cpf_cnpj", label: "CPF/CNPJ" },
            { key: "type", label: "Tipo", format: v => v === "pj" ? "PJ" : "PF" },
            { key: "client_type", label: "Perfil" },
            { key: "phone", label: "Telefone" },
            { key: "email", label: "E-mail" },
            { key: "billing_type", label: "Cobrança", format: v => v === "monthly" ? "Mensal" : "Por viagem" },
            { key: "status", label: "Status" },
            { key: "id", label: "Pedidos", format: (_v, c) => usageByClient[c.id]?.count || 0 },
          ])}>
          <Download className="w-4 h-4" /> Exportar
        </Button>
        <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setForm(EMPTY_CLIENT); }}>
          <DialogTrigger asChild>
            <Button className="font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
              <DialogTitle className="flex items-center gap-2 text-base"><Building2 className="w-4.5 h-4.5 text-primary" /> Cadastrar Cliente</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 p-5">
              <FormSection title="Identificação" icon={Building2} cols={2}>
                <Field label="Razão Social / Nome" required colSpan={2}>
                  <Input placeholder="Empresa Ltda ou João Silva" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </Field>
                <Field label="Nome fantasia" colSpan={2}>
                  <Input placeholder="Como o cliente é conhecido" value={form.trade_name || ""} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
                </Field>
                <Field label="CPF / CNPJ" required hint={docDuplicate ? "⚠ Já cadastrado para outro cliente" : docInvalid ? "⚠ CPF/CNPJ inválido" : undefined}>
                  <Input placeholder="00.000.000/0001-00" value={form.cpf_cnpj}
                    onChange={(e) => setForm({ ...form, cpf_cnpj: formatCpfCnpj(e.target.value) })}
                    className={docDuplicate || docInvalid ? "border-red-400 focus-visible:ring-red-400" : ""} />
                </Field>
                <Field label="Tipo de pessoa">
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                      <SelectItem value="pf">Pessoa Física</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {form.type === "pj" && (
                  <Field label="Inscrição Estadual" colSpan={2}>
                    <Input placeholder="Isento ou número da IE" value={form.state_registration || ""} onChange={(e) => setForm({ ...form, state_registration: e.target.value })} />
                  </Field>
                )}
                <Field label="E-mail">
                  <Input placeholder="contato@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label="Telefone">
                  <Input placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
              </FormSection>

              <FormSection title="Comercial" description="Perfil e forma de cobrança" icon={DollarSign} cols={2}>
                <Field label="Perfil de cliente">
                  <Select value={form.client_type} onValueChange={(v) => setForm({ ...form, client_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recorrente">Recorrente</SelectItem>
                      <SelectItem value="eventual">Eventual</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tipo de cobrança" colSpan={form.billing_type === "monthly" ? 2 : 2}>
                  <Select value={form.billing_type || "per_trip"} onValueChange={v => setForm(f => ({ ...f, billing_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_trip">Por viagem (padrão)</SelectItem>
                      <SelectItem value="monthly">Faturamento mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {form.billing_type === "monthly" && (
                  <>
                    <Field label="Dia de fechamento (1-28)">
                      <Input type="number" min="1" max="28" placeholder="ex: 25" value={form.billing_day || ""} onChange={e => setForm(f => ({ ...f, billing_day: Number(e.target.value) }))} />
                    </Field>
                    <Field label="Prazo de pagamento (dias)">
                      <Input type="number" min="0" placeholder="ex: 30" value={form.payment_term_days || ""} onChange={e => setForm(f => ({ ...f, payment_term_days: Number(e.target.value) }))} />
                    </Field>
                  </>
                )}
                <Field label="Limite de crédito (R$)" colSpan={2}>
                  <Input type="number" step="0.01" placeholder="0 = sem limite" value={form.credit_limit ?? ""} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value === "" ? null : Number(e.target.value) }))} />
                </Field>
              </FormSection>

              <FormSection title="Contatos" cols={1}>
                <ContactsEditor value={form.contacts} onChange={contacts => setForm(f => ({ ...f, contacts }))} />
              </FormSection>

              <AddressFields
                title="Endereço principal"
                value={form.address || {}}
                onChange={addr => setForm(f => ({ ...f, address: addr }))}
              />

              <FormSection title="Janelas (coleta e entrega)" cols={1}>
                <DeliveryWindowEditor label="Janela de coleta" value={form.collection_window} onChange={(w) => setForm(f => ({ ...f, collection_window: w }))} />
                <div className="h-2" />
                <DeliveryWindowEditor label="Janela de entrega" value={form.delivery_window} onChange={(w) => setForm(f => ({ ...f, delivery_window: w }))} />
              </FormSection>

              <FormSection title="Observações" cols={1}>
                <Field label="Anotações internas" optional>
                  <Textarea placeholder="Ex: portaria fecha às 17h, pagamento somente por PIX" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="resize-none" />
                </Field>
              </FormSection>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border sticky bottom-0 bg-background z-10">
              <Button variant="outline" onClick={() => { setShowAdd(false); setForm(EMPTY_CLIENT); }}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.company_name || !form.cpf_cnpj || docInvalid || docDuplicate || createMutation.isPending}
                className="font-bold gap-2"
              >
                <Plus className="w-4 h-4" /> {createMutation.isPending ? "Salvando..." : "Cadastrar cliente"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <DataTable
        data={clients}
        searchKeys={["company_name", "cpf_cnpj", "code", "email"]}
        searchPlaceholder="Buscar por nome, CNPJ, código ou e-mail..."
        initialSort={{ key: "company_name", dir: "asc" }}
        onRowClick={(c) => setViewingClient(c)}
        emptyMessage="Nenhum cliente cadastrado."
        columns={[
          { key: "code", label: "Código", sortable: true, width: 90, className: "font-mono text-xs text-muted-foreground", render: c => c.code || "—" },
          { key: "company_name", label: "Razão Social / Nome", sortable: true, className: "font-medium", render: c => (
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center flex-shrink-0"><Building2 className="w-3.5 h-3.5 text-primary" /></span>
              <span className="truncate">{c.company_name}</span>
            </div>
          )},
          { key: "cpf_cnpj", label: "CPF / CNPJ", sortable: true, className: "font-mono text-xs", render: c => c.cpf_cnpj || "—" },
          { key: "type", label: "Tipo", sortable: true, render: c => c.type === "pj" ? "PJ" : "PF" },
          { key: "client_type", label: "Perfil", sortable: true, render: c => c.client_type === "recorrente" ? "Recorrente" : "Eventual" },
          { key: "contact", label: "Contato", value: c => c.phone || c.email || "", className: "text-xs text-muted-foreground", render: c => (
            <div className="leading-tight">
              {c.phone && <p>{c.phone}</p>}
              {c.email && <p className="truncate max-w-[180px]">{c.email}</p>}
              {!c.phone && !c.email && "—"}
            </div>
          )},
          { key: "orders", label: "Pedidos", sortable: true, align: "right", className: "font-mono text-xs", value: c => usageByClient[c.id]?.count || 0, render: c => usageByClient[c.id]?.count || 0 },
          { key: "status", label: "Status", sortable: true, value: c => c.status, render: c => (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border ${
              c.status === "active" ? "text-green-700 dark:text-green-300 bg-green-500/10 border-green-500/30" : "text-muted-foreground bg-muted border-border"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.status === "active" ? "bg-green-600" : "bg-gray-400"}`} />
              {c.status === "active" ? "Ativo" : "Inativo"}
            </span>
          )},
          { key: "actions", label: "", align: "right", stopPropagation: true, width: 50, render: c => (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewingClient(c)} title="Ver detalhes"><Eye className="w-3.5 h-3.5" /></Button>
          )},
        ]}
      />

      {/* Sheet de visualização */}
      <Sheet open={!!viewingClient} onOpenChange={() => setViewingClient(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              {viewingClient?.company_name}
              {viewingClient?.code && <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{viewingClient.code}</span>}
            </SheetTitle>
          </SheetHeader>
          {viewingClient && (
            <div className="mt-4 space-y-5">
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                {[
                  ["CNPJ / CPF", viewingClient.cpf_cnpj || "—"],
                  ["Tipo", viewingClient.type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"],
                  ["Telefone", viewingClient.phone || "—"],
                  ["E-mail", viewingClient.email || "—"],
                  ["Perfil", viewingClient.client_type === "recorrente" ? "Recorrente" : "Eventual"],
                  ["Status", viewingClient.status === "active" ? "Ativo" : "Inativo"],
                  ["Cobrança", viewingClient.billing_type === "monthly" ? "Mensal" : "Por viagem"],
                  ["Pedidos", String(usageByClient[viewingClient.id]?.count || 0)],
                  ["Último pedido", usageByClient[viewingClient.id]?.last ? new Date(usageByClient[viewingClient.id].last).toLocaleDateString("pt-BR") : "—"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium">{val}</p>
                  </div>
                ))}
                {viewingClient.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm">{viewingClient.notes}</p>
                  </div>
                )}
              </div>
              {viewingClient.address?.cep && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Endereço</p>
                  <p className="text-sm">{viewingClient.address.street}{viewingClient.address.number ? `, ${viewingClient.address.number}` : ""}</p>
                  {viewingClient.address.complement && <p className="text-sm">{viewingClient.address.complement}</p>}
                  <p className="text-sm text-muted-foreground">
                    {[viewingClient.address.neighborhood, viewingClient.address.city, viewingClient.address.state].filter(Boolean).join(" · ")}
                    {viewingClient.address.cep && ` · CEP ${viewingClient.address.cep}`}
                  </p>
                </div>
              )}
              {(viewingClient.contacts || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contatos</p>
                  <div className="space-y-2">
                    {viewingClient.contacts.map((c, i) => (
                      <div key={i} className="p-3 bg-muted/30 rounded-xl text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {c.is_primary && <span className="text-[10px] bg-velox-amber/20 text-white font-bold px-1.5 py-0.5 rounded-full">Principal</span>}
                        </div>
                        {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                        <div className="flex gap-3 mt-1 flex-wrap text-xs">
                          {c.phone && <span>{c.phone}</span>}
                          {c.email && <span className="text-blue-600 dark:text-blue-300">{c.email}</span>}
                          {c.whatsapp && (
                            <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-300 flex items-center gap-1">
                              <MessageCircle size={10} /> {c.whatsapp}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-border/40">
                <Link to={`/admin/clientes/${viewingClient.id}`} className="flex-1" onClick={() => setViewingClient(null)}>
                  <Button className="w-full font-bold">Ver cadastro completo</Button>
                </Link>
                <Button variant="outline" onClick={() => setViewingClient(null)} className="flex-1">Fechar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
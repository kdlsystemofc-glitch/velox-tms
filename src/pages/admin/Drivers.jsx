import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, AlertTriangle, Eye, User, IdCard, Briefcase, Landmark } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays, parseISO } from "date-fns";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { FormSection, Field } from "@/components/shared/FormSection";
import { NumericInput } from "@/components/shared/NumericInput";
import { AddressFields } from "@/components/shared/AddressFields";
import { formatCPF, isValidCPF, onlyDigits } from "@/utils/validators";

const driverStatusConfig = {
  active:     { label: "Ativo",     dot: "bg-green-600", cls: "text-green-700 dark:text-green-300 bg-green-500/10 border-green-500/30" },
  away:       { label: "Afastado",  dot: "bg-amber-500", cls: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30" },
  terminated: { label: "Desligado", dot: "bg-red-500",   cls: "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/30" },
};

const statusLabels = {
  active: { label: "Ativo", color: "bg-green-500/15 text-green-700 dark:text-green-300" },
  away: { label: "Afastado", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  terminated: { label: "Desligado", color: "bg-red-500/15 text-red-700 dark:text-red-300" },
};

export default function Drivers({ hideTitle = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const EMPTY_DRIVER = { name: "", cpf: "", phone: "", email: "", birth_date: "", hire_date: "", cnh_number: "", cnh_category: "C", cnh_expiry: "", ear: true, cnh_points: "", exam_aso_expiry: "", exam_toxic_expiry: "", default_truck_id: "", role: "motorista", contract_type: "clt", base_salary: "", commission_percent: "", status: "active", address: { street: "", number: "", neighborhood: "", city: "", state: "", cep: "" }, bank_info: { bank: "", agency: "", account: "", pix_key: "" }, notes: "" };
  const [form, setForm] = useState(EMPTY_DRIVER);

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => db.Driver.list() });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => db.Truck.list() });

  const createMutation = useMutation({
    mutationFn: (data) => db.Driver.create(data),
    onSuccess: (driver) => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setShowAdd(false);
      setForm(EMPTY_DRIVER);
      toast({ title: "Motorista cadastrado!" });
      navigate(`/admin/motoristas/${driver.id}`);
    },
    onError: (e) => toast({ title: "Erro ao cadastrar", description: e?.message, variant: "destructive" }),
  });

  // Validação de CPF (formato + duplicidade).
  const cpfDigits = onlyDigits(form.cpf);
  const cpfDuplicate = cpfDigits.length === 11 && drivers.some(d => onlyDigits(d.cpf) === cpfDigits);
  const cpfInvalid = cpfDigits.length > 0 && !isValidCPF(cpfDigits);

  // Pendências de documentos (CNH / ASO / toxicológico) vencidas ou a vencer em 60 dias.
  const docPendencies = (driver) => {
    const labels = [["cnh_expiry", "CNH"], ["exam_aso_expiry", "ASO"], ["exam_toxic_expiry", "Toxicológico"]];
    return labels
      .filter(([k]) => driver[k] && differenceInDays(parseISO(driver[k]), new Date()) <= 60)
      .map(([k, l]) => ({ label: l, expired: differenceInDays(parseISO(driver[k]), new Date()) < 0 }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {!hideTitle ? (
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Motoristas</h1>
            <p className="text-muted-foreground text-xs mt-0.5">{drivers.length} motorista(s) cadastrado(s)</p>
          </div>
        ) : <p className="text-xs text-muted-foreground">{drivers.length} motorista(s) cadastrado(s)</p>}
        <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setForm(EMPTY_DRIVER); }}>
          <DialogTrigger asChild>
            <Button className="font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="px-5 py-4 border-b border-border sticky top-0 bg-background z-10">
              <DialogTitle className="flex items-center gap-2 text-base"><Users className="w-4.5 h-4.5 text-primary" /> Cadastrar Motorista</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 p-5">
              <FormSection title="Dados pessoais" icon={User} cols={2}>
                <Field label="Nome completo" required colSpan={2}>
                  <Input placeholder="Ex: João da Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </Field>
                <Field label="CPF" required hint={cpfDuplicate ? "⚠ CPF já cadastrado" : cpfInvalid ? "⚠ CPF inválido" : undefined}>
                  <Input
                    placeholder="000.000.000-00"
                    value={form.cpf}
                    onChange={e => setForm(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                    className={cpfDuplicate || cpfInvalid ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                </Field>
                <Field label="Data de nascimento">
                  <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
                </Field>
                <Field label="Telefone">
                  <Input placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </Field>
                <Field label="E-mail">
                  <Input type="email" placeholder="motorista@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </Field>
              </FormSection>

              <FormSection title="Habilitação (CNH)" icon={IdCard} cols={3}>
                <Field label="Número da CNH">
                  <Input placeholder="Ex: 01234567890" value={form.cnh_number} onChange={e => setForm(f => ({ ...f, cnh_number: e.target.value }))} />
                </Field>
                <Field label="Categoria">
                  <Select value={form.cnh_category} onValueChange={v => setForm(f => ({ ...f, cnh_category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>{["A","B","C","D","E","AB","AC","AD","AE"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Vencimento" hint="Gera alerta automático">
                  <Input type="date" value={form.cnh_expiry} onChange={e => setForm(f => ({ ...f, cnh_expiry: e.target.value }))} />
                </Field>
                <Field label="Pontos na CNH" hint="0 a 40">
                  <NumericInput integer value={form.cnh_points} onChange={v => setForm(f => ({ ...f, cnh_points: v }))} placeholder="Ex: 0" />
                </Field>
                <Field label="EAR" hint="Exerce atividade remunerada" colSpan={2}>
                  <label className="flex items-center gap-2 h-9 cursor-pointer text-sm">
                    <Checkbox checked={!!form.ear} onCheckedChange={v => setForm(f => ({ ...f, ear: !!v }))} />
                    CNH habilitada para atividade remunerada (EAR)
                  </label>
                </Field>
              </FormSection>

              <FormSection title="Saúde e veículo" icon={IdCard} cols={3}>
                <Field label="Validade ASO" hint="Exame ocupacional">
                  <Input type="date" value={form.exam_aso_expiry} onChange={e => setForm(f => ({ ...f, exam_aso_expiry: e.target.value }))} />
                </Field>
                <Field label="Validade toxicológico">
                  <Input type="date" value={form.exam_toxic_expiry} onChange={e => setForm(f => ({ ...f, exam_toxic_expiry: e.target.value }))} />
                </Field>
                <Field label="Veículo padrão">
                  <Select value={form.default_truck_id || "none"} onValueChange={v => setForm(f => ({ ...f, default_truck_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </FormSection>

              <FormSection title="Contrato" icon={Briefcase} cols={2}>
                <Field label="Função">
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motorista">Motorista</SelectItem>
                      <SelectItem value="ajudante">Ajudante</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Tipo de contrato">
                  <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="pj">PJ</SelectItem>
                      <SelectItem value="diarista">Diarista</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Data de admissão">
                  <Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} />
                </Field>
                <Field label="Salário base (R$)">
                  <NumericInput currency value={form.base_salary} onChange={v => setForm(f => ({ ...f, base_salary: v }))} placeholder="3.500,00" />
                </Field>
                <Field label="Comissão (% do frete)" hint="Aplicada no acerto ao encerrar a viagem">
                  <NumericInput value={form.commission_percent} onChange={v => setForm(f => ({ ...f, commission_percent: v }))} placeholder="ex: 10" />
                </Field>
                <Field label="Status" colSpan={2}>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="away">Afastado</SelectItem>
                      <SelectItem value="terminated">Desligado</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FormSection>

              <AddressFields
                title="Endereço"
                value={form.address || {}}
                onChange={addr => setForm(f => ({ ...f, address: addr }))}
              />

              <FormSection title="Dados bancários" description="Para pagamento de salário e adiantamentos" icon={Landmark} cols={4}>
                <Field label="Banco" colSpan={2}>
                  <Input placeholder="Ex: Banco do Brasil" value={form.bank_info?.bank || ""} onChange={e => setForm(f => ({ ...f, bank_info: { ...f.bank_info, bank: e.target.value } }))} />
                </Field>
                <Field label="Agência">
                  <Input value={form.bank_info?.agency || ""} onChange={e => setForm(f => ({ ...f, bank_info: { ...f.bank_info, agency: e.target.value } }))} />
                </Field>
                <Field label="Conta">
                  <Input value={form.bank_info?.account || ""} onChange={e => setForm(f => ({ ...f, bank_info: { ...f.bank_info, account: e.target.value } }))} />
                </Field>
                <Field label="Chave PIX" colSpan={4}>
                  <Input placeholder="CPF, telefone, e-mail ou aleatória" value={form.bank_info?.pix_key || ""} onChange={e => setForm(f => ({ ...f, bank_info: { ...f.bank_info, pix_key: e.target.value } }))} />
                </Field>
              </FormSection>

              <FormSection title="Observações" cols={1}>
                <Field label="Anotações internas" optional>
                  <Textarea rows={2} className="resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Restrições, histórico, observações..." />
                </Field>
              </FormSection>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border sticky bottom-0 bg-background z-10">
              <Button variant="outline" onClick={() => { setShowAdd(false); setForm(EMPTY_DRIVER); }}>Cancelar</Button>
              <Button
                onClick={() => createMutation.mutate({ ...form, base_salary: Number(form.base_salary) || undefined, cnh_points: form.cnh_points === "" ? undefined : Number(form.cnh_points) })}
                disabled={!form.name || !form.cpf || cpfInvalid || cpfDuplicate || createMutation.isPending}
                className="font-bold gap-2"
              >
                <Plus className="w-4 h-4" /> {createMutation.isPending ? "Salvando..." : "Cadastrar motorista"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable
        data={drivers}
        searchKeys={["name", "cpf", "cnh_number", "phone"]}
        searchPlaceholder="Buscar por nome, CPF ou CNH..."
        initialSort={{ key: "name", dir: "asc" }}
        onRowClick={(d) => navigate(`/admin/motoristas/${d.id}`)}
        emptyMessage="Nenhum motorista cadastrado."
        columns={[
          { key: "name", label: "Motorista", sortable: true, className: "font-medium", render: d => (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 bg-velox-dark rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold">{d.name?.charAt(0)}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate">{d.name}</span>
                {(() => {
                  const p = docPendencies(d);
                  if (p.length === 0) return null;
                  const expired = p.some(x => x.expired);
                  return <span className={`text-[11px] flex items-center gap-0.5 ${expired ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300"}`}><AlertTriangle className="w-3 h-3" /> {expired ? "Pendência: " : "A vencer: "}{p.map(x => x.label).join(", ")}</span>;
                })()}
              </span>
            </div>
          )},
          { key: "cpf", label: "CPF", sortable: true, className: "font-mono text-xs text-muted-foreground", render: d => d.cpf || "—" },
          { key: "cnh", label: "CNH", value: d => d.cnh_category || "", className: "text-xs text-muted-foreground", render: d => <span>Cat. {d.cnh_category || "—"} · {d.cnh_expiry || "—"}{d.ear ? " · EAR" : ""}{Number(d.cnh_points) > 0 ? ` · ${d.cnh_points} pts` : ""}</span> },
          { key: "role", label: "Função", sortable: true, className: "text-xs", render: d => ({ motorista: "Motorista", ajudante: "Ajudante", administrativo: "Administrativo" }[d.role] || d.role || "—") },
          { key: "phone", label: "Telefone", className: "text-xs text-muted-foreground", render: d => d.phone || "—" },
          { key: "status", label: "Status", sortable: true, value: d => d.status, render: d => <StatusBadge status={d.status} config={driverStatusConfig} /> },
          { key: "actions", label: "", align: "right", stopPropagation: true, width: 50, render: d => (
            <Link to={`/admin/motoristas/${d.id}`}><Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button></Link>
          )},
        ]}
      />
    </div>
  );
}
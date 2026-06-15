import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Search, AlertTriangle, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { differenceInDays, parseISO } from "date-fns";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";

const driverStatusConfig = {
  active:     { label: "Ativo",     dot: "bg-green-600", cls: "text-green-700 bg-green-50 border-green-200" },
  away:       { label: "Afastado",  dot: "bg-amber-500", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  terminated: { label: "Desligado", dot: "bg-red-500",   cls: "text-red-700 bg-red-50 border-red-200" },
};

const statusLabels = {
  active: { label: "Ativo", color: "bg-green-100 text-green-700" },
  away: { label: "Afastado", color: "bg-amber-100 text-amber-700" },
  terminated: { label: "Desligado", color: "bg-red-100 text-red-700" },
};

export default function Drivers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const EMPTY_DRIVER = { name: "", cpf: "", phone: "", email: "", birth_date: "", hire_date: "", cnh_number: "", cnh_category: "C", cnh_expiry: "", role: "motorista", contract_type: "clt", base_salary: "", status: "active" };
  const [form, setForm] = useState(EMPTY_DRIVER);

  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.create(data),
    onSuccess: (driver) => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setShowAdd(false);
      setForm(EMPTY_DRIVER);
      toast({ title: "Motorista cadastrado!" });
      navigate(`/admin/motoristas/${driver.id}`);
    },
  });

  const filtered = drivers.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.cpf?.includes(search));

  const cnhAlert = (driver) => {
    if (!driver.cnh_expiry) return false;
    return differenceInDays(parseISO(driver.cnh_expiry), new Date()) <= 60;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Motoristas</h1>
          <p className="text-muted-foreground text-sm mt-1">{drivers.length} motorista(s) cadastrado(s)</p>
        </div>
        <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setForm(EMPTY_DRIVER); }}>
          <DialogTrigger asChild>
            <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Novo Motorista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Cadastrar Motorista</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {/* Coluna 1 */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome completo *</label>
                  <Input placeholder="Ex: João da Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF *</label>
                  <Input placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone</label>
                  <Input placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</label>
                  <Input type="email" placeholder="motorista@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de nascimento</label>
                  <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de admissão</label>
                  <Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} className="mt-1" />
                </div>
              </div>
              {/* Coluna 2 */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número da CNH</label>
                  <Input placeholder="Ex: 01234567890" value={form.cnh_number} onChange={e => setForm(f => ({ ...f, cnh_number: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria CNH</label>
                  <Select value={form.cnh_category} onValueChange={v => setForm(f => ({ ...f, cnh_category: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>{["A","B","C","D","E","AB","AC","AD","AE"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vencimento da CNH</label>
                  <Input type="date" value={form.cnh_expiry} onChange={e => setForm(f => ({ ...f, cnh_expiry: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Função</label>
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motorista">Motorista</SelectItem>
                      <SelectItem value="ajudante">Ajudante</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de contrato</label>
                  <Select value={form.contract_type} onValueChange={v => setForm(f => ({ ...f, contract_type: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clt">CLT</SelectItem>
                      <SelectItem value="pj">PJ</SelectItem>
                      <SelectItem value="diarista">Diarista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Salário base (R$)</label>
                  <Input type="text" inputMode="decimal" placeholder="Ex: 3.500,00" value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="away">Afastado</SelectItem>
                      <SelectItem value="terminated">Desligado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button
              onClick={() => createMutation.mutate({ ...form, base_salary: parseFloat(String(form.base_salary).replace(/\./g, "").replace(",", ".")) || undefined })}
              disabled={!form.name || !form.cpf || createMutation.isPending}
              className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold mt-2"
            >
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
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
                {cnhAlert(d) && <span className="text-[11px] text-red-600 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> CNH vencendo</span>}
              </span>
            </div>
          )},
          { key: "cpf", label: "CPF", sortable: true, className: "font-mono text-xs text-muted-foreground", render: d => d.cpf || "—" },
          { key: "cnh", label: "CNH", value: d => d.cnh_category || "", className: "text-xs text-muted-foreground", render: d => `Cat. ${d.cnh_category || "—"} · ${d.cnh_expiry || "—"}` },
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
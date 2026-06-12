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
            <Button className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2">
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
              className="w-full bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold mt-2"
            >
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Motorista</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">CPF</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">CNH</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Telefone</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />Nenhum motorista cadastrado.
              </td></tr>
            )}
            {filtered.map(driver => {
              const sc = statusLabels[driver.status] || statusLabels.active;
              const hasAlert = cnhAlert(driver);
              return (
                <tr key={driver.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-velox-dark rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{driver.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        {hasAlert && <span className="text-xs text-red-500 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> CNH vencendo</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground hidden md:table-cell">{driver.cpf}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground hidden lg:table-cell">Cat. {driver.cnh_category} · {driver.cnh_expiry || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{driver.phone || "—"}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/admin/motoristas/${driver.id}`}>
                      <Button variant="ghost" size="sm" className="h-7"><Eye className="w-4 h-4" /></Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
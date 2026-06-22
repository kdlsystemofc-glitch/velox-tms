import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, User, FileText, TrendingUp, AlertTriangle, CheckCircle, AlertCircle, Smartphone, KeyRound, Power, Trash2 } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";

function docStatus(expiry) {
  if (!expiry) return null;
  const days = differenceInDays(parseISO(expiry), new Date());
  if (days < 0) return { label: "Vencido", color: "bg-red-100 text-red-700" };
  if (days <= 30) return { label: `${days}d`, color: "bg-red-100 text-red-700" };
  if (days <= 60) return { label: `${days}d`, color: "bg-amber-100 text-amber-700" };
  return { label: "OK", color: "bg-green-100 text-green-700" };
}

export default function DriverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPwd, setAccessPwd] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);

  const { data: driver } = useQuery({
    queryKey: ["driver", id],
    queryFn: () => base44.entities.Driver.filter({ id }),
    select: (d) => d[0],
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 200),
  });

  useEffect(() => { if (driver) setForm(driver); }, [driver]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["driver", id] }); queryClient.invalidateQueries({ queryKey: ["drivers"] }); setEditing(false); toast({ title: "Motorista atualizado!" }); },
    onError: (e) => toast({ title: "Erro ao salvar", description: e?.message || "Tente novamente.", variant: "destructive" }),
  });

  if (!driver) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full" /></div>;

  const cnhSt = docStatus(driver.cnh_expiry);
  const driverOrders = orders.filter(o => o.driver_id === id);
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);
  const thisMonthOrders = driverOrders.filter(o =>
    o.created_date?.startsWith(thisMonth) && o.status !== "cancelled"
  );
  const monthRevenue = thisMonthOrders.reduce((s, o) => s + (o.freight_value || 0), 0);
  const avgTicket = thisMonthOrders.length > 0 ? monthRevenue / thisMonthOrders.length : 0;

  // ── Gestão de acesso ao app (funções transacionais no servidor) ──
  const access = driver.app_access || "none";
  const runAccess = async (fn, args, okMsg) => {
    setAccessBusy(true);
    try {
      const { error } = await supabase.rpc(fn, args);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["driver", id] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast({ title: okMsg });
      setAccessEmail(""); setAccessPwd("");
    } catch (e) {
      toast({ title: "Erro", description: e?.message || "Falhou. A migration de acesso foi aplicada?", variant: "destructive" });
    } finally {
      setAccessBusy(false);
    }
  };
  const createLogin = () => {
    if (!accessEmail.trim() || accessPwd.length < 6) { toast({ title: "Informe e-mail e senha (mín. 6)", variant: "destructive" }); return; }
    runAccess("admin_create_driver_login", { p_driver_id: id, p_email: accessEmail.trim(), p_password: accessPwd }, "Acesso criado! Passe as credenciais ao motorista.");
  };
  const resetPwd = () => {
    const pwd = window.prompt("Nova senha (mín. 6 caracteres):");
    if (pwd && pwd.length >= 6) runAccess("admin_reset_driver_password", { p_driver_id: id, p_password: pwd }, "Senha redefinida.");
    else if (pwd) toast({ title: "Senha muito curta", variant: "destructive" });
  };
  const toggleFreeze = () => runAccess("admin_set_driver_access", { p_driver_id: id, p_frozen: access !== "frozen" }, access === "frozen" ? "Acesso reativado." : "Acesso congelado.");
  const deleteLogin = () => { if (window.confirm("Excluir o acesso do motorista ao app? Ele não conseguirá mais entrar.")) runAccess("admin_delete_driver_login", { p_driver_id: id }, "Acesso excluído."); };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/motoristas")}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-velox-dark rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{driver.name?.charAt(0)}</span>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">{driver.name}</h1>
              <p className="text-muted-foreground text-xs">{driver.role} · {driver.contract_type?.toUpperCase()}</p>
            </div>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          driver.status === "active" ? "bg-green-100 text-green-700" :
          driver.status === "away" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
        }`}>
          {driver.status === "active" ? "Ativo" : driver.status === "away" ? "Afastado" : "Desligado"}
        </span>
        <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
          {editing ? "Cancelar" : "Editar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Personal data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-velox-amber" /> Dados Pessoais e Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome completo *</label>
                    <Input placeholder="João da Silva" value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de nascimento</label>
                    <Input type="date" value={form.birth_date || ""} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CPF *</label>
                    <Input placeholder="000.000.000-00" value={form.cpf || ""} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone</label>
                    <Input placeholder="(00) 00000-0000" value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</label>
                    <Input placeholder="motorista@email.com" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número da CNH</label>
                    <Input placeholder="00000000000" value={form.cnh_number || ""} onChange={e => setForm(f => ({ ...f, cnh_number: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria CNH</label>
                    <Select value={form.cnh_category || "C"} onValueChange={v => setForm(f => ({ ...f, cnh_category: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Validade CNH</label>
                    <Input type="date" value={form.cnh_expiry || ""} onChange={e => setForm(f => ({ ...f, cnh_expiry: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data de admissão</label>
                    <Input type="date" value={form.hire_date || ""} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Função</label>
                    <Select value={form.role || "motorista"} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
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
                    <Select value={form.contract_type || "clt"} onValueChange={v => setForm(f => ({ ...f, contract_type: v }))}>
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
                    <Input type="text" inputMode="decimal" placeholder="Ex: 3.500,00" value={form.base_salary || ""} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                    <Select value={form.status || "active"} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="away">Afastado</SelectItem>
                        <SelectItem value="terminated">Desligado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="col-span-2 bg-velox-amber hover:bg-velox-amber/90 text-white font-bold" onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {[
                    ["CPF", <span className="font-mono">{driver.cpf}</span>],
                    ["Data de nascimento", driver.birth_date ? format(parseISO(driver.birth_date), "dd/MM/yyyy") : "—"],
                    ["Telefone", driver.phone || "—"],
                    ["E-mail", driver.email || "—"],
                    ["Função", driver.role || "—"],
                    ["CNH", `${driver.cnh_number || "—"} (Cat. ${driver.cnh_category || "—"})`],
                    ["Validade CNH", driver.cnh_expiry ? format(parseISO(driver.cnh_expiry), "dd/MM/yyyy") : "—"],
                    ["Admissão", driver.hire_date ? format(parseISO(driver.hire_date), "dd/MM/yyyy") : "—"],
                    ["Contrato", driver.contract_type?.toUpperCase() || "—"],
                    ["Salário base", driver.base_salary ? `R$ ${Number(driver.base_salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"],
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

          {/* Acesso ao app do motorista */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-velox-amber" /> Acesso ao app</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  access === "active" ? "bg-green-100 text-green-700" :
                  access === "frozen" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {access === "active" ? "Com acesso" : access === "frozen" ? "Congelado" : "Sem acesso"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {access === "none" ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Crie o login do motorista para ele usar o app pelo celular.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input placeholder="E-mail de acesso" value={accessEmail} onChange={e => setAccessEmail(e.target.value)} />
                    <Input type="text" placeholder="Senha inicial (mín. 6)" value={accessPwd} onChange={e => setAccessPwd(e.target.value)} />
                  </div>
                  <Button size="sm" className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-1.5" disabled={accessBusy} onClick={createLogin}>
                    <KeyRound className="w-3.5 h-3.5" /> Criar acesso
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">Login: <span className="font-mono font-medium">{driver.app_email || "—"}</span></p>
                  {access === "frozen" && <p className="text-xs text-amber-700">Acesso congelado — o motorista não consegue entrar.</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="text-xs gap-1.5" disabled={accessBusy} onClick={resetPwd}><KeyRound className="w-3.5 h-3.5" /> Redefinir senha</Button>
                    <Button size="sm" variant="outline" className={`text-xs gap-1.5 ${access === "frozen" ? "text-green-600" : "text-amber-600"}`} disabled={accessBusy} onClick={toggleFreeze}>
                      <Power className="w-3.5 h-3.5" /> {access === "frozen" ? "Reativar" : "Congelar"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1.5 text-red-600" disabled={accessBusy} onClick={deleteLogin}><Trash2 className="w-3.5 h-3.5" /> Excluir acesso</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Month performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-velox-amber" /> Painel do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{thisMonthOrders.length}</p>
                  <p className="text-xs text-muted-foreground">Fretes no mês</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-lg font-bold text-green-600 font-mono">R$ {monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                  <p className="text-xs text-muted-foreground">Receita gerada</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-lg font-bold text-foreground font-mono">R$ {avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</p>
                  <p className="text-xs text-muted-foreground">Ticket médio</p>
                </div>
              </div>
              {driver.base_salary && (
                <div className="border-t border-border pt-3 text-sm">
                  <div className="flex justify-between py-1"><span className="text-muted-foreground">Salário base</span><span className="font-mono">R$ {Number(driver.base_salary || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between py-1 font-semibold border-t border-border mt-1"><span>Custo estimado/mês</span><span className="font-mono">R$ {Number(driver.base_salary || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last orders */}
          {driverOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Últimos Pedidos</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground">Protocolo</th>
                      <th className="text-left py-2 text-muted-foreground">Cliente</th>
                      <th className="text-left py-2 text-muted-foreground">Status</th>
                      <th className="text-right py-2 text-muted-foreground">Valor</th>
                    </tr></thead>
                    <tbody>
                      {driverOrders.slice(0, 5).map(o => (
                        <tr key={o.id} className="border-b border-border/40">
                          <td className="py-2 font-mono font-semibold">{o.protocol}</td>
                          <td className="py-2">{o.client_name}</td>
                          <td className="py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              o.status === "delivered" ? "bg-green-100 text-green-700" :
                              o.status === "in_transit" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
                            }`}>{o.status === "delivered" ? "Entregue" : o.status === "in_transit" ? "Em Trânsito" : o.status}</span>
                          </td>
                          <td className="py-2 text-right font-mono">{o.freight_value ? `R$ ${o.freight_value.toFixed(2)}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* CNH Card */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-velox-amber" /> Documentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">CNH</p>
                  {cnhSt && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cnhSt.color}`}>{cnhSt.label}</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {driver.cnh_expiry ? `Venc. ${format(parseISO(driver.cnh_expiry), "dd/MM/yyyy")}` : "Não cadastrada"}
                </p>
                <p className="text-xs text-muted-foreground">Categoria: {driver.cnh_category || "—"}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Para adicionar mais documentos, edite o perfil do motorista.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
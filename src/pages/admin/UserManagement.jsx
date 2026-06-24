import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import DataTable from "@/components/shared/DataTable";
import { Users, Power, Trash2, ShieldCheck, Plus, KeyRound } from "lucide-react";

const ROLE_LABEL = { admin: "Administrador", operator: "Operador", motorista: "Motorista", pending: "Pendente" };
const ROLE_CLS = {
  admin: "bg-velox-amber/15 text-velox-amber border-velox-amber/30",
  operator: "bg-blue-100 text-blue-700 border-blue-200",
  motorista: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-gray-100 text-gray-600 border-gray-200",
};
const EMPTY_CREATE = { full_name: "", email: "", role: "operator", password: "" };

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [resetUser, setResetUser] = useState(null);
  const [resetPass, setResetPass] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      // Preferimos a RPC (traz o último acesso); cai na tabela direta se a migration ainda não rodou.
      const { data, error } = await supabase.rpc("admin_list_users");
      if (!error && data) return data;
      const r = await supabase.from("user_profiles").select("*").order("created_at", { ascending: true });
      if (r.error) throw r.error;
      return r.data || [];
    },
  });

  const { data: audit = [] } = useQuery({
    queryKey: ["user-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_audit_log").select("*").order("created_at", { ascending: false }).limit(20);
      if (error) return [];
      return data || [];
    },
  });

  const logAction = (action, target, detail) => {
    supabase.rpc("admin_log_action", { p_action: action, p_target_email: target || null, p_detail: detail || null })
      .then(() => queryClient.invalidateQueries({ queryKey: ["user-audit"] })).catch(() => {});
  };

  const run = useMutation({
    mutationFn: async ({ fn, args }) => {
      const { error } = await supabase.rpc(fn, args);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["user-profiles"] });
      if (vars.log) logAction(vars.log.action, vars.log.target, vars.log.detail);
      toast({ title: "Atualizado!" });
    },
    onError: (e) => toast({ title: "Erro", description: e?.message || "Falhou. A migration de papéis foi aplicada?", variant: "destructive" }),
  });

  const createUser = useMutation({
    mutationFn: async (form) => {
      const { error } = await supabase.rpc("admin_create_user", { p_email: form.email.trim().toLowerCase(), p_password: form.password, p_full_name: form.full_name.trim(), p_role: form.role });
      if (error) throw error;
    },
    onSuccess: (_d, form) => { queryClient.invalidateQueries({ queryKey: ["user-profiles"] }); logAction("Criou usuário", form.email, ROLE_LABEL[form.role]); setShowCreate(false); setCreateForm(EMPTY_CREATE); toast({ title: "Usuário criado!", description: "Já pode entrar com o e-mail e a senha definidos." }); },
    onError: (e) => toast({ title: "Erro ao criar usuário", description: e?.message, variant: "destructive" }),
  });

  const resetPassword = useMutation({
    mutationFn: async ({ id, password, email }) => {
      const { error } = await supabase.rpc("admin_reset_user_password", { p_user_id: id, p_password: password });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => { logAction("Redefiniu senha", vars.email); setResetUser(null); setResetPass(""); toast({ title: "Senha redefinida!" }); },
    onError: (e) => toast({ title: "Erro ao redefinir", description: e?.message, variant: "destructive" }),
  });

  const setRole = (p, role) => run.mutate({ fn: "admin_set_user_role", args: { p_user_id: p.id, p_role: role }, log: { action: "Alterou papel", target: p.email, detail: `→ ${ROLE_LABEL[role] || role}` } });
  const toggleActive = (p) => run.mutate({ fn: "admin_set_user_active", args: { p_user_id: p.id, p_active: p.active === false }, log: { action: p.active === false ? "Reativou" : "Desativou", target: p.email } });
  const remove = (p) => { if (window.confirm(`Excluir o usuário ${p.email}?`)) run.mutate({ fn: "admin_delete_user", args: { p_user_id: p.id }, log: { action: "Excluiu usuário", target: p.email } }); };

  const counts = { admin: 0, operator: 0, motorista: 0, pending: 0 };
  profiles.forEach(p => { counts[p.role] = (counts[p.role] || 0) + 1; });
  const pending = profiles.filter(p => p.role === "pending");

  const visible = profiles.filter(p => {
    if (roleFilter !== "all" && p.role !== roleFilter) return false;
    if (statusFilter === "active" && p.active === false) return false;
    if (statusFilter === "inactive" && p.active !== false) return false;
    return true;
  });
  const fmtAccess = (ts) => ts ? new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";

  return (
    <div className="space-y-4">
      <PageHeader icon={Users} title="Usuários & Acessos" subtitle="Crie usuários e defina quem é administrador, operador ou motorista">
        <Button className="font-bold gap-2" onClick={() => { setCreateForm(EMPTY_CREATE); setShowCreate(true); }}>
          <Plus className="w-4 h-4" /> Novo usuário
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Administradores</p><p className="text-2xl font-bold text-velox-amber">{counts.admin}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Operadores</p><p className="text-2xl font-bold text-blue-600">{counts.operator}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Motoristas</p><p className="text-2xl font-bold text-green-600">{counts.motorista}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-gray-500">{counts.pending}</p></CardContent></Card>
      </div>

      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {pending.length} usuário(s) aguardando liberação de acesso. Defina o papel abaixo.
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {[["all", "Todos os papéis"], ["admin", "Admins"], ["operator", "Operadores"], ["motorista", "Motoristas"], ["pending", "Pendentes"]].map(([v, l]) => (
          <Button key={v} size="sm" variant={roleFilter === v ? "default" : "outline"} className={roleFilter === v ? "bg-velox-dark text-white" : ""} onClick={() => setRoleFilter(v)}>{l}</Button>
        ))}
        <span className="w-px bg-border mx-1" />
        {[["all", "Todas"], ["active", "Ativos"], ["inactive", "Desativados"]].map(([v, l]) => (
          <Button key={v} size="sm" variant={statusFilter === v ? "default" : "outline"} className={statusFilter === v ? "bg-velox-dark text-white" : ""} onClick={() => setStatusFilter(v)}>{l}</Button>
        ))}
      </div>

      <DataTable
        data={visible}
        searchKeys={["full_name", "email"]}
        searchPlaceholder="Buscar por nome ou e-mail…"
        initialSort={{ key: "full_name", dir: "asc" }}
        emptyMessage="Nenhum usuário."
        columns={[
          { key: "full_name", label: "Usuário", sortable: true, className: "font-medium", render: p => (
            <div>
              <p className="font-medium flex items-center gap-1.5">{p.full_name || "—"} {p.id === user?.id && <span className="text-[10px] text-muted-foreground">(você)</span>}
                {p.role === "motorista" && p.driver_id && <span className="text-[9px] bg-green-100 text-green-700 font-bold px-1 rounded">app motorista</span>}</p>
              <p className="text-xs text-muted-foreground font-mono">{p.email}</p>
            </div>
          )},
          { key: "role", label: "Papel", sortable: true, stopPropagation: true, render: p => (
            <Select value={p.role || "pending"} onValueChange={(v) => setRole(p, v)} disabled={run.isPending}>
              <SelectTrigger className={`h-8 w-40 text-xs border ${ROLE_CLS[p.role] || ROLE_CLS.pending}`}><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          )},
          { key: "last_sign_in_at", label: "Último acesso", sortable: true, className: "text-xs text-muted-foreground", render: p => fmtAccess(p.last_sign_in_at) },
          { key: "active", label: "Situação", sortable: true, value: p => (p.active === false ? "inactive" : "active"), render: p => (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.active === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{p.active === false ? "Desativado" : "Ativo"}</span>
          )},
          { key: "actions", label: "", align: "right", stopPropagation: true, render: p => {
            const isSelf = p.id === user?.id;
            return (
              <div className="flex justify-end whitespace-nowrap">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={run.isPending} onClick={() => { setResetUser(p); setResetPass(""); }}><KeyRound className="w-3.5 h-3.5" /> Senha</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={run.isPending || isSelf} onClick={() => toggleActive(p)}><Power className="w-3.5 h-3.5" /> {p.active === false ? "Ativar" : "Desativar"}</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500" disabled={run.isPending || isSelf} onClick={() => remove(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            );
          }},
        ]}
      />

      {audit.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Atividade recente</p>
            <div className="space-y-1.5">
              {audit.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs gap-2 border-b border-border/30 last:border-0 pb-1.5 last:pb-0">
                  <span className="min-w-0 truncate">
                    <strong className="text-foreground">{a.actor_email || "—"}</strong> · {a.action}
                    {a.target_email && <span className="text-muted-foreground"> → {a.target_email}</span>}
                    {a.detail && <span className="text-muted-foreground"> ({a.detail})</span>}
                  </span>
                  <span className="text-muted-foreground flex-shrink-0">{a.created_at ? new Date(a.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" /> O sistema impede remover/desativar o último administrador. Motoristas também recebem login no cadastro do motorista.
      </p>

      {/* Criar usuário */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4 text-velox-amber" /> Novo usuário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground">Nome completo</label><Input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ex: Maria Souza" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">E-mail <span className="text-red-500">*</span></label><Input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="usuario@empresa.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-muted-foreground">Papel</label>
                <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="operator">Operador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Senha temporária <span className="text-red-500">*</span></label><Input type="text" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="mín. 6 caracteres" /></div>
            </div>
            <p className="text-[11px] text-muted-foreground">O usuário entra com este e-mail e senha. Oriente-o a trocar a senha depois.</p>
            <Button className="w-full font-bold"
              disabled={!createForm.email.trim() || createForm.password.length < 6 || createUser.isPending}
              onClick={() => createUser.mutate(createForm)}>
              {createUser.isPending ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Redefinir senha */}
      <Dialog open={!!resetUser} onOpenChange={(v) => { if (!v) setResetUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-velox-amber" /> Redefinir senha</DialogTitle></DialogHeader>
          {resetUser && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Nova senha para <strong className="text-foreground">{resetUser.email}</strong></p>
              <Input type="text" value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="mín. 6 caracteres" autoFocus />
              <Button className="w-full font-bold"
                disabled={resetPass.length < 6 || resetPassword.isPending}
                onClick={() => resetPassword.mutate({ id: resetUser.id, password: resetPass, email: resetUser.email })}>
                {resetPassword.isPending ? "Salvando..." : "Redefinir senha"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

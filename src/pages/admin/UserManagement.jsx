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
import { Users, Power, Trash2, ShieldCheck, Plus, KeyRound, Search } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [resetUser, setResetUser] = useState(null);
  const [resetPass, setResetPass] = useState("");

  const { data: profiles = [] } = useQuery({
    queryKey: ["user-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const run = useMutation({
    mutationFn: async ({ fn, args }) => {
      const { error } = await supabase.rpc(fn, args);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user-profiles"] }); toast({ title: "Atualizado!" }); },
    onError: (e) => toast({ title: "Erro", description: e?.message || "Falhou. A migration de papéis foi aplicada?", variant: "destructive" }),
  });

  const createUser = useMutation({
    mutationFn: async (form) => {
      const { error } = await supabase.rpc("admin_create_user", { p_email: form.email.trim().toLowerCase(), p_password: form.password, p_full_name: form.full_name.trim(), p_role: form.role });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user-profiles"] }); setShowCreate(false); setCreateForm(EMPTY_CREATE); toast({ title: "Usuário criado!", description: "Já pode entrar com o e-mail e a senha definidos." }); },
    onError: (e) => toast({ title: "Erro ao criar usuário", description: e?.message, variant: "destructive" }),
  });

  const resetPassword = useMutation({
    mutationFn: async ({ id, password }) => {
      const { error } = await supabase.rpc("admin_reset_user_password", { p_user_id: id, p_password: password });
      if (error) throw error;
    },
    onSuccess: () => { setResetUser(null); setResetPass(""); toast({ title: "Senha redefinida!" }); },
    onError: (e) => toast({ title: "Erro ao redefinir", description: e?.message, variant: "destructive" }),
  });

  const setRole = (p, role) => run.mutate({ fn: "admin_set_user_role", args: { p_user_id: p.id, p_role: role } });
  const toggleActive = (p) => run.mutate({ fn: "admin_set_user_active", args: { p_user_id: p.id, p_active: p.active === false } });
  const remove = (p) => { if (window.confirm(`Excluir o usuário ${p.email}?`)) run.mutate({ fn: "admin_delete_user", args: { p_user_id: p.id } }); };

  const counts = { admin: 0, operator: 0, motorista: 0, pending: 0 };
  profiles.forEach(p => { counts[p.role] = (counts[p.role] || 0) + 1; });
  const pending = profiles.filter(p => p.role === "pending");

  const q = search.trim().toLowerCase();
  const visible = profiles.filter(p => !q || `${p.full_name || ""} ${p.email || ""}`.toLowerCase().includes(q));

  return (
    <div className="space-y-4">
      <PageHeader icon={Users} title="Usuários & Acessos" subtitle="Crie usuários e defina quem é administrador, operador ou motorista">
        <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={() => { setCreateForm(EMPTY_CREATE); setShowCreate(true); }}>
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

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                  <th className="text-left py-3 px-4 font-medium">Usuário</th>
                  <th className="text-left py-3 px-4 font-medium">Papel</th>
                  <th className="text-left py-3 px-4 font-medium">Situação</th>
                  <th className="text-right py-3 px-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">Nenhum usuário.</td></tr>}
                {visible.map(p => {
                  const isSelf = p.id === user?.id;
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4">
                        <p className="font-medium">{p.full_name || "—"} {isSelf && <span className="text-[10px] text-muted-foreground">(você)</span>}</p>
                        <p className="text-xs text-muted-foreground font-mono">{p.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Select value={p.role || "pending"} onValueChange={(v) => setRole(p, v)} disabled={run.isPending}>
                          <SelectTrigger className={`h-8 w-40 text-xs border ${ROLE_CLS[p.role] || ROLE_CLS.pending}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${p.active === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {p.active === false ? "Desativado" : "Ativo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={run.isPending} onClick={() => { setResetUser(p); setResetPass(""); }}>
                          <KeyRound className="w-3.5 h-3.5" /> Senha
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={run.isPending || isSelf} onClick={() => toggleActive(p)}>
                          <Power className="w-3.5 h-3.5" /> {p.active === false ? "Ativar" : "Desativar"}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-red-500" disabled={run.isPending || isSelf} onClick={() => remove(p)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
            <Button className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold"
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
              <Button className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold"
                disabled={resetPass.length < 6 || resetPassword.isPending}
                onClick={() => resetPassword.mutate({ id: resetUser.id, password: resetPass })}>
                {resetPassword.isPending ? "Salvando..." : "Redefinir senha"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

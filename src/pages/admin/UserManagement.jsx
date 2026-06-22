import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { Users, Power, Trash2, ShieldCheck } from "lucide-react";

const ROLE_LABEL = { admin: "Administrador", operator: "Operador", motorista: "Motorista", pending: "Pendente" };
const ROLE_CLS = {
  admin: "bg-velox-amber/15 text-velox-amber border-velox-amber/30",
  operator: "bg-blue-100 text-blue-700 border-blue-200",
  motorista: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const setRole = (p, role) => run.mutate({ fn: "admin_set_user_role", args: { p_user_id: p.id, p_role: role } });
  const toggleActive = (p) => run.mutate({ fn: "admin_set_user_active", args: { p_user_id: p.id, p_active: p.active === false } });
  const remove = (p) => { if (window.confirm(`Excluir o usuário ${p.email}?`)) run.mutate({ fn: "admin_delete_user", args: { p_user_id: p.id } }); };

  const pending = profiles.filter(p => p.role === "pending");

  return (
    <div className="space-y-4">
      <PageHeader icon={Users} title="Usuários & Acessos" subtitle="Defina quem é administrador, operador ou motorista" />

      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {pending.length} usuário(s) aguardando liberação de acesso. Defina o papel abaixo.
        </div>
      )}

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
                {profiles.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">Nenhum usuário.</td></tr>}
                {profiles.map(p => {
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
                      <td className="py-3 px-4 text-right">
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
        <ShieldCheck className="w-3.5 h-3.5" /> O sistema impede remover/desativar o último administrador. Motoristas têm o login criado no cadastro do motorista.
      </p>
    </div>
  );
}

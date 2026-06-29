import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { UserCheck, Inbox } from "lucide-react";

export default function ClientAccess() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [picks, setPicks] = useState({}); // userId -> clientId

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["client-access-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_pending_client_requests");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

  const approve = useMutation({
    mutationFn: async ({ userId, clientId }) => {
      const { error } = await supabase.rpc("admin_approve_client", { p_user_id: userId, p_client_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-access-requests"] });
      toast({ title: "Acesso aprovado!", description: "O cliente já pode entrar no portal." });
    },
    onError: (e) => toast({ title: "Erro ao aprovar", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHeader icon={UserCheck} title="Acessos de Cliente" subtitle="Aprove solicitações de acesso ao Portal do Cliente e vincule à empresa correta." />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando…</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-foreground font-medium">Nenhuma solicitação pendente</p>
            <p className="text-sm text-muted-foreground mt-1">Cadastros feitos em <span className="font-mono">/portal/cadastro</span> aparecem aqui para aprovação.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {requests.map(r => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{r.full_name || "—"} <span className="text-muted-foreground font-normal">· {r.email}</span></p>
                  <p className="text-xs text-muted-foreground">Empresa informada: <strong>{r.requested_company}</strong></p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={picks[r.id] || ""} onValueChange={(v) => setPicks(p => ({ ...p, [r.id]: v }))}>
                    <SelectTrigger className="h-9 w-56 text-sm"><SelectValue placeholder="Vincular ao cliente…" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}{c.cpf_cnpj ? ` · ${c.cpf_cnpj}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" disabled={!picks[r.id] || approve.isPending}
                    onClick={() => approve.mutate({ userId: r.id, clientId: picks[r.id] })}>
                    Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

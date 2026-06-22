import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { ArrowLeftRight, Plus, Truck, Warehouse, ArrowRight, PackageCheck, Send } from "lucide-react";

export default function Transfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ from_branch_id: "", to_branch_id: "", truck_id: "", driver_id: "", order_ids: [], start: false });

  const { data: transfers = [] } = useQuery({ queryKey: ["transfers"], queryFn: () => base44.entities.Transfer.list("-created_date", 100) });
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => base44.entities.Branch.list() });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 500) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });

  const branchName = (id) => branches.find(b => b.id === id)?.name || "—";
  // Pedidos elegíveis para transferência: em rota/coleta/já em transferência.
  const eligible = orders.filter(o => ["collecting", "in_transit", "in_transfer"].includes(o.status));

  const create = useMutation({
    mutationFn: async () => {
      const from = branches.find(b => b.id === form.from_branch_id);
      const to = branches.find(b => b.id === form.to_branch_id);
      const truck = trucks.find(t => t.id === form.truck_id);
      const driver = drivers.find(d => d.id === form.driver_id);
      const transfer = await base44.entities.Transfer.create({
        protocol: `TRF-${Date.now().toString().slice(-8)}`,
        from_branch_id: form.from_branch_id || null, to_branch_id: form.to_branch_id || null,
        from_branch_name: from?.name, to_branch_name: to?.name,
        order_ids: form.order_ids, truck_id: form.truck_id || null, truck_plate: truck?.plate,
        driver_id: form.driver_id || null, driver_name: driver?.name,
        status: form.start ? "in_transit" : "planned",
        departure_date: form.start ? new Date().toISOString() : null,
        events: [{ type: "created", description: `Transferência criada: ${from?.name || "?"} → ${to?.name || "?"}`, timestamp: new Date().toISOString() }],
      });
      for (const oid of form.order_ids) {
        const o = orders.find(x => x.id === oid);
        await base44.entities.Order.update(oid, {
          status: "in_transfer",
          status_history: [...(o?.status_history || []), { status: "in_transfer", timestamp: new Date().toISOString(), user: "Admin", note: `Em transferência: ${from?.name || "?"} → ${to?.name || "?"}` }],
        });
      }
      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShowForm(false);
      setForm({ from_branch_id: "", to_branch_id: "", truck_id: "", driver_id: "", order_ids: [], start: false });
      toast({ title: "Transferência criada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const dispatch = useMutation({
    mutationFn: (t) => base44.entities.Transfer.update(t.id, { status: "in_transit", departure_date: new Date().toISOString(), events: [...(t.events || []), { type: "departed", description: "Saiu da origem", timestamp: new Date().toISOString() }] }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transfers"] }); toast({ title: "Transferência em trânsito" }); },
  });

  // Receber no destino: cross-dock → pedidos voltam para a fila com origem no CD (nova rota)
  const receive = useMutation({
    mutationFn: async (t) => {
      // Caminho ATÔMICO no servidor
      try {
        const { error } = await supabase.rpc("receive_transfer", { p_transfer_id: t.id, p_user: "Admin" });
        if (!error) return;
        throw error;
      } catch { /* fallback cliente abaixo */ }
      const to = branches.find(b => b.id === t.to_branch_id);
      await base44.entities.Transfer.update(t.id, { status: "received", arrival_date: new Date().toISOString(), events: [...(t.events || []), { type: "received", description: `Recebido em ${to?.name || "destino"}`, timestamp: new Date().toISOString() }] });
      for (const oid of t.order_ids || []) {
        const o = orders.find(x => x.id === oid);
        const branchOrigin = to?.address ? { ...to.address } : (o?.origin || {});
        await base44.entities.Order.update(oid, {
          current_branch_id: t.to_branch_id, status: "confirmed",
          trip_id: null, scheduled_truck_id: null, scheduled_date: null,
          origin: branchOrigin,
          status_history: [...(o?.status_history || []), { status: "confirmed", timestamp: new Date().toISOString(), user: "Admin", note: `Recebido em ${to?.name || "destino"} — disponível para nova rota (cross-docking)` }],
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transfers"] }); queryClient.invalidateQueries({ queryKey: ["orders"] }); toast({ title: "Recebido! Pedidos liberados para nova rota." }); },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const statusMeta = { planned: ["Planejada", "bg-blue-100 text-blue-700"], in_transit: ["Em trânsito", "bg-amber-100 text-amber-700"], received: ["Recebida", "bg-green-100 text-green-700"], cancelled: ["Cancelada", "bg-gray-100 text-gray-600"] };
  const toggleOrder = (id) => setForm(f => ({ ...f, order_ids: f.order_ids.includes(id) ? f.order_ids.filter(x => x !== id) : [...f.order_ids, id] }));

  return (
    <div className="space-y-4">
      <PageHeader icon={ArrowLeftRight} title="Transferências" subtitle="Movimentação entre filiais / centros de distribuição (cross-docking)">
        <Button size="sm" className="bg-velox-amber text-white font-bold gap-1" onClick={() => setShowForm(true)} disabled={branches.length < 2}>
          <Plus className="w-4 h-4" /> Nova transferência
        </Button>
      </PageHeader>

      {branches.length < 2 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Cadastre ao menos 2 filiais/CDs em <Link to="/admin/cadastros?aba=filiais" className="underline font-semibold">Cadastros → Filiais</Link> para transferir entre elas.
        </div>
      )}

      {transfers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" /> Nenhuma transferência.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {transfers.map(t => {
            const meta = statusMeta[t.status] || statusMeta.planned;
            return (
              <Card key={t.id}>
                <CardContent className="pt-4 flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-semibold">{t.protocol}</span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <Warehouse className="w-3.5 h-3.5 text-muted-foreground" /> {t.from_branch_name || "?"}
                    <ArrowRight className="w-3.5 h-3.5 text-velox-amber" /> {t.to_branch_name || "?"}
                  </span>
                  <span className="text-xs text-muted-foreground">{(t.order_ids || []).length} pedido(s)</span>
                  {t.truck_plate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {t.truck_plate}{t.driver_name ? ` · ${t.driver_name}` : ""}</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta[1]}`}>{meta[0]}</span>
                  <div className="ml-auto flex gap-2">
                    {t.status === "planned" && <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => dispatch.mutate(t)}><Send className="w-3.5 h-3.5" /> Despachar</Button>}
                    {t.status === "in_transit" && <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => receive.mutate(t)}><PackageCheck className="w-3.5 h-3.5" /> Receber no destino</Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Criar transferência */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-velox-amber" /> Nova transferência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Origem</label>
                <Select value={form.from_branch_id} onValueChange={v => setForm(f => ({ ...f, from_branch_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Filial/CD origem" /></SelectTrigger>
                  <SelectContent>{branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">Destino</label>
                <Select value={form.to_branch_id} onValueChange={v => setForm(f => ({ ...f, to_branch_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Filial/CD destino" /></SelectTrigger>
                  <SelectContent>{branches.filter(b => b.id !== form.from_branch_id).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">Caminhão</label>
                <Select value={form.truck_id} onValueChange={v => setForm(f => ({ ...f, truck_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Veículo (troca)" /></SelectTrigger>
                  <SelectContent>{trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">Motorista</label>
                <Select value={form.driver_id} onValueChange={v => setForm(f => ({ ...f, driver_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Motorista" /></SelectTrigger>
                  <SelectContent>{drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Pedidos a transferir ({form.order_ids.length})</label>
              <div className="max-h-48 overflow-y-auto space-y-1 mt-1 border border-border rounded-lg p-2">
                {eligible.length === 0 ? <p className="text-xs text-muted-foreground py-2 text-center">Nenhum pedido em rota/coleta para transferir.</p> :
                  eligible.map(o => (
                    <label key={o.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                      <Checkbox checked={form.order_ids.includes(o.id)} onCheckedChange={() => toggleOrder(o.id)} />
                      <span className="font-mono">{o.protocol}</span>
                      <span className="flex-1 truncate">{o.client_name}</span>
                      <span className="text-muted-foreground">{(o.recipients || []).map(r => r.city).filter(Boolean).join(", ")}</span>
                    </label>
                  ))}
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm"><Checkbox checked={form.start} onCheckedChange={v => setForm(f => ({ ...f, start: v }))} /> Iniciar em trânsito agora</label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="bg-velox-amber text-white font-bold" disabled={!form.from_branch_id || !form.to_branch_id || form.order_ids.length === 0 || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Criando..." : "Criar transferência"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

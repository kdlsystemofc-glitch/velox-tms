import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { supabase } from "@/api/supabaseClient";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { ArrowLeftRight, Plus, Truck, Warehouse, ArrowRight, PackageCheck, Send, Ban, Search, FileDown, Weight, AlertTriangle } from "lucide-react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { todayLocalISO } from "@/utils/dateUtils";

export default function Transfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { settings } = useCompanySettings();
  const userName = user?.full_name || "Admin";
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [generatingId, setGeneratingId] = useState(null);
  const [receiveModal, setReceiveModal] = useState(null); // transferência em conferência
  const [receiveForm, setReceiveForm] = useState({ km: "", cost: "", divergences: {} });
  const [form, setForm] = useState({ from_branch_id: "", to_branch_id: "", truck_id: "", driver_id: "", order_ids: [], start: false });

  const { data: transfers = [] } = useQuery({ queryKey: ["transfers"], queryFn: () => db.Transfer.list("-created_date", 100) });
  const { data: branches = [] } = useQuery({ queryKey: ["branches"], queryFn: () => db.Branch.list() });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => db.Order.list("-created_date", 500) });
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => db.Truck.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => db.Driver.list() });

  const branchName = (id) => branches.find(b => b.id === id)?.name || "—";

  // Alocação ativa (planned/in_transit) — base para evitar double-booking (Tr-1).
  const activeTransfers = transfers.filter(t => ["planned", "in_transit"].includes(t.status));
  const activeOrderIds = new Set(activeTransfers.flatMap(t => t.order_ids || []));
  const busyTruckIds = new Set(activeTransfers.map(t => t.truck_id).filter(Boolean));
  const busyDriverIds = new Set(activeTransfers.map(t => t.driver_id).filter(Boolean));

  // Pedidos elegíveis: em rota/coleta/transferência e NÃO já em outra transferência ativa.
  const eligible = orders.filter(o => ["collecting", "in_transit", "in_transfer"].includes(o.status) && !activeOrderIds.has(o.id));
  // Frota disponível para transferência (não em rota nem já alocada).
  const availableTrucks = trucks.filter(t => (t.status === "available" && !busyTruckIds.has(t.id)) || t.id === form.truck_id);
  const availableDrivers = drivers.filter(d => (d.status === "active" && !busyDriverIds.has(d.id)) || d.id === form.driver_id);

  // Status anterior do pedido (antes de entrar em transferência) — para o estorno.
  const priorStatus = (o) => {
    const hist = o?.status_history || [];
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i]?.status && hist[i].status !== "in_transfer") return hist[i].status;
    }
    return "confirmed";
  };

  // Peso/volume agregados de um conjunto de pedidos (Tr-2).
  const sumWeight = (ids) => (ids || []).reduce((s, oid) => s + (Number(orders.find(x => x.id === oid)?.total_weight_kg) || 0), 0);
  const sumVolumes = (ids) => (ids || []).reduce((s, oid) => s + (Number(orders.find(x => x.id === oid)?.total_volumes) || 0), 0);

  // Peso selecionado x capacidade do caminhão escolhido (alerta no formulário).
  const selectedWeight = sumWeight(form.order_ids);
  const selectedTruck = trucks.find(t => t.id === form.truck_id);
  const truckCapacity = Number(selectedTruck?.capacity_kg) || 0;
  const overCapacity = truckCapacity > 0 && selectedWeight > truckCapacity;

  // KPIs da malha.
  const inTransitCount = transfers.filter(t => t.status === "in_transit").length;
  const plannedCount = transfers.filter(t => t.status === "planned").length;
  const ordersInMesh = activeOrderIds.size;
  const weightInMesh = sumWeight([...activeOrderIds]);

  // Lista filtrada (busca + status).
  const q = search.trim().toLowerCase();
  const filteredTransfers = transfers.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (q && !`${t.protocol || ""} ${t.from_branch_name || ""} ${t.to_branch_name || ""} ${t.truck_plate || ""} ${t.driver_name || ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  // Manifesto PDF da transferência.
  const generateManifest = async (t) => {
    setGeneratingId(t.id);
    try {
      const list = [];
      for (const oid of t.order_ids || []) {
        const o = orders.find(x => x.id === oid) || (await db.Order.filter({ id: oid }))[0];
        if (o) list.push(o);
      }
      const { generateTransferManifest } = await import("@/utils/generateTransferManifest");
      const blob = generateTransferManifest(t, list, settings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Manifesto-${t.protocol || "transferencia"}-${todayLocalISO()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Erro ao gerar manifesto", description: e?.message, variant: "destructive" });
    } finally {
      setGeneratingId(null);
    }
  };

  const create = useMutation({
    mutationFn: async () => {
      const from = branches.find(b => b.id === form.from_branch_id);
      const to = branches.find(b => b.id === form.to_branch_id);
      const truck = trucks.find(t => t.id === form.truck_id);
      const driver = drivers.find(d => d.id === form.driver_id);
      const transfer = await db.Transfer.create({
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
        await db.Order.update(oid, {
          status: "in_transfer",
          status_history: [...(o?.status_history || []), { status: "in_transfer", timestamp: new Date().toISOString(), user: userName, note: `Em transferência: ${from?.name || "?"} → ${to?.name || "?"}` }],
        });
      }
      // Se já sai em trânsito, o caminhão fica on_route (evita double-booking com viagens).
      if (form.start && form.truck_id) await db.Truck.update(form.truck_id, { status: "on_route" });
      return transfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      setShowForm(false);
      setForm({ from_branch_id: "", to_branch_id: "", truck_id: "", driver_id: "", order_ids: [], start: false });
      toast({ title: "Transferência criada!" });
    },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const dispatch = useMutation({
    mutationFn: async (t) => {
      await db.Transfer.update(t.id, { status: "in_transit", departure_date: new Date().toISOString(), events: [...(t.events || []), { type: "departed", description: "Saiu da origem", timestamp: new Date().toISOString(), user: userName }] });
      if (t.truck_id) await db.Truck.update(t.truck_id, { status: "on_route" });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transfers"] }); queryClient.invalidateQueries({ queryKey: ["trucks"] }); toast({ title: "Transferência em trânsito" }); },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  // Estornar transferência: devolve pedidos ao status anterior e libera o caminhão (atômico).
  const cancelTransfer = useMutation({
    mutationFn: async (t) => {
      const orderStatus = (t.order_ids || []).map(oid => ({ id: oid, status: priorStatus(orders.find(x => x.id === oid)) }));
      try {
        const { error } = await supabase.rpc("cancel_transfer", { p_transfer_id: t.id, p_order_status: orderStatus, p_user: userName });
        if (!error) return;
        throw error;
      } catch { /* fallback cliente abaixo */ }
      await db.Transfer.update(t.id, { status: "cancelled", events: [...(t.events || []), { type: "cancelled", description: "Transferência estornada", timestamp: new Date().toISOString(), user: userName }] });
      for (const os of orderStatus) {
        const o = orders.find(x => x.id === os.id);
        if (o?.status === "in_transfer") {
          await db.Order.update(os.id, { status: os.status, status_history: [...(o.status_history || []), { status: os.status, timestamp: new Date().toISOString(), user: userName, note: "Transferência estornada — pedido devolvido" }] });
        }
      }
      if (t.truck_id) {
        const truck = trucks.find(x => x.id === t.truck_id);
        if (truck?.status === "on_route") await db.Truck.update(t.truck_id, { status: "available" });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transfers"] }); queryClient.invalidateQueries({ queryKey: ["orders"] }); queryClient.invalidateQueries({ queryKey: ["trucks"] }); toast({ title: "Transferência estornada", description: "Pedidos devolvidos ao status anterior." }); },
    onError: (e) => toast({ title: "Erro ao estornar", description: e?.message, variant: "destructive" }),
  });

  // Receber no destino: cross-dock → pedidos voltam para a fila com origem no CD (nova rota).
  // Tr-3: conferência (divergências), custo da transferência e rastreio pela malha.
  const receive = useMutation({
    mutationFn: async ({ t, km = "", cost = "", divergences = {} }) => {
      const to = branches.find(b => b.id === t.to_branch_id);
      const now = new Date().toISOString();
      // ── Núcleo: receber (atômico no servidor; fallback cliente) ──
      let viaRpc = false;
      try {
        const { error } = await supabase.rpc("receive_transfer", { p_transfer_id: t.id, p_user: userName });
        if (!error) viaRpc = true; else throw error;
      } catch { /* fallback cliente abaixo */ }
      if (!viaRpc) {
        await db.Transfer.update(t.id, { status: "received", arrival_date: now, events: [...(t.events || []), { type: "received", description: `Recebido em ${to?.name || "destino"}`, timestamp: now, user: userName }] });
        for (const oid of t.order_ids || []) {
          const o = orders.find(x => x.id === oid);
          const branchOrigin = to?.address ? { ...to.address } : (o?.origin || {});
          await db.Order.update(oid, {
            current_branch_id: t.to_branch_id, status: "confirmed",
            trip_id: null, scheduled_truck_id: null, scheduled_date: null,
            origin: branchOrigin,
            status_history: [...(o?.status_history || []), { status: "confirmed", timestamp: now, user: userName, note: `Recebido em ${to?.name || "destino"} — disponível para nova rota (cross-docking)` }],
          });
        }
        if (t.truck_id) {
          const truck = trucks.find(x => x.id === t.truck_id);
          if (truck?.status === "on_route") await db.Truck.update(t.truck_id, { status: "available" });
        }
      }

      // ── Malha: registra o hop de cada pedido (branch_history) ──
      for (const oid of t.order_ids || []) {
        const o = orders.find(x => x.id === oid);
        await db.Order.update(oid, {
          branch_history: [...(o?.branch_history || []), { branch_id: t.to_branch_id, branch_name: to?.name, from_branch_name: t.from_branch_name, at: now }],
        });
      }

      // ── Custo da transferência → Financeiro ──
      const costNum = Number(cost) || 0;
      if (costNum > 0 || Number(km) > 0) {
        await db.Transfer.update(t.id, { distance_km: Number(km) || null, cost: costNum || null });
      }
      if (costNum > 0) {
        await db.Expense.create({
          category: "other",
          description: `Transferência ${t.protocol} — ${t.from_branch_name || "?"} → ${t.to_branch_name || "?"}${Number(km) > 0 ? ` (${km} km)` : ""}`,
          amount: costNum, date: todayLocalISO(), status: "paid", truck_id: t.truck_id || undefined,
        });
      }

      // ── Conferência: divergências viram ocorrências (avaria) ──
      const divEntries = Object.entries(divergences).filter(([, note]) => (note || "").trim());
      for (const [oid, note] of divEntries) {
        try {
          await db.Incident.create({
            order_id: oid, type: "avaria", status: "open",
            description: `Divergência no recebimento (${t.protocol}): ${note.trim()}`,
          });
        } catch { /* não bloqueia o recebimento */ }
      }
      return divEntries.length;
    },
    onSuccess: (divCount) => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      if (divCount > 0) queryClient.invalidateQueries({ queryKey: ["incidents-all"] });
      setReceiveModal(null);
      setReceiveForm({ km: "", cost: "", divergences: {} });
      toast({ title: "Recebido! Pedidos liberados para nova rota.", description: divCount > 0 ? `${divCount} divergência(s) registrada(s) como ocorrência.` : undefined });
    },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const statusMeta = { planned: ["Planejada", "bg-blue-500/15 text-blue-700 dark:text-blue-300"], in_transit: ["Em trânsito", "bg-amber-500/15 text-amber-700 dark:text-amber-300"], received: ["Recebida", "bg-green-500/15 text-green-700 dark:text-green-300"], cancelled: ["Cancelada", "bg-muted text-muted-foreground"] };
  const toggleOrder = (id) => setForm(f => ({ ...f, order_ids: f.order_ids.includes(id) ? f.order_ids.filter(x => x !== id) : [...f.order_ids, id] }));

  return (
    <div className="space-y-4">
      <PageHeader icon={ArrowLeftRight} title="Transferências" subtitle="Movimentação entre filiais / centros de distribuição (cross-docking)">
        <Button size="sm" className="font-bold gap-1" onClick={() => setShowForm(true)} disabled={branches.length < 2}>
          <Plus className="w-4 h-4" /> Nova transferência
        </Button>
      </PageHeader>

      {branches.length < 2 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          Cadastre ao menos 2 filiais/CDs em <Link to="/admin/cadastros?aba=filiais" className="underline font-semibold">Cadastros → Filiais</Link> para transferir entre elas.
        </div>
      )}

      {transfers.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={Send} label="Em trânsito" value={inTransitCount} tone="warning" />
            <StatCard icon={ArrowLeftRight} label="Planejadas" value={plannedCount} tone="primary" />
            <StatCard icon={PackageCheck} label="Pedidos na malha" value={ordersInMesh} tone="primary" />
            <StatCard icon={Weight} label="Peso na malha" value={weightInMesh} suffix=" kg" tone="primary" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar protocolo, filial, placa, motorista…" className="pl-9" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[["all", "Todas"], ["planned", "Planejadas"], ["in_transit", "Em trânsito"], ["received", "Recebidas"], ["cancelled", "Canceladas"]].map(([val, lbl]) => (
                <Button key={val} variant={statusFilter === val ? "default" : "outline"} size="sm"
                  className={statusFilter === val ? "bg-velox-dark text-white" : ""} onClick={() => setStatusFilter(val)}>{lbl}</Button>
              ))}
            </div>
          </div>
        </>
      )}

      {transfers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground"><ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" /> Nenhuma transferência.</CardContent></Card>
      ) : filteredTransfers.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma transferência para o filtro atual.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filteredTransfers.map(t => {
            const meta = statusMeta[t.status] || statusMeta.planned;
            const tWeight = sumWeight(t.order_ids);
            return (
              <Card key={t.id}>
                <CardContent className="pt-4 flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-semibold">{t.protocol}</span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <Warehouse className="w-3.5 h-3.5 text-muted-foreground" /> {t.from_branch_name || "?"}
                    <ArrowRight className="w-3.5 h-3.5 text-velox-amber" /> {t.to_branch_name || "?"}
                  </span>
                  <span className="text-xs text-muted-foreground">{(t.order_ids || []).length} pedido(s)</span>
                  {tWeight > 0 && <span className="text-xs text-muted-foreground flex items-center gap-1"><Weight className="w-3.5 h-3.5" /> {tWeight.toLocaleString("pt-BR")} kg</span>}
                  {t.truck_plate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {t.truck_plate}{t.driver_name ? ` · ${t.driver_name}` : ""}</span>}
                  {Number(t.cost) > 0 && <span className="text-xs text-muted-foreground">R$ {Number(t.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}{Number(t.distance_km) > 0 ? ` · ${t.distance_km} km` : ""}</span>}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta[1]}`}>{meta[0]}</span>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground" disabled={generatingId === t.id || (t.order_ids || []).length === 0} onClick={() => generateManifest(t)}>
                      <FileDown className="w-3.5 h-3.5" /> {generatingId === t.id ? "..." : "Manifesto"}
                    </Button>
                    {t.status === "planned" && <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => dispatch.mutate(t)}><Send className="w-3.5 h-3.5" /> Despachar</Button>}
                    {t.status === "in_transit" && <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => { setReceiveForm({ km: "", cost: "", divergences: {} }); setReceiveModal(t); }}><PackageCheck className="w-3.5 h-3.5" /> Receber no destino</Button>}
                    {(t.status === "planned" || t.status === "in_transit") && (
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-red-600 dark:text-red-300 hover:text-red-700 dark:text-red-300 hover:bg-red-500/10"
                        disabled={cancelTransfer.isPending}
                        onClick={() => { if (window.confirm(`Estornar a transferência ${t.protocol}? Os ${(t.order_ids || []).length} pedido(s) voltam ao status anterior.`)) cancelTransfer.mutate(t); }}>
                        <Ban className="w-3.5 h-3.5" /> Estornar
                      </Button>
                    )}
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
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Veículo disponível" /></SelectTrigger>
                  <SelectContent>{availableTrucks.length === 0 ? <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum caminhão disponível</div> : availableTrucks.map(t => <SelectItem key={t.id} value={t.id}>{t.plate} — {t.model}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">Motorista</label>
                <Select value={form.driver_id} onValueChange={v => setForm(f => ({ ...f, driver_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Motorista livre" /></SelectTrigger>
                  <SelectContent>{availableDrivers.length === 0 ? <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum motorista livre</div> : availableDrivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Pedidos a transferir ({form.order_ids.length})</label>
                {selectedWeight > 0 && (
                  <span className={`text-xs font-medium ${overCapacity ? "text-red-600 dark:text-red-300" : "text-muted-foreground"}`}>
                    {selectedWeight.toLocaleString("pt-BR")} kg{truckCapacity > 0 ? ` / ${truckCapacity.toLocaleString("pt-BR")} kg` : ""}
                  </span>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 mt-1 border border-border rounded-lg p-2">
                {eligible.length === 0 ? <p className="text-xs text-muted-foreground py-2 text-center">Nenhum pedido em rota/coleta para transferir.</p> :
                  eligible.map(o => (
                    <label key={o.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/40 cursor-pointer">
                      <Checkbox checked={form.order_ids.includes(o.id)} onCheckedChange={() => toggleOrder(o.id)} />
                      <span className="font-mono">{o.protocol}</span>
                      <span className="flex-1 truncate">{o.client_name}</span>
                      {Number(o.total_weight_kg) > 0 && <span className="text-muted-foreground whitespace-nowrap">{Number(o.total_weight_kg).toLocaleString("pt-BR")} kg</span>}
                      <span className="text-muted-foreground truncate max-w-[90px]">{(o.recipients || []).map(r => r.city).filter(Boolean).join(", ")}</span>
                    </label>
                  ))}
              </div>
            </div>
            {overCapacity && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Peso selecionado ({selectedWeight.toLocaleString("pt-BR")} kg) excede a capacidade do caminhão ({truckCapacity.toLocaleString("pt-BR")} kg).
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm"><Checkbox checked={form.start} onCheckedChange={v => setForm(f => ({ ...f, start: v }))} /> Iniciar em trânsito agora</label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="font-bold" disabled={!form.from_branch_id || !form.to_branch_id || form.order_ids.length === 0 || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? "Criando..." : "Criar transferência"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conferência de recebimento (Tr-3) */}
      <Dialog open={!!receiveModal} onOpenChange={(v) => { if (!v) setReceiveModal(null); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PackageCheck className="w-4 h-4 text-green-600 dark:text-green-300" /> Conferência de recebimento</DialogTitle></DialogHeader>
          {receiveModal && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="font-mono font-semibold text-foreground">{receiveModal.protocol}</span>
                <Warehouse className="w-3.5 h-3.5" /> {receiveModal.from_branch_name || "?"} <ArrowRight className="w-3 h-3 text-velox-amber" /> {receiveModal.to_branch_name || "?"}
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Conferência dos pedidos ({(receiveModal.order_ids || []).length})</label>
                <div className="max-h-56 overflow-y-auto space-y-1.5 mt-1 border border-border rounded-lg p-2">
                  {(receiveModal.order_ids || []).map(oid => {
                    const o = orders.find(x => x.id === oid);
                    const hasDiv = !!(receiveForm.divergences[oid] || "").trim();
                    return (
                      <div key={oid} className="text-xs border-b border-border/50 last:border-0 pb-1.5 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{o?.protocol || oid.slice(0, 8)}</span>
                          <span className="flex-1 truncate">{o?.client_name || "—"}</span>
                          {Number(o?.total_weight_kg) > 0 && <span className="text-muted-foreground">{Number(o.total_weight_kg).toLocaleString("pt-BR")} kg</span>}
                        </div>
                        <Input
                          placeholder="Divergência? (avaria, falta de volume…) — opcional"
                          value={receiveForm.divergences[oid] || ""}
                          onChange={e => setReceiveForm(f => ({ ...f, divergences: { ...f.divergences, [oid]: e.target.value } }))}
                          className={`h-7 text-xs mt-1 ${hasDiv ? "border-amber-300 bg-amber-500/10" : ""}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Pedidos com divergência preenchida geram uma ocorrência de avaria automaticamente.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Distância (km)</label><Input type="number" step="0.1" value={receiveForm.km} onChange={e => setReceiveForm(f => ({ ...f, km: e.target.value }))} className="h-9 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Custo do trecho (R$)</label><Input type="number" step="0.01" value={receiveForm.cost} onChange={e => setReceiveForm(f => ({ ...f, cost: e.target.value }))} className="h-9 text-sm" /></div>
              </div>
              {Number(receiveForm.cost) > 0 && <p className="text-[11px] text-muted-foreground">O custo será lançado como despesa em Financeiro → Despesas.</p>}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setReceiveModal(null)}>Cancelar</Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold" disabled={receive.isPending}
                  onClick={() => receive.mutate({ t: receiveModal, km: receiveForm.km, cost: receiveForm.cost, divergences: receiveForm.divergences })}>
                  {receive.isPending ? "Recebendo..." : "Confirmar recebimento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

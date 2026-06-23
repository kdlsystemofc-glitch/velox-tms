import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/shared/NumericInput";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { calculateFreight } from "@/utils/freightCalculator";
import { todayLocalISO, formatDateBR } from "@/utils/dateUtils";
import { ensureRevenueForOrder, cancelRevenuesForOrder } from "@/utils/revenueHelper";
import { supabase } from "@/api/supabaseClient";
import { Search, Plus, Package, CheckCircle, XCircle, CalendarDays, Eye, ChevronUp, ChevronDown, ChevronsUpDown, Download } from "lucide-react";
import { downloadCsv, csvMoney, csvDate } from "@/utils/exportCsv";
import PageHeader from "@/components/shared/PageHeader";

function SortTh({ label, k, sort, onSort, align = "left", className = "" }) {
  const active = sort?.key === k;
  return (
    <th className={`py-2 px-4 cursor-pointer select-none hover:text-foreground ${align === "right" ? "text-right" : "text-left"} ${className}`}
      onClick={() => onSort(k)}>
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {active ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  );
}

const PIPELINE_TABS = [
  { key: "all",        label: "Todos" },
  { key: "new",        label: "Novos" },
  { key: "confirmed",  label: "Confirmados" },
  { key: "collecting", label: "Em coleta" },
  { key: "in_transit", label: "Em trânsito" },
  { key: "delivered",  label: "Entregues" },
  { key: "cancelled",  label: "Cancelados" },
];

/**
 * PEDIDOS — fila única do pipeline com ações inline.
 * Padrão de grandes TMS: o operador resolve o pedido sem sair da lista.
 */
export default function OrdersWorkspace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settings } = useCompanySettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("status") || "all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(null);
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [confirmForm, setConfirmForm] = useState({ date: "", freight_value: "", payment_method: "pix" });
  const [rejectingOrder, setRejectingOrder] = useState(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

  // Limite de crédito do cliente do pedido em confirmação (exposição em aberto).
  const confirmCredit = (() => {
    if (!confirmingOrder?.client_id) return null;
    const client = clients.find(c => c.id === confirmingOrder.client_id);
    const limit = Number(client?.credit_limit) || 0;
    if (limit <= 0) return null;
    const used = orders
      .filter(o => o.client_id === confirmingOrder.client_id && o.status !== "cancelled" && o.payment_status !== "paid")
      .reduce((s, o) => s + (o.freight_value || 0), 0);
    const fv = typeof confirmForm.freight_value === "number" ? confirmForm.freight_value : parseFloat(String(confirmForm.freight_value).replace(",", ".")) || 0;
    const projected = used + fv;
    return { limit, used, projected, over: projected > limit };
  })();

  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus && urlStatus !== tab) setTab(urlStatus);
  }, [searchParams]);

  const changeTab = (key) => {
    setTab(key);
    setSearchParams(key === "all" ? {} : { status: key }, { replace: true });
  };

  const counts = PIPELINE_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === "all"
      ? orders.length
      : orders.filter(o => o.status === t.key).length;
    return acc;
  }, {});

  const filteredBase = orders.filter(o => {
    const matchTab = tab === "all" || o.status === tab;
    const q = search.toLowerCase();
    const matchSearch = !search ||
      o.protocol?.toLowerCase().includes(q) ||
      o.client_name?.toLowerCase().includes(q) ||
      o.origin?.city?.toLowerCase().includes(q) ||
      (o.recipients || []).some(r => r.city?.toLowerCase().includes(q));
    return matchTab && matchSearch;
  });

  // Ordenação por coluna
  const sortValue = (o, key) => {
    switch (key) {
      case "protocol": return o.protocol || "";
      case "client_name": return (o.client_name || "").toLowerCase();
      case "date": return o.scheduled_date || o.collection_date || "";
      case "weight": return Number(o.total_weight_kg) || 0;
      case "freight": return Number(o.freight_value) || 0;
      case "status": return o.status || "";
      default: return "";
    }
  };
  const filtered = [...filteredBase].sort((a, b) => {
    if (!sort) return 0;
    const va = sortValue(a, sort.key), vb = sortValue(b, sort.key);
    let cmp;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
    return sort.dir === "asc" ? cmp : -cmp;
  });
  const toggleSort = (key) => setSort(prev =>
    !prev || prev.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null
  );

  // ── Confirmar (mesma lógica da antiga Agenda) ─────────────────
  const openConfirm = (order) => {
    const est = calculateFreight(order.total_weight_kg || 0, null, settings);
    setConfirmForm({
      date: order.collection_date || "",
      freight_value: order.freight_value || est || "",
      payment_method: order.payment_method || "pix",
    });
    setConfirmingOrder(order);
  };

  const confirmMutation = useMutation({
    mutationFn: async ({ order, form }) => {
      const fv = typeof form.freight_value === "number" ? form.freight_value : parseFloat(String(form.freight_value).replace(",", ".")) || 0;
      const dueDate = form.date || order.collection_date || todayLocalISO();
      // Caminho ATÔMICO (atualiza status + frete/forma/data + receita numa transação)
      try {
        const { error } = await supabase.rpc("confirm_order", {
          p_order_id: order.id, p_amount: fv, p_due_date: dueDate,
          p_payment_method: form.payment_method || null, p_user: "Admin",
          p_collection_date: form.date || order.collection_date || null,
        });
        if (!error) return;
        throw error;
      } catch { /* fallback cliente abaixo */ }
      // Confirmar NÃO atribui caminhão — isso é feito no Despacho.
      await base44.entities.Order.update(order.id, {
        status: "confirmed",
        collection_date: form.date || order.collection_date,
        freight_value: fv,
        payment_method: form.payment_method || undefined,
        status_history: [...(order.status_history || []), { status: "confirmed", timestamp: new Date().toISOString(), user: "Admin", note: "Confirmado na fila de pedidos" }],
      });
      await ensureRevenueForOrder(order, {
        amount: fv,
        dueDate: form.date || order.collection_date || todayLocalISO(),
        paymentMethod: form.payment_method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["revenues"] });
      setConfirmingOrder(null);
      toast({ title: "Pedido confirmado!" });
    },
    onError: (e) => toast({ title: "Erro ao confirmar", description: e?.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (order) => {
      await base44.entities.Order.update(order.id, {
        status: "cancelled",
        status_history: [...(order.status_history || []), { status: "cancelled", timestamp: new Date().toISOString(), user: "Admin", note: "Recusado na fila de pedidos" }],
      });
      await cancelRevenuesForOrder(order.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setRejectingOrder(null);
      toast({ title: "Pedido recusado." });
    },
    onError: (e) => toast({ title: "Erro ao recusar", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <PageHeader icon={Package} title="Pedidos" subtitle="Fila única — confirme, recuse e despache sem sair da tela">
        <Button variant="outline" className="gap-2" disabled={filtered.length === 0}
          onClick={() => downloadCsv(`pedidos-${todayLocalISO()}`, filtered, [
            { key: "protocol", label: "Protocolo" },
            { key: "client_name", label: "Cliente" },
            { key: "status", label: "Status" },
            { key: "origin", label: "Origem", format: (o) => o?.city || "" },
            { key: "recipients", label: "Destinos", format: (rs) => (rs || []).map(r => r.city).filter(Boolean).join(", ") },
            { key: "total_weight_kg", label: "Peso (kg)" },
            { key: "freight_value", label: "Frete", format: csvMoney },
            { key: "collection_date", label: "Coleta", format: csvDate },
            { key: "created_date", label: "Criado", format: csvDate },
          ])}>
          <Download className="w-4 h-4" /> Exportar
        </Button>
        <Button className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={() => navigate("/admin/coletas/nova")}>
          <Plus className="w-4 h-4" /> Novo Pedido
        </Button>
      </PageHeader>

      {/* Pipeline tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {PIPELINE_TABS.map(t => (
          <button key={t.key} onClick={() => changeTab(t.key)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              tab === t.key
                ? "bg-velox-dark text-white shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}>
            {t.label}
            <span className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
              tab === t.key ? "bg-white/15" : "bg-background"
            } ${t.key === "new" && counts.new > 0 ? "!bg-red-500 !text-white" : ""}`}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Protocolo, cliente ou cidade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <SortTh label="Protocolo" k="protocol" sort={sort} onSort={toggleSort} />
                  <SortTh label="Cliente" k="client_name" sort={sort} onSort={toggleSort} />
                  <th className="text-left py-2 px-4 hidden lg:table-cell">Rota</th>
                  <SortTh label="Coleta" k="date" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
                  <SortTh label="Carga" k="weight" sort={sort} onSort={toggleSort} align="right" className="hidden md:table-cell" />
                  <SortTh label="Valor" k="freight" sort={sort} onSort={toggleSort} align="right" className="hidden sm:table-cell" />
                  <SortTh label="Status" k="status" sort={sort} onSort={toggleSort} />
                  <th className="text-right py-2 px-4 w-44">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <TableSkeleton rows={8} cols={8} />}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    Nenhum pedido {tab !== "all" ? "nesta etapa" : ""}.
                  </td></tr>
                )}
                {filtered.map(order => (
                  <tr key={order.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/coletas/${order.id}`)}>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-semibold text-xs">{order.protocol}</span>
                      {order.freight_type === "urgent" && (
                        <span className="ml-1.5 text-[9px] bg-red-100 text-red-700 font-bold px-1 py-0.5 rounded uppercase">Urg</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 max-w-[180px] truncate">{order.client_name}</td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                      {order.origin?.city || "—"} → {(order.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground hidden md:table-cell">
                      {formatDateBR(order.scheduled_date || order.collection_date)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-right text-muted-foreground hidden md:table-cell font-mono">
                      {order.total_weight_kg ? `${Number(order.total_weight_kg).toLocaleString("pt-BR")} kg` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs hidden sm:table-cell">
                      {order.freight_value ? `R$ ${Number(order.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-2.5 px-4"><StatusBadge status={order.status} /></td>
                    <td className="py-2.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status === "new" && (
                          <>
                            <Button size="sm" className="h-7 text-xs bg-velox-amber text-white font-bold hover:bg-velox-amber/90"
                              onClick={() => openConfirm(order)}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Confirmar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                              title="Recusar"
                              onClick={() => setRejectingOrder(order)}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {order.status === "confirmed" && !order.trip_id && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => navigate("/admin/despacho")}>
                            <CalendarDays className="w-3 h-3" /> Despachar
                          </Button>
                        )}
                        {!["new"].includes(order.status) && !(order.status === "confirmed" && !order.trip_id) && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                            onClick={() => navigate(`/admin/coletas/${order.id}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20 text-xs font-semibold text-muted-foreground">
                    <td colSpan={4} className="py-2 px-4">{filtered.length} pedido{filtered.length !== 1 ? "s" : ""}</td>
                    <td className="py-2 px-4 text-right font-mono hidden md:table-cell">
                      {filtered.reduce((s, o) => s + (Number(o.total_weight_kg) || 0), 0).toLocaleString("pt-BR")} kg
                    </td>
                    <td className="py-2 px-4 text-right font-mono hidden sm:table-cell">
                      R$ {filtered.reduce((s, o) => s + (Number(o.freight_value) || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sheet de confirmação */}
      <Sheet open={!!confirmingOrder} onOpenChange={open => !open && setConfirmingOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {confirmingOrder && (
            <>
              <SheetHeader className="mb-5">
                <SheetTitle>Confirmar — {confirmingOrder.protocol}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg text-sm">
                  <p className="font-semibold">{confirmingOrder.client_name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {(confirmingOrder.total_weight_kg || 0).toLocaleString("pt-BR")} kg · {confirmingOrder.total_volumes || "?"} vol ·{" "}
                    {confirmingOrder.origin?.city || "—"} → {(confirmingOrder.recipients || []).map(r => r.city).filter(Boolean).join(", ")}
                  </p>
                </div>
                {confirmCredit?.over && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                    <p className="font-semibold flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cliente acima do limite de crédito</p>
                    <p className="mt-1">Em aberto + este frete: <strong>R$ {confirmCredit.projected.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> · Limite: R$ {confirmCredit.limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Confirme apenas se autorizado.</p>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Data de coleta</label>
                  <Input type="date" value={confirmForm.date} onChange={e => setConfirmForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Valor do frete (R$)</label>
                  <NumericInput currency value={confirmForm.freight_value} onChange={v => setConfirmForm(f => ({ ...f, freight_value: v }))} placeholder="ex: 1.250,00" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Forma de pagamento</label>
                  <Select value={confirmForm.payment_method} onValueChange={v => setConfirmForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/30 border border-border rounded p-2">
                  O <strong>caminhão</strong> e a rota são definidos depois, na tela de <strong>Despacho</strong>.
                </p>
                <div className="pt-2 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmingOrder(null)}>Cancelar</Button>
                  <Button className="flex-1 bg-velox-amber hover:bg-velox-amber/90 text-white font-bold"
                    disabled={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate({ order: confirmingOrder, form: confirmForm })}>
                    {confirmMutation.isPending ? "Confirmando..." : "Confirmar Pedido"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmação de recusa */}
      <Sheet open={!!rejectingOrder} onOpenChange={open => !open && setRejectingOrder(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {rejectingOrder && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>Recusar pedido {rejectingOrder.protocol}?</SheetTitle>
              </SheetHeader>
              <p className="text-sm text-muted-foreground mb-4">
                O pedido de <strong>{rejectingOrder.client_name}</strong> será cancelado e eventuais receitas pendentes serão estornadas.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setRejectingOrder(null)}>Voltar</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                  disabled={rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate(rejectingOrder)}>
                  {rejectMutation.isPending ? "Recusando..." : "Recusar Pedido"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

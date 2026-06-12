import React, { useState, useEffect } from "react";
import WeekAvailabilityBanner from "@/components/admin/WeekAvailabilityBanner";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Package, Plus, Eye } from "lucide-react";
import StatusBadge, { orderStatusConfig } from "@/components/admin/StatusBadge";

export default function Orders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Sincroniza o filtro com a URL (permite links diretos, ex: /admin/coletas?status=new)
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus && urlStatus !== statusFilter) setStatusFilter(urlStatus);
  }, [searchParams]);

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setSearchParams(value === "all" ? {} : { status: value }, { replace: true });
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 1000),
  });

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.protocol?.toLowerCase().includes(search.toLowerCase()) || o.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchType = typeFilter === "all" || o.freight_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6">
      <WeekAvailabilityBanner />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Coletas</h1>
          <p className="text-muted-foreground text-sm mt-1">Todos os pedidos de coleta e entrega</p>
        </div>
        <Button className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2" onClick={() => navigate("/admin/coletas/nova")}>
          <Plus className="w-4 h-4" /> Nova Coleta
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por protocolo ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(orderStatusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="dedicated">Dedicado</SelectItem>
            <SelectItem value="shared">Fracionado</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Protocolo</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Origem → Destinos</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Coleta</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Carga</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Valor</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="py-10 text-center"><div className="w-6 h-6 border-4 border-velox-amber/20 border-t-velox-amber rounded-full animate-spin mx-auto" /></td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    Nenhuma coleta encontrada.
                    {search === "" && statusFilter === "all" && (
                      <div className="mt-3"><Button className="bg-velox-amber hover:bg-velox-amber/90 text-velox-dark font-bold gap-2" onClick={() => navigate("/admin/coletas/nova")}>
                        <Plus className="w-4 h-4" /> Criar primeira coleta
                      </Button></div>
                    )}
                  </td></tr>
                )}
                {filtered.map(order => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <Link to={`/admin/coletas/${order.id}`} className="font-mono font-semibold hover:text-velox-amber transition-colors">
                        {order.protocol}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm">{order.client_name}</td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden lg:table-cell">
                      {order.origin?.city || "—"} → {(order.recipients || []).map(r => r.city || r.address?.city).filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">
                      {order.collection_date || "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground hidden md:table-cell">
                     {order.total_weight_kg ? `${Number(order.total_weight_kg).toLocaleString("pt-BR")} kg` : "—"}
                     {order.total_volumes ? <span className="ml-1.5">· {order.total_volumes} vol</span> : null}
                    </td>
                    <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                    <td className="py-3 px-4 text-right font-mono hidden sm:table-cell">
                     {order.freight_value ? `R$ ${Number(order.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                     <Link to={`/admin/coletas/${order.id}`}>
                        <Button variant="ghost" size="sm" className="h-7"><Eye className="w-4 h-4" /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
               <tr className="border-t-2 border-border bg-muted/20">
                 <td colSpan={3} className="py-2 px-4 text-xs font-semibold text-muted-foreground">
                   {filtered.length} coleta{filtered.length !== 1 ? "s" : ""} exibidas
                 </td>
                 <td className="py-2 px-4 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                   {filtered.reduce((s, o) => s + (Number(o.total_weight_kg) || 0), 0).toLocaleString("pt-BR")} kg total
                 </td>
                 <td className="py-2 px-4 hidden md:table-cell" />
                 <td className="py-2 px-4 text-xs font-semibold text-right hidden sm:table-cell">
                   R$ {filtered.reduce((s, o) => s + (Number(o.freight_value) || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                 </td>
                 <td />
               </tr>
              </tfoot>
              </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
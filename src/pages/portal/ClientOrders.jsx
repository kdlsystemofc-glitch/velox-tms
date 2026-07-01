import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import StatusBadge from "@/components/admin/StatusBadge";
import { Package, Plus } from "lucide-react";
import { formatDateBR } from "@/utils/dateUtils";

export default function ClientOrders() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-client-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_client_orders");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Meus Pedidos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe suas coletas e entregas.</p>
        </div>
        <Link to="/portal/novo" className="inline-flex items-center gap-2 bg-brand-gradient text-white font-semibold px-4 py-2 rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Novo pedido
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando…</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <p className="text-muted-foreground font-medium">Não foi possível carregar seus pedidos.</p>
            <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-primary hover:underline">Tentar de novo</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">Nenhum pedido ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Quando você solicitar uma coleta, ela aparece aqui.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                <th className="py-2.5 px-4">Protocolo</th>
                <th className="py-2.5 px-4">Destino(s)</th>
                <th className="py-2.5 px-4 hidden sm:table-cell">Coleta</th>
                <th className="py-2.5 px-4 text-right hidden sm:table-cell">Frete</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} onClick={() => navigate(`/portal/pedido/${o.id}`)}
                  className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer">
                  <td className="py-2.5 px-4 font-mono font-semibold text-xs">{o.protocol}</td>
                  <td className="py-2.5 px-4 text-muted-foreground max-w-[220px] truncate">
                    {(o.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">{formatDateBR(o.collection_date)}</td>
                  <td className="py-2.5 px-4 text-right font-mono hidden sm:table-cell">
                    {o.freight_value ? `R$ ${Number(o.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                  </td>
                  <td className="py-2.5 px-4"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import StatusBadge from "@/components/admin/StatusBadge";
import { Package, Plus } from "lucide-react";
import { formatDateBR } from "@/utils/dateUtils";

export default function ClientOrders() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useQuery({
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
          <h1 className="font-display text-2xl font-bold text-gray-900">Meus Pedidos</h1>
          <p className="text-sm text-gray-500">Acompanhe suas coletas e entregas.</p>
        </div>
        <Link to="/portal/novo" className="inline-flex items-center gap-2 bg-brand-gradient text-white font-semibold px-4 py-2 rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Novo pedido
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando…</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium">Nenhum pedido ainda</p>
            <p className="text-sm text-gray-400 mt-1">Quando você solicitar uma coleta, ela aparece aqui.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
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
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer">
                  <td className="py-2.5 px-4 font-mono font-semibold text-xs">{o.protocol}</td>
                  <td className="py-2.5 px-4 text-gray-600 max-w-[220px] truncate">
                    {(o.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-2.5 px-4 text-gray-500 hidden sm:table-cell">{formatDateBR(o.collection_date)}</td>
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

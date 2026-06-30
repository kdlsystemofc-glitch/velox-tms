import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import StatusBadge from "@/components/admin/StatusBadge";
import { PackageCheck } from "lucide-react";
import { formatDateBR } from "@/utils/dateUtils";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function CarrierOrders() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-carrier-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_carrier_orders");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Minhas Cargas</h1>
        <p className="text-sm text-gray-500">Fretes que você aceitou. Atualize o status conforme a coleta e a entrega.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando…</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <p className="text-gray-600 font-medium">Não foi possível carregar suas cargas.</p>
            <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-primary hover:underline">Tentar de novo</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <PackageCheck className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium">Nenhuma carga aceita ainda</p>
            <p className="text-sm text-gray-400 mt-1">Aceite uma oferta em "Ofertas" para começar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="py-2.5 px-4">Protocolo</th>
                <th className="py-2.5 px-4">Destino(s)</th>
                <th className="py-2.5 px-4 hidden sm:table-cell">Coleta</th>
                <th className="py-2.5 px-4 text-right hidden sm:table-cell">Valor</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} onClick={() => navigate(`/parceiro/carga/${o.id}`)}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer">
                  <td className="py-2.5 px-4 font-mono font-semibold text-xs">{o.protocol}</td>
                  <td className="py-2.5 px-4 text-gray-600 max-w-[220px] truncate">
                    {(o.recipients || []).map(r => r.city).filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-2.5 px-4 text-gray-500 hidden sm:table-cell">{formatDateBR(o.collection_date)}</td>
                  <td className="py-2.5 px-4 text-right font-mono hidden sm:table-cell">{o.carrier_amount ? brl(o.carrier_amount) : "—"}</td>
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

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import StatusBadge, { orderStatusConfig } from "@/components/admin/StatusBadge";
import { ArrowLeft, MapPin } from "lucide-react";
import { formatDateBR, formatDateTimeBR } from "@/utils/dateUtils";

export default function ClientOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-client-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_client_orders");
      if (error) throw error;
      return data || [];
    },
  });
  const order = orders.find(o => o.id === id);

  if (isLoading) return <div className="text-center py-12 text-gray-400 text-sm">Carregando…</div>;
  if (!order) return (
    <div className="text-center py-12">
      <p className="text-gray-600">Pedido não encontrado.</p>
      <button onClick={() => navigate("/portal")} className="mt-3 text-sm font-semibold text-primary hover:underline">Voltar para Meus Pedidos</button>
    </div>
  );

  const history = [...(order.status_history || [])].reverse();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate("/portal")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Meus Pedidos</button>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-bold font-mono text-gray-900">{order.protocol}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3">Acompanhamento</h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">Sem movimentações ainda.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${i === 0 ? "bg-brand-gradient" : "bg-gray-300"}`} />
                      {i < history.length - 1 && <span className="w-px flex-1 bg-gray-200" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium text-gray-900">{orderStatusConfig[h.status]?.label || h.status}</p>
                      {h.note && <p className="text-xs text-gray-500">{h.note}</p>}
                      <p className="text-[11px] text-gray-400">{formatDateTimeBR(h.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3">Destinatários</h2>
            <div className="space-y-2">
              {(order.recipients || []).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">{r.name || "—"}</p>
                    <p className="text-xs text-gray-500">{[r.street, r.number, r.city, r.state].filter(Boolean).join(", ") || r.city}</p>
                    {(r.items || []).length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{r.items.length} item(ns) · NF {(r.items.map(it => it.nf_number).filter(Boolean).join(", ")) || "—"}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-white border border-gray-200 rounded-xl p-5 text-sm space-y-2">
            <h2 className="font-semibold mb-1">Resumo</h2>
            <div className="flex justify-between"><span className="text-gray-500">Origem</span><span className="font-medium">{order.origin?.city || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Coleta</span><span className="font-medium">{formatDateBR(order.collection_date)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Volumes</span><span className="font-medium">{order.total_volumes || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Peso</span><span className="font-medium">{order.total_weight_kg ? `${order.total_weight_kg} kg` : "—"}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-500">Frete</span><span className="font-mono font-semibold">{order.freight_value ? `R$ ${Number(order.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "a definir"}</span></div>
          </section>
        </div>
      </div>
    </div>
  );
}

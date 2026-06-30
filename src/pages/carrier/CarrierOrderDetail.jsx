import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, MapPin, Truck, PackageCheck } from "lucide-react";
import { formatDateBR } from "@/utils/dateUtils";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
// Próximo status que o parceiro pode marcar, a partir do atual.
const FLOW = [
  { key: "collecting", label: "Em coleta" },
  { key: "in_transit", label: "Em trânsito" },
  { key: "delivered", label: "Entregue" },
];

export default function CarrierOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-carrier-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_carrier_orders");
      if (error) throw error;
      return data || [];
    },
  });
  const order = orders.find(o => o.id === id);

  const updateStatus = useMutation({
    mutationFn: async (status) => {
      const { error } = await supabase.rpc("carrier_update_order_status", { p_order_id: id, p_status: status, p_note: note });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["my-carrier-orders"] });
      toast({ title: "Status atualizado!", description: "A Velox e o cliente acompanham a mudança." });
    },
    onError: (e) => toast({ title: "Não foi possível atualizar", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="text-center py-12 text-gray-400 text-sm">Carregando…</div>;
  if (!order) return (
    <div className="text-center py-12">
      <p className="text-gray-600">Carga não encontrada.</p>
      <button onClick={() => navigate("/parceiro/cargas")} className="mt-3 text-sm font-semibold text-primary hover:underline">Voltar para Minhas Cargas</button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate("/parceiro/cargas")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Minhas Cargas</button>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-bold font-mono text-gray-900">{order.protocol}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3 flex items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> Atualizar status da carga</h2>
            <div className="flex flex-wrap gap-2">
              {FLOW.map(s => (
                <button key={s.key} disabled={updateStatus.isPending || order.status === s.key}
                  onClick={() => updateStatus.mutate(s.key)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 ${
                    order.status === s.key ? "bg-brand-gradient text-white border-transparent" : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}>
                  {s.label}{order.status === s.key ? " (atual)" : ""}
                </button>
              ))}
            </div>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Observação (opcional) — ex: chegou ao destino"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
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
            <h2 className="font-semibold mb-1 flex items-center gap-1.5"><PackageCheck className="w-4 h-4 text-primary" /> Resumo</h2>
            <div className="flex justify-between"><span className="text-gray-500">Origem</span><span className="font-medium">{order.origin?.city || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Coleta</span><span className="font-medium">{formatDateBR(order.collection_date)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Volumes</span><span className="font-medium">{order.total_volumes || "—"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Peso</span><span className="font-medium">{order.total_weight_kg ? `${order.total_weight_kg} kg` : "—"}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-gray-500">Valor combinado</span><span className="font-mono font-semibold text-green-600">{order.carrier_amount ? brl(order.carrier_amount) : "—"}</span></div>
          </section>
        </div>
      </div>
    </div>
  );
}

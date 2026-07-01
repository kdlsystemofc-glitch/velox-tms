import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import StatusBadge, { orderStatusConfig } from "@/components/admin/StatusBadge";
import { ArrowLeft, MapPin, Navigation } from "lucide-react";
import { formatDateBR, formatDateTimeBR } from "@/utils/dateUtils";
import LiveMap from "@/components/shared/LiveMap";

function relativeFromNow(iso) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  return `há ${h}h${mins % 60 ? ` ${mins % 60}min` : ""}`;
}

export default function ClientOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["my-client-order", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_client_order", { p_id: id });
      if (error) throw error;
      return (data && data[0]) || null;
    },
  });

  // Rastreamento ao vivo da carga (só enquanto está em coleta/trânsito).
  const inTransit = order && ["collecting", "in_transit"].includes(order.status);
  const { data: live } = useQuery({
    queryKey: ["order-live-location", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("order_live_location", { p_order_id: id });
      if (error) throw error;
      return data || null;
    },
    enabled: !!inTransit,
    refetchInterval: 20_000,
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground text-sm">Carregando…</div>;
  if (!order) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Pedido não encontrado.</p>
      <button onClick={() => navigate("/portal")} className="mt-3 text-sm font-semibold text-primary hover:underline">Voltar para Meus Pedidos</button>
    </div>
  );

  const history = [...(order.status_history || [])].reverse();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button onClick={() => navigate("/portal")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Meus Pedidos</button>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="font-display text-2xl font-bold font-mono text-foreground">{order.protocol}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {inTransit && (
            <section className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-1.5"><Navigation className="w-4 h-4 text-primary" /> Onde está minha carga</h2>
                {live?.updated_at && <span className="text-[11px] text-muted-foreground">Atualizado {relativeFromNow(live.updated_at)}</span>}
              </div>
              {live?.lat ? (
                <LiveMap height={280} markers={[{ lat: live.lat, lng: live.lng, kind: "truck", pulse: true, label: `${live.truck_plate || "Caminhão"}${live.driver_name ? ` · ${live.driver_name}` : ""}` }]} />
              ) : (
                <div className="h-40 flex items-center justify-center bg-muted/40 rounded-xl text-center text-sm text-muted-foreground px-4">
                  Aguardando a posição do motorista. O mapa aparece assim que a viagem começar a enviar GPS.
                </div>
              )}
            </section>
          )}

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3">Acompanhamento</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem movimentações ainda.</p>
            ) : (
              <ol className="space-y-3">
                {history.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${i === 0 ? "bg-brand-gradient" : "bg-muted-foreground/30"}`} />
                      {i < history.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium text-foreground">{orderStatusConfig[h.status]?.label || h.status}</p>
                      {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                      <p className="text-[11px] text-muted-foreground">{formatDateTimeBR(h.timestamp)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-semibold text-sm mb-3">Destinatários</h2>
            <div className="space-y-2">
              {(order.recipients || []).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{r.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{[r.street, r.number, r.city, r.state].filter(Boolean).join(", ") || r.city}</p>
                    {(r.items || []).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">{r.items.length} item(ns) · NF {(r.items.map(it => it.nf_number).filter(Boolean).join(", ")) || "—"}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-card border border-border rounded-xl p-5 text-sm space-y-2">
            <h2 className="font-semibold mb-1">Resumo</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Origem</span><span className="font-medium">{order.origin?.city || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Coleta</span><span className="font-medium">{formatDateBR(order.collection_date)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Volumes</span><span className="font-medium">{order.total_volumes || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Peso</span><span className="font-medium">{order.total_weight_kg ? `${order.total_weight_kg} kg` : "—"}</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Frete</span><span className="font-mono font-semibold">{order.freight_value ? `R$ ${Number(order.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "a definir"}</span></div>
          </section>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import PublicNavbar from "@/components/public/PublicNavbar";
import PublicFooter from "@/components/public/PublicFooter";
import WhatsAppButton from "@/components/public/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { motion } from "framer-motion";

const TRACKING_EVENTS = [
  { key: "new",        label: "Solicitado",  desc: "Pedido de coleta recebido",           icon: "📋" },
  { key: "confirmed",  label: "Confirmado",  desc: "Coleta confirmada pela equipe",        icon: "✅" },
  { key: "collecting", label: "Em Coleta",   desc: "Motorista a caminho para coletar",     icon: "🚚" },
  { key: "in_transit", label: "Em Trânsito", desc: "Carga coletada, em rota de entrega",   icon: "📍" },
  { key: "delivered",  label: "Entregue",    desc: "Carga entregue com sucesso",           icon: "🎉" },
];

const statusOrder = TRACKING_EVENTS.map(e => e.key);

export default function Tracking() {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setNotFound(false);
    setOrder(null);

    const q = query.trim().toUpperCase();

    try {
      // Preferencial: função segura no banco (não expõe a base de pedidos).
      const { data: tracked, error } = await supabase.rpc("track_order", { p_query: q });
      if (!error && tracked) {
        setOrder(tracked);
        setLoading(false);
        return;
      }
      if (!error && tracked === null) {
        // RPC respondeu, mas não encontrou
        setNotFound(true);
        setLoading(false);
        return;
      }
      // error → RPC ainda não criada; cai no fallback abaixo
      throw error || new Error("rpc indisponível");
    } catch {
      // Fallback (pré-migration): busca client-side
      let results = await base44.entities.Order.filter({ protocol: q });
      if (results.length === 0) results = await base44.entities.Order.filter({ cte_number: q });
      if (results.length === 0) {
        const allOrders = await base44.entities.Order.list("-created_date", 500);
        results = allOrders.filter(o =>
          (o.recipients || []).some(r =>
            (r.items || []).some(i => i.nf_number && i.nf_number.toUpperCase() === q)
          )
        );
      }
      if (results.length > 0) setOrder(results[0]);
      else setNotFound(true);
      setLoading(false);
    }
  };

  const currentIndex = order ? statusOrder.indexOf(order.status) : -1;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <div className="pt-32 pb-24">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-velox-dark mb-4">
              Rastrear Carga
            </h1>
            <p className="text-gray-500 text-lg">
              Insira o protocolo, CT-e ou número da NF para acompanhar sua carga.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3 mb-12">
            <Input
              placeholder="Protocolo VLX-2026-XXXXX, CT-e ou nº da NF"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white text-base py-6 font-mono"
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-velox-amber hover:bg-velox-amber/90 text-white font-bold px-8 py-6"
            >
              {loading ? <Clock className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </Button>
          </form>

          {notFound && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
              <p className="text-4xl mb-4">📦</p>
              <p className="font-semibold text-gray-700 mb-2">Nenhum pedido encontrado</p>
              <p className="text-gray-500 text-sm">Verifique o protocolo, CT-e ou número da NF e tente novamente.</p>
            </motion.div>
          )}

          {order && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-100 shadow-lg">

              {/* Header */}
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-500">Protocolo</p>
                  <p className="font-mono font-bold text-xl text-velox-dark">{order.protocol}</p>
                  {order.cte_number && (
                    <p className="text-xs text-gray-400 mt-0.5">CT-e: {order.cte_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-heading font-semibold text-velox-dark">{order.client_name}</p>
                </div>
              </div>

              {/* Timeline vertical */}
              <div className="relative space-y-6">
                {TRACKING_EVENTS.map((event, i) => {
                  const histEntry = (order.status_history || []).find(h => h.status === event.key);
                  const isReached = statusOrder.indexOf(event.key) <= currentIndex;
                  const isCurrent = event.key === order.status;
                  return (
                    <div key={event.key} className="flex items-start gap-4 relative">
                      {/* Linha conectora */}
                      {i < TRACKING_EVENTS.length - 1 && (
                        <div className={`absolute left-5 top-10 w-0.5 h-6 ${isReached ? "bg-velox-amber" : "bg-gray-100"}`} />
                      )}
                      {/* Ícone */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg transition-all ${
                        isCurrent ? "bg-velox-amber shadow-md scale-110" : isReached ? "bg-green-100" : "bg-gray-100"
                      }`}>
                        {event.icon}
                      </div>
                      {/* Info */}
                      <div className="flex-1 pt-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className={`font-semibold text-sm ${isCurrent ? "text-velox-amber" : isReached ? "text-foreground" : "text-muted-foreground"}`}>
                            {event.label}
                            {isCurrent && (
                              <span className="ml-2 text-[10px] bg-velox-amber text-white px-2 py-0.5 rounded-full font-bold uppercase">Atual</span>
                            )}
                          </p>
                          {histEntry?.timestamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(histEntry.timestamp).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.desc}</p>
                        {histEntry?.note && histEntry.note !== `Status alterado para ${event.label}` && (
                          <p className="text-xs text-blue-600 mt-1 italic">{histEntry.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Ocorrências */}
                {(order.status_history || []).filter(h => h.status === "incident").map((inc, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-lg">⚠️</div>
                    <div className="flex-1 pt-1.5 bg-red-50 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-red-700">Ocorrência registrada</p>
                        <p className="text-xs text-muted-foreground">{new Date(inc.timestamp).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <p className="text-xs text-red-600 mt-1">{inc.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Histórico detalhado de eventos (5.9) */}
              {(order.status_history || []).filter(h => h.timestamp).length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h3 className="font-heading font-bold text-velox-dark mb-4 text-sm">Histórico detalhado</h3>
                  <div className="space-y-2.5 border-l-2 border-gray-100 pl-4 ml-1">
                    {[...(order.status_history || [])]
                      .filter(h => h.timestamp)
                      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                      .map((h, i) => (
                        <div key={i} className="relative">
                          <span className={`absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full ${h.status === "incident" ? "bg-red-500" : "bg-velox-amber"}`} />
                          <p className="text-sm text-gray-700">{h.note || h.status}</p>
                          <p className="text-[11px] text-gray-400">
                            {new Date(h.timestamp).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Status por destinatário */}
              {(order.recipients || []).length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <h3 className="font-heading font-bold text-velox-dark mb-4 text-sm">
                    {order.recipients.length > 1 ? "Status por destinatário" : "Destinatário"}
                  </h3>
                  <div className="space-y-2">
                    {order.recipients.map((r, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${
                        r.delivery_status === "delivered" ? "bg-green-50 border-green-200" : "bg-gray-50 border-border"
                      }`}>
                        <div>
                          <p className="font-medium text-sm">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.city}/{r.state}</p>
                        </div>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          r.delivery_status === "delivered" ? "bg-green-100 text-green-700" :
                          r.delivery_status === "failed" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {r.delivery_status === "delivered" ? "✓ Entregue" :
                           r.delivery_status === "failed" ? "✗ Falha" :
                           r.delivery_status === "collected" ? "Coletado" : "Aguardando"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <PublicFooter />
      <WhatsAppButton />
    </div>
  );
}
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Inbox, MapPin, Check, X } from "lucide-react";
import { formatDateBR } from "@/utils/dateUtils";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function CarrierOffers() {
  const queryClient = useQueryClient();
  const { data: offers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-carrier-offers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_carrier_offers");
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30_000,
  });

  const respond = useMutation({
    mutationFn: async ({ orderId, accept }) => {
      const { error } = await supabase.rpc("carrier_respond_offer", { p_order_id: orderId, p_accept: accept });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-carrier-offers"] });
      queryClient.invalidateQueries({ queryKey: ["my-carrier-orders"] });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Ofertas de frete</h1>
        <p className="text-sm text-muted-foreground">Fretes que a Velox ofereceu à sua transportadora. Aceite para assumir a carga.</p>
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">Carregando…</div>
      ) : isError ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-muted-foreground font-medium">Não foi possível carregar as ofertas.</p>
          <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-primary hover:underline">Tentar de novo</button>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">Nenhuma oferta no momento</p>
          <p className="text-sm text-muted-foreground mt-1">Quando a Velox ofertar um frete para você, ele aparece aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map(o => {
            const cities = (o.recipients || []).map(r => r.city).filter(Boolean).join(", ");
            return (
              <div key={o.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-sm">{o.protocol}</p>
                    <p className="text-sm text-foreground flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {o.origin?.city || "Origem"} → {cities || "destino"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Coleta {formatDateBR(o.collection_date)} · {(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg · {o.total_volumes || 0} vol.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Valor ofertado</p>
                    <p className="font-mono font-bold text-green-600 text-lg">{brl(o.carrier_amount)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <button disabled={respond.isPending}
                    onClick={() => respond.mutate({ orderId: o.id, accept: true })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-sm disabled:opacity-60">
                    <Check className="w-4 h-4" /> Aceitar
                  </button>
                  <button disabled={respond.isPending}
                    onClick={() => { if (confirm("Recusar esta oferta de frete?")) respond.mutate({ orderId: o.id, accept: false }); }}
                    className="inline-flex items-center justify-center gap-1.5 border border-input text-muted-foreground hover:bg-muted/40 font-semibold py-2 px-4 rounded-lg text-sm disabled:opacity-60">
                    <X className="w-4 h-4" /> Recusar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

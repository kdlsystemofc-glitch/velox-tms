import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { supabase } from "@/api/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";
import { parseBRNumber } from "@/utils/number";
import { logAction } from "@/utils/auditLog";
import { rankCarriers } from "@/utils/carrierScorecard";
import { Sparkles } from "lucide-react";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const OFFER_LABEL = { offered: "ofertado", accepted: "aceito", refused: "recusado" };

// Oferta um pedido a uma transportadora parceira (subcontratação).
// Autocontido: carrega parceiros, dispara admin_offer_order e invalida o pedido.
export default function OfferToCarrierDialog({ order, open, onOpenChange }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [carrierId, setCarrierId] = useState("");
  const [amount, setAmount] = useState("");

  const { data: carriers = [] } = useQuery({
    queryKey: ["carriers"],
    queryFn: () => db.Carrier.list(),
    enabled: open,
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"], queryFn: () => db.Order.list("-created_date", 1000), enabled: open,
  });
  const activeCarriers = carriers.filter(c => c.status !== "inactive");
  // Tendering: ranqueia por desempenho (aceite/volume) para sugerir o melhor.
  const ranked = rankCarriers(activeCarriers, orders);
  const best = ranked[0];

  const offer = useMutation({
    mutationFn: async () => {
      const value = parseBRNumber(amount);
      if (!carrierId) throw new Error("Selecione a transportadora.");
      if (!(value > 0)) throw new Error("Informe o valor combinado com o parceiro.");
      const { error } = await supabase.rpc("admin_offer_order", { p_order_id: order.id, p_carrier_id: carrierId, p_amount: value });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      logAction("Ofertou pedido a parceiro", "order", order.protocol, `${carriers.find(c => c.id === carrierId)?.company_name || "parceiro"} · ${brl(parseBRNumber(amount))}`);
      toast({ title: "Pedido ofertado!", description: "O parceiro verá a oferta no Portal da Transportadora." });
      onOpenChange(false);
      setCarrierId(""); setAmount("");
    },
    onError: (e) => toast({ title: "Não foi possível ofertar", description: e?.message, variant: "destructive" }),
  });

  const carrierName = order.carrier_id && carriers.find(c => c.id === order.carrier_id)?.company_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="w-4 h-4 text-velox-amber" /> Ofertar a parceiro</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {order.carrier_status && (
            <div className="text-xs rounded-lg border border-border bg-muted/30 px-3 py-2">
              Situação atual: <strong>{OFFER_LABEL[order.carrier_status] || order.carrier_status}</strong>
              {carrierName ? ` — ${carrierName}` : ""}{order.carrier_amount ? ` · ${brl(order.carrier_amount)}` : ""}.
              {order.carrier_status === "offered" && " Reofertar substitui a oferta atual."}
            </div>
          )}

          {activeCarriers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transportadora cadastrada. Cadastre em Cadastros → Transportadoras.</p>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transportadora</label>
                  {best && (
                    <button type="button" onClick={() => setCarrierId(best.carrier.id)}
                      className="text-[11px] font-semibold text-velox-amber hover:underline inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Sugerir melhor{best.score.acceptanceRate != null ? ` (${best.score.acceptanceRate}%)` : ""}
                    </button>
                  )}
                </div>
                <Select value={carrierId} onValueChange={setCarrierId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione o parceiro…" /></SelectTrigger>
                  <SelectContent>
                    {ranked.map(({ carrier: c, score }) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name}{score.acceptanceRate != null ? ` · ${score.acceptanceRate}% aceite` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor combinado (R$)</label>
                <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 1.200,00" inputMode="decimal" />
                {order.freight_value > 0 && (
                  <p className="text-[11px] text-muted-foreground">Frete cobrado do cliente: {brl(order.freight_value)}{parseBRNumber(amount) > 0 ? ` · margem ${brl(order.freight_value - parseBRNumber(amount))}` : ""}</p>
                )}
              </div>
              <Button className="w-full font-bold gap-2" disabled={offer.isPending} onClick={() => offer.mutate()}>
                <Send className="w-4 h-4" /> {offer.isPending ? "Ofertando…" : "Enviar oferta"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

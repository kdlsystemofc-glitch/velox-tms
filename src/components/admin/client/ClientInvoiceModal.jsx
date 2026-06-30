import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Receipt } from "lucide-react";
import { toLocalISO } from "@/utils/dateUtils";

// Modal "Fechar Fatura do Mês". Extraído de ClientDetailPage (A2).
// Unificado (B1/B2/F1): gera uma FATURA de verdade via RPC create_invoice e
// marca os pedidos, em vez de criar uma 2ª receita solta (evita dupla cobrança).
export default function ClientInvoiceModal({ open, onOpenChange, orders, client }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const now = new Date();
  const monthOrders = orders.filter(o => {
    if (!o.created_date) return false;
    const d = new Date(o.created_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      && o.status !== "cancelled" && o.freight_value > 0 && !o.invoice_id; // só não-faturados
  });
  const total = monthOrders.reduce((s, o) => s + (o.freight_value || 0), 0);
  const billingDay = client.billing_day || 25;
  const termDays = client.payment_term_days || 30;
  const closingDate = new Date(now.getFullYear(), now.getMonth(), billingDay);
  const dueDate = new Date(closingDate.getTime() + termDays * 86400000);

  const generateInvoice = async () => {
    const ids = monthOrders.filter(o => !o.invoice_id).map(o => o.id);
    if (ids.length === 0) {
      toast({ title: "Nada a faturar", description: "Os fretes do mês já estão em uma fatura.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.rpc("create_invoice", {
      p_client_id: client.id, p_order_ids: ids, p_due_date: toLocalISO(dueDate),
      p_notes: `Fatura mensal — ${now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
    });
    if (error) { toast({ title: "Erro ao faturar", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    onOpenChange(false);
    toast({ title: `Fatura ${data} gerada!`, description: `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} — vence em ${dueDate.toLocaleDateString("pt-BR")}` });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-velox-amber" /> Fechar Fatura do Mês
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {monthOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum frete no mês atual.</p>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {monthOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{o.protocol}</span>
                    <span className="font-medium">R$ {(o.freight_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Total da fatura</span>
                  <span className="font-mono text-green-600 dark:text-green-300">R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fechamento</span>
                  <span>{closingDate.toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Vencimento ({termDays} dias)</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-300">{dueDate.toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <Button className="w-full font-bold" onClick={generateInvoice}>
                Gerar fatura (R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

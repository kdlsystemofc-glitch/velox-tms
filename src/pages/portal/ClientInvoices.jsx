import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Receipt, FileDown } from "lucide-react";
import { formatDateBR } from "@/utils/dateUtils";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";
import StatusBadge, { invoiceStatusConfig } from "@/components/admin/StatusBadge";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export default function ClientInvoices() {
  const { settings } = useCompanySettings();
  const downloadPdf = (inv) => {
    const blob = generateInvoicePDF(inv, settings);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${inv.number || "fatura"}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };
  const { data: invoices = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-client-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_client_invoices");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Faturas</h1>
        <p className="text-sm text-muted-foreground">Suas cobranças e o que está em aberto.</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando…</div>
        ) : isError ? (
          <div className="p-10 text-center">
            <p className="text-muted-foreground font-medium">Não foi possível carregar suas faturas.</p>
            <button onClick={() => refetch()} className="mt-3 text-sm font-semibold text-primary hover:underline">Tentar de novo</button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">Nenhuma fatura</p>
            <p className="text-sm text-muted-foreground mt-1">Suas faturas aparecem aqui quando emitidas.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                <th className="py-2.5 px-4">Número</th>
                <th className="py-2.5 px-4 hidden sm:table-cell">Emissão</th>
                <th className="py-2.5 px-4">Vencimento</th>
                <th className="py-2.5 px-4 text-right">Total</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 px-4 font-mono font-semibold text-xs">{inv.number}</td>
                  <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">{formatDateBR(inv.issue_date)}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{formatDateBR(inv.due_date)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{brl(inv.total)}</td>
                  <td className="py-2.5 px-4"><StatusBadge status={inv.status} config={invoiceStatusConfig} /></td>
                  <td className="py-2.5 px-4 text-right">
                    <button onClick={() => downloadPdf(inv)} title="Baixar PDF" className="inline-flex items-center gap-1 text-primary hover:underline text-xs"><FileDown className="w-3.5 h-3.5" /> PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

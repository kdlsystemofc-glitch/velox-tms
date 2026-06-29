import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Receipt, FileDown } from "lucide-react";
import { formatDateBR } from "@/utils/dateUtils";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { generateInvoicePDF } from "@/utils/generateInvoicePDF";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const meta = {
  open: { label: "Em aberto", cls: "bg-amber-100 text-amber-700" },
  paid: { label: "Paga", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
};

export default function ClientInvoices() {
  const { settings } = useCompanySettings();
  const downloadPdf = (inv) => {
    const blob = generateInvoicePDF(inv, settings);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${inv.number || "fatura"}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };
  const { data: invoices = [], isLoading } = useQuery({
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
        <h1 className="font-display text-2xl font-bold text-gray-900">Faturas</h1>
        <p className="text-sm text-gray-500">Suas cobranças e o que está em aberto.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando…</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium">Nenhuma fatura</p>
            <p className="text-sm text-gray-400 mt-1">Suas faturas aparecem aqui quando emitidas.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
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
                <tr key={inv.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 px-4 font-mono font-semibold text-xs">{inv.number}</td>
                  <td className="py-2.5 px-4 text-gray-500 hidden sm:table-cell">{formatDateBR(inv.issue_date)}</td>
                  <td className="py-2.5 px-4 text-gray-500">{formatDateBR(inv.due_date)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{brl(inv.total)}</td>
                  <td className="py-2.5 px-4"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta[inv.status]?.cls}`}>{meta[inv.status]?.label || inv.status}</span></td>
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

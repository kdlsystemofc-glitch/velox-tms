import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

// Histórico de preços do cliente (5.6). Somente leitura.
// Extraído de ClientDetailPage (A2). Destaca fretes >30% fora da média R$/kg.
export default function ClientPriceHistoryCard({ orders }) {
  const priced = orders.filter(o => o.status !== "cancelled" && (o.freight_value > 0 || o.total_weight_kg > 0));
  const perKgList = priced.map(o => (o.total_weight_kg > 0 ? (o.freight_value || 0) / o.total_weight_kg : null)).filter(v => v != null);
  const avgPerKg = perKgList.length ? perKgList.reduce((s, v) => s + v, 0) / perKgList.length : 0;

  return (
    <Card>
      <CardHeader className="py-3 border-b border-border bg-muted/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-velox-amber" /> Histórico de preços
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {priced.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Nenhum pedido com valor ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">Data</th>
                  <th className="text-left py-2 font-medium">Protocolo</th>
                  <th className="text-right py-2 font-medium">Peso</th>
                  <th className="text-right py-2 font-medium">Valor decl.</th>
                  <th className="text-right py-2 font-medium">Frete</th>
                  <th className="text-right py-2 font-medium">R$/kg</th>
                </tr>
              </thead>
              <tbody>
                {priced.map(o => {
                  const perKg = o.total_weight_kg > 0 ? (o.freight_value || 0) / o.total_weight_kg : null;
                  const dev = perKg != null && avgPerKg > 0 ? (perKg - avgPerKg) / avgPerKg : 0;
                  const off = Math.abs(dev) > 0.3; // >30% fora da média
                  return (
                    <tr key={o.id} className="border-b border-border/40">
                      <td className="py-2 text-muted-foreground">{o.created_date ? new Date(o.created_date).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="py-2"><Link to={`/admin/coletas/${o.id}`} className="font-mono text-velox-amber hover:underline">{o.protocol}</Link></td>
                      <td className="py-2 text-right font-mono">{(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg</td>
                      <td className="py-2 text-right font-mono">{o.total_declared_value ? `R$ ${Number(o.total_declared_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                      <td className="py-2 text-right font-mono">{o.freight_value ? `R$ ${Number(o.freight_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</td>
                      <td className={`py-2 text-right font-mono font-semibold ${off ? (dev > 0 ? "text-red-600 dark:text-red-300" : "text-amber-600 dark:text-amber-300") : "text-foreground"}`} title={off ? `${(dev * 100).toFixed(0)}% vs. média` : ""}>
                        {perKg != null ? `R$ ${perKg.toFixed(2)}` : "—"}{off && (dev > 0 ? " ▲" : " ▼")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={5} className="py-2 text-right text-muted-foreground">Média R$/kg</td>
                  <td className="py-2 text-right font-mono font-bold">R$ {avgPerKg.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            <p className="text-[10px] text-muted-foreground mt-2">▲ acima / ▼ abaixo da média (desvio &gt; 30%) — ajuda a achar fretes fora do padrão.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

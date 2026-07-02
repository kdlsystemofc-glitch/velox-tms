import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { useToast } from "@/components/ui/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import { requestFiscal, markContingency, cancelFiscal } from "@/services/fiscal";
import { Button } from "@/components/ui/button";
import { FileCheck2, AlertTriangle, Ban, ShieldQuestion, Loader2 } from "lucide-react";

const STATUS = {
  draft:            { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
  provider_pending: { label: "Sem provedor", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  pending:          { label: "Aguardando SEFAZ", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  authorized:       { label: "Autorizado", cls: "bg-green-500/15 text-green-700 dark:text-green-300" },
  rejected:         { label: "Rejeitado", cls: "bg-red-500/15 text-red-700 dark:text-red-300" },
  contingency:      { label: "Contingência", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  cancelled:        { label: "Cancelado", cls: "bg-muted text-muted-foreground line-through" },
};

/**
 * Painel fiscal do pedido (Projeto 09.4) — CT-e. A emissão REAL na SEFAZ depende
 * de provedor (pago) + certificado; sem eles o documento fica 'provider_pending'
 * e o painel deixa isso explícito (não autoriza nada).
 */
export default function FiscalPanel({ order, company }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasProvider = !!(company?.fiscal_provider && String(company.fiscal_provider).trim());
  useRealtime(["fiscal_documents"], ["fiscal", order?.id]);

  const { data: docs = [] } = useQuery({
    queryKey: ["fiscal", order?.id],
    queryFn: () => db.FiscalDocument.filter({ entity_id: order.id }, "-created_at", 10),
    enabled: !!order?.id,
  });
  const cte = docs.find((d) => d.kind === "cte" && d.status !== "cancelled");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fiscal", order?.id] });

  const emit = useMutation({
    mutationFn: () => requestFiscal("cte", "order", order.id, { order, company, environment: company?.fiscal_environment || "homologacao" }),
    onSuccess: () => { invalidate(); toast({ title: "CT-e solicitado", description: hasProvider ? "Na fila para a SEFAZ." : "Sem provedor: ficará pendente até configurar." }); },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });
  const conting = useMutation({
    mutationFn: (id) => markContingency(id),
    onSuccess: () => { invalidate(); toast({ title: "Contingência acionada" }); },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });
  const cancel = useMutation({
    mutationFn: (id) => cancelFiscal(id, "Cancelado pela equipe"),
    onSuccess: () => { invalidate(); toast({ title: "Documento cancelado" }); },
    onError: (e) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const st = cte ? (STATUS[cte.status] || STATUS.draft) : null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold flex items-center gap-1.5"><FileCheck2 className="w-4 h-4 text-velox-amber" /> CT-e (fiscal)</span>
        {cte && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>}
      </div>

      {!hasProvider && (
        <p className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
          <ShieldQuestion className="w-3.5 h-3.5" /> Sem provedor fiscal configurado — não autoriza na SEFAZ. Arquitetura pronta; ligue o provedor em Configurações.
        </p>
      )}

      {cte ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          {cte.access_key && <p>Chave: <span className="font-mono">{cte.access_key}</span></p>}
          {cte.protocol && <p>Protocolo: {cte.protocol}</p>}
          {cte.error && <p className="text-red-600 dark:text-red-300">{cte.error}</p>}
          <div className="flex gap-2 pt-1">
            {["pending", "provider_pending", "rejected"].includes(cte.status) && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={conting.isPending} onClick={() => conting.mutate(cte.id)}>
                <AlertTriangle className="w-3.5 h-3.5" /> Contingência
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 dark:text-red-300" disabled={cancel.isPending} onClick={() => cancel.mutate(cte.id)}>
              <Ban className="w-3.5 h-3.5" /> Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" className="h-8 text-xs gap-1" disabled={emit.isPending} onClick={() => emit.mutate()}>
          {emit.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck2 className="w-3.5 h-3.5" />} Emitir CT-e
        </Button>
      )}
    </div>
  );
}

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/repositories";
import { useToast } from "@/components/ui/use-toast";
import { useRealtime } from "@/hooks/useRealtime";
import { renderPendingDocuments, signedDocumentUrl } from "@/services/documents";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Download, Play, Loader2, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const TYPE_LABEL = {
  invoice: "Fatura", receipt: "Comprovante", shipment: "Doc. transporte",
  trip_manifest: "Romaneio de viagem", transfer_manifest: "Manifesto de transferência", labels: "Etiquetas",
};
const STATUS = {
  pending: { label: "Na fila", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: Clock },
  ready:   { label: "Pronto", cls: "bg-green-500/15 text-green-700 dark:text-green-300", icon: CheckCircle2 },
  error:   { label: "Erro", cls: "bg-red-500/15 text-red-700 dark:text-red-300", icon: AlertTriangle },
};
const fmt = (ts) => (ts ? new Date(ts).toLocaleString("pt-BR") : "—");

/**
 * Fila de documentos server-side (Projeto 08.4). Lista o registro `documents`,
 * aciona a Edge Function de render (lote) e baixa os prontos por signed URL.
 */
export default function DocumentsQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useRealtime(["documents"], ["documents-queue"]);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents-queue"],
    queryFn: () => db.Document.list("-created_at", 100),
  });
  const pendingCount = docs.filter((d) => d.status === "pending").length;

  const process = useMutation({
    mutationFn: () => renderPendingDocuments({ limit: 50 }),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["documents-queue"] });
      toast({ title: "Fila processada", description: `${r?.processed ?? 0} gerado(s)${r?.failed ? `, ${r.failed} com erro` : ""}.` });
    },
    onError: (e) => toast({ title: "Erro ao processar", description: e?.message || "A Edge Function render-documents está publicada?", variant: "destructive" }),
  });

  const download = async (doc) => {
    try {
      const url = await signedDocumentUrl(doc.storage_path, 60);
      if (url) window.open(url, "_blank", "noopener");
    } catch (e) {
      toast({ title: "Erro ao baixar", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader icon={FileText} title="Documentos (fila)" subtitle="Geração e arquivo de documentos no servidor" />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">{pendingCount} na fila · {docs.length} no total (últimos 100)</p>
        <Button size="sm" className="gap-1" onClick={() => process.mutate()} disabled={process.isPending || pendingCount === 0}>
          {process.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Processar fila no servidor
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando…</div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-foreground font-medium">Nenhum documento solicitado</p>
            <p className="text-sm text-muted-foreground mt-1">Solicite a geração em Pedidos, Faturas ou Transferências.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">Solicitado</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const st = STATUS[d.status] || STATUS.pending;
                  const Icon = st.icon;
                  return (
                    <tr key={d.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 px-4">
                        <span className="font-medium">{TYPE_LABEL[d.type] || d.type}</span>
                        {d.title && <span className="text-xs text-muted-foreground ml-2">{d.title}</span>}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground hidden sm:table-cell">{fmt(d.created_at)}{d.requested_by_email ? ` · ${d.requested_by_email}` : ""}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${st.cls}`}>
                          <Icon className="w-3 h-3" /> {st.label}
                        </span>
                        {d.status === "error" && d.error && <span className="block text-[10px] text-red-600 dark:text-red-300 mt-0.5 max-w-[220px] truncate" title={d.error}>{d.error}</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {d.status === "ready" && d.storage_path && (
                          <button className="text-xs text-velox-amber hover:underline inline-flex items-center gap-1" onClick={() => download(d)}>
                            <Download className="w-3.5 h-3.5" /> Baixar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground px-1">Os PDFs são renderizados no servidor (Edge Function <span className="font-mono">render-documents</span>) e arquivados no bucket privado. O botão "baixar agora" das telas continua gerando no cliente para uso imediato.</p>
    </div>
  );
}

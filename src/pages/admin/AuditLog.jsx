import React, { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTimeBR } from "@/utils/dateUtils";

const PAGE_SIZE = 30;

export default function AuditLog() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", page],
    queryFn: () => base44.entities.AuditLog.page({ orderBy: "-created_at", page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader icon={ScrollText} title="Trilha de auditoria" subtitle="Ações sensíveis registradas por usuário (cancelamentos, faturas, conciliações, subcontratação)." />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-foreground font-medium">Nenhum registro ainda</p>
            <p className="text-sm text-muted-foreground mt-1">As ações sensíveis aparecem aqui conforme acontecem.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/30">
                  <th className="py-2.5 px-4">Quando</th>
                  <th className="py-2.5 px-4">Usuário</th>
                  <th className="py-2.5 px-4">Ação</th>
                  <th className="py-2.5 px-4">Referência</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{formatDateTimeBR(r.created_at)}</td>
                    <td className="py-2.5 px-4 max-w-[160px] truncate">{r.actor_email || "—"}</td>
                    <td className="py-2.5 px-4 font-medium">{r.action}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">{r.entity ? `${r.entity}${r.entity_id ? ` · ${r.entity_id}` : ""}` : "—"}</td>
                    <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell max-w-[220px] truncate">{r.detail || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground disabled:opacity-30 px-3 py-1.5 rounded-lg border border-border">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <span className="text-xs text-muted-foreground">Página {page + 1} de {totalPages} · {total} registros</span>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground disabled:opacity-30 px-3 py-1.5 rounded-lg border border-border">
            Próxima <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

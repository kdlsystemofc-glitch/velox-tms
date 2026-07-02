import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

/**
 * Histórico de versões de uma tarifa governada (Projeto 03.4). Somente leitura.
 *
 * Mostra as versões de tariff_versions para um escopo/chave (default | route:UF-UF
 * | client:<id>): número, vigência, status, autor e nota. A versão vigente
 * (status "active") fica destacada. Leitura restrita a staff pela RLS.
 */
const STATUS_LABEL = { active: "Vigente", archived: "Arquivada", draft: "Rascunho" };
const STATUS_STYLE = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  archived: "bg-muted text-muted-foreground",
  draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : null);

export default function TariffHistoryCard({ scope, scopeKey = null, title = "Histórico de tarifa" }) {
  const { data: versions = [], isLoading, error } = useQuery({
    queryKey: ["tariff-history", scope, scopeKey],
    queryFn: async () => {
      let q = supabase
        .from("tariff_versions")
        .select("version_no, valid_from, valid_until, status, note, created_by_email, created_at, tariff_tables!inner(scope, scope_key)")
        .eq("tariff_tables.scope", scope)
        .order("version_no", { ascending: false });
      q = scopeKey == null ? q.is("tariff_tables.scope_key", null) : q.eq("tariff_tables.scope_key", scopeKey);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader className="py-3 border-b border-border bg-muted/30">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="w-4 h-4 text-velox-amber" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => <div key={i} className="h-6 rounded bg-muted animate-pulse" />)}
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground text-center py-3">Não foi possível carregar o histórico de tarifas.</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Sem versões registradas. A tarifa será versionada na próxima alteração.</p>
        ) : (
          <div className="space-y-1.5">
            {versions.map((v, i) => {
              const range = [fmtDate(v.valid_from), fmtDate(v.valid_until)];
              const vigencia = range[0] || range[1] ? `${range[0] || "—"} → ${range[1] || "sem fim"}` : "sem vigência definida";
              return (
                <div key={i} className="flex items-center justify-between gap-2 text-xs border-b border-border/40 pb-1.5 last:border-0">
                  <div className="min-w-0">
                    <span className="font-mono font-semibold">v{v.version_no}</span>
                    <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLE[v.status] || STATUS_STYLE.archived}`}>
                      {STATUS_LABEL[v.status] || v.status}
                    </span>
                    {v.note && <span className="ml-2 text-muted-foreground truncate">{v.note}</span>}
                  </div>
                  <div className="text-right text-muted-foreground shrink-0">
                    <div>{fmtDate(v.created_at)}{v.created_by_email ? ` · ${v.created_by_email}` : ""}</div>
                    <div className="text-[10px]">{vigencia}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

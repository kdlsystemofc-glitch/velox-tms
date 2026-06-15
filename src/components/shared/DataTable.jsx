import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Inbox } from "lucide-react";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * DataTable — tabela densa padrão TMS profissional.
 * - Ordenação clicável por coluna
 * - Busca inline (searchKeys)
 * - Toolbar com slot para filtros/ações
 * - Linha clicável, rodapé opcional
 *
 * columns: [{ key, label, sortable, align, className, width, render(row), value(row) }]
 *   value(row) → usado para ordenação/busca quando difere do render.
 */
export default function DataTable({
  columns,
  data,
  getRowId = (r) => r.id,
  onRowClick,
  searchKeys = [],
  searchPlaceholder = "Buscar...",
  initialSort,
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
  toolbar,
  footer,
  dense = true,
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(initialSort || null); // { key, dir }

  const cellValue = (col, row) => {
    if (col.value) return col.value(row);
    return row[col.key];
  };

  const processed = useMemo(() => {
    let rows = [...(data || [])];
    if (search && searchKeys.length) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        searchKeys.some(k => {
          const v = typeof k === "function" ? k(r) : r[k];
          return String(v ?? "").toLowerCase().includes(q);
        })
      );
    }
    if (sort) {
      const col = columns.find(c => c.key === sort.key);
      if (col) {
        rows.sort((a, b) => {
          const va = cellValue(col, a), vb = cellValue(col, b);
          if (va == null) return 1;
          if (vb == null) return -1;
          let cmp;
          if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
          else cmp = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [data, search, sort, columns, searchKeys]);

  const toggleSort = (col) => {
    if (!col.sortable) return;
    setSort(prev => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: "asc" };
      if (prev.dir === "asc") return { key: col.key, dir: "desc" };
      return null;
    });
  };

  const pad = dense ? "px-2.5 py-2" : "px-3 py-2.5";

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {(searchKeys.length > 0 || toolbar) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {searchKeys.length > 0 && (
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          )}
          {toolbar}
        </div>
      )}

      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                {columns.map(col => {
                  const active = sort?.key === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col)}
                      style={col.width ? { width: col.width } : undefined}
                      className={`${pad} h-9 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40 whitespace-nowrap ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      } ${col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""} ${col.headClassName || ""}`}
                    >
                      <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "flex-row-reverse" : ""}`}>
                        {col.label}
                        {col.sortable && (
                          active
                            ? (sort.dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                            : <ChevronsUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading && <TableSkeleton rows={8} cols={columns.length} />}
              {!loading && processed.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                    <Inbox className="w-9 h-9 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{search ? `Nada encontrado para "${search}".` : emptyMessage}</p>
                  </td>
                </tr>
              )}
              {!loading && processed.map(row => (
                <tr
                  key={getRowId(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-border/50 last:border-0 transition-colors ${onRowClick ? "cursor-pointer hover:bg-muted/30" : ""}`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`${pad} align-middle ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.className || ""}`}
                      onClick={col.stopPropagation ? (e) => e.stopPropagation() : undefined}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {footer && !loading && processed.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/20 text-xs font-semibold text-muted-foreground">
                  {footer(processed)}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {!loading && processed.length > 0 && (
        <p className="text-xs text-muted-foreground px-0.5">{processed.length} registro{processed.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}

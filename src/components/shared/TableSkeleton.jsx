import React from "react";

/**
 * Skeleton de carregamento para tabelas e listas.
 * Uso: <TableSkeleton rows={6} cols={5} /> dentro de <tbody> use variant="rows".
 */
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-border/40">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="py-3 px-4">
              <div className="h-4 bg-muted/60 rounded animate-pulse" style={{ width: `${55 + ((ri + ci) % 4) * 12}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Skeleton de cards em grid. */
export function CardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border p-5 space-y-3">
          <div className="h-5 bg-muted/60 rounded animate-pulse w-2/3" />
          <div className="h-4 bg-muted/40 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-muted/40 rounded animate-pulse w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default TableSkeleton;

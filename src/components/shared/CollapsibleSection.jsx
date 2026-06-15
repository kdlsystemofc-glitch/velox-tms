import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Seção colapsável para telas de detalhe (padrão TMS: tudo numa página só).
 * Cabeçalho clicável com título, ícone opcional, contador e ação à direita.
 */
export default function CollapsibleSection({ title, icon: Icon, count, defaultOpen = true, right, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="bg-card border border-border rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
      >
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? "" : "-rotate-90"}`} />
        {Icon && <Icon className="w-4 h-4 text-primary flex-shrink-0" />}
        <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
        {count != null && count > 0 && (
          <span className="text-[11px] font-bold bg-muted text-muted-foreground rounded px-1.5 py-0.5">{count}</span>
        )}
        {right && <span onClick={e => e.stopPropagation()}>{right}</span>}
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border">{children}</div>}
    </section>
  );
}

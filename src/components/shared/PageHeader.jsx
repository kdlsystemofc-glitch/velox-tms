import React from "react";

/**
 * Cabeçalho de página padrão do painel (consistência entre todos os módulos):
 * chip de ícone + título compacto + subtítulo, com slot de ações à direita.
 */
export default function PageHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-[18px] h-[18px] text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-foreground leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}

/** Classe padrão para TabsList dos containers (segmentado denso). */
export const segmentedTabsClass = "bg-muted/60 p-1 rounded-md gap-0.5 h-auto flex-wrap";
export const segmentedTriggerClass = "rounded-[5px] data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary gap-2 text-xs font-medium";

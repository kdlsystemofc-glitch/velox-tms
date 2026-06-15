import React from "react";

/**
 * Padrão de formulário TMS profissional:
 * seções com título + descrição, campos agrupados em grid,
 * labels sempre acima, obrigatório marcado, erro inline.
 */

/** Seção de formulário com cabeçalho e grade de campos. */
export function FormSection({ title, description, icon: Icon, cols = 2, children, className = "" }) {
  const gridCols = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[cols] || "sm:grid-cols-2";
  return (
    <section className={`bg-card border border-border rounded-md ${className}`}>
      <header className="flex items-start gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
        {Icon && <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />}
        <div>
          <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </header>
      <div className={`grid grid-cols-1 ${gridCols} gap-x-4 gap-y-3.5 p-4`}>
        {children}
      </div>
    </section>
  );
}

/** Campo com label acima, marcação de obrigatório/opcional e erro inline. */
export function Field({ label, required, optional, error, hint, className = "", colSpan, children }) {
  const span = colSpan ? { 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4" }[colSpan] : "";
  return (
    <div className={`space-y-1 ${span} ${className}`} data-error={error ? "true" : undefined}>
      {label && (
        <label className="block text-[12px] font-medium text-foreground/80">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && <span className="text-muted-foreground/60 font-normal ml-1 text-[11px]">(opcional)</span>}
        </label>
      )}
      {children}
      {error && <p className="text-[11px] text-destructive flex items-center gap-1">{error}</p>}
      {!error && hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default FormSection;

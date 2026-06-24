import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

/**
 * Estado vazio padrão — visual moderno e amigável.
 * @param tone "muted" (neutro) | "success" (tudo certo) | "brand"
 */
export function EmptyState({ icon: Icon, title, description, action, tone = "muted" }) {
  const chip = tone === "success"
    ? "bg-[hsl(var(--success))]/12 text-[hsl(var(--success))] ring-[hsl(var(--success))]/20"
    : tone === "brand"
    ? "bg-brand-gradient text-white ring-transparent shadow-soft"
    : "bg-primary/10 text-primary ring-primary/15";

  const Btn = action && (
    <span className="press inline-flex items-center gap-2 bg-brand-gradient text-white font-semibold px-4 py-2.5 rounded-lg shadow-soft hover:shadow-elevated hover:brightness-105 transition-all">
      <Plus className="w-4 h-4" /> {action.label}
    </span>
  );

  return (
    <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-up">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ring-4 ${chip}`}>
        {Icon && <Icon className="w-8 h-8" />}
      </div>
      <h3 className="font-semibold text-base text-foreground mb-1.5">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-5">{description}</p>}
      {action && (action.href
        ? <Link to={action.href}>{Btn}</Link>
        : <button onClick={action.onClick}>{Btn}</button>)}
    </div>
  );
}

export default EmptyState;

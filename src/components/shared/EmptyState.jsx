import React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action && (
        <Link to={action.href} className="inline-flex items-center gap-2 bg-velox-amber text-velox-dark font-semibold px-4 py-2 rounded-lg hover:bg-velox-amber/90 transition-colors">
          <Plus className="w-4 h-4" /> {action.label}
        </Link>
      )}
    </div>
  );
}
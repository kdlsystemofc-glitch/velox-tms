import React from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { Link } from "react-router-dom";

export default function AlertsPanel({ alerts = [], maxItems = 6 }) {
  const icons = { critical: AlertCircle, warning: AlertTriangle, info: Info };
  const colors = { critical: "text-red-500 bg-red-50", warning: "text-amber-500 bg-amber-50", info: "text-blue-500 bg-blue-50" };
  const displayed = alerts.slice(0, maxItems);

  if (displayed.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        <Info className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Nenhum alerta no momento
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayed.map((alert, i) => {
        const Icon = icons[alert.level] || Info;
        const colorClass = colors[alert.level] || colors.info;
        return (
          <Link
            key={i}
            to={alert.link || "#"}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-sm text-foreground group-hover:text-primary transition-colors leading-snug">{alert.message}</p>
          </Link>
        );
      })}
    </div>
  );
}
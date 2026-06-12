import React from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function KPICard({ title, value, icon: Icon, trend, trendLabel, subtitle, to, color = "bg-velox-amber" }) {
  const card = (
    <Card className={`p-5 transition-shadow hover:shadow-md ${to ? "cursor-pointer hover:border-velox-amber/40" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1 font-mono">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-semibold ${trend >= 0 ? "text-velox-success" : "text-velox-danger"}`}>
                {trend >= 0 ? "+" : ""}{trend}%
              </span>
              {trendLabel && <span className="text-xs text-muted-foreground">{trendLabel}</span>}
            </div>
          )}
        </div>
        <div className={`w-11 h-11 ${color} bg-opacity-10 rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5`} style={{ color: color === "bg-velox-amber" ? "#F59E0B" : color === "bg-velox-success" ? "#10B981" : color === "bg-velox-danger" ? "#EF4444" : "#1E3A5F" }} />
        </div>
      </div>
    </Card>
  );

  return to ? <Link to={to} className="block">{card}</Link> : card;
}

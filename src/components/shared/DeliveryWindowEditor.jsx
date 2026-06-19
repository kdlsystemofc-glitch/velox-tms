import React from "react";
import { WEEKDAYS } from "@/utils/deliveryWindow";
import { Clock } from "lucide-react";

/**
 * Editor da janela de recebimento (S6 / B2-B).
 * value = { days:[1..6/0], start:"08:00", end:"11:00" } | undefined
 */
export default function DeliveryWindowEditor({ value, onChange, label = "Janela de recebimento" }) {
  const win = value || { days: [], start: "", end: "" };
  const toggle = (d) => {
    const days = win.days?.includes(d) ? win.days.filter((x) => x !== d) : [...(win.days || []), d];
    onChange({ ...win, days });
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> {label}
        <span className="normal-case font-normal text-[10px]">(dias e horário que aceita entrega — opcional)</span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAYS.map((w) => {
          const on = (win.days || []).includes(w.v);
          return (
            <button key={w.v} type="button" onClick={() => toggle(w.v)}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${
                on ? "bg-velox-amber text-white border-velox-amber" : "bg-background text-muted-foreground border-border hover:border-velox-amber/40"
              }`}>
              {w.label}
            </button>
          );
        })}
      </div>
      {(win.days || []).length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">das</span>
          <input type="time" value={win.start || ""} onChange={(e) => onChange({ ...win, start: e.target.value })}
            className="h-8 rounded-md border border-border px-2 text-sm" />
          <span className="text-xs text-muted-foreground">às</span>
          <input type="time" value={win.end || ""} onChange={(e) => onChange({ ...win, end: e.target.value })}
            className="h-8 rounded-md border border-border px-2 text-sm" />
        </div>
      )}
    </div>
  );
}

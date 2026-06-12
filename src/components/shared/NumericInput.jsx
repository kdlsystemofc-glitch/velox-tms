import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function toDisplay(value, currency, focused) {
  if (value === "" || value === null || value === undefined) return "";
  const num = parseFloat(String(value));
  if (isNaN(num)) return "";
  if (focused) return String(num).replace(".", ",");
  if (currency) return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(num).replace(".", ",");
}

/**
 * Input numérico brasileiro:
 * - Aceita vírgula ou ponto como separador decimal
 * - Não remove zeros iniciais enquanto o usuário digita
 * - Prefixo R$ quando currency=true
 * - integer=true para campos sem decimal
 */
export function NumericInput({ value, onChange, placeholder, currency = false, integer = false, className, ...props }) {
  const [focused, setFocused] = useState(false);
  const [display, setDisplay] = useState(() => toDisplay(value, currency, false));

  useEffect(() => {
    if (!focused) setDisplay(toDisplay(value, currency, false));
  }, [value, focused, currency]);

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9,.\-]/g, "");
    raw = raw.replace(".", ",");
    const parts = raw.split(",");
    if (parts.length > 2) raw = parts[0] + "," + parts.slice(1).join("");
    if (integer) raw = raw.split(",")[0];
    setDisplay(raw);
    const numeric = parseFloat(raw.replace(",", "."));
    onChange(isNaN(numeric) ? "" : numeric);
  };

  const handleFocus = () => {
    setFocused(true);
    const num = parseFloat(String(display).replace(/\./g, "").replace(",", "."));
    if (!isNaN(num)) setDisplay(String(num).replace(".", ","));
  };

  const handleBlur = () => {
    setFocused(false);
    setDisplay(toDisplay(parseFloat(display.replace(",", ".")), currency, false));
  };

  return (
    <div className="relative">
      {currency && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none select-none">
          R$
        </span>
      )}
      <Input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={currency ? "0,00" : (placeholder || "0")}
        className={cn(currency && "pl-8", className)}
        {...props}
      />
    </div>
  );
}
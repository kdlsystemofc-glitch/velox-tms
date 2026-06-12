import React from "react";

/**
 * Wrapper reutilizável para campos de formulário.
 * Renderiza label, campo filho, hint e mensagem de erro.
 */
export function FormField({ label, required, error, hint, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-slate-700 block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

/** Variante para uso no site público (cores do design system Velox) */
export function PublicFormField({ label, required, error, hint, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-velox-dark mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
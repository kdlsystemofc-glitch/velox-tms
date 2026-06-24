import React from "react";
import { Truck, ShieldCheck, Zap, BarChart3 } from "lucide-react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Painel de marca (desktop) */}
      <div className="hidden lg:flex lg:w-[44%] relative overflow-hidden bg-brand-gradient text-white p-12 flex-col justify-between">
        {/* Brilhos decorativos */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-black/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/25">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight leading-none">VELOX</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Transportadora</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight">
            Sua operação<br />de transporte,<br />sob controle total.
          </h2>
          <p className="text-white/70 mt-4 max-w-sm">
            Pedidos, despacho, frota, financeiro e indicadores — tudo num só lugar, em tempo real.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            {[[Zap, "Despacho e roteirização ágeis"], [ShieldCheck, "Documentos e SLA sob controle"], [BarChart3, "Indicadores e DRE em tempo real"]].map(([I, t], i) => (
              <div key={i} className="flex items-center gap-3 text-white/85">
                <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center"><I className="w-4 h-4" /></span>
                {t}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/50">© {new Date().getFullYear()} Velox Transportadora · TMS</p>
      </div>

      {/* Painel do formulário */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-fade-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gradient shadow-soft mb-4">
              {Icon && <Icon className="w-7 h-7 text-white" aria-hidden="true" />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1.5">{subtitle}</p>}
          </div>
          <div className="bg-card rounded-2xl shadow-elevated border border-border p-8">
            {children}
          </div>
          {footer && <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { Building2, DollarSign, CalendarCog, Bell, SlidersHorizontal } from "lucide-react";
import AdminSettings from "@/pages/admin/AdminSettings";

/**
 * CONFIGURAÇÕES — navegação lateral por categorias, apenas PARÂMETROS do sistema.
 * Telas operacionais (Documentos, Mensagens, Mapa, lista de Alertas) saíram daqui.
 */
const CATEGORIES = [
  { key: "empresa",   label: "Empresa",            desc: "Dados, redes sociais e site público",        icon: Building2,   render: () => <AdminSettings only={["company", "site"]} /> },
  { key: "comercial", label: "Comercial & Preços", desc: "Frete base, taxas, tabela de rotas, prazos", icon: DollarSign,  render: () => <AdminSettings only={["pricing", "routes"]} /> },
  { key: "operacao",  label: "Operação",           desc: "Área de cobertura e regras de agendamento",   icon: CalendarCog, render: () => <AdminSettings only={["coverage", "scheduling"]} /> },
  { key: "alertas",   label: "Alertas",            desc: "Limiares de vencimento de documentos",        icon: Bell,        render: () => <AdminSettings only={["alerts"]} /> },
];

export default function ConfigPage() {
  const [active, setActive] = useState("empresa");
  const badges = {};
  const current = CATEGORIES.find(c => c.key === active);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
          <SlidersHorizontal className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-xs">Parâmetros do sistema — preços, operação, alertas e dados da empresa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">
        {/* Nav lateral de categorias */}
        <nav className="bg-card border border-border rounded-md p-1.5 lg:sticky lg:top-20 space-y-0.5">
          {CATEGORIES.map(cat => {
            const isActive = active === cat.key;
            const count = cat.badge ? badges[cat.badge] || 0 : 0;
            return (
              <button
                key={cat.key}
                onClick={() => setActive(cat.key)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                  isActive ? "bg-primary/10" : "hover:bg-muted/60"
                }`}
              >
                <cat.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{cat.label}</span>
                    {count > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-muted-foreground leading-tight mt-0.5">{cat.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Conteúdo da categoria */}
        <div className="min-w-0">
          {current?.render()}
        </div>
      </div>
    </div>
  );
}

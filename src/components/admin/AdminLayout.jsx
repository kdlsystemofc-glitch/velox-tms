import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminTopbar from "./AdminTopbar";
import AdminNav from "./AdminNav";
import { getTheme, onThemeChange } from "@/lib/theme";

export default function AdminLayout() {
  const [theme, setTheme] = useState(getTheme());
  const location = useLocation();

  // O escuro fica restrito ao painel admin (esta árvore). Site público e app do
  // motorista não herdam a classe `dark`.
  useEffect(() => onThemeChange(() => setTheme(getTheme())), []);

  return (
    <div className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-background text-foreground`}>
      {/* Navegação no TOPO: barra de topo (logo + busca + ações) + barra de áreas */}
      <AdminTopbar />
      <AdminNav />
      {/* key por rota → leve animação de entrada a cada navegação */}
      <main key={location.pathname} className="px-5 py-5 mx-auto max-w-[1600px] animate-fade-up">
        <Outlet />
      </main>
    </div>
  );
}
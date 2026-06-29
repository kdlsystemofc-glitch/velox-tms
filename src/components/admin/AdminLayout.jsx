import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import { getTheme, onThemeChange } from "@/lib/theme";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(getTheme());
  const location = useLocation();

  // O escuro fica restrito ao painel admin (esta árvore). Site público e app do
  // motorista não herdam a classe `dark`.
  useEffect(() => onThemeChange(() => setTheme(getTheme())), []);

  return (
    <div className={`${theme === "dark" ? "dark" : ""} min-h-screen bg-background text-foreground`}>
      <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div
        className={`transition-all duration-300 ${
          collapsed ? "ml-[64px]" : "ml-56"
        }`}
      >
        <AdminTopbar />
        {/* key por rota → leve animação de entrada a cada navegação */}
        <main key={location.pathname} className="px-5 py-5 max-w-[1600px] animate-fade-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
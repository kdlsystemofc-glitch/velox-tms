import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
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
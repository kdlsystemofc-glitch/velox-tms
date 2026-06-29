import React, { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Truck, Package, LogOut } from "lucide-react";
import { supabase } from "@/api/supabaseClient";

const navItems = [
  { to: "/portal", label: "Meus Pedidos", icon: Package, end: true },
];

export default function PortalLayout() {
  const location = useLocation();
  const [company, setCompany] = useState("");

  useEffect(() => {
    supabase.rpc("my_client_profile").then(({ data }) => setCompany(data?.client_name || ""));
  }, []);

  const isActive = (to, end) => end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/portal" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-gradient rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <span className="font-display text-lg font-extrabold tracking-tight block">VELOX</span>
              <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Portal do Cliente</span>
            </div>
          </Link>
          <nav className="flex items-center gap-1 ml-4">
            {navItems.map(it => (
              <Link key={it.to} to={it.to}
                className={`flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-medium transition-colors ${
                  isActive(it.to, it.end) ? "bg-brand-gradient text-white" : "text-gray-600 hover:bg-gray-100"
                }`}>
                <it.icon className="w-4 h-4" /> {it.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {company && <span className="text-sm text-gray-600 hidden sm:block">{company}</span>}
            <button onClick={() => { supabase.auth.signOut(); window.location.href = "/login"; }}
              title="Sair" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

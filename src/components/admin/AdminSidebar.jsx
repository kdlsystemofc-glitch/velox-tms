import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, CalendarDays, Truck,
  DollarSign, Settings, ChevronLeft, ChevronRight, LogOut, BookUser,
  FolderOpen, MessageSquare
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";

const navItems = [
  { icon: LayoutDashboard, label: "Operações",      path: "/admin",            exact: true },

  { group: "Fluxo" },
  { icon: Package,         label: "Pedidos",        path: "/admin/coletas",    badge: "pendingOrders" },
  { icon: CalendarDays,    label: "Despacho",       path: "/admin/despacho",   badge: "toDispatch" },
  { icon: Truck,           label: "Frota",          path: "/admin/frota" },

  { group: "Cadastros & Gestão" },
  { icon: BookUser,        label: "Cadastros",      path: "/admin/cadastros" },
  { icon: FolderOpen,      label: "Documentos",     path: "/admin/documentos" },
  { icon: MessageSquare,   label: "Mensagens",      path: "/admin/mensagens",  badge: "unreadMessages" },
  { icon: DollarSign,      label: "Financeiro",     path: "/admin/financeiro", adminOnly: true },
  { icon: Settings,        label: "Configurações",  path: "/admin/config",     adminOnly: true },
];

export default function AdminSidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { user } = useAuth();

  const { data: allOrders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 300),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: () => base44.entities.ContactMessage.list("-created_date", 100),
  });

  const badges = {
    pendingOrders: allOrders.filter(o => o.status === "new").length,
    toDispatch: allOrders.filter(o => o.status === "confirmed" && !o.trip_id).length,
    unreadMessages: messages.filter(m => !m.read).length,
  };

  const isActive = (path, exact) => {
    if (exact || path === "/admin") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 ${
        collapsed ? "w-[64px]" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border flex-shrink-0">
        <Link to="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-display text-lg font-extrabold text-white tracking-tight block">VELOX</span>
              <span className="text-[9px] text-sidebar-foreground/50 uppercase tracking-widest -mt-0.5 block">Transportadora</span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {navItems.map((item, i) => {
          if (item.group) {
            if (item.adminOnly && user?.role !== "admin") return null;
            return !collapsed ? (
              <p key={i} className="text-[9px] font-bold text-sidebar-foreground/25 uppercase tracking-[0.15em] px-3 mt-4 mb-1 first:mt-2">
                {item.group}
              </p>
            ) : <div key={i} className="border-t border-sidebar-border/20 mx-2 my-2" />;
          }
          if (item.adminOnly && user?.role !== "admin") return null;
          const count = item.badge ? badges[item.badge] || 0 : 0;
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mx-0.5 ${
                active
                  ? "bg-velox-amber text-white font-bold shadow-sm"
                  : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {count > 0 && !collapsed && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {count > 99 ? "99+" : count}
                </span>
              )}
              {count > 0 && collapsed && (
                <span className="absolute left-7 top-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sidebar" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-0.5 flex-shrink-0">
        {user && !collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-sidebar-foreground/70 truncate">{user.full_name || user.email}</p>
            <p className="text-[10px] text-sidebar-foreground/30 capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={() => { supabase.auth.signOut(); window.location.href = "/login"; }}
          title={collapsed ? "Sair" : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full transition-all"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Recolher"}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4 flex-shrink-0" /> : <><ChevronLeft className="w-4 h-4 flex-shrink-0" /><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  );
}
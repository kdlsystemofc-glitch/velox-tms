import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, CalendarDays, Truck,
  DollarSign, Settings, ChevronLeft, ChevronRight, LogOut, BookUser,
  FolderOpen, MessageSquare, Route as RouteIcon, AlertTriangle, ShieldAlert, BarChart3, ArrowLeftRight, Users, Palette
} from "lucide-react";
import { trucksNeedingReplan, driversNeedingReplan } from "@/utils/replanner";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";

// Navegação por ÁREAS (padrão Open TMS): cada bloco é uma área da operação.
const navItems = [
  { icon: LayoutDashboard, label: "Operações",      path: "/admin",            exact: true },

  { group: "Operação" },
  { icon: Package,         label: "Pedidos",        path: "/admin/coletas",    badge: "pendingOrders" },
  { icon: CalendarDays,    label: "Despacho",       path: "/admin/despacho",   badge: "toDispatch" },
  { icon: AlertTriangle,   label: "Replanejamento", path: "/admin/replanejamento", badge: "replan" },
  { icon: RouteIcon,       label: "Viagens",        path: "/admin/viagens" },
  { icon: ArrowLeftRight,  label: "Transferências", path: "/admin/transferencias" },
  { icon: ShieldAlert,     label: "Ocorrências",    path: "/admin/ocorrencias", badge: "openIncidents" },

  { group: "Frota & Cadastros" },
  { icon: Truck,           label: "Frota",          path: "/admin/frota" },
  { icon: BookUser,        label: "Cadastros",      path: "/admin/cadastros" },
  { icon: FolderOpen,      label: "Documentos",     path: "/admin/documentos" },

  { group: "Comercial" },
  { icon: MessageSquare,   label: "Mensagens",      path: "/admin/mensagens",  badge: "unreadMessages" },

  { group: "Financeiro", adminOnly: true },
  { icon: DollarSign,      label: "Financeiro",     path: "/admin/financeiro", adminOnly: true },
  { icon: BarChart3,       label: "Indicadores",    path: "/admin/indicadores", adminOnly: true },

  { group: "Sistema", adminOnly: true },
  { icon: Users,           label: "Usuários",       path: "/admin/usuarios",   adminOnly: true },
  { icon: Settings,        label: "Configurações",  path: "/admin/config",     adminOnly: true },
  { icon: Palette,         label: "Style Guide",    path: "/admin/style-guide", adminOnly: true },
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

  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: trips = [] } = useQuery({ queryKey: ["trips"], queryFn: () => base44.entities.Trip.list("-created_date", 80) });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents-all"], queryFn: () => base44.entities.Incident.list("-created_date", 300) });

  const badges = {
    pendingOrders: allOrders.filter(o => o.status === "new").length,
    toDispatch: allOrders.filter(o => o.status === "confirmed" && !o.trip_id).length,
    unreadMessages: messages.filter(m => !m.read).length,
    replan: trucksNeedingReplan(trucks, allOrders, trips).length + driversNeedingReplan(drivers, trips).length,
    openIncidents: incidents.filter(i => i.status !== "resolved").length,
  };

  const isActive = (path, exact) => {
    if (exact || path === "/admin") return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 text-sidebar-foreground flex flex-col transition-all duration-300 bg-gradient-to-b from-[#1a2336] via-[#161d2c] to-[#111723] ${
        collapsed ? "w-[64px]" : "w-56"
      }`}
    >
      {/* Faixa de marca no topo */}
      <div className="h-1 bg-brand-gradient flex-shrink-0" />
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border flex-shrink-0">
        <Link to="/admin" className="flex items-center gap-2.5 overflow-hidden group">
          <div className="w-9 h-9 bg-brand-gradient rounded-xl flex items-center justify-center flex-shrink-0 shadow-soft transition-transform group-hover:scale-105">
            <Truck className="w-5 h-5 text-white" />
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
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mx-0.5 ${
                active
                  ? "bg-brand-gradient text-white font-semibold shadow-soft"
                  : "text-sidebar-foreground/60 hover:text-white hover:bg-card/[0.07]"
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-card/90" />}
              <item.icon className={`w-4 h-4 flex-shrink-0 transition-all ${active ? "" : "group-hover:scale-110 group-hover:text-[hsl(var(--sidebar-primary))]"}`} />
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
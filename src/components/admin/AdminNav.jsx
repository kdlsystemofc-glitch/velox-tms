import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, CalendarDays, Truck, DollarSign, Settings, BookUser,
  FolderOpen, MessageSquare, Route as RouteIcon, AlertTriangle, ShieldAlert,
  BarChart3, ArrowLeftRight, Users, ChevronDown, UserCheck, Handshake,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { trucksNeedingReplan, driversNeedingReplan } from "@/utils/replanner";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";

// Navegação por ÁREAS no TOPO (horizontal). Cada área abre um menu com seus módulos.
const AREAS = [
  {
    label: "Operação",
    items: [
      { icon: Package, label: "Pedidos", path: "/admin/coletas", badge: "pendingOrders" },
      { icon: CalendarDays, label: "Despacho", path: "/admin/despacho", badge: "toDispatch" },
      { icon: AlertTriangle, label: "Replanejamento", path: "/admin/replanejamento", badge: "replan" },
      { icon: RouteIcon, label: "Viagens", path: "/admin/viagens" },
      { icon: ArrowLeftRight, label: "Transferências", path: "/admin/transferencias" },
      { icon: ShieldAlert, label: "Ocorrências", path: "/admin/ocorrencias", badge: "openIncidents" },
    ],
  },
  {
    label: "Frota & Cadastros",
    items: [
      { icon: Truck, label: "Frota", path: "/admin/frota" },
      { icon: BookUser, label: "Cadastros", path: "/admin/cadastros" },
      { icon: Handshake, label: "Transportadoras", path: "/admin/transportadoras" },
      { icon: FolderOpen, label: "Documentos", path: "/admin/documentos" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { icon: MessageSquare, label: "Mensagens", path: "/admin/mensagens", badge: "unreadMessages" },
      { icon: UserCheck, label: "Acessos de Cliente", path: "/admin/portal-clientes", adminOnly: true },
      { icon: Handshake, label: "Acessos de Parceiro", path: "/admin/portal-parceiros", adminOnly: true },
    ],
  },
  {
    label: "Financeiro",
    adminOnly: true,
    items: [
      { icon: DollarSign, label: "Financeiro", path: "/admin/financeiro" },
      { icon: BarChart3, label: "Indicadores", path: "/admin/indicadores" },
    ],
  },
  {
    label: "Sistema",
    adminOnly: true,
    items: [
      { icon: Users, label: "Usuários", path: "/admin/usuarios" },
      { icon: Settings, label: "Configurações", path: "/admin/config" },
    ],
  },
];

function Count({ n }) {
  if (!n) return null;
  return (
    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function AdminNav() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: allOrders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => base44.entities.Order.list("-created_date", 300) });
  const { data: messages = [] } = useQuery({ queryKey: ["contact-messages"], queryFn: () => base44.entities.ContactMessage.list("-created_date", 100) });
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

  const dashActive = location.pathname === "/admin";
  // Área que contém a rota atual → seus itens viram a 2ª linha (visíveis, 1 clique).
  const activeArea = AREAS.find(a => (!a.adminOnly || isAdmin) && a.items.some(it => location.pathname.startsWith(it.path)));

  return (
    <>
    <nav className="h-12 border-b border-border bg-card/60 backdrop-blur flex items-center gap-1 px-4 sticky top-16 z-20 overflow-x-auto">
      <Link
        to="/admin"
        className={`flex items-center gap-2 px-3 h-8 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
          dashActive ? "bg-brand-gradient text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <LayoutDashboard className="w-4 h-4" /> Operações
      </Link>

      {AREAS.map((area) => {
        if (area.adminOnly && !isAdmin) return null;
        const items = area.items.filter(it => !it.adminOnly || isAdmin);
        const areaActive = items.some(it => location.pathname.startsWith(it.path));
        const areaCount = items.reduce((s, it) => s + (it.badge ? badges[it.badge] || 0 : 0), 0);
        return (
          <DropdownMenu key={area.label}>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium whitespace-nowrap transition-colors outline-none ${
                  areaActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {area.label}
                {areaCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 inline-flex items-center justify-center px-1">
                    {areaCount > 99 ? "99+" : areaCount}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {items.map((it) => {
                const count = it.badge ? badges[it.badge] || 0 : 0;
                const active = location.pathname.startsWith(it.path);
                return (
                  <DropdownMenuItem key={it.path} asChild>
                    <Link to={it.path} className={`flex items-center gap-2.5 cursor-pointer ${active ? "text-primary font-semibold" : ""}`}>
                      <it.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{it.label}</span>
                      <Count n={count} />
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>

    {/* 2ª linha: itens da área ativa, visíveis (sem precisar abrir dropdown). */}
    {activeArea && (
      <div className="h-10 border-b border-border bg-muted/20 flex items-center gap-1 px-4 sticky top-28 z-10 overflow-x-auto">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60 pr-2 whitespace-nowrap">{activeArea.label}</span>
        {activeArea.items.filter(it => !it.adminOnly || isAdmin).map(it => {
          const count = it.badge ? badges[it.badge] || 0 : 0;
          const active = location.pathname.startsWith(it.path);
          return (
            <Link key={it.path} to={it.path}
              className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-sm whitespace-nowrap transition-colors ${
                active ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}>
              <it.icon className="w-3.5 h-3.5" /> {it.label}
              {count > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 inline-flex items-center justify-center px-1">{count > 99 ? "99+" : count}</span>}
            </Link>
          );
        })}
      </div>
    )}
    </>
  );
}

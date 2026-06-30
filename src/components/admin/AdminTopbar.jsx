import React, { useState, useEffect, useRef } from "react";
import { Bell, Search, AlertCircle, AlertTriangle, Info, X, Package, Users, Truck, User, Sun, Moon, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTheme, toggleTheme } from "@/lib/theme";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Bell / Notifications ──────────────────────────────────────────────────────
function NotificationsDropdown({ onClose }) {
  const queryClient = useQueryClient();
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.list("-created_date", 200),
  });

  const unresolved = alerts.filter(a => !a.resolved);
  const recent = unresolved.slice(0, 5);

  const markAllRead = async () => {
    const unread = unresolved.filter(a => !a.read);
    await Promise.all(unread.map(a => base44.entities.Alert.update(a.id, { read: true })));
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
  };

  const levelIcon = { critical: AlertCircle, warning: AlertTriangle, info: Info };
  const levelColor = { critical: "text-red-500", warning: "text-amber-500", info: "text-blue-500" };

  const refLink = (a) => {
    if (a.reference_type === "driver") return `/admin/motoristas/${a.reference_id}`;
    if (a.reference_type === "truck") return `/admin/frota/${a.reference_id}`;
    if (a.reference_type === "order") return `/admin/coletas/${a.reference_id}`;
    return "#";
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">Notificações</span>
        <div className="flex gap-2">
          {unresolved.some(a => !a.read) && (
            <button onClick={markAllRead} className="text-xs text-velox-amber hover:underline">Marcar todas lidas</button>
          )}
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>
      {recent.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
          Sem alertas ativos
        </div>
      ) : (
        <div>
          {recent.map(alert => {
            const Icon = levelIcon[alert.level] || Info;
            return (
              <Link
                key={alert.id}
                to={refLink(alert)}
                onClick={onClose}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/30 border-b border-border/40 transition-colors ${!alert.read ? "bg-muted/10" : ""}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${levelColor[alert.level]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug font-medium">{alert.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {alert.created_date ? formatDistanceToNow(new Date(alert.created_date), { addSuffix: true, locale: ptBR }) : ""}
                  </p>
                </div>
                {!alert.read && <span className="w-2 h-2 rounded-full bg-velox-amber flex-shrink-0 mt-1" />}
              </Link>
            );
          })}
          <Link to="/admin/alertas" onClick={onClose} className="block text-center text-xs text-velox-amber py-3 hover:underline font-medium">
            Ver todos os alertas →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Global Search ─────────────────────────────────────────────────────────────
function SearchDropdown({ query, onClose }) {
  const navigate = useNavigate();
  const [results, setResults] = useState({ orders: [], clients: [], trucks: [], drivers: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) return;
    setLoading(true);
    const timer = setTimeout(async () => {
      const q = query.toLowerCase();
      const [orders, clients, trucks, drivers] = await Promise.all([
        base44.entities.Order.list("-created_date", 200),
        base44.entities.Client.list(),
        base44.entities.Truck.list(),
        base44.entities.Driver.list(),
      ]);
      setResults({
        orders: orders.filter(o => o.protocol?.toLowerCase().includes(q) || o.client_name?.toLowerCase().includes(q)).slice(0, 4),
        clients: clients.filter(c => c.company_name?.toLowerCase().includes(q)).slice(0, 3),
        trucks: trucks.filter(t => t.plate?.toLowerCase().includes(q)).slice(0, 3),
        drivers: drivers.filter(d => d.name?.toLowerCase().includes(q)).slice(0, 3),
      });
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const statusLabel = { new: "Novo", confirmed: "Confirmado", collecting: "Em Coleta", in_transit: "Em Trânsito", delivered: "Entregue", cancelled: "Cancelado" };
  const truckStatusLabel = { available: "Disponível", on_route: "Em Rota", maintenance: "Manutenção", inactive: "Inativo" };
  const driverStatusLabel = { active: "Ativo", away: "Afastado", terminated: "Desligado" };

  const hasResults = results.orders.length + results.clients.length + results.trucks.length + results.drivers.length > 0;

  const go = (path) => { navigate(path); onClose(); };

  const Group = ({ icon: Icon, label, items, renderItem }) => items.length === 0 ? null : (
    <div>
      <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
        <Icon className="w-3 h-3" /> {label}
      </div>
      {items.map(renderItem)}
    </div>
  );

  return (
    <div className="absolute left-0 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto">
      {loading ? (
        <div className="space-y-2 p-3">
          {[1,2,3].map(i => <div key={i} className="h-9 bg-muted/40 rounded animate-pulse" />)}
        </div>
      ) : !hasResults ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Nenhum resultado para "{query}"</div>
      ) : (
        <div>
          <Group icon={Package} label="Pedidos" items={results.orders} renderItem={o => (
            <button key={o.id} onClick={() => go(`/admin/coletas/${o.id}`)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 text-left">
              <span className="font-mono text-xs font-semibold">{o.protocol}</span>
              <span className="text-xs text-muted-foreground">{o.client_name} · {statusLabel[o.status]}</span>
            </button>
          )} />
          <Group icon={Users} label="Clientes" items={results.clients} renderItem={c => (
            <button key={c.id} onClick={() => go(`/admin/clientes/${c.id}`)} className="w-full flex items-center px-3 py-2.5 hover:bg-muted/30 text-left">
              <span className="text-sm">{c.company_name}</span>
            </button>
          )} />
          <Group icon={Truck} label="Caminhões" items={results.trucks} renderItem={t => (
            <button key={t.id} onClick={() => go(`/admin/frota/${t.id}`)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 text-left">
              <span className="font-mono text-sm">{t.plate}</span>
              <span className="text-xs text-muted-foreground">{t.model} · {truckStatusLabel[t.status]}</span>
            </button>
          )} />
          <Group icon={User} label="Motoristas" items={results.drivers} renderItem={d => (
            <button key={d.id} onClick={() => go(`/admin/motoristas/${d.id}`)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 text-left">
              <span className="text-sm">{d.name}</span>
              <span className="text-xs text-muted-foreground">{driverStatusLabel[d.status]}</span>
            </button>
          )} />
        </div>
      )}
    </div>
  );
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export default function AdminTopbar() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [dark, setDark] = useState(getTheme() === "dark");
  const searchRef = useRef(null);
  const bellRef = useRef(null);

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.list("-created_date", 200),
  });
  const unreadCount = alerts.filter(a => !a.resolved && !a.read).length;

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") { setSearchOpen(false); setBellOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-16 border-b border-border glass flex items-center gap-4 px-5 sticky top-0 z-30">
      {/* Logo (a navegação foi para a barra de baixo) */}
      <Link to="/admin" className="flex items-center gap-2.5 flex-shrink-0 group">
        <div className="w-9 h-9 bg-brand-gradient rounded-xl flex items-center justify-center shadow-soft transition-transform group-hover:scale-105">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div className="hidden md:block leading-none">
          <span className="font-display text-lg font-extrabold tracking-tight block">VELOX</span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-widest block">TMS</span>
        </div>
      </Link>

      {/* Search */}
      <div ref={searchRef} className="relative w-80 hidden sm:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          placeholder="Buscar pedidos, clientes, placas... (Ctrl+K)"
          className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 text-sm"
          value={query}
          onChange={e => { setQuery(e.target.value); setSearchOpen(e.target.value.length >= 3); }}
          onFocus={() => { if (query.length >= 3) setSearchOpen(true); }}
        />
        {searchOpen && query.length >= 3 && (
          <SearchDropdown query={query} onClose={() => { setSearchOpen(false); setQuery(""); }} />
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Tema claro/escuro */}
        <Button variant="ghost" size="icon" title={dark ? "Tema claro" : "Tema escuro"}
          onClick={() => setDark(toggleTheme() === "dark")}>
          {dark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
        </Button>
        {/* Bell */}
        <div ref={bellRef} className="relative">
          <Button variant="ghost" size="icon" className="relative" onClick={() => setBellOpen(o => !o)}>
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {bellOpen && <NotificationsDropdown onClose={() => setBellOpen(false)} />}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="w-8 h-8 bg-brand-gradient rounded-full flex items-center justify-center shadow-soft ring-2 ring-card">
            <span className="text-white text-xs font-bold">{(user?.full_name?.charAt(0) || "A").toUpperCase()}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.full_name || "Admin"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{user?.role || "admin"}</p>
          </div>
        </div>
        {/* Sair */}
        <Button variant="ghost" size="icon" title="Sair"
          onClick={() => { supabase.auth.signOut(); window.location.href = "/login"; }}>
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
}
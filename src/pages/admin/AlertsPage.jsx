import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const levelIcon = { critical: AlertCircle, warning: AlertTriangle, info: Info };
const levelColor = {
  critical: "text-red-500 bg-red-50 border-red-200",
  warning: "text-amber-500 bg-amber-50 border-amber-200",
  info: "text-blue-500 bg-blue-50 border-blue-200",
};
const levelLabel = { critical: "Crítico", warning: "Atenção", info: "Info" };

const refLink = (alert) => {
  if (alert.reference_type === "driver") return `/admin/motoristas/${alert.reference_id}`;
  if (alert.reference_type === "truck") return `/admin/frota/${alert.reference_id}`;
  if (alert.reference_type === "order") return `/admin/coletas/${alert.reference_id}`;
  return "#";
};

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.list("-created_date", 200),
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => base44.entities.Alert.update(id, { resolved: true, read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Alert.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const active = alerts.filter(a => !a.resolved);
  const filtered = active.filter(a => {
    if (filterLevel !== "all" && a.level !== filterLevel) return false;
    if (filterType !== "all" && a.reference_type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Alertas</h1>
          <p className="text-muted-foreground text-sm mt-1">{active.length} alerta{active.length !== 1 ? "s" : ""} ativo{active.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="warning">Atenção</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="driver">Motoristas</SelectItem>
            <SelectItem value="truck">Caminhões</SelectItem>
            <SelectItem value="order">Pedidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-muted/40 rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Nenhum alerta ativo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(alert => {
                const Icon = levelIcon[alert.level] || Info;
                const colorClass = levelColor[alert.level] || levelColor.info;
                return (
                  <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${colorClass} ${!alert.read ? "opacity-100" : "opacity-70"}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-white/70">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs opacity-70">
                          {alert.created_date ? formatDistanceToNow(new Date(alert.created_date), { addSuffix: true, locale: ptBR }) : "—"}
                        </span>
                        <span className="text-xs font-semibold px-1.5 py-0.5 bg-white/50 rounded">{levelLabel[alert.level]}</span>
                        {!alert.read && <span className="text-xs font-bold">● Não lido</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link to={refLink(alert)} className="text-xs underline hover:opacity-70">Ver</Link>
                      {!alert.read && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => markReadMutation.mutate(alert.id)}>
                          Lido
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 gap-1" onClick={() => resolveMutation.mutate(alert.id)}>
                        <CheckCircle2 className="w-3 h-3" /> Resolver
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
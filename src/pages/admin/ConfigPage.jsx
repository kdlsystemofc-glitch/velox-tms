import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Bell, FolderOpen, MapPin } from "lucide-react";
import AdminSettings from "@/pages/admin/AdminSettings";
import AlertsPage from "@/pages/admin/AlertsPage";
import Documents from "@/pages/admin/Documents";
import MapPage from "@/pages/admin/MapPage";

export default function ConfigPage() {
  const [tab, setTab] = useState("empresa");

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => base44.entities.Alert.list("-created_date", 100),
    select: (d) => d.filter(a => !a.resolved),
  });
  const alertCount = alerts.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-foreground">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Empresa, alertas, documentos e mapa operacional</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 p-1 rounded-xl flex-wrap gap-1">
          <TabsTrigger value="empresa" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Building2 className="w-3.5 h-3.5" /> Empresa
          </TabsTrigger>
          <TabsTrigger value="alertas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Bell className="w-3.5 h-3.5" /> Alertas
            {alertCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documentos" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <FolderOpen className="w-3.5 h-3.5" /> Documentos
          </TabsTrigger>
          <TabsTrigger value="mapa" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <MapPin className="w-3.5 h-3.5" /> Mapa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-4"><AdminSettings /></TabsContent>
        <TabsContent value="alertas" className="mt-4"><AlertsPage /></TabsContent>
        <TabsContent value="documentos" className="mt-4"><Documents /></TabsContent>
        <TabsContent value="mapa" className="mt-4"><MapPage /></TabsContent>
      </Tabs>
    </div>
  );
}
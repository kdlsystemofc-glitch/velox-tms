import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Users, Boxes } from "lucide-react";
import Fleet from "@/pages/admin/Fleet";
import Drivers from "@/pages/admin/Drivers";
import LoadingSimulator from "@/pages/admin/LoadingSimulator";
import PageHeader, { segmentedTabsClass, segmentedTriggerClass } from "@/components/shared/PageHeader";

function Kpi({ label, value, tone = "" }) {
  return (
    <Card><CardContent className="p-3.5"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`text-xl font-bold ${tone}`}>{value}</p></CardContent></Card>
  );
}

const within = (d, days = 60) => d && differenceInDays(parseISO(d), new Date()) <= days;

export default function FrotaPage() {
  const [tab, setTab] = useState("carretas");
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: drivers = [] } = useQuery({ queryKey: ["drivers"], queryFn: () => base44.entities.Driver.list() });

  const docsVencendo =
    trucks.filter(t => within(t.crlv_expiry) || within(t.insurance_expiry) || within(t.tachograph_next)).length +
    drivers.filter(d => within(d.cnh_expiry) || within(d.exam_aso_expiry) || within(d.exam_toxic_expiry)).length;

  return (
    <div className="space-y-4">
      <PageHeader icon={Truck} title="Frota" subtitle="Carretas, motoristas e simulação de carregamento" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Disponíveis" value={trucks.filter(t => t.status === "available").length} tone="text-green-600" />
        <Kpi label="Em rota" value={trucks.filter(t => t.status === "on_route").length} tone="text-amber-600" />
        <Kpi label="Manutenção" value={trucks.filter(t => t.status === "maintenance").length} tone="text-red-600" />
        <Kpi label="Motoristas ativos" value={drivers.filter(d => d.status === "active").length} />
        <Kpi label="Documentos vencendo" value={docsVencendo} tone={docsVencendo > 0 ? "text-red-600" : "text-green-600"} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={segmentedTabsClass}>
          <TabsTrigger value="carretas" className={segmentedTriggerClass}><Truck className="w-3.5 h-3.5" /> Carretas</TabsTrigger>
          <TabsTrigger value="motoristas" className={segmentedTriggerClass}><Users className="w-3.5 h-3.5" /> Motoristas</TabsTrigger>
          <TabsTrigger value="simulador" className={segmentedTriggerClass}><Boxes className="w-3.5 h-3.5" /> Simulador</TabsTrigger>
        </TabsList>

        <TabsContent value="carretas" className="mt-4"><Fleet hideTitle /></TabsContent>
        <TabsContent value="motoristas" className="mt-4"><Drivers hideTitle /></TabsContent>
        <TabsContent value="simulador" className="mt-4"><LoadingSimulator /></TabsContent>
      </Tabs>
    </div>
  );
}
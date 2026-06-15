import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Users, Boxes } from "lucide-react";
import Fleet from "@/pages/admin/Fleet";
import Drivers from "@/pages/admin/Drivers";
import LoadingSimulator from "@/pages/admin/LoadingSimulator";
import PageHeader, { segmentedTabsClass, segmentedTriggerClass } from "@/components/shared/PageHeader";

export default function FrotaPage() {
  const [tab, setTab] = useState("carretas");

  return (
    <div className="space-y-4">
      <PageHeader icon={Truck} title="Frota" subtitle="Carretas, motoristas e simulação de carregamento" />

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
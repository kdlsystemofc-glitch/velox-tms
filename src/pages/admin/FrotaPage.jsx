import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Users, Boxes } from "lucide-react";
import Fleet from "@/pages/admin/Fleet";
import Drivers from "@/pages/admin/Drivers";
import LoadingSimulator from "@/pages/admin/LoadingSimulator";

export default function FrotaPage() {
  const [tab, setTab] = useState("carretas");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-foreground">Frota</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie suas carretas, motoristas e simule carregamentos</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="carretas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Truck className="w-3.5 h-3.5" /> Carretas
          </TabsTrigger>
          <TabsTrigger value="motoristas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Users className="w-3.5 h-3.5" /> Motoristas
          </TabsTrigger>
          <TabsTrigger value="simulador" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Boxes className="w-3.5 h-3.5" /> Simulador
          </TabsTrigger>
        </TabsList>

        <TabsContent value="carretas" className="mt-4">
          <Fleet />
        </TabsContent>
        <TabsContent value="motoristas" className="mt-4">
          <Drivers />
        </TabsContent>
        <TabsContent value="simulador" className="mt-4">
          <LoadingSimulator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
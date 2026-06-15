import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Package, BookUser } from "lucide-react";
import Clients from "@/pages/admin/Clients";
import Suppliers from "@/pages/admin/Suppliers";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader, { segmentedTabsClass, segmentedTriggerClass } from "@/components/shared/PageHeader";

export default function CadastrosPage() {
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get("aba") === "fornecedores" ? "fornecedores" : "clientes";
  const [tab, setTab] = useState(initialTab);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date"),
  });

  return (
    <div className="space-y-4">
      <PageHeader icon={BookUser} title="Cadastros" subtitle="Clientes e fornecedores da empresa" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={segmentedTabsClass}>
          <TabsTrigger value="clientes" className={segmentedTriggerClass}>
            <Building2 className="w-3.5 h-3.5" /> Clientes
            {clients.length > 0 && <span className="bg-background text-muted-foreground text-[10px] font-bold rounded px-1.5 py-0.5 ml-1">{clients.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className={segmentedTriggerClass}>
            <Package className="w-3.5 h-3.5" /> Fornecedores
            {suppliers.length > 0 && <span className="bg-background text-muted-foreground text-[10px] font-bold rounded px-1.5 py-0.5 ml-1">{suppliers.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <Clients hideTitle />
        </TabsContent>
        <TabsContent value="fornecedores" className="mt-4">
          <Suppliers hideTitle />
        </TabsContent>
      </Tabs>
    </div>
  );
}
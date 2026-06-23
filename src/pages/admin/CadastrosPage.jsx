import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Package, BookUser, MapPin, Warehouse } from "lucide-react";
import Clients from "@/pages/admin/Clients";
import Suppliers from "@/pages/admin/Suppliers";
import Recipients from "@/pages/admin/Recipients";
import Branches from "@/pages/admin/Branches";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader, { segmentedTabsClass, segmentedTriggerClass } from "@/components/shared/PageHeader";

function Kpi({ label, value, tone = "" }) {
  return <Card><CardContent className="p-3.5"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`text-xl font-bold ${tone}`}>{value}</p></CardContent></Card>;
}

export default function CadastrosPage() {
  const params = new URLSearchParams(window.location.search);
  const abaParam = params.get("aba");
  const initialTab = abaParam === "fornecedores" ? "fornecedores" : abaParam === "destinatarios" ? "destinatarios" : abaParam === "filiais" ? "filiais" : "clientes";
  const [tab, setTab] = useState(initialTab);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date"),
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date"),
  });
  const { data: recipients = [] } = useQuery({
    queryKey: ["recipients"],
    queryFn: () => base44.entities.Recipient.list("-created_date"),
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => base44.entities.Branch.list("-created_date"),
  });

  return (
    <div className="space-y-4">
      <PageHeader icon={BookUser} title="Cadastros" subtitle="Clientes, destinatários, fornecedores e filiais" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Clientes ativos" value={clients.filter(c => c.status !== "inactive").length} tone="text-green-600" />
        <Kpi label="Destinatários" value={recipients.length} />
        <Kpi label="Fornecedores" value={suppliers.length} />
        <Kpi label="Filiais & CDs" value={branches.length} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={segmentedTabsClass}>
          <TabsTrigger value="clientes" className={segmentedTriggerClass}>
            <Building2 className="w-3.5 h-3.5" /> Clientes
            {clients.length > 0 && <span className="bg-background text-muted-foreground text-[10px] font-bold rounded px-1.5 py-0.5 ml-1">{clients.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="destinatarios" className={segmentedTriggerClass}>
            <MapPin className="w-3.5 h-3.5" /> Destinatários
            {recipients.length > 0 && <span className="bg-background text-muted-foreground text-[10px] font-bold rounded px-1.5 py-0.5 ml-1">{recipients.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className={segmentedTriggerClass}>
            <Package className="w-3.5 h-3.5" /> Fornecedores
            {suppliers.length > 0 && <span className="bg-background text-muted-foreground text-[10px] font-bold rounded px-1.5 py-0.5 ml-1">{suppliers.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="filiais" className={segmentedTriggerClass}>
            <Warehouse className="w-3.5 h-3.5" /> Filiais & CDs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <Clients hideTitle />
        </TabsContent>
        <TabsContent value="destinatarios" className="mt-4">
          <Recipients hideTitle />
        </TabsContent>
        <TabsContent value="fornecedores" className="mt-4">
          <Suppliers hideTitle />
        </TabsContent>
        <TabsContent value="filiais" className="mt-4">
          <Branches hideTitle />
        </TabsContent>
      </Tabs>
    </div>
  );
}
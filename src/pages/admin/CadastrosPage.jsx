import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Package } from "lucide-react";
import Clients from "@/pages/admin/Clients";
import Suppliers from "@/pages/admin/Suppliers";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

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
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-foreground">Cadastros</h1>
        <p className="text-muted-foreground text-sm mt-1">Clientes e fornecedores da empresa</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 p-1 rounded-xl gap-1">
          <TabsTrigger value="clientes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Building2 className="w-3.5 h-3.5" /> Clientes
            {clients.length > 0 && (
              <span className="bg-muted text-muted-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-1">
                {clients.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Package className="w-3.5 h-3.5" /> Fornecedores
            {suppliers.length > 0 && (
              <span className="bg-muted text-muted-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-1">
                {suppliers.length}
              </span>
            )}
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
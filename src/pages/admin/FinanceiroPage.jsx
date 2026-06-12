import React from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, FileText, Activity } from "lucide-react";
import Financial from "@/pages/admin/Financial";
import Revenues from "@/pages/admin/Revenues";
import Expenses from "@/pages/admin/Expenses";
import DRE from "@/pages/admin/DRE";
import CashFlow from "@/pages/admin/CashFlow";

export default function FinanceiroPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("aba") || "resumo";
  const setTab = (t) => setSearchParams({ aba: t });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe receitas, despesas e o resultado da empresa</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50 p-1 rounded-xl flex-wrap gap-1">
          <TabsTrigger value="resumo" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="receitas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Receitas
          </TabsTrigger>
          <TabsTrigger value="despesas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <TrendingDown className="w-3.5 h-3.5" /> Despesas
          </TabsTrigger>
          <TabsTrigger value="dre" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <FileText className="w-3.5 h-3.5" /> DRE
          </TabsTrigger>
          <TabsTrigger value="fluxo" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Activity className="w-3.5 h-3.5" /> Fluxo de Caixa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4"><Financial /></TabsContent>
        <TabsContent value="receitas" className="mt-4"><Revenues /></TabsContent>
        <TabsContent value="despesas" className="mt-4"><Expenses /></TabsContent>
        <TabsContent value="dre" className="mt-4"><DRE /></TabsContent>
        <TabsContent value="fluxo" className="mt-4"><CashFlow /></TabsContent>
      </Tabs>
    </div>
  );
}
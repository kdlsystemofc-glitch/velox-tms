import React from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, FileText, Activity, DollarSign } from "lucide-react";
import Financial from "@/pages/admin/Financial";
import Revenues from "@/pages/admin/Revenues";
import Expenses from "@/pages/admin/Expenses";
import DRE from "@/pages/admin/DRE";
import CashFlow from "@/pages/admin/CashFlow";
import PageHeader, { segmentedTabsClass, segmentedTriggerClass } from "@/components/shared/PageHeader";

export default function FinanceiroPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("aba") || "resumo";
  const setTab = (t) => setSearchParams({ aba: t });

  return (
    <div className="space-y-4">
      <PageHeader icon={DollarSign} title="Financeiro" subtitle="Receitas, despesas, DRE e fluxo de caixa" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className={segmentedTabsClass}>
          <TabsTrigger value="resumo" className={segmentedTriggerClass}><BarChart3 className="w-3.5 h-3.5" /> Resumo</TabsTrigger>
          <TabsTrigger value="receitas" className={segmentedTriggerClass}><TrendingUp className="w-3.5 h-3.5" /> Receitas</TabsTrigger>
          <TabsTrigger value="despesas" className={segmentedTriggerClass}><TrendingDown className="w-3.5 h-3.5" /> Despesas</TabsTrigger>
          <TabsTrigger value="dre" className={segmentedTriggerClass}><FileText className="w-3.5 h-3.5" /> DRE</TabsTrigger>
          <TabsTrigger value="fluxo" className={segmentedTriggerClass}><Activity className="w-3.5 h-3.5" /> Fluxo de Caixa</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4"><Financial hideTitle /></TabsContent>
        <TabsContent value="receitas" className="mt-4"><Revenues hideTitle /></TabsContent>
        <TabsContent value="despesas" className="mt-4"><Expenses hideTitle /></TabsContent>
        <TabsContent value="dre" className="mt-4"><DRE hideTitle /></TabsContent>
        <TabsContent value="fluxo" className="mt-4"><CashFlow hideTitle /></TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { NumericInput } from "@/components/shared/NumericInput";
import { FreightBreakdown } from "@/components/shared/FreightBreakdown";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { calculateFreightFull, getDeliveryDaysByState } from "@/utils/freightCalculator";
import { Calculator, ArrowRight } from "lucide-react";

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function Cotacao() {
  const navigate = useNavigate();
  const { settings } = useCompanySettings();
  const [f, setF] = useState({
    originState: settings?.region || "", destState: "", destCity: "", destCep: "",
    weight_kg: "", volumes: "1", height_cm: "", width_cm: "", length_cm: "", declared_value: "",
    nfCount: "1", freight_type: "shared",
  });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const num = (v) => parseFloat(String(v).replace(",", ".")) || 0;

  const breakdown = useMemo(() => {
    if (!num(f.weight_kg)) return null;
    return calculateFreightFull({
      items: [{
        weight_kg: num(f.weight_kg), volumes: parseInt(f.volumes) || 1,
        height_cm: num(f.height_cm), width_cm: num(f.width_cm), length_cm: num(f.length_cm),
        declared_value: num(f.declared_value),
      }],
      nfCount: parseInt(f.nfCount) || 1, pricing: settings?.pricing, settings,
      originState: f.originState || null, destState: f.destState || null, freightType: f.freight_type,
    });
  }, [f, settings]);

  const prazo = f.destState ? getDeliveryDaysByState(f.destState, settings, f.originState) : null;

  const toOrder = () => {
    navigate("/admin/coletas/nova", { state: { fromQuote: {
      freight_type: f.freight_type,
      freight_value: breakdown?.total,
      origin: { state: f.originState },
      recipient: { state: f.destState, city: f.destCity, cep: f.destCep },
      item: { weight_kg: f.weight_kg, height_cm: f.height_cm, width_cm: f.width_cm, length_cm: f.length_cm, volumes: parseInt(f.volumes) || 1, declared_value: f.declared_value },
    } } });
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <PageHeader icon={Calculator} title="Cotação" subtitle="Simule o frete e converta em pedido com um clique" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs text-muted-foreground">UF origem</label>
                <Select value={f.originState} onValueChange={v => set("originState", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">UF destino</label>
                <Select value={f.destState} onValueChange={v => set("destState", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground">Cidade destino</label>
                <Input className="h-9 text-sm" value={f.destCity} onChange={e => set("destCity", e.target.value)} placeholder="opcional" /></div>
              <div><label className="text-xs text-muted-foreground">CEP destino</label>
                <Input className="h-9 text-sm" value={f.destCep} onChange={e => set("destCep", e.target.value)} placeholder="opcional" /></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><label className="text-xs text-muted-foreground">Peso (kg) *</label>
                <NumericInput value={f.weight_kg} onChange={v => set("weight_kg", v)} placeholder="ex: 1.200" /></div>
              <div><label className="text-xs text-muted-foreground">Volumes</label>
                <NumericInput integer value={f.volumes} onChange={v => set("volumes", v)} /></div>
              <div><label className="text-xs text-muted-foreground">Valor declarado</label>
                <NumericInput currency value={f.declared_value} onChange={v => set("declared_value", v)} placeholder="R$" /></div>
              <div><label className="text-xs text-muted-foreground">Nº de NFs</label>
                <NumericInput integer value={f.nfCount} onChange={v => set("nfCount", v)} /></div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Dimensões (cm) — opcional, para cubagem</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <NumericInput value={f.height_cm} onChange={v => set("height_cm", v)} placeholder="Alt." />
                <NumericInput value={f.width_cm} onChange={v => set("width_cm", v)} placeholder="Larg." />
                <NumericInput value={f.length_cm} onChange={v => set("length_cm", v)} placeholder="Comp." />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Tipo de frete</label>
              <Select value={f.freight_type} onValueChange={v => set("freight_type", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Fracionado</SelectItem>
                  <SelectItem value="dedicated">Dedicado</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-3">
            <h3 className="font-heading font-semibold text-sm">Resultado</h3>
            {!breakdown ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Informe ao menos o peso para calcular.</p>
            ) : (
              <>
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">Frete estimado</p>
                  <p className="text-3xl font-bold font-mono text-velox-amber">R$ {breakdown.total.toFixed(2)}</p>
                  {breakdown.usedCubic && <p className="text-[11px] text-amber-600">cobrado pelo peso cubado ({breakdown.taxableKg.toFixed(0)} kg)</p>}
                  {prazo && <p className="text-xs text-blue-600 mt-1">Prazo: {prazo} dia(s) úteis</p>}
                </div>
                <FreightBreakdown breakdown={breakdown} compact />
                <Button className="w-full bg-velox-amber hover:bg-velox-amber/90 text-white font-bold gap-2" onClick={toOrder}>
                  Criar pedido com esta cotação <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

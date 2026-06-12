import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Plus, RotateCcw, AlertTriangle } from "lucide-react";

const TRUCK_L = 13.6;
const TRUCK_W = 2.4;
const TRUCK_H = 2.7;
const SCALE = 28;

const PKG_COLORS = {
  caixa:     "#3B82F6",
  palete:    "#8B5CF6",
  tambor:    "#F59E0B",
  bobina:    "#10B981",
  fardo:     "#EF4444",
  saco:      "#6366F1",
  outro:     "#64748B",
};

function TruckVisualization({ items, truckL, truckW, truckH, view, scale }) {
  const W = view === "front" ? Math.round(truckW * scale) : Math.round(truckL * scale);
  const H = view === "top"   ? Math.round(truckW * scale) : Math.round(truckH * scale);

  let xOffset = 0;
  let yBase = H;
  const rendered = [];

  for (const item of items) {
    const vols = item.volumes || 1;
    const il = ((item.length_cm || 60) / 100) * scale;
    const ih = ((item.height_cm || 40) / 100) * scale;

    for (let v = 0; v < Math.min(vols, 20); v++) {
      const x = xOffset % W;
      const y = yBase - ih;
      rendered.push({ x, y: Math.max(0, y), w: Math.min(il, W - x), h: ih, color: item.color || "#64748B", key: `${item.orderId}-${v}` });
      xOffset += il;
      if (xOffset >= W) { xOffset = 0; yBase -= ih; if (yBase < 0) break; }
    }
  }

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="border-2 border-slate-300 rounded bg-slate-50" style={{ display: "block", maxWidth: "100%" }}>
        <rect x={0} y={H - 4} width={W} height={4} fill="#94A3B8" />
        {rendered.map(item => (
          <rect key={item.key} x={item.x + 1} y={item.y} width={Math.max(item.w - 2, 2)} height={Math.max(item.h - 1, 2)} fill={item.color} fillOpacity={0.8} stroke={item.color} strokeWidth={1} rx={2} />
        ))}
        <rect x={1} y={1} width={W - 2} height={H - 2} fill="none" stroke="#475569" strokeWidth={2} rx={4} />
        <text x={8} y={16} fontSize={10} fill="#94A3B8">
          {view === "side" ? `${truckL}m × ${truckH}m` : view === "top" ? `${truckL}m × ${truckW}m` : `${truckW}m × ${truckH}m`}
        </text>
        {rendered.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={13} fill="#94A3B8">
            Baú vazio — adicione pedidos →
          </text>
        )}
      </svg>
    </div>
  );
}

export default function LoadingSimulator() {
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => base44.entities.Truck.list() });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => base44.entities.Order.list("-created_date", 100),
    select: d => d.filter(o => o.status === "confirmed" || o.status === "new"),
  });

  const [selectedTruck, setSelectedTruck] = useState(null);
  const [loadedItems, setLoadedItems] = useState([]);
  const [view, setView] = useState("side");

  const truck = trucks.find(t => t.id === selectedTruck) || trucks[0];
  const truckL = truck?.dimensions?.length_m || TRUCK_L;
  const truckW = truck?.dimensions?.width_m  || TRUCK_W;
  const truckH = truck?.dimensions?.height_m || TRUCK_H;
  const truckCapKg = truck?.capacity_kg || 27000;

  const totalKg  = loadedItems.reduce((s, i) => s + (i.weight_kg || 0), 0);
  const totalVol = loadedItems.reduce((s, i) => s + (i.volumes || 0), 0);
  const weightPct = Math.min((totalKg / truckCapKg) * 100, 100);
  const isOverweight = totalKg > truckCapKg;
  const barColor = weightPct > 90 ? "bg-red-500" : weightPct > 70 ? "bg-amber-500" : "bg-green-500";

  const addOrder = (order) => {
    const items = order.recipients?.flatMap(r =>
      r.items?.map(item => ({
        ...item,
        orderId: order.id,
        protocol: order.protocol,
        color: PKG_COLORS[item.package_type || "caixa"] || "#64748B",
      })) || []
    ) || [];
    setLoadedItems(prev => [...prev, ...items]);
  };

  const removeOrder = (orderId) => setLoadedItems(prev => prev.filter(i => i.orderId !== orderId));
  const reset = () => setLoadedItems([]);

  const addedOrderIds = new Set(loadedItems.map(i => i.orderId));
  const availableOrders = orders.filter(o => !addedOrderIds.has(o.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-velox-amber" /> Simulador de Carregamento
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visualize como os pedidos preenchem o baú da carreta</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={selectedTruck || ""} onChange={e => { setSelectedTruck(e.target.value); reset(); }}>
            {trucks.map(t => <option key={t.id} value={t.id}>{t.plate} — {t.model} ({(t.capacity_kg||0).toLocaleString("pt-BR")} kg)</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" /> Limpar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <p className="text-2xl font-bold font-mono">{totalKg.toLocaleString("pt-BR")} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
                  <p className="text-xs text-muted-foreground">Peso carregado</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-mono">{totalVol} <span className="text-sm font-normal text-muted-foreground">vol</span></p>
                  <p className="text-xs text-muted-foreground">Volumes</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold font-mono ${isOverweight ? "text-red-500" : ""}`}>{weightPct.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">%</span></p>
                  <p className="text-xs text-muted-foreground">Capacidade usada</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Peso: {totalKg.toLocaleString("pt-BR")} / {truckCapKg.toLocaleString("pt-BR")} kg</span>
                  <span>{weightPct.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${weightPct}%` }} />
                </div>
              </div>
              {isOverweight && (
                <div className="mt-2 flex items-center gap-2 text-red-600 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" /> Peso excedido! Excesso: {(totalKg - truckCapKg).toLocaleString("pt-BR")} kg
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Visualização do Baú</CardTitle>
                <div className="flex gap-1">
                  {["side", "top", "front"].map(v => (
                    <button key={v} onClick={() => setView(v)} className={`px-2 py-1 text-xs rounded ${view === v ? "bg-velox-amber text-velox-dark font-semibold" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      {v === "side" ? "Lateral" : v === "top" ? "Topo" : "Frontal"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TruckVisualization items={loadedItems} truckL={truckL} truckW={truckW} truckH={truckH} view={view} scale={SCALE} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {loadedItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">No Caminhão ({[...new Set(loadedItems.map(i => i.orderId))].length} pedidos)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...new Set(loadedItems.map(i => i.orderId))].map(orderId => {
                  const oi = loadedItems.filter(i => i.orderId === orderId);
                  const kg = oi.reduce((s, i) => s + (i.weight_kg || 0), 0);
                  return (
                    <div key={orderId} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{oi[0]?.protocol || orderId}</p>
                        <p className="text-sm font-medium">{kg.toLocaleString("pt-BR")} kg · {oi.reduce((s,i)=>s+(i.volumes||0),0)} vol</p>
                      </div>
                      <button onClick={() => removeOrder(orderId)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded">Remover</button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido disponível</p>
              ) : availableOrders.map(order => {
                const kg = order.total_weight_kg || 0;
                const wouldExceed = (totalKg + kg) > truckCapKg;
                return (
                  <div key={order.id} className={`p-3 border rounded-lg ${wouldExceed ? "border-red-200 bg-red-50/30" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[11px] text-muted-foreground">{order.protocol}</p>
                        <p className="text-sm font-medium truncate">{order.client_name}</p>
                        <p className="text-xs text-muted-foreground">{kg.toLocaleString("pt-BR")} kg · {order.total_volumes || "?"} vol</p>
                        {wouldExceed && <p className="text-xs text-red-500 mt-0.5">⚠ Excede em {((totalKg + kg) - truckCapKg).toLocaleString("pt-BR")} kg</p>}
                      </div>
                      <Button size="sm" variant={wouldExceed ? "outline" : "default"} className={wouldExceed ? "border-red-300 text-red-500 hover:bg-red-50" : "bg-velox-amber text-velox-dark hover:bg-velox-amber/90"} onClick={() => addOrder(order)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import React, { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/repositories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Truck, Plus, RotateCcw, AlertTriangle, Box, Scale, ShieldAlert, FileDown } from "lucide-react";
import { packLoad } from "@/utils/loadPacker";
import { downloadCsv } from "@/utils/exportCsv";

// three.js é pesado → carrega só quando o baú 3D aparece.
const Truck3D = lazy(() => import("@/components/admin/Truck3D"));
import { itemVolumeM3, truckVolumeM3, fmtM3 } from "@/utils/cargoVolume";

// Baú padrão (carreta) quando o veículo não tem dimensões cadastradas.
const DEF_L = 13.6, DEF_W = 2.4, DEF_H = 2.7;

// Cor distinta por PEDIDO (não por tipo) — facilita ler a separação no 3D.
const ORDER_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#6366F1", "#EC4899", "#14B8A6", "#F97316", "#0EA5E9"];

function Bar({ label, used, total, unit, pct, warn }) {
  const color = warn ? "bg-red-500" : pct > 90 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono ${warn ? "text-red-600 dark:text-red-300 font-semibold" : "text-muted-foreground"}`}>{used} / {total} {unit} · {pct.toFixed(0)}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

export default function LoadingSimulator() {
  const { data: trucks = [] } = useQuery({ queryKey: ["trucks"], queryFn: () => db.Truck.list() });
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => db.Order.list("-created_date", 100),
    select: d => d.filter(o => o.status === "confirmed" || o.status === "new"),
  });

  const [selectedTruck, setSelectedTruck] = useState(null);
  const [loadedItems, setLoadedItems] = useState([]);

  const truck = trucks.find(t => t.id === selectedTruck) || trucks[0];
  const truckL = Number(truck?.dimensions?.length_m) || DEF_L;
  const truckW = Number(truck?.dimensions?.width_m) || DEF_W;
  const truckH = Number(truck?.dimensions?.height_m) || DEF_H;
  const truckCapKg = Number(truck?.capacity_kg) || 27000;
  const truckVol = truckVolumeM3(truck) || (truckL * truckW * truckH);

  // Pesos e volumes.
  const totalKg = loadedItems.reduce((s, i) => s + (i.weight_kg || 0), 0);
  const totalVolM3 = loadedItems.reduce((s, i) => s + itemVolumeM3(i), 0);
  const weightPct = truckCapKg > 0 ? (totalKg / truckCapKg) * 100 : 0;
  const volPct = truckVol > 0 ? (totalVolM3 / truckVol) * 100 : 0;
  const isOverweight = totalKg > truckCapKg;
  const isOvervolume = totalVolM3 > truckVol;

  // Cor por pedido + empacotamento 3D.
  const orderIds = [...new Set(loadedItems.map(i => i.orderId))];
  const colorOf = (orderId) => ORDER_COLORS[orderIds.indexOf(orderId) % ORDER_COLORS.length];
  const itemsForPack = loadedItems.map(i => ({ ...i, color: colorOf(i.orderId) }));
  const pack = packLoad({ length_m: truckL, width_m: truckW, height_m: truckH }, itemsForPack);

  // ── Inteligência de carga (Fr-3) ──
  // Centro de gravidade longitudinal (% do comprimento, a partir da frente/cabine).
  const cgWeight = pack.boxes.reduce((s, b) => s + (b.kg || 0), 0);
  const cg = cgWeight > 0 ? pack.boxes.reduce((s, b) => s + (b.kg || 0) * (b.x + b.l / 2), 0) / cgWeight / truckL : null;
  const cgImbalance = cg != null && (cg < 0.35 || cg > 0.65); // ideal: centrado (eixo)
  // Zona do baú onde cada pedido ficou (frente/meio/fundo).
  const zoneOf = (orderId) => {
    const bs = pack.boxes.filter(b => b.orderId === orderId);
    if (!bs.length) return "—";
    const avg = bs.reduce((s, b) => s + (b.x + b.l / 2), 0) / bs.length / truckL;
    return avg < 0.34 ? "Frente" : avg > 0.66 ? "Fundo" : "Meio";
  };
  // Restrições a partir das flags dos itens.
  const hasFragile = loadedItems.some(i => i.fragile);
  const hasDangerous = loadedItems.some(i => i.dangerous);

  // Plano de carga (LIFO: primeira entrega = última a carregar) → CSV.
  const exportLoadPlan = () => {
    const rows = orderIds.map((oid, idx) => {
      const oi = loadedItems.filter(i => i.orderId === oid);
      return {
        seq: idx + 1,
        protocol: oi[0]?.protocol || oid,
        volumes: oi.reduce((s, i) => s + (i.volumes || 0), 0),
        kg: oi.reduce((s, i) => s + (i.weight_kg || 0), 0),
        m3: oi.reduce((s, i) => s + itemVolumeM3(i), 0).toFixed(2).replace(".", ","),
        zona: zoneOf(oid),
      };
    });
    downloadCsv(`plano-carga-${truck?.plate || "carreta"}`, rows, [
      { key: "seq", label: "Ordem de carregamento" },
      { key: "protocol", label: "Pedido" },
      { key: "volumes", label: "Volumes" },
      { key: "kg", label: "Peso (kg)" },
      { key: "m3", label: "Volume (m³)" },
      { key: "zona", label: "Zona do baú" },
    ]);
  };

  const addOrder = (order) => {
    const items = (order.recipients || []).flatMap(r =>
      (r.items || []).map(item => ({
        ...item,
        orderId: order.id,
        protocol: order.protocol,
      }))
    );
    // Sem dimensões nos itens? cria 1 caixa estimada com o peso total do pedido.
    if (items.length === 0 || items.every(i => !i.length_cm && !i.width_cm && !i.height_cm)) {
      items.length = 0;
      items.push({ orderId: order.id, protocol: order.protocol, volumes: order.total_volumes || 1, weight_kg: order.total_weight_kg || 0, length_cm: 80, width_cm: 60, height_cm: 60 });
    }
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
            <Truck className="w-6 h-6 text-velox-amber" /> Simulador de Carregamento 3D
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Veja como os pedidos preenchem o baú — em peso e em espaço. Arraste para girar, role para dar zoom.</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={truck?.id || ""} onChange={e => { setSelectedTruck(e.target.value); reset(); }}>
            {trucks.length === 0 && <option value="">Nenhuma carreta cadastrada</option>}
            {trucks.map(t => <option key={t.id} value={t.id}>{t.plate} — {t.model} ({(t.capacity_kg || 0).toLocaleString("pt-BR")} kg)</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="w-4 h-4 mr-1" /> Limpar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-4 pb-3 space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className={`text-2xl font-bold font-mono ${isOverweight ? "text-red-500" : ""}`}>{totalKg.toLocaleString("pt-BR")} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
                  <p className="text-xs text-muted-foreground">Peso ({weightPct.toFixed(0)}%)</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold font-mono ${isOvervolume ? "text-red-500" : ""}`}>{totalVolM3.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">m³</span></p>
                  <p className="text-xs text-muted-foreground">Volume ({volPct.toFixed(0)}%)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold font-mono">{pack.placed}<span className="text-sm font-normal text-muted-foreground">/{pack.total}</span></p>
                  <p className="text-xs text-muted-foreground">Volumes acomodados</p>
                </div>
              </div>
              <Bar label="Peso" used={totalKg.toLocaleString("pt-BR")} total={truckCapKg.toLocaleString("pt-BR")} unit="kg" pct={weightPct} warn={isOverweight} />
              <Bar label="Espaço (m³)" used={totalVolM3.toFixed(1)} total={truckVol.toFixed(1)} unit="m³" pct={volPct} warn={isOvervolume} />
              {(isOverweight || isOvervolume || pack.unplaced > 0) && (
                <div className="space-y-1 pt-1">
                  {isOverweight && <div className="flex items-center gap-2 text-red-600 dark:text-red-300 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> Peso excedido em {(totalKg - truckCapKg).toLocaleString("pt-BR")} kg</div>}
                  {isOvervolume && <div className="flex items-center gap-2 text-red-600 dark:text-red-300 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> Volume excedido em {(totalVolM3 - truckVol).toFixed(1)} m³</div>}
                  {pack.unplaced > 0 && <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300 text-sm font-medium"><AlertTriangle className="w-4 h-4" /> {pack.unplaced} volume(s) não couberam fisicamente no baú</div>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Box className="w-4 h-4 text-velox-amber" /> Baú 3D — {truck?.plate || "carreta padrão"} ({truckL}m × {truckW}m × {truckH}m)</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-[380px] flex items-center justify-center text-sm text-muted-foreground border-2 border-slate-500/30 rounded-lg">Carregando visualização 3D…</div>}>
                <Truck3D boxes={pack.boxes} truckL={truckL} truckW={truckW} truckH={truckH} />
              </Suspense>
              {orderIds.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                  {orderIds.map(oid => {
                    const oi = loadedItems.find(i => i.orderId === oid);
                    return (
                      <div key={oid} className="flex items-center gap-1.5 text-xs">
                        <span className="w-3 h-3 rounded-sm" style={{ background: colorOf(oid) }} />
                        <span className="font-mono text-muted-foreground">{oi?.protocol || oid.slice(0, 8)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {loadedItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Scale className="w-4 h-4 text-velox-amber" /> Inteligência de carga</CardTitle>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={exportLoadPlan}><FileDown className="w-3.5 h-3.5" /> Plano de carga</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cg != null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Centro de gravidade (frente → fundo)</span>
                      <span className={`font-mono ${cgImbalance ? "text-red-600 dark:text-red-300 font-semibold" : "text-muted-foreground"}`}>{(cg * 100).toFixed(0)}%</span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full">
                      {/* faixa ideal 35–65% */}
                      <div className="absolute top-0 bottom-0 bg-green-200/70 rounded" style={{ left: "35%", right: "35%" }} />
                      <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white ${cgImbalance ? "bg-red-500" : "bg-green-600"}`} style={{ left: `${Math.min(Math.max(cg * 100, 2), 98)}%` }} />
                    </div>
                    {cgImbalance && <p className="text-[11px] text-red-600 dark:text-red-300 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Carga desbalanceada — redistribua para aproximar o CG do centro (eixos).</p>}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">Aproveitamento: <b className="text-foreground">{Math.max(weightPct, volPct).toFixed(0)}%</b> ({weightPct >= volPct ? "peso" : "volume"})</span>
                  {hasFragile && <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1"><Package className="w-3 h-3" /> Frágil — acomodar por cima</span>}
                  {hasDangerous && <span className="text-[11px] px-2 py-1 rounded-full bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Carga perigosa — isolar e sinalizar</span>}
                </div>
                <p className="text-[11px] text-muted-foreground">O plano de carga segue a lógica LIFO: o último pedido a carregar é o primeiro a entregar. Cada pedido recebe a zona do baú (frente/meio/fundo).</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {loadedItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">No caminhão ({orderIds.length} pedido{orderIds.length > 1 ? "s" : ""})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orderIds.map(orderId => {
                  const oi = loadedItems.filter(i => i.orderId === orderId);
                  const kg = oi.reduce((s, i) => s + (i.weight_kg || 0), 0);
                  const vol = oi.reduce((s, i) => s + itemVolumeM3(i), 0);
                  return (
                    <div key={orderId} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: colorOf(orderId) }} />
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-muted-foreground truncate">{oi[0]?.protocol || orderId}</p>
                          <p className="text-sm font-medium">{kg.toLocaleString("pt-BR")} kg · {oi.reduce((s, i) => s + (i.volumes || 0), 0)} vol · {fmtM3(vol)}</p>
                        </div>
                      </div>
                      <button onClick={() => removeOrder(orderId)} className="text-xs text-red-400 hover:text-red-600 dark:text-red-300 px-2 py-1 rounded flex-shrink-0">Remover</button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Adicionar pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido disponível</p>
              ) : availableOrders.map(order => {
                const kg = order.total_weight_kg || 0;
                const wouldExceed = (totalKg + kg) > truckCapKg;
                return (
                  <div key={order.id} className={`p-3 border rounded-lg ${wouldExceed ? "border-red-500/30 bg-red-500/10/30" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[11px] text-muted-foreground">{order.protocol}</p>
                        <p className="text-sm font-medium truncate">{order.client_name}</p>
                        <p className="text-xs text-muted-foreground">{kg.toLocaleString("pt-BR")} kg · {order.total_volumes || "?"} vol</p>
                        {wouldExceed && <p className="text-xs text-red-500 mt-0.5">⚠ Excede em {((totalKg + kg) - truckCapKg).toLocaleString("pt-BR")} kg</p>}
                      </div>
                      <Button size="sm" variant={wouldExceed ? "outline" : "default"} className={wouldExceed ? "border-red-300 text-red-500 hover:bg-red-500/10" : ""} onClick={() => addOrder(order)}>
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

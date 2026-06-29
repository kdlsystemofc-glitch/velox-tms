import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import PriorityBadge from "@/components/shared/PriorityBadge";
import { Palette, Truck } from "lucide-react";

// Amostra de uma cor (token do tema). `var` é o nome da CSS variable.
function Swatch({ name, vartoken, fg = "--foreground" }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="h-16 flex items-end p-2" style={{ background: `hsl(var(${vartoken}))` }}>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `hsl(var(--card))`, color: `hsl(var(${fg}))` }}>
          {vartoken}
        </span>
      </div>
      <div className="px-2 py-1.5 text-xs font-medium">{name}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <Card>
      <CardHeader className="py-3 border-b border-border bg-muted/30">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

export default function StyleGuide() {
  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader icon={Palette} title="Style Guide" subtitle="Referência visual do tema (padrão Open TMS) — cores, componentes e tipografia." />

      <Section title="Cores do tema (tokens)">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Swatch name="Primária (azul)" vartoken="--primary" fg="--primary-foreground" />
          <Swatch name="Marca — de" vartoken="--brand-from" fg="--primary-foreground" />
          <Swatch name="Marca — até (roxo)" vartoken="--brand-to" fg="--primary-foreground" />
          <Swatch name="Sucesso" vartoken="--success" fg="--success-foreground" />
          <Swatch name="Atenção" vartoken="--warning" fg="--warning-foreground" />
          <Swatch name="Info" vartoken="--info" fg="--info-foreground" />
          <Swatch name="Destrutivo" vartoken="--destructive" fg="--destructive-foreground" />
          <Swatch name="Card" vartoken="--card" />
          <Swatch name="Muted" vartoken="--muted" fg="--muted-foreground" />
          <Swatch name="Borda" vartoken="--border" />
        </div>
        <p className="text-xs text-muted-foreground mt-3">As cores mudam automaticamente entre claro e escuro (botão sol/lua no topo). Use sempre os tokens — nunca cores fixas como <code className="font-mono">bg-white</code>.</p>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Botões">
          <div className="flex flex-wrap gap-2">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="destructive">Destrutivo</Button>
            <Button className="bg-brand-gradient text-white">Marca</Button>
          </div>
        </Section>

        <Section title="Selos de status e prioridade">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="new" />
            <StatusBadge status="confirmed" />
            <StatusBadge status="in_transit" />
            <StatusBadge status="delivered" />
            <StatusBadge status="cancelled" />
            <StatusBadge status="awaiting_approval" />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <PriorityBadge priority="critical" showNormal />
            <PriorityBadge priority="high" showNormal />
            <PriorityBadge priority="normal" showNormal />
          </div>
        </Section>

        <Section title="Chips semânticos">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="px-2 py-1 rounded-full bg-success/15 text-success border border-success/30">Sucesso</span>
            <span className="px-2 py-1 rounded-full bg-warning/15 text-warning border border-warning/30">Atenção</span>
            <span className="px-2 py-1 rounded-full bg-info/15 text-info border border-info/30">Info</span>
            <span className="px-2 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">Erro</span>
            <span className="px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">Primário</span>
          </div>
        </Section>

        <Section title="Campos">
          <div className="space-y-2 max-w-xs">
            <Input placeholder="Texto de exemplo…" />
            <Input placeholder="Desabilitado" disabled />
          </div>
        </Section>
      </div>

      <Section title="Tipografia">
        <div className="space-y-1.5">
          <p className="font-display text-2xl font-extrabold">Display — títulos fortes</p>
          <p className="text-lg font-semibold text-foreground">Subtítulo / seção</p>
          <p className="text-sm text-foreground">Corpo — texto padrão da interface.</p>
          <p className="text-sm text-muted-foreground">Secundário — apoio e legendas.</p>
          <p className="font-mono text-xs text-muted-foreground">Mono — VLX-2026-00042 · ABC-1D23</p>
        </div>
      </Section>

      <Section title="Card de exemplo">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center"><Truck className="w-5 h-5 text-white" /></div>
          <div>
            <p className="font-semibold text-sm">Componente em superfície <span className="font-mono text-xs text-muted-foreground">bg-card</span></p>
            <p className="text-xs text-muted-foreground">Borda <span className="font-mono">border-border</span> · texto <span className="font-mono">text-foreground</span> / <span className="font-mono">text-muted-foreground</span>.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

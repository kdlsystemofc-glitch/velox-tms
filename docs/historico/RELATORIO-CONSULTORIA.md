# 📋 Relatório de Consultoria — Velox TMS
### Diagnóstico independente e visão de transformação para TMS Enterprise

> Avaliação feita como **consultoria independente**, questionando todas as
> decisões e **sem tratar nenhum fluxo atual como definitivo**. A pergunta-guia
> não foi "isto funciona?", e sim "**esta é a forma como um TMS líder resolveria
> isto?**". Gerado em 2026-07-01.

---

## 0. Lente da avaliação
O sistema foi avaliado como **plataforma de negócio logístico**, não como base de
código. As recomendações priorizam correção estrutural e valor de mercado, não a
preservação do que já existe.

---

## 1. Reavaliação da arquitetura funcional (questionando decisões)

**1.1 A camada `base44` é dívida arquitetural, não abstração.**
O acesso a dados passa por um Proxy que **imita um BaaS legado (base44)** sobre o
Supabase. Cria uma fachada que não representa o domínio real, mistura CRUD direto
(RLS) com RPCs de forma inconsistente e esconde os contratos de dados.
*Rever:* substituir por **camada de repositório/serviços de domínio explícita**,
aposentando a mímica do base44.

**1.2 Lógica de negócio no frontend é o maior risco estrutural.**
Processos críticos (cálculo de frete, encerramento de viagem, despacho,
casamento de conciliação) vivem em componentes React. Parte é protegida por RPCs
transacionais, mas há **regras no cliente** — duplicadas entre `NewOrder`,
`BookingForm` e portal. Consequência: **bypassável, difícil de testar,
divergente entre canais**. *Rever:* frontend como **thin client**; regras de
domínio no servidor com um **motor de tarifação único**.

**1.3 Comunicação entre domínios via tabelas compartilhadas.**
Não há eventos nem contratos entre domínios — tudo se encontra em `orders`,
`trips`, `revenues`. Mudança de schema propaga risco por todo o sistema.
*Rever:* **backbone de eventos de domínio** (outbox/event bus) para desacoplar.

**1.4 Modelo síncrono + polling.**
Sem filas/jobs/agendador; rastreio e listas por **polling de 20s**. Automação
real (faturamento, tendering, notificações, auditoria) exige **processamento
assíncrono e realtime**. Não escala.

**1.5 Autorização incoerente.**
Mistura RLS + RPCs `SECURITY DEFINER`, com SoD só parcialmente no servidor.
Falta uma **estratégia de autorização única** (policy-as-code), além de MFA/SSO.

**1.6 Tarifação como blob JSON.**
Preços/faixas moram em JSON de `settings`/`client`. Para enterprise,
**tarifa/contrato precisa ser entidade governada, versionada e auditável** — não
um campo.

**1.7 Documentos/3D no cliente.**
PDFs (jsPDF) e simulador 3D (Three) rodam no navegador. Não escala para
volume/lote nem para documentos fiscais. *Rever:* **serviço de documentos
server-side**.

---

## 2. Reavaliação dos domínios (dividir / unificar)

O modelo atual tem 6 domínios. Contesto três fronteiras:

- **"Frota & Cadastros" mistura master data com recursos operacionais.** Separar
  **Master Data & Partner Management** (clientes, transportadoras, fornecedores,
  filiais) de **Gestão de Ativos/Frota** (veículos, motoristas). Ciclos de vida
  e donos diferentes.
- **"Financeiro" está amalgamado.** Enterprise separa **Faturamento & Contas a
  Receber**, **Freight Payables & Acerto de Parceiro**, **Auditoria de Frete** e
  **Tesouraria/Conciliação**. Hoje convivem na mesma caixa, com **dois caminhos
  de baixa** que não se cruzam (`pay_invoice` vs `reconcile`).
- **"Portais" não é domínio — é canal.** Cliente/Parceiro/Motorista são **canais
  de entrega** sobre domínios (self-service, colaboração, mobilidade). Modelar
  como canais evita duplicação.

**Domínios que deveriam existir e não existem como tal:**
- **Gestão de Contratos & Tarifas** (comercial) — hoje disperso.
- **Fiscal & Compliance** (CT-e/MDF-e/CIOT/ANTT/seguro) — **ausente**; núcleo de
  TMS BR.
- **Order/Shipment Management** distinto de "Operação" (pedido comercial ≠
  execução física).
- **Planejamento & Otimização** separado de **Execução & Visibilidade**.
- **Sinistros/Devoluções (Claims & Reverse Logistics)**.
- **Pátio/Doca & Agendamento**.

---

## 3. Reavaliação de fluxos (eliminar / simplificar / automatizar)

- **Entrada anônima de pedido (`/agendar`)**: cria `orders` reais a partir de
  visitante não autenticado — **fronteira de confiança frágil**. Deveria ser
  **lead → cotação → pedido qualificado**, não INSERT anônimo.
- **Faturamento manual** ("Fechar fatura"): deveria ser **automático por regra de
  corte/contrato**.
- **Acerto do parceiro manual**: deveria disparar **na entrega + auditoria
  automática**.
- **Atualização de status manual** (motorista/parceiro): onde houver telemetria,
  **geofence/GPS deveria mover o status**.
- **Conciliação manual**: alta confiança deveria ter **baixa automática por
  regra**.
- **Despacho por arrastar-e-soltar**: deveria ser **otimizador-assistido**
  (sugere, humano confirma).
- **Cálculo de frete duplicado** em 3 telas: **um único serviço de precificação**.
- **Dois caminhos de baixa financeira**: **unificar num razão de liquidação
  único**.

---

## 4. Funcionalidades que deveriam existir e não existem
Motor de tarifação/contratos governado · **Fiscal eletrônico (CT-e/MDF-e/SEFAZ)**
· Freight Audit & Pay completo · Agendamento de docas/pátio ·
Sinistros/devoluções · Motor de workflow de exceções · Motor de notificações
multicanal · Hub de integrações (ERP/EDI/telemetria/bancos) · SSO/MFA ·
Multi-tenant · Data platform/BI avançado · App do motorista com
navegação/offline/POD · Gestão de capacidade/compromisso.

---

# 🎯 Relatório Executivo

## ✅ Pontos fortes
1. **Cobertura operacional rara para o porte** — pedido→despacho→viagem→entrega
   com recursos avançados (comboio, backhaul, estadia, roteirização,
   encerramento atômico).
2. **Diferenciais já entregues** que TMS "leves" não têm: rastreio ao vivo,
   portais de **cliente e parceiro**, conciliação bancária, **auditoria de
   frete**, **RBAC/SoD**, **OTIF/BI**, **ESG**, torre de controle.
3. **Segurança de dados por RLS + RPCs** e **transações atômicas** em pontos
   sensíveis (encerramento, faturamento).
4. **Stack moderna e UX coesa** (React/Vite/Supabase, design tokens, dark mode) —
   vantagem enorme sobre concorrentes legados de UX datada.
5. **Governança emergente** (audit log, observabilidade, testes de utils +
   CI/E2E).

## ⚠️ Pontos fracos
1. **Lógica de negócio no cliente** (bypassável, duplicada).
2. **Fachada `base44`** — dívida que ofusca o domínio.
3. **Sem compliance fiscal eletrônico** — impeditivo para operar como emissor.
4. **Single-tenant** — teto de mercado.
5. **Acoplamento por tabelas**, sem eventos; **síncrono + polling**.
6. **Tarifação como JSON**, não entidade governada.
7. **Financeiro fragmentado** (dois caminhos de baixa; conciliação manual).
8. **Cobertura de teste de fluxos críticos insuficiente**; **migrations manuais**
   (risco de drift).

## 🚀 Oportunidades de evolução
- **Plataforma de tarifação/contratos** como núcleo comercial (upsell, precisão,
  auditoria).
- **Motor fiscal (CT-e/MDF-e)** — de "não pode operar" para **diferencial
  verticalizado BR**.
- **Automação de exceções + ETA preditivo** na torre de controle.
- **Tendering/marketplace automático** (já há scorecard + tendering assistido).
- **Multi-tenant → SaaS** (escala de receita).
- **Hub de integrações** (ERP/EDI/telemetria/bancos) — encaixe no ecossistema do
  embarcador.

## 🔴 Riscos
- **Regulatório/fiscal:** sem CT-e/MDF-e não há operação legal como transportador
  documental — risco existencial no BR.
- **Segurança:** regras no cliente + autorização parcial + sem MFA/SSO.
- **Escalabilidade:** polling, listas não paginadas em massa, ausência de
  filas/observabilidade/DR.
- **Integridade financeira:** dois caminhos de baixa, conciliação manual.
- **Manutenção:** god-components, fachada base44, drift de migrations.

## 🏆 Diferenciais competitivos
- **Hoje:** UX moderna + rastreio sem custo (OSM) + portais nativos + conciliação
  + auditoria de frete + ESG + OTIF — combinação incomum na faixa de preço.
- **Potenciais:** verticalização fiscal BR **combinada** com inteligência
  (tendering, ETA preditivo, pricing dinâmico) e time-to-value — algo que os
  incumbentes (TOTVS/ESL/Senior) entregam com UX pesada e ciclos longos.

## 🔭 Visão de longo prazo (TMS Enterprise)
**Arquitetura-alvo:** serviços de domínio + **backbone de eventos** + **data
platform**; frontend **thin client**; **multi-tenant SaaS**; **motor fiscal**;
**hub de integrações**; **camada de automação/IA** (torre prescritiva, pricing,
ETA).

**Sequência recomendada (independente do roadmap incremental atual):**
1. **Endurecer o núcleo** — mover regras ao servidor, **tarifa/contrato como
   entidade**, unificar liquidação financeira, aposentar a fachada base44,
   elevar cobertura de testes.
2. **Compliance & billing** — motor fiscal (CT-e/MDF-e) + faturamento e acerto
   **automáticos** por regra.
3. **Plataforma & escala** — eventos/filas, multi-tenant, hub de integrações,
   observabilidade/DR.
4. **Inteligência** — ETA preditivo, torre prescritiva, pricing dinâmico,
   tendering automático.
5. **Rede** — marketplace de capacidade / network effects.

---

## Relação com os demais documentos
- `INVENTARIO-SISTEMA.md` — o que existe.
- `ARQUITETURA-FUNCIONAL.md` — como se organiza hoje.
- `MAPA-FLUXOS-PERFIS.md` — como se opera por perfil.
- `GAP-ANALYSIS-ENTERPRISE.md` — lacunas vs. enterprise (incremental).
- `ROADMAP-ESTRATEGICO.md` — plano incremental em execução.
- **Este documento** — visão de consultoria independente, que **questiona** o
  incremental e propõe a rearquitetura-alvo.

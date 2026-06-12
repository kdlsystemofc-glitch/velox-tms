# VELOX_ROADMAP.md — Auditoria, Análise de Mercado e Plano de Implementação

> Gerado a partir de auditoria completa do código-fonte + análise comparativa com TMS profissionais.
> Data: 2026-06-12

---

# PARTE 1 — ANÁLISE COMPARATIVA COM TMS DE MERCADO

Referências brasileiras: Rotaflex, Benner TMS, Mitra, Softruck, Transystem, Senior TMS.
Referências internacionais: McLeod Software, TMW Suite (Trimble), MercuryGate.

## 1.1 Funcionalidades padrão que o Velox ainda NÃO tem

| Funcionalidade | Presente em | Relevância p/ Velox (3 carretas) |
|---|---|---|
| **Emissão de CT-e/MDF-e** (integração SEFAZ) | Todos os TMS BR | ALTA — obrigação fiscal; hoje o CT-e é só um campo de texto |
| **Romaneio / Manifesto de carga impresso** | Todos | ALTA — documento que o motorista leva na viagem |
| **Tabela de frete por cliente** (negociada) | Todos | MÉDIA — campo `pricing` existe no Client mas não tem UI de edição |
| **Ocorrências padronizadas (tabela EDI/Proceda)** | Benner, Senior, Rotaflex | MÉDIA — incidentes existem mas sem código padrão |
| **Averbação de seguro de carga** | Benner, Senior | MÉDIA — AT&M/averbadoras; hoje só GRIS calculado |
| **Conta-corrente do cliente / faturamento múltiplo** | Todos | MÉDIA — só há fatura mensal simples |
| **Gestão de jornada do motorista (Lei 13.103)** | Softruck, Transystem | BAIXA-MÉDIA — relevante c/ fiscalização |
| **Rastreamento GPS em tempo real** | Softruck, Transystem | MÉDIA — placeholder no MapPage |
| **EDI com embarcadores (NOTFIS/OCOREN)** | McLeod, TMW, Benner | BAIXA — só com clientes grandes |
| **Torre de controle / painel de exceções** | MercuryGate, McLeod | MÉDIA — dashboard atual é bom começo |
| **Cotação multi-transportadora (spot)** | MercuryGate | N/A — Velox é transportadora, não embarcador |
| **DACTE / etiquetas de volume com código de barras** | Todos BR | MÉDIA — facilita conferência de carga |

## 1.2 Fluxos de UX que aceleram a operação nos TMS profissionais

1. **Entrada de pedido em tela única com grid de itens** (McLeod "Order Entry"): digitação contínua via teclado, sem modais. O Velox usa formulários longos verticais — bom para o site público, lento para o operador.
2. **KPIs clicáveis** — em todos os TMS modernos, cada número do dashboard é um link para a lista já filtrada. *(Implementado nesta rodada — Seção C1)*
3. **Busca global (Ctrl+K)** por protocolo/cliente/placa de qualquer tela (TMW, MercuryGate).
4. **Ações em lote** — confirmar/programar vários pedidos de uma vez (o SmartScheduleModal já cobre parte disso).
5. **Status com cores consistentes e fila de exceção** — o operador olha apenas o que precisa de ação ("management by exception"). A aba "Aguardando" da Agenda já segue esse padrão.
6. **Autopreenchimento agressivo** — último endereço usado, últimas mercadorias do cliente, templates de pedido recorrente (Rotaflex tem "pedido modelo").

## 1.3 Campos padrão que faltam em pedidos, viagens e financeiro

**Pedido:**
- Número/chave da NF-e (44 dígitos) — hoje só número simples
- Espécie/natureza da mercadoria + NCM ✅ (campo existe; faltava exibir no detalhe — corrigido nesta rodada)
- Tomador do serviço (pode ser terceiro, não só CIF/FOB)
- Seguro: apólice, averbação
- Motivo de cancelamento *(implementado nesta rodada — Seção A)*

**Viagem:**
- Romaneio impresso *(implementado nesta rodada — Seção B1)*
- Adiantamento de viagem (vale-frete/vale-pedágio) e acerto de viagem
- Hodômetro inicial (só tem final no encerramento)
- Custo por km rodado calculado e exibido

**Financeiro:**
- Centro de custo por caminhão (DRE por veículo)
- Conciliação bancária
- Parcelas de fatura
- Estorno automático na anulação do pedido *(implementado nesta rodada — Seção A4)*

## 1.4 Como TMS profissionais organizam o dashboard operacional

Padrão de mercado ("torre de controle"):
1. **Fila de exceções no topo** — o que precisa de ação humana AGORA (pedidos sem confirmação, entregas atrasadas, docs vencendo). O Velox já tem os banners urgentes ✅.
2. **Números clicáveis** — todo KPI navega para a lista filtrada *(implementado nesta rodada)*.
3. **Linha do tempo do dia** — coletas/entregas de hoje em ordem cronológica com status.
4. **Mapa com posição da frota** ao lado dos KPIs (depende de GPS — futuro).
5. **Margem do dia** — receita vs custo das viagens em andamento (admin).

## 1.5 App do motorista: mercado vs Velox

| Recurso | TMS profissionais | Velox hoje |
|---|---|---|
| Lista de paradas com navegação | ✅ | ✅ |
| POD (comprovante c/ foto) | ✅ foto + assinatura na tela + geolocalização | ✅ foto da NF (sem assinatura digital nem GPS) |
| Ocorrências padronizadas | ✅ com código | ✅ com tipos fixos (bom) |
| Checklist de saída do veículo | ✅ (pneus, luzes, documentos) | ❌ |
| Jornada (início/fim, pausas) | ✅ | ❌ |
| Chat com a base | ✅ | ❌ (WhatsApp resolve na prática) |
| Modo offline | ✅ crítico em estrada | ❌ (PWA + fila local seria o caminho) |
| Aceite de viagem | ✅ motorista confirma que viu | ❌ |

---

# PARTE 2 — AUDITORIA COMPLETA DO CÓDIGO

## Erros críticos encontrados

| # | Erro | Arquivo | Efeito |
|---|---|---|---|
| 1 | **`generateProtocol` retorna formato errado** — a camada de compatibilidade retorna `{ data: "VLX-..." }` (string), mas BookingForm:316 e NewOrder:201 leem `data.protocol` → **todo pedido é criado com `protocol: undefined`** | `supabaseClient.js`, `BookingForm.jsx`, `NewOrder.jsx` | Rastreamento quebrado, protocolo "undefined" em telas e PDFs |
| 2 | **Protocolo não-único** — gerado com `Math.random()`, sem verificação de colisão | `supabaseClient.js:260` | Risco de protocolos duplicados |
| 3 | **Timezone UTC em datas** — `new Date().toISOString().split("T")[0]` retorna a data UTC; após ~21h no Brasil vira o dia seguinte. Afeta data de vencimento de receitas, validação de "hoje", data padrão de programação | 12+ arquivos | Receitas com vencimento errado, validação rejeita data válida à noite |
| 4 | **Display de data com shift de -1 dia** — `new Date("2026-06-12")` é interpretado como UTC-midnight → exibe 11/06 no Brasil | `OrderDetailPage.jsx:321`, `Dashboard.jsx:55` | Data de coleta exibida errada SEMPRE |
| 5 | **Receita duplicada** — Revenue criada na confirmação sem verificar se já existe para o pedido (3 pontos de criação: AgendaPage, OrderDetailPage, SmartSchedule) | `AgendaPage.jsx`, `OrderDetailPage.jsx` | Contas a receber infladas |
| 6 | **Cancelamento não estorna receita** — cancelar pedido confirmado deixa a Revenue `receivable` ativa | `OrderDetailPage.jsx` | Financeiro mostra valores a receber de pedidos cancelados |
| 7 | **BookingForm sem try/catch no submit** — se `Order.create` falhar, o botão trava em "Enviando..." sem feedback | `BookingForm.jsx:311` | Usuário público sem resposta |
| 8 | **ContactSection sem try/catch** — mesma situação no formulário de contato | `ContactSection.jsx:39` | idem |

## Problemas de performance e segurança

| # | Problema | Arquivo |
|---|---|---|
| 9 | BookingForm (página PÚBLICA) carrega 200 pedidos + frota + bloqueios sem usar nenhum deles (queries mortas) | `BookingForm.jsx:48-59` |
| 10 | Tracking baixa até 500 pedidos no navegador para buscar por NF (privacidade + performance) | `Tracking.jsx:46` |
| 11 | RLS permite leitura pública de TODOS os pedidos (dados de clientes expostos a quem souber a API) — mitigar com busca server-side (Edge Function) ou policy por protocolo | `supabase/schema.sql` |
| 12 | `getClientByCnpj` baixa todos os clientes ativos para comparar CNPJ no cliente | `supabaseClient.js:271` |
| 13 | `console.log` de debug em produção no VeloxDatePicker | `VeloxDatePicker.jsx:34-67` |

## Código morto / inconsistências

- `Operations.jsx`, `Schedule.jsx`, `SchedulePage.jsx` não estão roteados (rotas redirecionam para `/admin/agenda`) — candidatos a remoção
- `Operations.jsx` ainda cria Revenue (lógica duplicada da AgendaPage)
- Mutations sem `onError` na maioria das páginas (falha silenciosa)
- `window.prompt` para resolver incidente (OrderDetailPage:463) — funciona mas destoa da UI

---

# PARTE 3 — PLANO DE IMPLEMENTAÇÃO

## SEÇÃO A — Correções urgentes ✅ IMPLEMENTADAS NESTA RODADA

### A1. Protocolo undefined + não-único — Prioridade 5 · Complexidade baixa
- **Problema:** contrato `data.protocol` vs retorno string; geração aleatória.
- **Solução:** `generateProtocol` agora consulta o maior protocolo do ano no banco e retorna sequencial `{ data: { protocol } }`, com fallback aleatório + verificação de colisão.
- **Arquivos:** `src/api/supabaseClient.js`.

### A2. Datas timezone-safe — Prioridade 5 · Complexidade baixa
- **Problema:** `toISOString()` retorna UTC; parsing de `YYYY-MM-DD` como UTC desloca -1 dia na exibição.
- **Solução:** novo `src/utils/dateUtils.js` (`todayLocalISO`, `toLocalISO`, `parseLocalDate`, `formatDateBR`); substituídas as ocorrências de risco em OrderDetailPage, Dashboard, AgendaPage, NewOrder, BookingForm, Expenses, Revenues, TripDetailPage, TruckDetailPage.
- **Arquivos:** novo util + 9 páginas.

### A3. Receita duplicada — Prioridade 5 · Complexidade baixa
- **Solução:** helper `ensureRevenueForOrder()` em `src/utils/revenueHelper.js` — verifica Revenue existente por `order_id` antes de criar. Aplicado nos 3 pontos de confirmação.
- **Arquivos:** novo util, `AgendaPage.jsx`, `OrderDetailPage.jsx`.

### A4. Cancelamento estorna receita + motivo de cancelamento — Prioridade 5 · Complexidade baixa
- **Solução:** ao cancelar pedido, todas as Revenues `receivable` vinculadas passam a `cancelled`; o card de confirmação agora pede o **motivo**, gravado no `status_history`.
- **Arquivos:** `revenueHelper.js` (`cancelRevenuesForOrder`), `OrderDetailPage.jsx`, `AgendaPage.jsx` (recusa).

### A5. Tratamento de erro nos formulários públicos — Prioridade 5 · Complexidade baixa
- **Solução:** try/catch com mensagem visível em `BookingForm.handleSubmit` e `ContactSection.handleSubmit`; remoção das 3 queries mortas da página pública.
- **Arquivos:** `BookingForm.jsx`, `ContactSection.jsx`.

### A6. Limpeza de debug — Prioridade 4 · Complexidade trivial
- Removidos `console.log` do `VeloxDatePicker.jsx`.

## SEÇÃO B — Funcionalidades básicas de TMS faltantes

### B1. Romaneio de carga (manifesto de viagem em PDF) — Prioridade 5 · Complexidade média ✅ IMPLEMENTADO
- **O quê:** documento impresso com motorista, veículo, sequência de paradas, NFs, volumes, pesos e campo de assinatura — o motorista leva na viagem. Padrão absoluto de mercado.
- **Como:** `src/utils/generateTripManifest.js` (jsPDF, mesmo estilo do comprovante) + botão "Romaneio PDF" no `TripDetailPage`.

### B2. NF/NCM/dimensões visíveis no detalhe do pedido — Prioridade 4 · Complexidade baixa ✅ IMPLEMENTADO
- **O quê:** a tabela de itens do OrderDetailPage não mostrava nº da NF, NCM nem dimensões (dados que o formulário coleta).
- **Como:** colunas adicionadas à tabela de itens.

### B3. Tabela de frete por cliente (UI) — ✅ IMPLEMENTADO
- Card "Tabela de Frete" no ClientDetailPage edita `client.custom_pricing` (9 campos; em branco herda o padrão).
- NewOrder e OrderDetailPage agora passam a tabela do cliente ao `calculateFreightFull()` (prioridade máxima).

### B4. Chave da NF-e (44 dígitos) + validação — ✅ IMPLEMENTADO
- `src/utils/nfeUtils.js`: `validateNFeKey()` (comprimento + dígito verificador módulo 11), `nfNumberFromKey()`, `formatNFeKey()`.
- Campo opcional `nf_key` nos itens do NewOrder e BookingForm com validação visual; nº da NF auto-preenchido a partir da chave; ícone 🔑 na tabela do pedido.

### B5. Adiantamento e acerto de viagem — ✅ IMPLEMENTADO
- Colunas `advance_amount`/`advance_date` (migration `20260612_trip_advance.sql` — **aplicar no Supabase**).
- Campo no NewTrip; gera Expense pendente automática; exibido no financeiro da viagem e no resumo do encerramento. Código tolera banco sem a migration (cria a viagem sem os campos).

### B6. Emissão de CT-e/MDF-e — Prioridade 3 (estratégica) · Complexidade ALTA · 🔌 DEPENDE DE SERVIÇO EXTERNO
- Via API de terceiros (TecnoSpeed, FocusNFe, MigrateWeb). Requer **certificado digital A1** e conta no provedor + Edge Function. Não implementável sem essas contratações.

### B7. Checklist de saída do motorista — ✅ IMPLEMENTADO
- Card no DriverTrip (viagem planejada/em andamento): 5 itens (pneus, luzes, CRLV, carga amarrada, óleo/água). Gravado como evento `checklist` em `trip.events` (sem migration). Badge "concluído" após confirmação.

## SEÇÃO C — Melhorias de UX inspiradas no mercado

### C1. KPIs do dashboard clicáveis — Prioridade 5 · Complexidade baixa ✅ IMPLEMENTADO
- Cada KPI navega para a lista já filtrada (`/admin/coletas?status=new`, `/admin/financeiro?aba=receitas`...). `Orders.jsx` agora lê `?status=` da URL.

### C2. Busca global Ctrl+K — ✅ JÁ EXISTIA
- Constatado na auditoria desta rodada: o `AdminTopbar` já tem busca global com atalho Ctrl+K, debounce e resultados agrupados (pedidos/clientes/caminhões/motoristas).

### C3. Linha do tempo do dia no dashboard — ✅ IMPLEMENTADO
- Card "Coletas de hoje" no Dashboard: pedidos do dia ordenados por período (manhã/tarde/a combinar), com status e link.

### C4. Pedido modelo / duplicar pedido — ✅ IMPLEMENTADO
- Botão "Duplicar" no OrderDetailPage abre NewOrder pré-preenchido via `location.state.duplicate` (zera datas, NFs assinadas e status de entrega).

### C5. Substituir `window.prompt`/`window.confirm` por dialogs — ✅ IMPLEMENTADO
- Resolver incidente: Dialog com textarea obrigatória. Criar cliente após pedido: Dialog "Criar cadastro?" não-bloqueante.

### C6. Skeleton loaders — ✅ IMPLEMENTADO (base)
- `src/components/shared/TableSkeleton.jsx` (TableSkeleton + CardsSkeleton); aplicado na lista de coletas. Expandir para outras listas conforme necessidade.

## SEÇÃO D — Funcionalidades avançadas (versão futura)

| Item | Descrição | Status / Bloqueio |
|---|---|---|
| D1. Rastreamento GPS | Mapa real no MapPage (react-leaflet já instalado) | 🔌 Exige rastreador/telemetria contratada (Softruck/Onixsat) |
| D2. CT-e/MDF-e completo | Ver B6 | 🔌 Exige certificado A1 + API paga |
| D3. Portal do cliente | Login para embarcadores verem pedidos, faturas e PODs | 📦 Projeto próprio (exige redesenho de RLS por cliente) |
| D4. App motorista offline (PWA) | Service worker + fila de sincronização | 📦 Projeto próprio |
| D5. EDI Proceda (NOTFIS/OCOREN) | Intercâmbio com grandes embarcadores | 🔌 Exige acordo com embarcador parceiro |
| D6. DRE por veículo | Centro de custo por caminhão | ✅ **IMPLEMENTADO** — card "Resultado por Caminhão" no DRE (receita atribuída vs despesas diretas com `truck_id`) |
| D7. Manutenção preventiva com agenda | Plano por km/tempo com ordem de serviço | Pendente (já existem alertas de km e histórico de manutenção) |
| D8. Averbação automática de seguro | Integração AT&M | 🔌 Exige conta na averbadora |
| D9. Otimização de rota multi-parada | Ordenação de paradas por distância (OSRM/Google) | 🔌 Exige API de roteamento (Google Maps key já tem campo no settings) |
| D10. WhatsApp transacional | Notificação automática de status ao cliente | 🔌 Exige conta WhatsApp Business API |

---

# PARTE 4 — REGISTRO DO QUE FOI IMPLEMENTADO

## Rodada 1 (commit `05aea43`)

1. **A1** — Protocolo sequencial único com contrato `{ data: { protocol } }` (`supabaseClient.js`)
2. **A2** — `src/utils/dateUtils.js` + correção de timezone em 9 arquivos
3. **A3** — `src/utils/revenueHelper.js` com `ensureRevenueForOrder()` (anti-duplicação)
4. **A4** — Estorno de receita no cancelamento + motivo de cancelamento obrigatório
5. **A5** — try/catch nos submits públicos + remoção de queries mortas do BookingForm
6. **A6** — Remoção de console.log de debug
7. **B1** — Romaneio de carga em PDF (`generateTripManifest.js` + botão no TripDetailPage)
8. **B2** — Colunas NF, NCM e dimensões na tabela de itens do OrderDetailPage
9. **C1** — KPIs clicáveis no Dashboard + filtro por URL na lista de coletas

## Rodada 2 (restante do roadmap)

1. **Fix Vercel 404** — `vercel.json` com rewrites SPA (rotas client-side como `/login` davam 404)
2. **B3** — Tabela de frete por cliente (`custom_pricing`) com editor no ClientDetailPage; usada no cálculo do NewOrder e OrderDetailPage
3. **B4** — Chave NF-e 44 dígitos com validação DV (`nfeUtils.js`) nos formulários interno e público; auto-preenche nº da NF
4. **B5** — Adiantamento de viagem (migration `20260612_trip_advance.sql`; campo no NewTrip; despesa automática; acerto exibido no encerramento)
5. **B7** — Checklist de saída do motorista (5 itens; gravado em `trip.events`)
6. **C2** — Constatado já implementado (busca global Ctrl+K no AdminTopbar)
7. **C3** — Card "Coletas de hoje" no Dashboard ordenado por período
8. **C4** — Botão "Duplicar" pedido (NewOrder pré-preenchido)
9. **C5** — `window.prompt`/`window.confirm` substituídos por Dialogs (resolver incidente; criar cliente)
10. **C6** — `TableSkeleton`/`CardsSkeleton` compartilhados; aplicado na lista de coletas
11. **D6** — Card "Resultado por Caminhão" no DRE (centro de custo por veículo)
12. **Bug extra corrigido** — NewOrder não salvava o campo NCM no payload (era descartado no submit)

### Migrations pendentes de aplicação no Supabase
1. `supabase/migrations/20260612_revenue_status_cancelled.sql` (rodada 1 — já aplicada pelo usuário)
2. `supabase/migrations/20260612_trip_advance.sql` (rodada 2 — **aplicar**: adiciona `advance_amount`/`advance_date` em `trips`)

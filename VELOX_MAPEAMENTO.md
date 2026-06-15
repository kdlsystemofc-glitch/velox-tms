# VELOX_MAPEAMENTO.md — Mapeamento Completo de Telas e Componentes

> Mapeamento granular de cada tela: rota, acesso, campos, botões, estados, queries e comportamentos especiais.
> **Design System "Steel & Slate" (2026):** paleta corporativa azul-aço sobre canvas ardósia, densa, cantos retos (6px) — ver `VELOX_CONTEXT.md §1.05`. As listas de cadastro usam o `DataTable` (ordenação por coluna + busca inline); formulários usam seções com cabeçalho; detalhes usam seções colapsáveis.

---

## PARTE 1 — SITE PÚBLICO

---

### 1.1 Landing Page

**Arquivo:** `src/pages/LandingPage.jsx`  
**Rota:** `/`  
**Acesso:** público

**Componentes renderizados (em ordem):**
1. `PublicNavbar` — logo, links de navegação, botão "Agendar"
2. `HeroSection` — título, subtítulo e CTAs (texto do banco: `hero_title`, `hero_subtitle`)
3. `AboutSection` — texto sobre a empresa (`about_text`)
4. `ServicesSection` — serviços oferecidos
5. `HowItWorksSection` — como funciona o processo
6. `StatsSection` — números da empresa
7. `TestimonialsSection` — depoimentos ativos do banco (`testimonials.active = true`)
8. `ContactSection` — formulário de contato que cria `ContactMessage`
9. `PublicFooter` — links e informações
10. `WhatsAppButton` — botão flutuante de WhatsApp

**Queries DB:** `company_settings` (público), `testimonials` (active=true, público)

---

### 1.2 Formulário de Agendamento

**Arquivo:** `src/pages/BookingForm.jsx`  
**Rota:** `/agendar`  
**Acesso:** público (não requer login)

**Passos do formulário:**

#### Passo 1 — Solicitante
- Campos: Nome da empresa*, CNPJ/CPF*, Telefone*, E-mail*
- CNPJ onBlur → `base44.functions.invoke("getClientByCnpj")` → preenche nome/tel/email
- `VeloxDatePicker`: data de coleta (bloqueia fins de semana e dias < `min_advance_days`)
- Próximo → validação de campos obrigatórios

#### Passo 2 — Origem
- Campos: CEP*, logradouro*, número, complemento, bairro, cidade*, estado*, tipo de local
- CEP onChange (8 dígitos) → `fetch("https://viacep.com.br/ws/{cep}/json/")` → auto-fill
- Verificação de cobertura: `isAddressInCoverage(cep, state, city, settings)`
  - Se fora da cobertura → alerta + botão "Próximo" bloqueado

#### Passo 3 — Destinatários
- Múltiplos destinatários (botão "+ Adicionar destinatário")
- Por destinatário: nome, CNPJ, telefone, CEP (auto-fill), endereço
- CNPJ do destinatário → `getClientByCnpj` → preenche nome/endereço
- Múltiplos itens por destinatário (botão "+ Adicionar item"):
  - Campos por item: descrição, nº NF, volumes, peso (kg), altura, largura, comprimento (cm), valor declarado, tipo de embalagem
  - Cubagem calculada em tempo real: `(H×W×L / 6000) × volumes` exibida ao usuário

#### Passo 4 — Serviço
- Tipo de frete: CIF (frete por conta do remetente) / FOB (por conta do destinatário)
- Modal de transporte: Rodoviário Padrão / Rodoviário Urgente / Aéreo
- Exibe cálculo de frete usando `calculateFreightFull()` com dados dos itens

#### Passo 5 — Resumo
- Exibição completa do pedido
- `FreightBreakdown` detalhando todos os componentes do frete
- Botão "Confirmar Agendamento":
  - `base44.functions.invoke("generateProtocol")` → `{ data: { protocol } }` (sequencial por ano)
  - `base44.entities.Order.create({...formData, status: "new"})`
  - Exibe protocolo gerado + opção de copiar
  - Submit envolto em try/catch — falha exibe banner de erro vermelho acima dos botões (estado `submitError`)

**Comportamentos especiais:**
- Se vier de `/cotacao` com `location.state.prefill`: pré-preenche com dados da cotação
- Form reseta após submissão bem-sucedida (toast 5s)
- A página NÃO carrega pedidos/frota/bloqueios (dados internos não são expostos no site público)

---

### 1.3 Formulário de Cotação

**Arquivo:** `src/pages/QuoteForm.jsx`  
**Rota:** `/cotacao`  
**Acesso:** público

**Passos:**

#### Passo 1 — Rota
- Campos: UF de origem (select 27 estados), UF de destino

#### Passo 2 — Carga
- Múltiplos itens: descrição, volumes, peso, H×W×L, valor declarado
- Qtd de NFs
- Exibe cubagem por item em tempo real

#### Passo 3 — Resultado
- Exibe `FreightBreakdown` completo
- Prazo de entrega em dias úteis (lookup por estado)
- Botão "Agendar este frete" → navega para `/agendar` com `location.state.prefill`

**Queries DB:** `company_settings` (pricing + route_pricing + delivery_days_table)

---

### 1.4 Calculadora Rápida de Frete

**Arquivo:** `src/pages/QuickQuote.jsx`  
**Rota:** `/calculadora`  
**Acesso:** público

**Campos na tela única:**
- Peso total (kg), volumes, H×W×L (cm), valor declarado, qtd NFs
- UF destino, distância em km (opcional)
- Botão "Calcular"

**Saída:** peso real vs. cubado, peso taxável, FreightBreakdown, prazo estimado

---

### 1.5 Rastreamento

**Arquivo:** `src/pages/Tracking.jsx`  
**Rota:** `/rastrear`  
**Acesso:** público

**Campo:** protocolo, CT-e ou NF  
**Lógica de busca:**
1. Tenta `filter({ protocol: input })`
2. Tenta `filter({ cte_number: input })`
3. Varre todos os pedidos procurando nos `recipients[].items[].nf_number`

**Exibição do resultado:**
- Status atual + badge colorido
- Timeline vertical de `status_history` com timestamps
- Destinatários com badge de `delivery_status` individual
- Mensagem "aguardando confirmação" se status for `new`

---

## PARTE 2 — AUTENTICAÇÃO

---

### 2.1 Login

**Arquivo:** `src/pages/Login.jsx`  
**Rota:** `/login`  
**Acesso:** público (redireciona se já autenticado)

**Campos:** E-mail, Senha  
**Botões:**
- "Entrar" → `base44.auth.login(email, password)` → redireciona por role: `/motorista` ou `/admin`
- "Entrar com Google" → `supabase.auth.signInWithOAuth({ provider: "google" })`
- "Esqueci minha senha" → `/esqueci-senha`
- "Criar conta" → `/cadastro`

---

### 2.2 Cadastro

**Arquivo:** `src/pages/Register.jsx`  
**Rota:** `/cadastro`  
**Acesso:** público

**Campos:** Nome completo, E-mail, Senha, Confirmar senha  
**Ação:** `supabase.auth.signUp()` → e-mail de confirmação enviado

---

### 2.3 Recuperação de Senha

**Arquivo:** `src/pages/ForgotPassword.jsx`  
**Rota:** `/esqueci-senha`  
**Acesso:** público

**Campo:** E-mail  
**Ação:** `supabase.auth.resetPasswordForEmail(email, { redirectTo: "/redefinir-senha" })`

---

### 2.4 Redefinição de Senha

**Arquivo:** `src/pages/ResetPassword.jsx`  
**Rota:** `/redefinir-senha`  
**Acesso:** público (link mágico do e-mail)

**Campos:** Nova senha, Confirmar nova senha  
**Ação:** `supabase.auth.updateUser({ password })`

---

## PARTE 3 — PAINEL ADMIN

### Layout e navegação

**Arquivo:** `src/components/admin/AdminLayout.jsx`  
Contém `AdminSidebar` + `AdminTopbar` + área de conteúdo com `<Outlet />`

**Sidebar links (fluxo reconstruído 2026):**
- Operações (`/admin`)
- **Fluxo:** Pedidos (`/admin/coletas`, badge = novos), Despacho (`/admin/despacho`, badge = confirmados sem viagem), Frota (`/admin/frota`)
- **Cadastros & Gestão:** Cadastros (`/admin/cadastros`), Financeiro (`/admin/financeiro`, admin), Configurações (`/admin/config`, admin)

---

### 3.1 Operações (Painel / torre de controle)

**Arquivo:** `src/pages/admin/OperationsHub.jsx`  
**Rota:** `/admin`  
**Acesso:** operador + admin

**1. Fila de ação** (gestão por exceção — só o que exige decisão agora; some quando vazia):
- Pedidos novos aguardando confirmação → `/admin/coletas?status=new`
- Confirmados sem viagem → `/admin/despacho`
- Alertas críticos → `/admin/config`
- (admin) Recebimentos em atraso → `/admin/financeiro?aba=receitas`

**2. Pipeline clicável:** Novos → Confirmados → Em coleta → Em trânsito → Entregues (cada etapa leva à lista filtrada)

**3. Operação de hoje:** coletas/entregas do dia ordenadas por período (Manhã/Tarde/A combinar)

**4. Frota agora:** cada caminhão com status (em rota com progresso de paradas / disponível / manutenção); clique vai à viagem ou ao caminhão

**5. Financeiro resumido (admin):** A Receber / A Pagar (cards clicáveis)

**onMount:** `syncAlerts`. **Queries:** orders, trips, trucks, alerts, revenues, expenses

---

### 3.2 Pedidos (workspace / pipeline)

**Arquivo:** `src/pages/admin/OrdersWorkspace.jsx`  
**Rota:** `/admin/coletas`  
**Acesso:** operador + admin

**Abas do pipeline** (com contadores): Todos · Novos · Confirmados · Em coleta · Em trânsito · Entregues · Cancelados — sincronizadas com URL `?status=`

**Busca:** protocolo, cliente ou cidade

**Tabela colunas:** Protocolo (+ tag Urgente), Cliente, Rota, Coleta, Carga, Valor, Status, **Ações inline**:
- Status `new` → botão **Confirmar** (abre Sheet) + **Recusar** (Sheet de confirmação → cancela + estorna receitas)
- Status `confirmed` sem viagem → botão **Despachar** (vai ao quadro)
- Demais → botão Ver
- Clique na linha → workspace do pedido

**Sheet de confirmação:** data de coleta, caminhão sugerido (`suggestTruckForOrder` bin-packing, mostra % cheio e kg livres), valor do frete, forma de pagamento → `Order.update(confirmed)` + `ensureRevenueForOrder()`

**Rodapé:** total de pedidos, kg e valor da aba filtrada

---

### 3.3 Novo Pedido (Interno)

**Arquivo:** `src/pages/admin/NewOrder.jsx`  
**Rota:** `/admin/coletas/novo`  
**Acesso:** operador + admin

**Seção Remetente:**
- Busca de cliente por nome (autocomplete dropdown, debounce)
- CNPJ onBlur → `getClientByCnpj` → auto-fill
- Campos: nome, CNPJ/CPF, telefone, e-mail
- Se cliente não encontrado: opção "Criar novo cliente" (cria no DB + vincula)

**Seção Origem:**
- CEP → auto-fill via ViaCEP
- Campos: endereço completo

**Seção Destinatários:**
- Múltiplos destinatários
- Por destinatário: nome, CNPJ, endereço (CEP auto-fill)
- Por item: descrição, nº NF, **chave NF-e 44 dígitos** (validação DV mod-11, borda verde/vermelha, auto-preenche nº NF), NCM, volumes, peso, dimensões, valor declarado

**Duplicação:** se aberto via botão "Duplicar" do detalhe do pedido (`location.state.duplicate`), o formulário vem pré-preenchido com os dados do pedido original (datas, NFs assinadas e status zerados)

**Pós-criação:** se o cliente não existir na base, Dialog "Criar cadastro de cliente?" (substitui o antigo `window.confirm`)

**Seção Serviço:**
- Tipo de frete (CIF/FOB), modal, data de coleta
- Calculadora de frete inline: `calculateFreightFull()` → exibe breakdown
- Botão "Usar este valor" → preenche `freight_value`
- Pagamento: método, condição, status

**Seção Operacional:**
- Motorista (select), Caminhão (select), Observações

**Ações:**
- "Salvar Pedido" → `Order.create({ status: "new", ... })`

---

### 3.4 Pedido (workspace)

**Arquivo:** `src/pages/admin/OrderWorkspace.jsx`  
**Rota:** `/admin/coletas/:id`  
**Acesso:** operador + admin

**Cabeçalho:** protocolo + status + tag Urgente · **ação primária por etapa** (Confirmar Pedido → Marcar Em Coleta → Marcar Em Trânsito → Confirmar Entrega) · menu "⋯" com ações secundárias (Duplicar, Comprovante PDF se entregue, Ver viagem, Cancelar)

**Stepper de ciclo de vida:** Novo → Confirmado → Em Coleta → Em Trânsito → Entregue, com timestamp de cada etapa (do `status_history`)

**Corpo em seções colapsáveis numa página só** (`CollapsibleSection` — sem abas; padrão TMS):
- **Resumo do pedido:** rota visual (coleta → entregas) com datas/observações; cartões Solicitante e Carga (volumes/kg/NFs + prazo por UF); marca cliente com tabela negociada
- **Cargas e destinatários:** por destinatário, tabela de itens (Nº NF + 🔑 chave, NCM, descrição + badges, volumes, peso, dimensões, valor, NF assinada com link/upload)
- **Financeiro:** valor do frete + forma + condições; breakdown `calculateFreightFull` (usa `clientPricing` se houver) com "Usar este valor"; estado da receita vinculada; observações internas
- **Ocorrências:** lista de incidentes; "Resolver" via Dialog com textarea (recolhida por padrão se vazia)
- **Histórico de eventos:** `status_history` em ordem reversa (recolhida por padrão)

**Rail direito:** atribuição operacional (motorista, caminhão, CT-e inline), info de programação, atalho "Programar no Despacho" (se confirmado sem viagem), card de pagamento (status + "Marcar como Pago")

**Regras preservadas:** ao confirmar → `ensureRevenueForOrder` (anti-duplicação); ao cancelar (modal com motivo obrigatório) → `cancelRevenuesForOrder` (estorno) + motivo no histórico; datas via `formatDateBR` (timezone-safe)

---

### 3.5 Despacho (quadro de programação)

**Arquivo:** `src/pages/admin/DispatchBoard.jsx`  
**Rota:** `/admin/despacho`  
**Acesso:** operador + admin

**Layout em 2 colunas:**

**Esquerda — Fila de despacho:** pedidos `confirmed` sem viagem e sem programação. Cada card tem checkbox (seleção múltipla), protocolo, cliente, rota, kg e data solicitada. Barra fixa mostra seleção atual (qtd + kg).

**Direita — Quadro caminhões × dias (seg–sáb, navegável por semana):**
- Linhas = caminhões ativos (placa, modelo, capacidade, status)
- Células = dia × caminhão
- **Fluxo:** seleciona pedidos na fila → clica numa célula → pedidos recebem `scheduled_truck_id` + `scheduled_date` (valida capacidade, bloqueia excesso de peso)
- Célula com pedidos: lista cada um, barra de % de capacidade (verde/âmbar/vermelho), kg usado, "✕" devolve à fila, botão **Viagem** → `/admin/viagens/nova` com `state.preselectedOrderIds` + `preselectedTruckId`
- Rodapé: viagens em rota/planejadas resumidas

**Queries:** orders, trucks (ativos), trips

---

### 3.6 Frota (Container)

**Arquivo:** `src/pages/admin/FrotaPage.jsx`  
**Rota:** `/admin/frota`  
**Acesso:** operador + admin

**3 abas:**
- Frota → `Fleet.jsx`
- Motoristas → `Drivers.jsx`
- Simulador → `LoadingSimulator.jsx`

---

### 3.7 Lista de Caminhões

**Arquivo:** `src/pages/admin/Fleet.jsx`  
**Rota:** dentro de `/admin/frota` (aba Frota)  
**Acesso:** operador + admin

**`DataTable` denso** (ordenação por coluna + busca inline por placa/modelo/fabricante/RENAVAM). Colunas: Placa, Veículo (fab.+modelo+ano), Tipo, Capacidade, Documentos (badge "Vencendo"/"Em dia"), Status (`StatusBadge`), Ação. Clique na linha → `/admin/frota/:id`.

**Dialog "Novo Caminhão":**
- Campos: Placa*, Fabricante, Modelo, Ano, Tipo, Cor, Capacidade (kg), RENAVAM
- Dimensões (C×L×A em metros)
- Vencimento CRLV, Seguro, Tacógrafo
- Km atual (odômetro)
- Alertas por km: troca de óleo, revisão geral, pneus
- Submit → `Truck.create()` + navega para detalhe

---

### 3.8 Detalhe de Caminhão

**Arquivo:** `src/pages/admin/TruckDetailPage.jsx`  
**Rota:** `/admin/frota/:id`  
**Acesso:** operador + admin

**Seção Dados do Veículo:** visualização + modo edição (toggle botão "Editar")
- Campos editáveis: todos os campos do caminhão incluindo km, dimensões, motorista titular, alertas km
- Submit → `Truck.update(id, payload)`

**Seção Manutenções:**
- Lista collapsible (detalhes em `<details>`) ordenada por data DESC
- Por registro: tipo (óleo/revisão/pneu/etc.), data, km, descrição, valor, fornecedor, próxima manutenção
- Botões: "Editar" e "Remover" por registro
- Botão "Registrar" → Modal de manutenção:
  - Tipo, data*, km, descrição*, valor, fornecedor (autocomplete por Suppliers), próxima data
  - Se novo registro e valor > 0 → cria Expense `pending` automaticamente

**Seção Documentos (sidebar):**
- CRLV, Seguro, Tacógrafo com badges de status (OK/Atenção/Vencido/Dias restantes)
- Campos de data editáveis quando em modo edição

---

### 3.9 Lista de Motoristas

**Arquivo:** `src/pages/admin/Drivers.jsx`  
**Rota:** dentro de `/admin/frota` (aba Motoristas)  
**Acesso:** operador + admin

**`DataTable` denso** (ordenação por coluna + busca por nome/CPF/CNH). Colunas: Motorista (com alerta CNH vencendo ≤60d), CPF, CNH (categoria/vencimento), Função, Telefone, Status (`StatusBadge`), Ação. Clique na linha → detalhe.  
**Dialog "Novo Motorista":**
- Campos: Nome*, CPF*, Telefone, E-mail, Nascimento, Admissão
- CNH: número, categoria, vencimento
- Função, tipo de contrato, salário base, status
- Submit → `Driver.create()` + navega para detalhe

---

### 3.10 Lista de Viagens

**Arquivo:** `src/pages/admin/Trips.jsx`  
**Rota:** `/admin/viagens`  
**Acesso:** operador + admin

**4 abas:** Ativas (in_progress) | Planejadas (planned) | Concluídas (completed) | Canceladas  
**Card de viagem:** motorista, placa, status, barra de progresso, data/hora saída, pedidos vinculados, link "Ver detalhes"  
**Botão:** "Nova Viagem" → `/admin/viagens/nova`

---

### 3.11 Nova Viagem

**Arquivo:** `src/pages/admin/NewTrip.jsx`  
**Rota:** `/admin/viagens/nova`  
**Acesso:** operador + admin

**Pré-seleção:** quando aberta pelo botão "Viagem" do **Despacho**, recebe `location.state.preselectedOrderIds` + `preselectedTruckId` e já vem com pedidos e caminhão marcados.

**3 seções:**

1. **Pedidos para a viagem**
   - Lista pedidos com `status = "confirmed"` e sem `trip_id`
   - Checkboxes de seleção (pré-marcados se veio do Despacho)
   - Totais: pedidos, kg, receita

2. **Equipe e Veículo**
   - Select Motorista (filtrado: `status = "active"`)
   - Select Caminhão (filtrado: `status = "available"`)
   - Alerta visual se peso exceder capacidade do caminhão

3. **Agendamento**
   - Data/hora de saída (datetime-local)
   - **Adiantamento ao motorista (R$)** — opcional; salvo em `trip.advance_amount` e gera Expense pendente automática ("Adiantamento de viagem — {motorista}")
   - Observações
   - Checkbox "Iniciar imediatamente"

**Submit:** cria Trip + atualiza orders com `trip_id` + navega para `/admin/viagens/:id` (tolera banco sem colunas de adiantamento — migration pendente)

---

### 3.12 Detalhe de Viagem

**Arquivo:** `src/pages/admin/TripDetailPage.jsx`  
**Rota:** `/admin/viagens/:id`  
**Acesso:** operador + admin

**Cabeçalho:** driver + placa + status badge  
**Botão "Romaneio PDF"** (sempre visível): busca os pedidos vinculados (`order_ids`) e gera o manifesto de carga via `generateTripManifest(trip, orders, settings)` (import dinâmico — chunk separado) → download `Romaneio-{placa}-{data}.pdf`  
**Botão "Iniciar"** (se planned): `startTrip()` → status `in_progress` + caminhão `on_route` + pedidos `collecting`  
**Botão "Encerrar Viagem"** (se in_progress): abre modal de encerramento

**Barra de progresso:** paradas concluídas / total

**Lista de paradas:**
- Por parada: número, tipo badge (Partida/Coleta/Entrega), nome destinatário, endereço
- Status visual: pendente/chegou/concluído
- Botões (se em andamento):
  - "Chegou" → status `arrived`
  - "Concluir" → status `completed` + sync de status do pedido
  - Upload de NF (se entrega, sem NF ainda)

**Sidebar financeira:**
- Receita total, custo total (após encerramento), lucro líquido

**Log de eventos:** timeline reversa de `trip.events`

**Modal Encerrar Viagem:**
- Km final (odômetro), litros combustível, custo combustível, pedágios
- Outros gastos: lista dinâmica (descrição + valor)
- Preview de lucro líquido
- Submit: `closeTrip()` → status `completed` + expenses criadas + caminhão `available` + pedidos `delivered`

**Refetch interval:** 30s quando `in_progress`

---

### 3.13 Cadastros (Container)

**Arquivo:** `src/pages/admin/CadastrosPage.jsx`  
**Rota:** `/admin/cadastros`  
**Acesso:** operador + admin

**2 abas via URL param `?aba=`:**
- `clientes` → `Clients.jsx`
- `fornecedores` → `Suppliers.jsx`

---

### 3.14 Lista de Clientes

**Arquivo:** `src/pages/admin/Clients.jsx`  
**Rota:** dentro de `/admin/cadastros`  
**Acesso:** operador + admin

**`DataTable` denso** (ordenação por coluna + busca por nome/CNPJ/código/e-mail). Colunas: Código CLI, Razão Social/Nome, CPF/CNPJ, Tipo (PJ/PF), Perfil, Contato, Cobrança, Status, Ação. Clique na linha → Sheet lateral com dados completos, endereço e contatos.  
- Link no Sheet: "Ver cadastro completo" → `/admin/clientes/:id`

**Dialog "Novo Cliente":**
- Razão Social*, CNPJ*, tipo (PJ/PF), e-mail, telefone
- Perfil (recorrente/eventual), status
- Tipo de cobrança (por viagem / mensal): se mensal → dia de fechamento + prazo de pagamento
- Observações
- Seção de múltiplos contatos (nome, função, telefone, WhatsApp, e-mail, is_primary)
- Endereço principal com CEP auto-fill
- Submit → gera código `CLI{n}` → `Client.create()`

---

### 3.15 Detalhe de Cliente

**Arquivo:** `src/pages/admin/ClientDetailPage.jsx`  
**Rota:** `/admin/clientes/:id`  
**Acesso:** operador + admin

**KPIs:** Fretes realizados, Total faturado, Ticket médio  
**Dados cadastrais:** modo visualização + modo edição (toggle)  
**Contatos:** lista com editar/remover, botão "+ Adicionar contato"  
**Sidebar:** card **Tabela de Frete** (edita `custom_pricing`: R$/kg, R$/km, taxa fixa, mínimo, GRIS, Ad Valorem, TDE, TDA, pedágio — em branco herda padrão; botão "Limpar" volta à tabela padrão; tabela negociada tem prioridade máxima no cálculo) + últimos 5 pedidos com status  
**Fatura mensal:** se `billing_type = "monthly"` → card informativo + botão "Fechar fatura":
- Modal mostra pedidos do mês, total, data de fechamento, data de vencimento
- "Gerar fatura" → `Revenue.create()` com vencimento calculado

---

### 3.16 Lista de Fornecedores

**Arquivo:** `src/pages/admin/Suppliers.jsx`  
**Rota:** dentro de `/admin/cadastros?aba=fornecedores`  
**Acesso:** operador + admin

**`DataTable` denso** (ordenação por coluna + busca por nome/CNPJ/código/contato). Colunas: Código FOR, Fornecedor, Categoria, CNPJ/CPF, Contato, Telefone/E-mail, Ação. Clique na linha → Dialog de edição inline.

**Dialog "Novo Fornecedor":**
- Nome*, CNPJ, categoria (combustível/manutenção/pneus/seguros/outros)
- Contato principal, telefone, WhatsApp, e-mail, observações
- Seção de múltiplos contatos gerenciável
- Submit → gera código `FOR{n}` → `Supplier.create()`

---

### 3.17 Financeiro (Container)

**Arquivo:** `src/pages/admin/FinanceiroPage.jsx`  
**Rota:** `/admin/financeiro`  
**Acesso:** somente admin  
**Abas via `?aba=`:** resumo | receitas | despesas | dre | fluxo

---

### 3.18 Resumo Financeiro

**Arquivo:** `src/pages/admin/Financial.jsx`  
**Acesso:** somente admin

**KPIs do mês:** Receita, Despesas, Resultado (lucro/prejuízo)  
**Gráfico de barras:** Recharts — receita vs. despesa nos últimos 6 meses

---

### 3.19 Receitas

**Arquivo:** `src/pages/admin/Revenues.jsx`  
**Acesso:** somente admin

**Painel de aging (contas a receber):** cards Total a receber / Recebido + 5 faixas **clicáveis que filtram a lista** — Vencidas, ≤7 dias, 8–30, 31–60, >60 (cada uma com qtd e valor). `agingOf(due_date)` classifica pela data.  
**Filtros:** busca por descrição, filtro de status, filtro de aging  
**Tabela:** Descrição, Valor, Vencimento (com "Xd vencida"/"em Xd"), Status, Ação  
**Botão "Recebido"** (se receivable): `Revenue.update(id, { status: "received", received_date })`  
**Dialog "Nova Receita":** Descrição*, Valor*, Vencimento*, Forma de pagamento

---

### 3.20 Despesas

**Arquivo:** `src/pages/admin/Expenses.jsx`  
**Acesso:** somente admin

**Painel de aging (contas a pagar):** cards Total a pagar / Total pago + 5 faixas **clicáveis que filtram a lista** — Vencidas, ≤7 dias, 8–30, 31–60, >60 (qtd + valor); aging por `due_date || date` dos lançamentos `pending`/`installment`.  
**Filtros:** busca, filtro de categoria, filtro de aging  
**Tabela:** Data, Categoria, Descrição, Valor, Status, Ação  
**Botão "Dar Baixa"** (se pending): modal de confirmação com data, forma de pagamento, upload de comprovante  
**Dialog "Nova Despesa":** Categoria*, Descrição*, Valor*, Data*, Status, Forma de pagamento, Observações

---

### 3.21 DRE

**Arquivo:** `src/pages/admin/DRE.jsx`  
**Acesso:** somente admin

**Seletor:** Mês + Ano  
**Estrutura do DRE:**
- (+) Receita Bruta (soma dos `order.freight_value` do período)
- (-) Deduções estimadas (`tax_rate_percent` do settings)
- (=) Receita Líquida
- (-) Custos Variáveis (combustível, manutenção, pneus, pedágios)
- (-) Custos Fixos (salários, impostos, seguros, aluguel, administrativo, marketing)
- (=) EBITDA
- (-) Depreciação mensal estimada (`monthly_depreciation`)
- (=) Lucro / Prejuízo Líquido + margem %

**Resultado por Caminhão** (card adicional): por veículo com movimento no período — receita dos pedidos atribuídos (`truck_id`/`scheduled_truck_id`) vs despesas diretas (`expense.truck_id`) e resultado; custos fixos gerais não são rateados

**Gráfico pizza:** composição dos custos por categoria (Recharts)  
**Botões:**
- "Exportar Excel" → CSV com BOM para Excel
- "Gerar PDF" → jsPDF formatado com cabeçalho e rodapé

---

### 3.22 Fluxo de Caixa

**Arquivo:** `src/pages/admin/CashFlow.jsx`  
**Acesso:** somente admin

**Selector:** 30/60/90 dias  
**Dados:** receitas `receivable` + despesas `pending` com `due_date` futuro  
**Gráfico de área:** saldo acumulado projetado dia a dia (Recharts)  
**Alerta:** se saldo projetado ficar negativo → banner de alerta com data do evento  
**Tabela:** movimentações futuras com entrada/saída/saldo acumulado

---

### 3.23 Configurações (Container)

**Arquivo:** `src/pages/admin/ConfigPage.jsx`  
**Rota:** `/admin/config`  
**Acesso:** somente admin  
**Navegação lateral por categorias** (não abas — padrão TMS): Empresa & Operação | Alertas (badge de contagem) | Documentos | Mapa Operacional. Lista sticky à esquerda com título + descrição de cada categoria; conteúdo à direita.

---

### 3.24 Configurações da Empresa (AdminSettings)

**Arquivo:** `src/pages/admin/AdminSettings.jsx`  
**Acesso:** somente admin

**8 abas:**

#### Empresa
- Campos: nome, CNPJ, telefone, e-mail, WhatsApp, região, endereço
- Missão, Visão, Valores
- Redes sociais: Instagram, LinkedIn, Facebook
- Google Maps API Key (campo password)

#### Área de Atuação
- Componente `CoverageSettings`
- Tipo de cobertura: nenhuma / por estados / por cidades / por faixa de CEP
- Gerenciamento de lista de estados/cidades/ranges

#### Preços
- Frete base: R$/kg, R$/km, taxa fixa, frete mínimo
- Taxas adicionais: GRIS (%), Ad Valorem (%), TDE (R$/NF), TDA (R$/NF), Pedágio (R$/kg)
- Prazo de entrega: velocidade padrão (km/dia), tabela por estado (UF → dias úteis)
- Parâmetros financeiros: alíquota fiscal (%), depreciação mensal (R$)

#### Alertas
- Antecedência para CNH, CRLV, Seguro (dias antes do vencimento)

#### Agendamento
- Antecedência mínima (dias úteis)
- Dias de operação (checkboxes Seg-Dom)

#### Tabela de Rotas
- Grid editável: Origem UF → Destino UF → R$/kg, R$/km, taxa fixa, mínimo, prazo (dias)
- Campos em branco herdam da tabela padrão

#### Site Público
- Hero: título, subtítulo
- Texto "Sobre Nós"

#### Mensagens
- Lista de contatos recebidos pelo site
- Badge de não lidas, expandir para ler, marcar como lido

**Botão "Salvar":** `CompanySettings.update(id, form)` + `resetSettingsCache()`

---

### 3.25 Alertas (AlertsPage)

**Arquivo:** `src/pages/admin/AlertsPage.jsx`  
**Acesso:** somente admin

**Filtros:** nível (crítico/atenção/info), tipo (motorista/caminhão/pedido)  
**Lista de alertas ativos:** ícone por nível, mensagem, timestamp, badge de não lido  
**Ações por alerta:** "Ver" (link para o recurso), "Lido", "Resolver"

---

### 3.26 Documentos

**Arquivo:** `src/pages/admin/Documents.jsx`  
**Acesso:** somente admin

**Busca:** protocolo, NF, placa ou nome

**3 abas:**
- **Pedidos e Viagens:** tabela de NFs assinadas coletadas de `orders[].recipients[].items[].nf_signed_url`
  - Colunas: Protocolo, Cliente, Destinatário, NF nº, Data, botão Visualizar (abre URL em nova aba)
- **Frota:** por caminhão → CRLV / Seguro / Tacógrafo com badge de status e link
- **Motoristas:** por motorista → CNH com categoria, vencimento e badge

---

### 3.27 Mapa Operacional

**Arquivo:** `src/pages/admin/MapPage.jsx`  
**Acesso:** somente admin

**KPIs:** Viagens Ativas, Planejadas, Em Trânsito, Em Coleta  
**Placeholder visual:** grid de linhas representando mapa + mensagem "Integração com GPS em desenvolvimento"  
**Lista viagens em andamento:** progresso de paradas, próxima parada, link para detalhe  
**Lista pedidos em trânsito:** protocolo, cliente, status badge, link para detalhe

---

### 3.28 Simulador de Carregamento

**Arquivo:** `src/pages/admin/LoadingSimulator.jsx`  
**Rota:** dentro de `/admin/frota` (aba Simulador)  
**Acesso:** operador + admin

**Funcionalidade:**
- Seleciona um caminhão (dimensões reais do baú usadas)
- Adiciona pedidos confirmados/novos à simulação
- Visualização SVG 2D do baú em 3 vistas: Lateral / Topo / Frontal
- KPIs: peso carregado, volumes, % de capacidade
- Barra de progresso com cor (verde/âmbar/vermelho)
- Alerta visual se exceder capacidade

---

## PARTE 4 — APP DO MOTORISTA

---

### 4.1 Home do Motorista

**Arquivo:** `src/pages/driver/DriverHome.jsx`  
**Rota:** `/motorista`  
**Acesso:** somente motorista

**Cabeçalho:** Bem-vindo + nome do motorista, botão "Sair"

**Se sem viagem ativa:** tela vazia com link para histórico

**Se com viagem ativa:**
- Status badge (Em Andamento / Planejada)
- Informações: data/hora de saída, placa do caminhão
- Próxima parada: tipo badge, nome destinatário, endereço
- Botão grande (h-14) "Abrir no Google Maps" → URL `https://www.google.com/maps/dir/?api=1&destination={endereço}`
- Barra de progresso de paradas (concluídas/total)
- Botão grande (h-14) "Ver todas as paradas" → `/motorista/viagem/:id`

> Interface mobile com botões grandes (h-14), uso com uma mão — padrão de app de motorista TMS.

**Queries:** Driver filter by user_id, Trip filter by driver_id (ativa)

---

### 4.2 Detalhe da Viagem (Motorista)

**Arquivo:** `src/pages/driver/DriverTrip.jsx`  
**Rota:** `/motorista/viagem/:id`  
**Acesso:** somente motorista

**Checklist de saída** (topo, se ainda não concluído e viagem planejada/em andamento):
- 5 itens: pneus, luzes/setas, CRLV a bordo, carga amarrada, óleo/água
- Botão "Confirmar checklist" habilitado só com todos marcados → grava evento `type: "checklist"` em `trip.events`
- Após concluído: badge verde "Checklist de saída concluído"

**Lista de paradas** (em ordem):
- Por parada: número, tipo (Partida/Coleta/Entrega), destinatário, endereço
- Status visual: pendente / chegou (âmbar) / concluído (verde/opaco)
- Botão "Confirmar Chegada" (se pending + viagem in_progress) → stop.status = "arrived"
- Se status = "arrived":
  - **Entrega:** upload obrigatório de NF assinada (foto/PDF, câmera capturada)
  - **Coleta:** foto opcional
  - Textarea de observações (opcional)
  - Botão "Confirmar Entrega/Coleta" (desabilitado se entrega sem NF)
  - Aviso "Faça o upload da NF para continuar"
- Ao concluir parada:
  - Synca status do pedido (`in_transit` na coleta, `delivered` quando todos entregues)
  - Se entrega: salva `nf_signed_url` no recipient do pedido

**Footer fixo (se in_progress):** Botão "Registrar Ocorrência" (vermelho)

**Modal de Ocorrência:**
- Tipo*: avaria / atraso / tentativa sem sucesso / carga recusada / roubo / acidente / outro
- Descrição*
- Foto opcional (câmera)
- Submit → cria `Incident` no banco + registra evento no log da viagem

---

### 4.3 Histórico do Motorista

**Arquivo:** `src/pages/driver/DriverHistory.jsx`  
**Rota:** `/motorista/historico`  
**Acesso:** somente motorista

**Lista de viagens concluídas e canceladas** (mais recentes primeiro)  
**Por viagem:** data, qtd pedidos, placa, status badge  
**Expandir:** km real, lista de paradas com status e horário de conclusão

---

## PARTE 5 — COMPONENTES COMPARTILHADOS

---

### 5.1 FreightBreakdown

**Arquivo:** `src/components/shared/FreightBreakdown.jsx`  
**Uso:** QuoteForm, QuickQuote, BookingForm, NewOrder, OrderWorkspace

**Recebe:** objeto com resultado de `calculateFreightFull()`  
**Exibe:** tabela detalhada de todos os componentes do frete:
- Peso real vs. cubado vs. taxável
- Frete por peso, por distância, GRIS, Ad Valorem, TDE, TDA, Pedágio, Taxa Fixa
- Subtotal, Frete mínimo (se aplicado), **Total**
- Detalhes de cubagem por item (se houver dimensões)

---

### 5.2 FileUploadButton

**Arquivo:** `src/components/shared/FileUploadButton.jsx`  
**Uso:** DriverTrip (NF assinada, foto), Expenses (comprovante)

**Props:** `label`, `accept`, `capture`, `onUpload(url)`, `className`  
**Comportamento:** upload para Supabase Storage → chama `onUpload(publicUrl)`

---

### 5.3 NumericInput

**Arquivo:** `src/components/shared/NumericInput.jsx`  
**Uso:** AdminSettings (preços), Revenues, Expenses, NewOrder

**Props:** `currency` (máscara R$), `integer`, `value`, `onChange(numericValue)`, `placeholder`  
**Comportamento:** aceita apenas números, aplica máscara brasileira se `currency`

---

### 5.4 VeloxDatePicker

**Arquivo:** `src/components/public/VeloxDatePicker.jsx`  
**Uso:** BookingForm (passo 1)

**Props:** `value`, `onChange(dateStr)`, `settings` (company_settings)  
**Comportamento:**
- Bloqueia dias não operacionais (`working_days`)
- Bloqueia datas com menos de `min_advance_days` dias úteis a partir de hoje
- Interface de calendário visual

---

### 5.5 StatusBadge

**Arquivo:** `src/components/admin/StatusBadge.jsx`  
**Uso:** OrdersWorkspace, OrderWorkspace, DispatchBoard, NewTrip, ClientDetailPage, Drivers, Fleet

**Props:** `status`, `config` (opcional — `orderStatusConfig` padrão; também há configs de motorista/caminhão)  
**Exibe:** tag retangular corporativa com **ponto indicador** + label em português (pedidos e viagens)

---

### 5.5b DataTable

**Arquivo:** `src/components/shared/DataTable.jsx`  
**Uso:** Clients, Suppliers, Drivers, Fleet (e disponível para novas listas)

**Props:** `columns` (com `sortable`, `align`, `render`, `value`, `stopPropagation`), `data`, `searchKeys`, `onRowClick`, `initialSort`, `toolbar`, `footer`, `loading`, `emptyMessage`  
**Funcionalidade:** ordenação clicável por coluna (asc/desc/none), busca inline (`searchKeys`), cabeçalho corporativo, linha clicável, contagem de registros, skeleton no loading

---

### 5.5c FormSection / Field

**Arquivo:** `src/components/shared/FormSection.jsx`  
**Uso:** padrão de formulário (seções com cabeçalho + grade; `Field` com label acima, obrigatório/opcional, erro inline)

### 5.5d CollapsibleSection

**Arquivo:** `src/components/shared/CollapsibleSection.jsx`  
**Uso:** OrderWorkspace (seções da página de detalhe) — cabeçalho clicável com ícone, contador e ação à direita

---

### 5.6 WeekAvailabilityBanner

**Arquivo:** `src/components/admin/WeekAvailabilityBanner.jsx`  
**Uso:** componente legado — não montado nas telas atuais (a lista de pedidos virou `OrdersWorkspace`). Mantido para reuso.

**Exibe:** faixa horizontal com 7 dias, por dia mostra `availableKg` e cor por status  
**Queries:** orders (scheduled), trucks, schedule_blocks, company_settings

---

### 5.7 SmartScheduleModal

**Arquivo:** `src/components/schedule/SmartScheduleModal.jsx`  
**Uso:** componente legado da antiga Agenda — não montado no fluxo atual (substituído pelo quadro de `DispatchBoard`). Mantido para reuso.

**Funcionalidade:** sugere automaticamente a melhor data + caminhão para um pedido
- Calcula disponibilidade nos próximos 14 dias úteis
- Usa bin-packing para sugerir o caminhão com melhor aproveitamento
- Permite ao admin aceitar ou ajustar a sugestão

---

## PARTE 6 — ROTAS E REDIRECIONAMENTOS

### Rotas públicas
| Rota | Componente |
|------|-----------|
| `/` | LandingPage |
| `/agendar` | BookingForm |
| `/cotacao` | QuoteForm |
| `/calculadora` | QuickQuote |
| `/rastrear` | Tracking |
| `/login` | Login |
| `/cadastro` | Register |
| `/esqueci-senha` | ForgotPassword |
| `/redefinir-senha` | ResetPassword |

### Rotas admin
| Rota | Componente | Acesso |
|------|-----------|--------|
| `/admin` | **OperationsHub** | operador+ |
| `/admin/coletas` | **OrdersWorkspace** | operador+ |
| `/admin/coletas/nova` | NewOrder | operador+ |
| `/admin/coletas/:id` | **OrderWorkspace** | operador+ |
| `/admin/despacho` | **DispatchBoard** | operador+ |
| `/admin/frota` | FrotaPage | operador+ |
| `/admin/frota/:id` | TruckDetailPage | operador+ |
| `/admin/motoristas/:id` | DriverDetailPage | operador+ |
| `/admin/viagens` | Trips | operador+ |
| `/admin/viagens/nova` | NewTrip | operador+ |
| `/admin/viagens/:id` | TripDetailPage | operador+ |
| `/admin/cadastros` | CadastrosPage | operador+ |
| `/admin/clientes/:id` | ClientDetailPage | operador+ |
| `/admin/financeiro` | FinanceiroPage | admin only |
| `/admin/config` | ConfigPage | admin only |

### Redirecionamentos legados
| URL antiga | Redireciona para |
|-----------|-----------------|
| `/admin/agenda`, `/admin/programacao`, `/admin/operacoes` | `/admin/despacho` |
| `/admin/pedidos`, `/admin/pedidos/:id` | `/admin/coletas` |
| `/admin/configuracoes` | `/admin/config` |
| `/admin/motoristas`, `/admin/carregamento` | `/admin/frota` |
| `/admin/alertas`, `/admin/documentos`, `/admin/mapa` | `/admin/config` |

### Rotas motorista
| Rota | Componente |
|------|-----------|
| `/motorista` | DriverHome |
| `/motorista/viagem/:id` | DriverTrip |
| `/motorista/historico` | DriverHistory |

---

## PARTE 7 — SEGURANÇA (RLS Supabase)

| Tabela | Leitura pública | Escrita pública | Acesso autenticado |
|--------|----------------|-----------------|-------------------|
| `orders` | ✅ (todos) | ✅ (insert) | ✅ full |
| `company_settings` | ✅ | ❌ | ✅ full |
| `testimonials` | ✅ (active=true) | ❌ | ✅ full |
| `clients` | ✅ (active=true) | ❌ | ✅ full |
| `contact_messages` | ❌ | ✅ (insert) | ✅ full |
| Demais tabelas | ❌ | ❌ | ✅ full |

Políticas: `authenticated users full access` em todas as tabelas + políticas específicas de leitura pública acima.

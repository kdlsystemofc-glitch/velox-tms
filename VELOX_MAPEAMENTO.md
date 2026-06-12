# VELOX_MAPEAMENTO.md — Mapeamento Completo de Telas e Componentes

> Mapeamento granular de cada tela: rota, acesso, campos, botões, estados, queries e comportamentos especiais.

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
  - `base44.functions.invoke("generateProtocol")` → protocolo
  - `base44.entities.Order.create({...formData, status: "new"})`
  - Exibe protocolo gerado + opção de copiar

**Comportamentos especiais:**
- Se vier de `/cotacao` com `location.state.prefill`: pré-preenche com dados da cotação
- Form reseta após submissão bem-sucedida (toast 5s)

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

**Sidebar links:**
- Dashboard (`/admin`)
- Coletas (`/admin/coletas`)
- Agenda (`/admin/agenda`)
- Frota (`/admin/frota`)
- Viagens (`/admin/viagens`)
- Cadastros (`/admin/cadastros`)
- Financeiro (`/admin/financeiro`) — somente admin
- Configurações (`/admin/configuracoes`)

---

### 3.1 Dashboard

**Arquivo:** `src/pages/admin/Dashboard.jsx`  
**Rota:** `/admin`  
**Acesso:** operador + admin

**KPIs (cards):**
- Pedidos Novos (status=new, hoje)
- Em Coleta Hoje (status=collecting, scheduled_date=hoje)
- Entregues Hoje (status=delivered, updated_date=hoje)
- Alertas Ativos (alerts não resolvidos)
- **Somente admin:** A Receber (receitas status=receivable), A Pagar (despesas status=pending)

**Calendário semanal:** 7 dias a partir de hoje, com `getAvailabilityForDate()` para cada dia, cor por status (verde/âmbar/vermelho/cinza)

**Tabela de pedidos recentes:** últimos 10 pedidos, com protocolo, cliente, data, status

**Alertas panel:** `AlertsPanel` com alertas críticos e de atenção

**Banners urgentes:**
- Novos pedidos sem confirmar → "X pedidos aguardando confirmação"
- Receitas em atraso → "X receitas em atraso"
- Alertas críticos → "X alertas críticos"

**onMount:** `base44.functions.invoke("syncAlerts", { trucks, drivers, settings })`

**Queries:** orders, trucks, drivers, schedule_blocks, company_settings, alerts, revenues, expenses

---

### 3.2 Lista de Pedidos

**Arquivo:** `src/pages/admin/Orders.jsx`  
**Rota:** `/admin/coletas`  
**Acesso:** operador + admin

**Componentes no topo:** `WeekAvailabilityBanner` — banner com disponibilidade dos próximos 7 dias

**Filtros:**
- Busca por texto (protocolo, cliente, origem, destino)
- Filtro status (todos/new/confirmed/collecting/in_transit/delivered/cancelled)
- Filtro tipo (CIF/FOB)

**Tabela colunas:** Protocolo, Cliente, Origem→Destinos, Data coleta, Peso/Volumes, Status, Frete  
**Rodapé:** totais de peso, volumes, valor de frete dos pedidos filtrados  
**Click na linha:** navega para `/admin/coletas/:id`

**Queries:** orders (list, -created_date, 200)

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
- Por item: descrição, NF, volumes, peso, dimensões, valor declarado

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

### 3.4 Detalhe de Pedido

**Arquivo:** `src/pages/admin/OrderDetailPage.jsx`  
**Rota:** `/admin/coletas/:id` ou `/admin/pedidos/:id`  
**Acesso:** operador + admin

**Layout:** timeline de status horizontal no topo + corpo principal + sidebar direita

**Timeline de status:** mostra todas as transições de `status_history` com timestamps

**Seção Destinatários:**
- Collapsible por destinatário
- Tabela de itens (NF, descrição, volumes, peso, dimensões, valor declarado)
- Badge de delivery_status por destinatário
- Botão "Ver NF assinada" se disponível

**Seção Incidentes:**
- Lista de `incidents` vinculados ao pedido
- Botão "Registrar Incidente" (modal)

**Seção Histórico:** log completo de `status_history`

**Sidebar direita:**
- Motorista e Caminhão (select editáveis)
- Valor do frete + calculadora inline (abre/fecha)
- Botão "Usar este valor"
- Campo CT-e (editável inline)
- Status de pagamento + método
- Observações
- Botão "Cancelar Pedido" (somente admin)
- Botão "Comprovante PDF" (somente quando `status = "delivered"`)
  - Chama `generateDeliveryReceipt(order, trip, company)` → download do blob

**Confirmação de pedido:**
- Botão "Confirmar Pedido" (status: new → confirmed)
- Ao confirmar: opcionalmente chama `calculateDistance` via Google Maps
- Cria Revenue `receivable` automaticamente

**Queries:** orders filter by id, trips filter by order_id, company_settings

---

### 3.5 Agenda

**Arquivo:** `src/pages/admin/AgendaPage.jsx`  
**Rota:** `/admin/agenda`  
**Acesso:** operador + admin

**3 abas:**

#### Aba "Aguardando" (fila de aprovação)
- Lista de pedidos com `status = "new"` ou `schedule_status = "pending"`
- Por pedido: protocolo, cliente, data solicitada, peso, frete estimado
- Sugestão automática de caminhão: `suggestTruckForOrder()` (bin-packing)
- Botão "Confirmar": abre Sheet de agendamento manual
  - Campos no Sheet: data de coleta (date picker), caminhão (select com capacidade), valor do frete, forma de pagamento
  - Ao salvar: `order.update({ status: "confirmed", scheduled_date, scheduled_truck_id, freight_value })` + Revenue criado
- Botão "Recusar": cancela o pedido
- Botão ⚡ (raio): abre `SmartScheduleModal` para auto-agendamento

#### Aba "Programado" (calendário semanal)
- Grid de 7 dias × caminhões ativos
- Por célula: pedidos programados para aquela data/caminhão
- Indicador de % de capacidade usada
- Click em pedido → `OrderDetailPanel`

#### Aba "Em Rota" (viagens ativas)
- Lista de trips com `status = "in_progress"`
- Progresso: paradas concluídas / total
- Próxima parada
- Link para detalhe da viagem

**Queries:** orders, trucks, drivers, schedule_blocks, company_settings

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

**Filtro:** busca por placa ou modelo  
**Cards de caminhão:**
- Placa (destaque), status badge, alerta visual "Doc. vencendo" (≤60 dias)
- Fabricante, modelo, ano, tipo, capacidade
- Botão "Ver detalhes" → `/admin/frota/:id`

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

**Filtro:** busca por nome ou CPF  
**Tabela:** Nome (com alerta CNH vencendo ≤60d), CPF, CNH (categoria/vencimento), Telefone, Status  
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

**3 seções:**

1. **Pedidos para a viagem**
   - Lista pedidos com `status = "confirmed"` e sem `trip_id`
   - Checkboxes de seleção
   - Totais: pedidos, kg, receita

2. **Equipe e Veículo**
   - Select Motorista (filtrado: `status = "active"`)
   - Select Caminhão (filtrado: `status = "available"`)
   - Alerta visual se peso exceder capacidade do caminhão

3. **Agendamento**
   - Data/hora de saída (datetime-local)
   - Observações
   - Checkbox "Iniciar imediatamente"

**Submit:** cria Trip + atualiza orders com `trip_id` + navega para `/admin/viagens/:id`

---

### 3.12 Detalhe de Viagem

**Arquivo:** `src/pages/admin/TripDetailPage.jsx`  
**Rota:** `/admin/viagens/:id`  
**Acesso:** operador + admin

**Cabeçalho:** driver + placa + status badge  
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

**Busca:** nome ou CNPJ  
**Cards de cliente:** nome, código CLI, CNPJ, e-mail, telefone, status, tipo (PJ/PF/Recorrente/Eventual)  
**Botão "Ver detalhes":** abre Sheet lateral com dados completos, endereço, contatos  
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
**Sidebar:** últimos 5 pedidos com status  
**Fatura mensal:** se `billing_type = "monthly"` → card informativo + botão "Fechar fatura":
- Modal mostra pedidos do mês, total, data de fechamento, data de vencimento
- "Gerar fatura" → `Revenue.create()` com vencimento calculado

---

### 3.16 Lista de Fornecedores

**Arquivo:** `src/pages/admin/Suppliers.jsx`  
**Rota:** dentro de `/admin/cadastros?aba=fornecedores`  
**Acesso:** operador + admin

**Cards:** nome, código FOR, categoria, contato principal, telefone, e-mail  
**Botão editar:** abre Dialog de edição inline

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

**KPIs:** Total a receber, Total recebido  
**Filtros:** busca por descrição, filtro de status (a receber/recebido/atrasado)  
**Tabela:** Descrição, Valor, Vencimento, Status, Ação  
**Botão "Recebido"** (se receivable): `Revenue.update(id, { status: "received", received_date })` 
**Dialog "Nova Receita":** Descrição*, Valor*, Vencimento*, Forma de pagamento

---

### 3.20 Despesas

**Arquivo:** `src/pages/admin/Expenses.jsx`  
**Acesso:** somente admin

**KPIs:** Total a pagar, Total pago  
**Filtros:** busca, filtro de categoria  
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
**Rota:** `/admin/configuracoes`  
**Acesso:** somente admin  
**Abas:** Empresa | Alertas (badge de contagem) | Documentos | Mapa

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
- Botão "Abrir no Google Maps" → URL `https://www.google.com/maps/dir/?api=1&destination={endereço}`
- Contador de paradas concluídas/total
- Botão "Ver todas as paradas" → `/motorista/viagem/:id`

**Queries:** Driver filter by user_id, Trip filter by driver_id (ativa)

---

### 4.2 Detalhe da Viagem (Motorista)

**Arquivo:** `src/pages/driver/DriverTrip.jsx`  
**Rota:** `/motorista/viagem/:id`  
**Acesso:** somente motorista

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
**Uso:** QuoteForm, QuickQuote, BookingForm, NewOrder, OrderDetailPage

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
**Uso:** Orders, NewTrip, ClientDetailPage, AgendaPage

**Props:** `status`  
**Exibe:** badge colorido com label em português para cada status de pedido

---

### 5.6 WeekAvailabilityBanner

**Arquivo:** `src/components/admin/WeekAvailabilityBanner.jsx`  
**Uso:** Orders.jsx (topo)

**Exibe:** faixa horizontal com 7 dias, por dia mostra `availableKg` e cor por status  
**Queries:** orders (scheduled), trucks, schedule_blocks, company_settings

---

### 5.7 SmartScheduleModal

**Arquivo:** `src/components/schedule/SmartScheduleModal.jsx`  
**Uso:** AgendaPage

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
| `/admin` | Dashboard | operador+ |
| `/admin/coletas` | Orders | operador+ |
| `/admin/coletas/novo` | NewOrder | operador+ |
| `/admin/coletas/:id` | OrderDetailPage | operador+ |
| `/admin/agenda` | AgendaPage | operador+ |
| `/admin/frota` | FrotaPage | operador+ |
| `/admin/frota/:id` | TruckDetailPage | operador+ |
| `/admin/motoristas/:id` | DriverDetailPage | operador+ |
| `/admin/viagens` | Trips | operador+ |
| `/admin/viagens/nova` | NewTrip | operador+ |
| `/admin/viagens/:id` | TripDetailPage | operador+ |
| `/admin/cadastros` | CadastrosPage | operador+ |
| `/admin/clientes/:id` | ClientDetailPage | operador+ |
| `/admin/financeiro` | FinanceiroPage | admin only |
| `/admin/configuracoes` | ConfigPage | admin only |

### Redirecionamentos legados (URLs antigas do Base44)
| URL antiga | Redireciona para |
|-----------|-----------------|
| `/admin/pedidos` | `/admin/coletas` |
| `/admin/pedidos/:id` | `/admin/coletas/:id` |
| `/admin/frota/motoristas` | `/admin/frota?tab=motoristas` |

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

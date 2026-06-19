# VELOX_SYSTEM.md — Documento Geral do Sistema

> Descreve a visão de negócio, entidades, regras e módulos do Velox TMS.

---

## 1. Visão de negócio

**Velox Transportadora** é uma empresa de transporte rodoviário de carga com ~3 carretas. O TMS foi construído para centralizar:

- Recebimento e acompanhamento de pedidos (interno e via site público)
- Programação eficiente das viagens, maximizando a ocupação das carretas
- Controle financeiro integrado (frete → receita → DRE)
- Visibilidade para clientes (rastreamento por protocolo)
- App de campo para motoristas (sem papel)

---

## 2. Módulos implementados

| Módulo | Rota admin | Descrição |
|--------|-----------|-----------|
| **Operações** | `/admin` | Torre de controle: fila de ação, pipeline clicável, operação de hoje, frota agora |
| **Pedidos** | `/admin/coletas` | Fila do pipeline em abas (Novos→Entregues) com ações inline (confirmar/recusar/despachar) |
| Nova Coleta | `/admin/coletas/novo` | **Assistente (wizard) de 4 passos** padrão TMS: Remetente/coleta → Cargas/NF-e (importar XMLs + agrupar por CNPJ, colar chaves) → Cotação/pagamento → Atribuição/revisão. Defaults do cliente, "repetir último pedido", painel de cotação ao vivo (peso taxável, composição do frete, prazo, ocupação do veículo) |
| **Pedido (workspace)** | `/admin/coletas/:id` | Stepper de ciclo de vida + ação primária + abas (Resumo/Cargas/Financeiro/Ocorrências/Histórico) |
| **Despacho** | `/admin/despacho` | Quadro caminhões × dias: fila → célula → cria viagem |
| Frota | `/admin/frota` | Caminhões, motoristas, simulador |
| Detalhe de Caminhão | `/admin/frota/:id` | Documentos, manutenções, km, dimensões |
| Viagens | `/admin/viagens` | Lista por status (ativas/planejadas/concluídas) |
| Nova Viagem | `/admin/viagens/nova` | Agrupamento de pedidos + equipe + agendamento |
| Detalhe de Viagem | `/admin/viagens/:id` | Paradas, eventos, encerramento com custos |
| Cadastros | `/admin/cadastros` | Clientes e Fornecedores |
| Detalhe de Cliente | `/admin/clientes/:id` | Dados, contatos, histórico, fatura mensal |
| Financeiro | `/admin/financeiro` | Resumo, receitas, despesas, DRE, fluxo de caixa |
| Configurações | `/admin/configuracoes` | Empresa, preços, cobertura, alertas, site, agendamento, rotas, mensagens |
| Site público | `/` | Landing page, cotação, agendamento, rastreamento |
| App Motorista | `/motorista` | Home com viagem ativa, detalhe de paradas, histórico |

### Padrão de formulários (cadastros)

Todos os diálogos de criação/edição (Caminhão, Motorista, Fornecedor, **Cliente**, Despesa) usam o padrão `FormSection`/`Field` (`src/components/shared/FormSection.jsx`): seções com título + ícone, label sempre acima do campo, obrigatório marcado, grid responsivo, cabeçalho e rodapé fixos (sticky) com botões Cancelar/Salvar. Campos numéricos com decimais usam `NumericInput` (aceita vírgula **e** ponto). Feedback de salvar: toast com ícone/cor de confirmação + estado verde "Salvo!" no botão.

**Endereço inteligente:** todos os campos de endereço usam o componente `AddressFields` (`src/components/shared/AddressFields.jsx`) — CEP com **autofill via ViaCEP** (preenche rua/bairro/cidade/UF) + Número/Complemento. Usado em Cliente, Motorista, Fornecedor e na origem/destinatários da Nova Coleta. O endereço do **fornecedor** passou a ser **estruturado** (`suppliers.address` é JSONB; migração `20260617_supplier_address_jsonb.sql` converte dados antigos em texto para `{street}`).

**Campos por cadastro (resumo):**
- **Caminhão:** identificação (placa, tipo, fabricante, modelo, ano, cor, RENAVAM, chassi), capacidade + dimensões, documentação (CRLV, seguro, tacógrafo último/próximo), km + alertas de manutenção, observações.
- **Motorista:** dados pessoais, CNH, contrato (função, tipo, admissão, salário, status), endereço, dados bancários (banco/agência/conta/PIX), observações.
- **Fornecedor:** identificação, **endereço estruturado (autofill CEP)**, contato principal, financeiro (condições de pagamento, PIX), observações. *(colunas: `address` JSONB, `payment_terms`, `pix_key`)*
- **Despesa:** despesa (categoria, valor, descrição), pagamento (situação, forma, competência, vencimento/data de pagamento), vínculos (fornecedor, veículo, motorista), comprovante + observações.
- **Cliente:** + Inscrição Estadual (`state_registration`) para PJ.

---

## 3. Entidades do banco de dados (15 tabelas)

### 3.1 `orders` (Pedidos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `protocol` | text unique | `VLX-{ano}-{5 dígitos}` |
| `status` | text | `new` / `confirmed` / `collecting` / `in_transit` / `delivered` / `cancelled` |
| `schedule_status` | text | `pending` / `scheduled` / `cancelled` |
| `client_name` | text | Nome do remetente |
| `client_cpf_cnpj` | text | CNPJ/CPF do remetente |
| `client_id` | uuid FK → clients | Referência ao cadastro de cliente |
| `client_phone` | text | Telefone do remetente |
| `client_email` | text | E-mail do remetente |
| `freight_type` | text | `cif` / `fob` |
| `transport_modal` | text | `road` / `urgent_road` / `air` |
| `collection_date` | date | Data solicitada de coleta |
| `scheduled_date` | date | Data confirmada pelo admin |
| `scheduled_truck_id` | uuid FK → trucks | Caminhão programado |
| `origin` | jsonb | `{cep, street, number, complement, neighborhood, city, state}` |
| `recipients` | jsonb[] | Array de destinatários (ver subestrutura abaixo) |
| `total_weight_kg` | numeric | Peso total calculado |
| `total_volumes` | integer | Total de volumes |
| `freight_value` | numeric | Valor do frete calculado |
| `payment_method` | text | `pix` / `boleto` / `transfer` / `cash` |
| `payment_status` | text | `pending` / `paid` / `overdue` |
| `payment_term` | text | Condição (ex: `30 dias`) |
| `notes` | text | Observações internas |
| `driver_id` | uuid FK → drivers | — |
| `truck_id` | uuid FK → trucks | — |
| `trip_id` | uuid FK → trips | — |
| `cte_number` | text | Número do CT-e |
| `status_history` | jsonb[] | `[{status, timestamp, user, note}]` |
| `created_date` | timestamptz | — |
| `updated_date` | timestamptz | — |

**Subestrutura de recipient:**
```json
{
  "name": "Empresa Destino",
  "cpf_cnpj": "00.000.000/0001-00",
  "phone": "...",
  "email": "...",
  "cep": "...",
  "street": "...",
  "number": "...",
  "complement": "...",
  "neighborhood": "...",
  "city": "...",
  "state": "SP",
  "delivery_status": "pending|delivered",
  "nf_signed_url": "https://...",
  "items": [
    {
      "description": "...",
      "nf_number": "...",
      "volumes": 2,
      "weight_kg": 100,
      "height_cm": 50,
      "width_cm": 60,
      "length_cm": 80,
      "declared_value": 5000,
      "package_type": "caixa|palete|tambor|bobina|fardo|saco|outro",
      "nf_signed_url": "https://..."
    }
  ]
}
```

---

### 3.2 `trucks` (Caminhões)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `plate` | text unique | Placa (formato ABC-1234) |
| `model` | text | Ex: Actros 2651 |
| `manufacturer` | text | Ex: Mercedes-Benz |
| `year` | integer | — |
| `truck_type` | text | `carreta` / `truck` / `vuc` / `toco` / `bitruck` / `outro` |
| `color` | text | — |
| `renavam` | text | — |
| `capacity_kg` | integer | Capacidade em kg |
| `status` | text | `available` / `on_route` / `maintenance` / `inactive` |
| `main_driver_id` | uuid FK → drivers | Motorista titular |
| `crlv_expiry` | date | Vencimento do CRLV |
| `insurance_expiry` | date | Vencimento do seguro |
| `tachograph_next` | date | Próxima aferição do tacógrafo |
| `total_km` | integer | Quilometragem atual (odômetro) |
| `km_alert_oil` | integer | Intervalo para troca de óleo (km) |
| `km_alert_review` | integer | Intervalo para revisão (km) |
| `km_alert_tires` | integer | Intervalo para pneus (km) |
| `dimensions` | jsonb | `{length_m, width_m, height_m}` |
| `maintenance_history` | jsonb[] | `[{type, date, km, description, amount, provider, provider_id, next_date, created_at}]` |
| `created_date` | timestamptz | — |

---

### 3.3 `drivers` (Motoristas)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `name` | text | Nome completo |
| `cpf` | text | CPF |
| `phone` | text | — |
| `email` | text | — |
| `birth_date` | date | — |
| `hire_date` | date | Data de admissão |
| `cnh_number` | text | Número da CNH |
| `cnh_category` | text | A/B/C/D/E/AB/AC/AD/AE |
| `cnh_expiry` | date | Vencimento da CNH |
| `role` | text | `motorista` / `ajudante` / `administrativo` |
| `contract_type` | text | `clt` / `pj` / `diarista` |
| `base_salary` | numeric | Salário base |
| `commission_percent` | numeric | % de comissão sobre a receita da viagem (acerto no encerramento) — Fase 6 |
| `status` | text | `active` / `away` / `terminated` |
| `user_id` | uuid FK → auth.users | Vínculo com usuário Supabase |
| `created_date` | timestamptz | — |

---

### 3.4 `clients` (Clientes)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `code` | text | `CLI{00001}` (auto-gerado) |
| `company_name` | text | Razão Social ou Nome |
| `cpf_cnpj` | text | — |
| `type` | text | `pj` / `pf` |
| `email` | text | — |
| `phone` | text | — |
| `status` | text | `active` / `inactive` |
| `client_type` | text | `recorrente` / `eventual` |
| `billing_type` | text | `per_trip` / `monthly` |
| `billing_day` | integer | Dia de fechamento (1-28), se `monthly` |
| `payment_term_days` | integer | Prazo de pagamento em dias |
| `notes` | text | Observações |
| `address` | jsonb | `{cep, street, number, complement, neighborhood, city, state}` |
| `contacts` | jsonb[] | `[{name, role, phone, whatsapp, email, is_primary}]` |
| `pricing` | jsonb | Tabela de preços personalizada (prioridade máxima no cálculo) |
| `created_date` | timestamptz | — |

---

### 3.5 `trips` (Viagens)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `status` | text | `planned` / `in_progress` / `completed` / `cancelled` |
| `driver_id` | uuid FK → drivers | — |
| `driver_name` | text | Desnormalizado |
| `truck_id` | uuid FK → trucks | — |
| `truck_plate` | text | Desnormalizado |
| `order_ids` | uuid[] | IDs dos pedidos vinculados |
| `order_protocols` | text[] | Protocolos desnormalizados |
| `stops` | jsonb[] | `[{type, order_id, recipient_name, address, city, state, status, arrived_at, completed_at, nf_signed_url, notes, photo_url}]` |
| `events` | jsonb[] | `[{type, description, timestamp, user, photo_url}]` |
| `departure_date` | timestamptz | — |
| `arrival_date` | timestamptz | — |
| `total_revenue` | numeric | Soma dos fretes dos pedidos |
| `real_km` | numeric | KM real percorrido (preenchido no encerramento) |
| `fuel_liters` | numeric | — |
| `fuel_cost` | numeric | — |
| `tolls_cost` | numeric | — |
| `other_costs` | jsonb[] | `[{description, amount}]` |
| `total_cost` | numeric | Custo total (calculado no encerramento) |
| `net_profit` | numeric | Receita - Custo |
| `advance_amount` | numeric | Adiantamento (vale-frete) pago ao motorista antes da saída |
| `commission_amount` | numeric | Comissão do motorista calculada no encerramento (% × receita) — Fase 6 |
| `advance_date` | date | Data do adiantamento |
| `notes` | text | — |
| `created_date` | timestamptz | — |

---

### 3.6 `expenses` (Despesas)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `category` | text | `fuel` / `maintenance` / `tires` / `tolls` / `salaries` / `taxes` / `insurance` / `rent` / `administrative` / `marketing` / `other` |
| `description` | text | — |
| `amount` | numeric | — |
| `date` | date | Data da despesa |
| `due_date` | date | Vencimento (para `pending`) |
| `status` | text | `pending` / `paid` / `installment` |
| `payment_method` | text | `pix` / `boleto` / `transfer` / `card` / `cash` |
| `paid_date` | date | Data do pagamento efetivo |
| `receipt_url` | text | URL do comprovante |
| `trip_id` | uuid FK → trips | — |
| `truck_id` | uuid FK → trucks | — |
| `notes` | text | — |
| `created_date` | timestamptz | — |

---

### 3.7 `revenues` (Receitas)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `description` | text | Ex: `Frete VLX-2026-00042` |
| `amount` | numeric | — |
| `due_date` | date | Vencimento |
| `received_date` | date | Data de recebimento efetivo |
| `status` | text | `receivable` / `received` / `overdue` / `cancelled` (estorno) |
| `payment_method` | text | `pix` / `boleto` / `transfer` / `cash` |
| `order_id` | uuid FK → orders | — |
| `client_id` | uuid FK → clients | — |
| `created_date` | timestamptz | — |

**Regras de negócio da receita de frete:**
- Criada automaticamente na confirmação do pedido via `ensureRevenueForOrder()` — **uma única receita ativa por pedido** (verificação por `order_id` evita duplicatas entre Agenda, Detalhe do Pedido e programação automática).
- Ao **cancelar/recusar** um pedido, as receitas pendentes (`receivable`/`overdue`) são estornadas para `cancelled` via `cancelRevenuesForOrder()`. Receitas já `received` não são tocadas.
- O cancelamento de pedido pelo painel exige **motivo**, gravado no `status_history`.

---

### 3.8 `incidents` (Incidentes)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `order_id` | uuid FK → orders | — |
| `trip_id` | uuid FK → trips | — |
| `type` | text | `avaria` / `atraso` / `tentativa_entrega` / `carga_recusada` / `roubo` / `acidente` / `outro` |
| `description` | text | — |
| `status` | text | `open` / `resolved` |
| `photo_urls` | text[] | — |
| `reported_by_name` | text | — |
| `reported_by_role` | text | `motorista` / `admin` |
| `resolution` | text | Como foi resolvido |
| `created_date` | timestamptz | — |

---

### 3.9 `alerts` (Alertas)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `type` | text | `cnh_expiry` / `crlv_expiry` / `insurance_expiry` / `km_oil` / `km_review` / `km_tires` / `overdue_revenue` / `new_order` |
| `level` | text | `critical` / `warning` / `info` |
| `message` | text | Mensagem para o admin |
| `reference_type` | text | `driver` / `truck` / `order` |
| `reference_id` | uuid | ID do objeto referenciado |
| `resolved` | boolean | — |
| `read` | boolean | — |
| `created_date` | timestamptz | — |

---

### 3.10 `company_settings` (Configurações da Empresa)

Tabela com **uma única linha**. Campos principais:

| Grupo | Campos |
|-------|--------|
| Empresa | `company_name`, `cnpj`, `phone`, `email`, `whatsapp`, `address`, `region`, `mission`, `vision`, `values` |
| Redes Sociais | `social_instagram`, `social_linkedin`, `social_facebook` |
| Preços base | `pricing: {price_per_kg, price_per_km, fixed_fee, minimum_freight, gris_percent, ad_valorem_percent, tde_per_nf, tda_per_nf, toll_per_kg, `**`pickup_fee, cubage_factor, urgent_percent, dedicated_percent`**`}` (Fase 4) |
| Tabela por corredor | `route_pricing: [{origin_state, dest_state, price_per_kg, price_per_km, fixed_fee, minimum_freight, gris_percent, tde_per_nf, tda_per_nf, toll_per_kg, delivery_days, active, `**`valid_from, valid_until`**`}]` — vigência aplicada pela data de coleta (Fase 4) |
| Prazo de entrega | `km_per_day` (fallback), `delivery_days_table: [{state, days}]` |
| Financeiro | `tax_rate_percent`, `monthly_depreciation` |
| Alertas | `alert_days_cnh`, `alert_days_crlv`, `alert_days_insurance` |
| Agendamento | `working_days` (array int 0-6), `min_advance_days` |
| Captação (Fase 3) | `collection_model` (`detailed`/`simple`/`both`) — modo inicial da Nova Coleta |
| Cobertura | `coverage_type` (`none`/`states`/`cities`/`cep_range`), `coverage_states`, `coverage_cities`, `coverage_cep_ranges` |
| Site público | `hero_title`, `hero_subtitle`, `about_text` |
| API | `google_maps_api_key` |

---

### 3.11 `testimonials` (Depoimentos)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `name` | text | Nome do autor |
| `company` | text | — |
| `text` | text | Depoimento |
| `rating` | integer | 1-5 |
| `active` | boolean | Exibir no site |
| `created_date` | timestamptz | — |

---

### 3.12 `user_profiles` (Perfis de Usuário)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | = `auth.users.id` |
| `full_name` | text | — |
| `email` | text | — |
| `role` | text | `admin` / `operador` / `motorista` |
| `created_date` | timestamptz | — |

---

### 3.13 `schedule_blocks` (Bloqueios de Agenda)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `date` | date | Data bloqueada |
| `truck_id` | uuid FK → trucks | Nulo = bloqueio global |
| `block_type` | text | `full_block` / `partial` |
| `remaining_kg` | numeric | Kg ainda disponíveis (se `partial`) |
| `reason` | text | — |
| `created_date` | timestamptz | — |

---

### 3.14 `suppliers` (Fornecedores)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `code` | text | `FOR{00001}` (auto-gerado) |
| `name` | text | — |
| `cnpj_cpf` | text | — |
| `category` | text | `fuel` / `maintenance` / `tires` / `insurance` / `other` |
| `contact_name` | text | Contato principal |
| `phone` | text | — |
| `whatsapp` | text | — |
| `email` | text | — |
| `notes` | text | — |
| `active` | boolean | — |
| `contacts` | jsonb[] | `[{name, role, phone, whatsapp, email, is_primary}]` |
| `created_date` | timestamptz | — |

---

### 3.15 `contact_messages` (Mensagens do Site)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid PK | — |
| `name` | text | — |
| `email` | text | — |
| `phone` | text | — |
| `message` | text | — |
| `read` | boolean | Lida pelo admin |
| `created_date` | timestamptz | — |

---

## 4. Regras de negócio implementadas

### 4.1 Cálculo de frete

**Arquivo:** `src/utils/freightCalculator.js`

**Fórmula completa:**
```
Peso taxável = MAX(Peso real total, Peso cubado total)
Peso cubado por item = (H × W × L / 6000) × volumes

Frete por peso    = Peso taxável × R$/kg
Frete por km      = Distância km × R$/km
GRIS              = Valor declarado total × (gris_percent / 100)
Ad Valorem        = Valor declarado total × (ad_valorem_percent / 100)
TDE               = tde_per_nf × quantidade de NFs
TDA               = tda_per_nf × quantidade de NFs
Pedágio           = Peso taxável × toll_per_kg
Taxa fixa         = fixed_fee

Subtotal = soma de todos os componentes
Total    = MAX(subtotal, minimum_freight)
```

**Prioridade de tabela de preços:**
1. `client.pricing` (tabela personalizada do cliente)
2. `route_pricing` (tabela por corredor de origem→destino)
3. `settings.pricing` (tabela padrão da empresa)

### 4.2 Protocolo de pedido

Formato: `VLX-{ano}-{NNNNN}` (sequencial por ano, 5 dígitos com zeros à esquerda)  
Exemplo: `VLX-2026-00042`  
Gerado pela função `generateProtocol()` em `supabaseClient.js`: consulta o maior protocolo do ano no banco e incrementa. Fallback aleatório com verificação de colisão se a consulta falhar. Retorna `{ data: { protocol } }`.

### 4.3 Fluxo de status de pedido

```
new → confirmed → collecting → in_transit → delivered
                                         ↑
                             (qualquer estado) → cancelled
```

| Transição | Quem / Quando |
|-----------|--------------|
| `new` | Criado (público ou interno) |
| `confirmed` | Admin confirma na Agenda |
| `collecting` | Trip iniciada (admin ou motorista) |
| `in_transit` | Parada de coleta concluída |
| `delivered` | Todos os destinatários entregues |
| `cancelled` | Admin cancela |

### 4.4 Disponibilidade de frota

**Arquivo:** `src/utils/availabilityChecker.js`

- Calcula kg disponível por data, por caminhão
- Considera: pedidos programados (`schedule_status = "scheduled"`) + bloqueios (`ScheduleBlock`)
- Status: `available` (≥40% livre e ≥500 kg), `limited` (<40%), `full` (<500 kg), `blocked`
- Dias não operacionais: baseados em `settings.working_days`

### 4.5 Bin-packing (sugestão de caminhão)

**Em:** `src/pages/admin/AgendaPage.jsx` — `suggestTruckForOrder()`

Algoritmo:
1. Para cada caminhão ativo, calcula kg disponíveis na data alvo
2. Soma o peso do pedido a ser programado
3. Sugere o caminhão que resultará na menor folga (mais ocupado mas sem exceder)
4. Garante que não excede a capacidade

### 4.6 Sistema de alertas

**Em:** `supabaseClient.js` — `syncAlerts()`

Verifica e cria alertas para:
- CNH vencendo (configurável em `alert_days_cnh`, padrão 60 dias antes)
- CRLV vencendo (`alert_days_crlv`, padrão 60 dias)
- Seguro vencendo (`alert_days_insurance`, padrão 30 dias)
- Km de troca de óleo (`km_alert_oil` do caminhão)
- Km de revisão (`km_alert_review`)
- Km de pneus (`km_alert_tires`)
- Receitas em atraso (status `receivable` com `due_date` passado)

Chamado automaticamente no mount do Dashboard.

### 4.7 Verificação de cobertura

**Arquivo:** `src/utils/coverageChecker.js`

Modos:
- `none` — sem restrição (padrão)
- `states` — lista de UFs permitidas
- `cities` — lista de cidades+UF permitidas
- `cep_range` — ranges de CEP

Usado no BookingForm para bloquear agendamentos fora da área de atuação.

### 4.8 Prazo de entrega

**Em:** `src/utils/freightCalculator.js` — `getDeliveryDaysByState()`

Prioridade:
1. `route_pricing[rota].delivery_days`
2. `delivery_days_table[state].days`
3. `Math.ceil(distanceKm / km_per_day)` (fallback, padrão 600 km/dia)

---

## 5. Permissões por papel

| Funcionalidade | admin | operador | motorista |
|----------------|-------|----------|-----------|
| Ver pedidos | ✅ | ✅ | ❌ |
| Criar pedido interno | ✅ | ✅ | ❌ |
| Confirmar/cancelar pedido | ✅ | ✅ | ❌ |
| Ver financeiro | ✅ | ❌ | ❌ |
| Criar/editar receitas | ✅ | ❌ | ❌ |
| Criar/editar despesas | ✅ | ❌ | ❌ |
| DRE / Fluxo de caixa | ✅ | ❌ | ❌ |
| Gerenciar frota/motoristas | ✅ | ✅ | ❌ |
| Criar/gerenciar viagens | ✅ | ✅ | ❌ |
| Ver viagem própria | ❌ | ❌ | ✅ |
| Confirmar paradas | ❌ | ❌ | ✅ |
| Registrar ocorrência | ❌ | ❌ | ✅ |
| Configurações do sistema | ✅ | ❌ | ❌ |
| Deletar registros | ✅ | ❌ | ❌ |

---

## 6. Fluxos principais

> **Fluxo do painel reconstruído (refatoração 2026)** seguindo padrão de grandes TMS — ver `VELOX_CONTEXT.md §1.1`. Sequência: **Operações** (vê pendências) → **Pedidos** (confirma) → **Despacho** (programa no quadro) → **Viagem** (executa) → **Pedido/workspace** (acompanha). Lógica de negócio inalterada.

### Fluxo de pedido público
1. Cliente acessa `/agendar`
2. Preenche 5 passos: Solicitante → Origem → Destinatários → Serviço → Resumo
3. Sistema verifica cobertura, exibe cálculo de frete em tempo real
4. Submissão → protocolo gerado → pedido criado com `status: "new"`
5. Painel de **Operações** exibe na fila de ação; sidebar mostra badge em "Pedidos"

### Fluxo de aprovação de pedido
1. Admin abre **Pedidos** (`/admin/coletas`), aba "Novos"
2. Clica em "Confirmar" na própria linha → Sheet de confirmação
3. Define data de coleta, valor final do frete e forma de pagamento (o **caminhão NÃO é escolhido aqui** — fica para o Despacho)
4. Confirma → pedido `confirmed` + Revenue criado via `ensureRevenueForOrder` (sem duplicar) → entra na fila do Despacho

### Fluxo de despacho e viagem
1. Admin abre **Despacho** (`/admin/despacho`): fila de confirmados sem viagem à esquerda
2. Seleciona um ou mais pedidos → clica na célula do quadro (caminhão + dia) → programado (valida capacidade)
3. Botão "Viagem" na célula → `/admin/viagens/nova` já com pedidos + caminhão pré-selecionados
4. Paradas geradas automaticamente (coleta + entrega por destinatário)
5. Admin/motorista inicia viagem → pedidos vão para `collecting`; motorista faz checklist de saída
6. Motorista confirma chegada → confirma entrega (NF obrigatória); status sobe para `in_transit`/`delivered`
7. Admin encerra viagem com km + combustível + pedágios → despesas geradas; adiantamento entra no acerto

### Fluxo financeiro
- Confirmação de pedido → Revenue `receivable` criado
- Encerramento de viagem → Expenses de combustível/pedágios criadas
- Registro de manutenção com valor → Expense `pending` criada
- Faturamento mensal de cliente → Revenue gerada com data de vencimento calculada

---

## 7. Integrações externas

| Integração | Status | Descrição |
|-----------|--------|-----------|
| **Supabase** | ✅ Ativo | DB, Auth, Storage |
| **ViaCEP** | ✅ Ativo | Preenchimento de endereço por CEP |
| **Google Maps API** | ⚠️ Opcional | Cálculo de distância real; chave em `company_settings.google_maps_api_key` |
| **Google OAuth** | ✅ Ativo | Login social |
| **GPS/Rastreamento** | 🔴 Pendente | MapPage tem placeholder; integração não implementada |
| **WhatsApp** | ⚠️ Parcial | Botão flutuante no site público, links diretos nos contatos |
| **E-mail transacional** | ⚠️ Parcial | Supabase envia e-mail de confirmação/reset de senha |

---

## 8. O que existe vs. o que está pendente

### ✅ Implementado
- CRUD completo de pedidos, caminhões, motoristas, clientes, fornecedores, viagens
- Cálculo completo de frete (todos os componentes)
- Bin-packing para sugestão de caminhão
- Fluxo completo de viagem com atualização de status em cascata
- DRE mensal com export PDF e CSV
- Fluxo de caixa projetado (30/60/90 dias)
- App de motorista com confirmação de entrega e upload de NF
- Sistema de alertas (documentos + km + receitas em atraso)
- Rastreamento público por protocolo, CT-e e NF
- Formulário público de agendamento (5 passos)
- Cotação online (3 passos + calculadora rápida)
- Documentos: NFs assinadas, CRLV, CNH, seguro
- Simulador de carregamento de baú
- Configurações completas (preços, cobertura, agendamento, rotas por corredor)
- RLS no banco — dados protegidos por autenticação
- Romaneio de carga (manifesto de viagem) em PDF
- Protocolo sequencial único por ano
- Receita automática anti-duplicação + estorno no cancelamento (com motivo obrigatório)
- KPIs do dashboard clicáveis (navegam para listas filtradas)
- Datas timezone-safe em todo o fluxo (utils/dateUtils.js)
- Tabela de frete negociada por cliente (`clients.custom_pricing`) com editor e prioridade máxima no cálculo
- Chave de acesso NF-e (44 dígitos) com validação de dígito verificador e auto-preenchimento do nº da NF
- Adiantamento de viagem (vale-frete) com despesa automática e acerto no encerramento
- Checklist de saída do veículo no app do motorista (gravado em trip.events)
- Busca global Ctrl+K no painel admin (pedidos, clientes, placas, motoristas)
- Linha do tempo "Coletas de hoje" no dashboard
- Duplicar pedido (clientes recorrentes)
- DRE com resultado por caminhão (centro de custo)
- Importação de XML da NF-e no Novo Pedido (preenche destinatário + item automaticamente)
- POD com assinatura digital do recebedor (canvas no app do motorista) + nome do recebedor
- Ordenação por coluna na lista de Pedidos; "Criar pedido" a partir de mensagem do site
- Segurança RLS endurecida (funções SECURITY DEFINER; sem leitura pública direta de orders/clients)

> Roadmap completo com análise de mercado e status item a item: ver `VELOX_ROADMAP.md`.

### 🔴 Pendente / Não implementado
- Integração GPS real-time (MapPage tem placeholder)
- Rastreamento em tempo real com localização do caminhão
- Notificações push para motorista (novo pedido, etc.)
- Integração com sistema de emissão de CT-e (número inserido manualmente)
- API de faturamento mensal automatizada
- Portal do cliente (cliente ver seus próprios pedidos)
- Relatórios avançados (eficiência de rota, consumo/km, etc.)
- App mobile nativo (atualmente é PWA via navegador)
- Assinatura digital de comprovante (coleta foto, mas sem assinatura eletrônica)
- Integração com Correios/transportadoras parceiras

---

## Modelo de dados — Ondas operacionais 0–4 (jun/2026)

> Detalhe funcional em `VELOX_MELHORIAS_OPERACIONAIS.md`. Migrations:
> `20260619_onda1_operacional.sql`, `20260619_onda2_cubagem_janela.sql`, `20260619_onda4_tms.sql`.

**orders**
- `status` ganhou `awaiting_cargo` (carga não pronta — S5) e `partially_delivered` (entrega parcial — S12)
- `unproductive_fee` NUMERIC — taxa de deslocamento improdutivo (S10)
- `cubage_factor` NUMERIC — fator de cubagem específico do pedido (5.3)
- `recipients[]` (JSONB) ganhou: `delivery_status` aceita `partial`/`failed`; `delivered_volumes`,
  `partial_reason`, `failure_action`, `next_attempt_date`, `attempts[]`, `delivery_window`

**incidents**
- novos tipos: `carga_nao_pronta`, `entrega_parcial`, `destinatario_ausente`
- novos campos: `severity`, `assigned_to`, `action_plan`, `client_notified`, `client_notified_at`,
  `insurance_triggered`, `due_date`, `timeline` (JSONB), `stop_index`, `recipient_name`

**alerts**
- novos tipos: `truck_breakdown`, `driver_absent`, `cargo_hold`, `delivery_attempt`,
  `order_cancelled_in_trip`, `address_changed`, `recipient_window`

**trips.stops[]** (JSONB) — novos campos: `delivery_result` (`partial`/`failed`), `delivered_volumes`,
`partial_reason`, `failure_action`, `next_attempt_date`, `awaiting_cargo`, `cargo_hold_notes`,
`skipped`/`skip_reason`, `address_changed`/`address_changed_at`

**clients** — `delivery_window` JSONB (`{days,start,end}` — janela de recebimento, S6)

**order_templates** (nova tabela) — modelos de pedido salvos (S11): `name`, `client_id`,
`client_name`, `data` (JSONB com remetente/destinatários/tipo/valores)

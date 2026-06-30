# 📦 Inventário Técnico — Velox TMS

> Documento de **descoberta/mapeamento** do sistema, gerado a partir do código e
> das migrations. Apenas documenta a estrutura existente — não contém sugestões,
> críticas nem propostas de melhoria.
>
> Gerado em 2026-06-30 (skills aplicadas em modo descoberta: `vibe-code-auditor`,
> `ux-flow`, `ui-review`).

---

## 1. Visão geral / stack
- **Front:** React 18 + Vite 6 + React Router (lazy/Suspense) + Tailwind + shadcn/ui + @tanstack/react-query v5.
- **Backend:** Supabase (Postgres + Auth + Storage + RLS), acessado por uma camada de compatibilidade `base44.entities.<Entidade>` (Proxy → `TABLE_MAP`) e por `supabase.rpc()` para funções `SECURITY DEFINER`.
- **Camada de dados:** 21 entidades mapeadas; 51 migrations SQL (`20260612`→`20260654`); 41 funções RPC.
- **Render de mapa:** Leaflet + OpenStreetMap. **PDF:** jsPDF. **3D:** Truck3D (carregamento). **CEP:** ViaCEP. **Geo opcional:** Google Maps (chave em Configurações).

## 2. Domínios funcionais
1. **Site público / comercial** (landing, agendamento, cotação, rastreamento, contato)
2. **Operação** (pedidos/coletas, despacho, viagens, transferências, ocorrências, replanejamento)
3. **Frota & cadastros** (frota, motoristas, clientes, destinatários, fornecedores, filiais, transportadoras, documentos)
4. **Financeiro** (faturas, receitas, despesas, DRE, fluxo de caixa, conciliação bancária)
5. **Portais externos** (Cliente, Transportadora/parceiro, Motorista)
6. **Sistema** (usuários, configurações, indicadores, mensagens, alertas)

## 3. Perfis de usuário & permissões
Papel em `user_profiles.role` (constraint: `admin`, `operator`, `motorista`, `client`, `carrier`, `pending`) + vínculos `driver_id` / `client_id` / `carrier_id`. `active=false` rebaixa para sem-acesso.

| Perfil | Guard | Espaço | Vínculo |
|---|---|---|---|
| **admin** | `AdminRoute` | `/admin/*` (tudo, incl. áreas `adminOnly`) | — |
| **operator** | `OperatorRoute` | `/admin/*` (exceto Financeiro/Sistema/Acessos) | — |
| **motorista** | `DriverRoute` | `/motorista/*` | `driver_id` |
| **client** | `ClientRoute` | `/portal/*` | `client_id` |
| **carrier** | `CarrierRoute` | `/parceiro/*` | `carrier_id` |
| **pending** | — | `/sem-acesso` (aguarda aprovação) | — |

Isolamento de dados dos portais por RLS + RPCs `SECURITY DEFINER` com escopo (`my_client_*`, `my_carrier_*`). Helpers de RLS: `is_admin()`, `is_staff()`, `is_driver()`.

## 4. Menus / navegação
**Admin** (`AdminNav`, navegação por áreas no topo — hub-and-spoke):
- **Operação:** Pedidos · Despacho · Replanejamento · Viagens · Transferências · Ocorrências
- **Frota & Cadastros:** Frota · Cadastros · Transportadoras · Documentos
- **Comercial:** Mensagens · Acessos de Cliente *(adminOnly)* · Acessos de Parceiro *(adminOnly)*
- **Financeiro** *(adminOnly)*: Financeiro · Indicadores
- **Sistema** *(adminOnly)*: Usuários · Configurações

**Portal Cliente** (`PortalLayout`): Meus Pedidos · Faturas
**Portal Transportadora** (`CarrierLayout`): Ofertas · Minhas Cargas
**App Motorista** (`DriverHome`): Hoje · Histórico

## 5. Inventário de telas (66 páginas)

**Públicas (10):** Home (landing) · BookingForm (`/agendar`) · QuoteForm (`/cotacao`) · QuickQuote (`/cotacao-avancada`) · Tracking (`/rastrear`) · Login · Register · ClientRegister (`/portal/cadastro`) · CarrierRegister (`/parceiro/cadastro`) · NoAccess · ForgotPassword · ResetPassword.

**Admin — Operação:** OperationsHub (`/admin`, central) · OrdersWorkspace (lista) · OrderWorkspace (detalhe) · NewOrder · Cotacao · DispatchBoard · Replanning · Incidents · Transfers · Trips · NewTrip · TripDetailPage.

**Admin — Frota & Cadastros:** FrotaPage (abas: carretas / motoristas / simulador) → Fleet, Drivers, LoadingSimulator, TruckDetailPage, DriverDetailPage · CadastrosPage (abas: clientes / destinatários / fornecedores / filiais) → Clients, Recipients, Suppliers, Branches, ClientDetailPage · Carriers · Documents.

**Admin — Financeiro** (abas): FinanceiroPage → Financial (resumo) · Invoices · Revenues · Expenses · DRE · CashFlow · BankReconciliation (conciliação).

**Admin — Sistema/Comercial:** UserManagement · ConfigPage→AdminSettings (abas: company / coverage / pricing / alerts / scheduling / routes / site) · Indicators · Messages · AlertsPage · ClientAccess · CarrierAccess · MapPage.

**Portal Cliente (5):** ClientOrders · ClientNewOrder · ClientOrderDetail (com rastreio ao vivo) · ClientInvoices.
**Portal Transportadora (4):** CarrierOffers · CarrierOrders · CarrierOrderDetail.
**App Motorista (3):** DriverHome · DriverTrip (checklist, status, exceções, GPS) · DriverHistory.

## 6. Entidades do sistema (21 + 1) e relacionamentos
`orders`, `clients`, `suppliers`, `drivers`, `trucks`, `trips`, `revenues`, `expenses`, `alerts`, `incidents`, `order_templates`, `recipients`, `branches`, `transfers`, `schedule_blocks`, `contact_messages`, `testimonials`, `company_settings`, `invoices`, `carriers`, `bank_transactions` (+ `trip_positions`, `user_profiles`).

Relacionamentos (FKs e referências lógicas):
- **orders** → `client_id`→clients, `trip_id`→trips, `carrier_id`→carriers, `invoice_id`→invoices; `recipients[]`, `status_history[]`, `carrier_status/amount` (jsonb/campos).
- **trips** → `order_ids[]`→orders, `driver_id`→drivers, `truck_id`→trucks, `vehicles[]` (comboio), `stops[]`, `current_lat/lng`; **trip_positions** → `trip_id`→trips.
- **revenues** → `order_id`→orders, `client_id`→clients; **expenses** → `trip_id`→trips, `driver_id`→drivers, `supplier_id`→suppliers.
- **invoices** → `client_id`→clients, agrega orders (via `create_invoice`); **bank_transactions** → `matched_id`→revenue/expense.
- **incidents** → order/trip; **transfers** → branches; **user_profiles** → driver/client/carrier.

## 7. Cadastros
Clientes (com tabela de frete personalizada e contatos) · Destinatários · Fornecedores · Filiais · Transportadoras parceiras · Frota (caminhões/carretas) · Motoristas · Usuários · Documentos da empresa.

## 8. Funcionalidades & processos
- **Pedido/coleta:** criação (admin, público `/agendar`, portal cliente multi-destinatário), aprovação, stepper de status, cálculo de frete (`freightCalculator`/`FreightBreakdown`), prioridade/SLA, cancelamento com taxa, duplicação, NF-e (`nfeUtils`/`nfeXml`).
- **Despacho/roteirização:** DispatchBoard (DnD), `dispatchPlanner`/`routePlanner`/`routeOptimizer`, `loadPacker`/`cargoVolume` + simulador 3D, janelas de entrega, replanejamento de comboio.
- **Viagem:** comboio multi-veículo, paradas/roteirização, backhaul, estadia/tempo de espera, encerramento atômico (`close_trip`), eficiência km/L, comissão/acerto, romaneio.
- **Transferências** entre filiais (malha, recebimento).
- **Ocorrências** (kanban + SLA, impacto, timeline motorista).
- **Financeiro:** receitas/despesas, faturamento mensal (`create_invoice`/`pay_invoice`), DRE, fluxo de caixa, **conciliação bancária** (import OFX/CSV + baixa).
- **Rastreamento ao vivo:** motorista emite GPS (`useTripGeolocation`) → admin (MapPage) → cliente (portal).
- **Subcontratação:** ofertar pedido a parceiro → aceite/recusa → atualização de status.
- **Cobertura/atendimento:** `coverageChecker`/`availabilityChecker` (CEP/cidade/UF).
- **Mensagens/alertas**, indicadores, gestão de usuários (criar/role/ativar/reset/excluir).

## 9. Fluxos existentes (entrada → saída)
- **Agendamento público:** Home → `/agendar` → cálculo frete → `create_client_order`/pedido anônimo → protocolo.
- **Auto-cadastro cliente:** `/portal/cadastro` → `pending` → admin aprova (`ClientAccess`/`admin_approve_client`) → `/portal`.
- **Auto-cadastro parceiro:** `/parceiro/cadastro` → `pending` → admin aprova (`CarrierAccess`) → `/parceiro`.
- **Ciclo do pedido:** novo → confirmado → coleta → trânsito → entregue (status_history).
- **Ciclo da viagem:** planejada → em andamento (GPS) → encerrada (custos/comissão/baixa).
- **Subcontratação:** admin oferta → parceiro aceita → status → reflete no admin e portal cliente.
- **Faturamento:** pedidos do mês → `create_invoice` → fatura (PDF) → `pay_invoice`.
- **Conciliação:** importa extrato → sugestão de match → conciliar/ignorar/desfazer → baixa no ledger.
- **Rastreamento:** GPS motorista → `update_trip_location` → MapPage / `order_live_location` (portal).

## 10. APIs / serviços de backend (41 RPCs)
- **Pedido/operação:** `next_protocol`, `confirm_order`, `cancel_order`, `create_client_order`, `schedule_orders`, `unschedule_orders`, `apply_dispatch_plan`, `track_order`, `client_by_cnpj`.
- **Viagem/transferência:** `close_trip`, `reassign_driver`, `redistribute_truck`, `cancel_transfer`, `receive_transfer`, `update_trip_location`.
- **Financeiro:** `create_invoice`, `pay_invoice`, `next_invoice_number`, `my_client_invoices`, `reconcile_bank_tx`, `unreconcile_bank_tx`.
- **Portais cliente/parceiro:** `my_client_orders`, `my_client_order`, `my_client_profile`, `set_my_requested_company`, `order_live_location`; `my_carrier_*`, `set_my_carrier_request`, `carrier_respond_offer`, `carrier_update_order_status`.
- **Admin/acessos:** `admin_pending/approve_client`, `admin_pending/approve_carrier`, `admin_offer_order`, `admin_list_users`, `admin_set_user_role/active`, `admin_delete_user`, `handle_new_user`.
- **Config/RLS:** `public_settings`, `is_admin`, `is_staff`, `is_driver`.

## 11. Integrações externas
- **Supabase** (Auth/Postgres/Storage/RLS) — núcleo.
- **ViaCEP** (autofill de endereço — `AddressFields`, BookingForm, ClientNewOrder, ClientDetailPage).
- **OpenStreetMap/Leaflet** (mapa ao vivo).
- **Google Maps** (opcional, via chave em Configurações — geocode/distância em viagens).
- **jsPDF** (documentos). **Truck3D** (Three.js — simulador de carregamento).

## 12. Tipos de documentos (gerados)
Fatura (`generateInvoicePDF`) · Romaneio de viagem (`generateTripManifest`) · Manifesto de transferência (`generateTransferManifest`) · Etiquetas de volume (`generateVolumeLabels`) · Documento de transporte (`generateShipmentDoc`) · Comprovante de entrega (`generateDeliveryReceipt`) · NF-e (utils `nfeUtils`/`nfeXml`).

## 13. Partes incompletas / pendentes (estado factual)
- **Migrations não aplicadas no banco** (front degrada graciosamente até aplicar): `20260652_live_tracking`, `20260653_carrier_portal`, `20260654_bank_reconciliation`.
- **`base44` Proxy** possui fallback para "Edge Function do Supabase para funções não implementadas aqui" (`supabaseClient.js`) — caminho previsto, não implementado nesse ponto.
- **Rotas legadas/consolidadas** que apenas redirecionam: `/admin/mapa`→config, `/admin/motoristas`→frota, `/admin/carregamento`→frota, `/admin/pedidos*`→coletas, `/admin/operacoes|programacao|agenda`→despacho.
- **Itens marcados como futuros** em `ROADMAP-FUTURO.md`: notificações por e-mail (AU1/AU3/AU4/F4), refinos de rastreio (ETA/trail/Realtime), leilão de frete, conciliação de boletos, **multi-tenant (adiado por decisão de produto)**, refactor dos god-components restantes (`NewOrder`, `OrderWorkspace`, `BookingForm`).

---

## Anexo A — Telas por rota (referência rápida)

| Rota | Tela | Acesso |
|---|---|---|
| `/` | Home | público |
| `/agendar` | BookingForm | público |
| `/cotacao`, `/cotacao-avancada` | QuoteForm, QuickQuote | público |
| `/rastrear` | Tracking | público |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Auth | público |
| `/portal/cadastro` | ClientRegister | público |
| `/parceiro/cadastro` | CarrierRegister | público |
| `/sem-acesso` | NoAccess | autenticado pendente |
| `/admin` | OperationsHub | operator+ |
| `/admin/coletas`, `/admin/coletas/nova`, `/admin/coletas/:id` | OrdersWorkspace, NewOrder, OrderWorkspace | operator+ |
| `/admin/cotacao` | Cotacao | operator+ |
| `/admin/despacho` | DispatchBoard | operator+ |
| `/admin/replanejamento` | Replanning | operator+ |
| `/admin/ocorrencias` | Incidents | operator+ |
| `/admin/transferencias` | Transfers | operator+ |
| `/admin/viagens`, `/admin/viagens/nova`, `/admin/viagens/:id` | Trips, NewTrip, TripDetailPage | operator+ |
| `/admin/frota`, `/admin/frota/:id` | FrotaPage, TruckDetailPage | operator+ |
| `/admin/motoristas/:id` | DriverDetailPage | operator+ |
| `/admin/cadastros`, `/admin/clientes/:id` | CadastrosPage, ClientDetailPage | operator+ |
| `/admin/transportadoras` | Carriers | operator+ |
| `/admin/documentos` | Documents | operator+ |
| `/admin/mensagens` | Messages | operator+ |
| `/admin/alertas` | AlertsPage | operator+ |
| `/admin/financeiro` | FinanceiroPage | admin |
| `/admin/indicadores` | Indicators | admin |
| `/admin/usuarios` | UserManagement | admin |
| `/admin/config` | ConfigPage / AdminSettings | admin |
| `/admin/portal-clientes` | ClientAccess | admin |
| `/admin/portal-parceiros` | CarrierAccess | admin |
| `/motorista`, `/motorista/viagem/:id`, `/motorista/historico` | DriverHome, DriverTrip, DriverHistory | motorista |
| `/portal`, `/portal/novo`, `/portal/pedido/:id`, `/portal/faturas` | ClientOrders, ClientNewOrder, ClientOrderDetail, ClientInvoices | client |
| `/parceiro`, `/parceiro/cargas`, `/parceiro/carga/:id` | CarrierOffers, CarrierOrders, CarrierOrderDetail | carrier |
| `*` | PageNotFound | — |

# VELOX_CONTEXT.md — Contexto Técnico do Sistema

> Documento de referência técnica para IAs e desenvolvedores.  
> **Regra obrigatória:** toda alteração de código deve atualizar os 3 documentos (`VELOX_CONTEXT.md`, `VELOX_SYSTEM.md`, `VELOX_MAPEAMENTO.md`) e fazer `git push` na mesma operação.

---

## 1. O que é o sistema

**Velox TMS** é um Transportation Management System (TMS) desenvolvido para a **Velox Transportadora**, empresa de transporte de carga rodoviária localizada no Brasil, com frota de ~3 carretas.

O sistema cobre:
- Cadastro e acompanhamento de pedidos de frete
- Agenda e programação de coletas
- Gestão de frota (caminhões + motoristas)
- Módulo financeiro (receitas, despesas, DRE, fluxo de caixa)
- App mobile simplificado para motoristas
- Site público com cotação, agendamento e rastreamento

URL de produção: **https://velox-tms.vercel.app**

---

## 1.05 Design System "Steel & Slate" (reformulação visual de 2026)

Identidade visual corporativa no padrão de TMS profissionais (McLeod, Benner, Senior). **Tudo cascateia por tokens** — `src/index.css` (variáveis CSS HSL) + `tailwind.config.js` (paleta `velox`).

- **Paleta:** canvas ardósia `#F1F3F5`; texto grafite `#19212E`; **acento azul-aço `#2B5FA8`** (primary/CTA); sidebar grafite `#1B2430`. Status semânticos: verde `#1E8E4E`, âmbar `#C27510` (atenção), vermelho `#C0392B`.
- **Migração do âmbar:** o token legado `velox.amber` foi **remapeado para o azul-aço** — todo `bg-velox-amber`/`text-velox-amber` no código antigo agora renderiza azul. CTAs com `text-velox-dark` foram migrados para `text-white`.
- **Densidade:** `--radius: 0.375rem` (6px, cantos retos); `Card` com `p-4`/`shadow-sm`; `Input` h-9 com foco azul; cabeçalhos de tabela uppercase 11px com fill (`TableHead`). Números tabulares (`tnum`) no body.
- **Tipografia:** Inter (display/heading/body) + JetBrains Mono (protocolos, valores, placas). Removido o Barlow Condensed.
- **Componentes-base novos:**
  - `StatusBadge` — tag retangular com ponto indicador (pedidos + viagens + configs de motorista/caminhão).
  - `components/shared/DataTable.jsx` — tabela densa com **ordenação clicável por coluna**, busca inline, toolbar e rodapé. Aplicada em Clientes, Fornecedores, Motoristas e Frota (substituíram os grids de cards).
  - `components/shared/FormSection.jsx` — `FormSection` (cabeçalho com barra + grade) e `Field` (label acima, obrigatório/opcional, erro inline). Padrão aplicado nas seções de NewOrder e NewTrip (cabeçalho com divisória + fundo).
  - `components/shared/CollapsibleSection.jsx` — seção colapsável para telas de detalhe.
  - `components/shared/PageHeader.jsx` — **cabeçalho de página padrão** (chip de ícone + título compacto `text-xl` + subtítulo + slot de ações). Aplicado em todos os módulos para consistência. Exporta também `segmentedTabsClass`/`segmentedTriggerClass` (estilo único das abas dos containers Frota/Cadastros/Financeiro). Containers passam `hideTitle` aos filhos (Fleet, Drivers, Revenues, Expenses, DRE, CashFlow, Financial, Clients, Suppliers) para evitar título duplicado.
- **Configurações:** `ConfigPage` agora é **navegação lateral por categorias** (não abas).
- **Pedido (`OrderWorkspace`):** página única com **seções colapsáveis** (Resumo, Cargas, Financeiro, Ocorrências, Histórico) — sem abas.
- **Financeiro (`Revenues`/`Expenses`):** painel de **aging** clicável (Vencidas, ≤7d, 8–30d, 31–60d, >60d) que filtra a lista; coluna de vencimento mostra dias vencidos/a vencer.
- **App do motorista:** botões grandes (h-14) e barra de progresso de paradas.
- **Listas de cadastro:** tabelas densas ordenáveis (DataTable) em vez de grids de cards — clique no cabeçalho ordena, busca inline filtra.
- **Dashboard (OperationsHub):** faixa de métricas de comando no topo (frota disponível, em rota, coletas/entregas hoje) + fila de ação + pipeline + operação de hoje + frota agora.

---

## 1.1 Fluxo do painel admin (arquitetura nova — refatoração de 2026)

O painel foi reconstruído seguindo o padrão dos grandes TMS (McLeod, TMW, Benner): **fluxo de despacho centrado em "gestão por exceção"**, não telas isoladas. A lógica de negócio, integrações e dados foram 100% preservados — só a experiência mudou.

**As 4 telas do fluxo operacional:**

1. **Operações** (`/admin` → `OperationsHub.jsx`) — torre de controle. Topo: *fila de ação* (só o que exige decisão agora: pedidos novos, confirmados sem viagem, alertas críticos, recebimentos atrasados). Depois: *pipeline* clicável (Novos → Confirmados → Em coleta → Em trânsito → Entregues), *operação de hoje* e *frota agora*.

2. **Pedidos** (`/admin/coletas` → `OrdersWorkspace.jsx`) — fila única com abas por etapa do pipeline e **ações inline**: confirmar (Sheet: data/valor/forma de pagamento — o **caminhão é definido depois no Despacho**), recusar e despachar sem trocar de tela. Substitui a antiga lista `Orders` + aba "Aguardando" da Agenda.

3. **Despacho** (`/admin/despacho` → `DispatchBoard.jsx`) — o coração do TMS. Esquerda: fila de confirmados sem viagem. Direita: quadro **caminhões × dias** com capacidade. Fluxo: seleciona pedidos → clica na célula (caminhão+dia) → programado; botão "Viagem" na célula cria a viagem já com pedidos+caminhão pré-selecionados. Substitui a antiga `AgendaPage`.

4. **Pedido** (`/admin/coletas/:id` → `OrderWorkspace.jsx`) — stepper de ciclo de vida no topo + **uma ação primária por etapa** (Confirmar → Em coleta → Em trânsito → Entregar) + menu de ações secundárias (duplicar, comprovante, cancelar) + corpo em abas (Resumo / Cargas / Financeiro / Ocorrências / Histórico) + rail direito de atribuição operacional. Substitui `OrderDetailPage`.

**Navegação (sidebar):** *Operações* · grupo **Fluxo** (Pedidos, Despacho, **Viagens**, Frota) · grupo **Cadastros & Gestão** (Cadastros, Documentos, Mensagens, Financeiro, Configurações). Badges: pedidos novos em "Pedidos", confirmados sem viagem em "Despacho", mensagens não lidas em "Mensagens".

**Configurações = só parâmetros** (`ConfigPage` com nav lateral): Empresa, Comercial & Preços, Operação, Alertas — cada uma renderiza `<AdminSettings only={[...]} />`. Telas operacionais que antes ficavam em Config saíram: **Documentos** (`/admin/documentos`) e **Mensagens** (`/admin/mensagens`, `Messages.jsx`) viraram itens da sidebar; **lista de alertas** em `/admin/alertas`; **Mapa** segue placeholder.

**Telas removidas** (substituídas): `Dashboard.jsx`, `Orders.jsx`, `OrderDetailPage.jsx`, `AgendaPage.jsx`, `Operations.jsx`, `Schedule.jsx`, `SchedulePage.jsx`. Rotas legadas (`/admin/agenda`, `/admin/pedidos/*`, `/admin/programacao`) redirecionam para as novas.

---

## 2. Histórico e migração

| Fase | Descrição |
|------|-----------|
| Origem | Sistema desenvolvido na plataforma **Base44** (no-code/low-code) |
| Migração | Exportado para código React + reescrito para rodar em **Vercel + Supabase + GitHub** |
| Compatibilidade | `src/api/supabaseClient.js` implementa uma camada de compatibilidade que imita a API da Base44, evitando a reescrita de ~46 arquivos existentes |

A migração manteve a assinatura original das chamadas `base44.entities.EntityName.method()` funcionando, apenas trocando o backend por Supabase.

> **Nota de gravação (importante):** a leitura injeta os aliases Base44 `created_date`/`updated_date` (via `normalizeRecord`), que **não são colunas reais** no Supabase. Telas que carregam o registro inteiro e salvam de volta (ex.: Configurações) reenviavam esses campos, gerando **400 Bad Request** ("coluna inexistente"). Por isso `create`/`update` passam o payload por `sanitizePayload`, que remove `created_date`, `updated_date`, `created_at`, `updated_at` e `id` antes de gravar. O `sanitizePayload` também converte **string vazia `""` → `null`** em colunas `_id`/`_date`/`_expiry` (UUID/DATE), evitando o 400 `invalid input syntax for type uuid/date` quando um campo de caminhão/data é limpo. Para reconciliar bancos criados de versões antigas do schema, rode `supabase/migrations/20260616_reconcile_schema.sql` (idempotente — adiciona toda coluna que o app usa).

---

## 3. Stack completa com versões

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| React | 18.2.0 | Framework principal (SPA) |
| Vite | 5.x | Build tool e dev server |
| React Router DOM | 6.26.0 | Roteamento SPA |
| Tailwind CSS | 3.x | Estilização utility-first |
| shadcn/ui (Radix UI) | — | Componentes UI acessíveis |
| @supabase/supabase-js | 2.108.1 | Client Supabase (DB, Auth, Storage) |
| @tanstack/react-query | 5.84.1 | Cache e fetching de dados |
| framer-motion | 11.16.4 | Animações |
| recharts | 2.15.4 | Gráficos (DRE, financeiro) |
| jsPDF | 4.2.1 | Geração de PDFs (DRE, comprovante) |
| lucide-react | 0.475.0 | Ícones |
| date-fns | 3.6.0 | Manipulação de datas |
| react-leaflet | 4.2.1 | Mapa (instalado, não integrado com GPS ainda) |
| zod | 3.24.2 | Validação de esquemas |

---

## 4. Camada de compatibilidade Base44 → Supabase

**Arquivo:** `src/api/supabaseClient.js`

### Como funciona

```js
// Import nos componentes (mantido do Base44):
import { base44 } from "@/api/base44Client";

// Uso nos componentes:
base44.entities.Order.list("-created_date", 50)
base44.entities.Order.filter({ status: "new" })
base44.entities.Order.get(id)
base44.entities.Order.create(data)
base44.entities.Order.update(id, data)
base44.entities.Order.delete(id)
```

**O arquivo `src/api/base44Client.js`** é um re-export de `supabaseClient.js`, mantendo o caminho de import original.

### TABLE_MAP (Base44 entity name → Supabase table name)

```
Order           → orders
Truck           → trucks
Driver          → drivers
Client          → clients
Trip            → trips
Expense         → expenses
Revenue         → revenues
Incident        → incidents
Alert           → alerts
CompanySettings → company_settings
Testimonial     → testimonials
UserProfile     → user_profiles
ScheduleBlock   → schedule_blocks
Supplier        → suppliers
ContactMessage  → contact_messages
```

### Normalização de campos

A camada converte automaticamente:
- `created_at` → `created_date`
- `updated_at` → `updated_date`

### Métodos especiais implementados no cliente

| Método | Descrição |
|--------|-----------|
| `base44.auth.me()` | Retorna perfil do usuário autenticado |
| `base44.auth.login(email, password)` | Login com email/senha |
| `base44.auth.logout()` | Logout |
| `base44.storage.upload(bucket, file)` | Upload de arquivo |
| `base44.functions.invoke("generateProtocol")` | Gera protocolo `VLX-{ano}-{5 dígitos}` |
| `base44.functions.invoke("getClientByCnpj", {cnpj})` | Busca cliente por CNPJ |
| `base44.functions.invoke("syncAlerts", {trucks, drivers, settings})` | Sincroniza alertas de documentos |
| `base44.functions.invoke("calculateDistance", {origin, destinations})` | Calcula distância via Google Maps API |

---

## 5. Autenticação e perfis

**Arquivo:** `src/lib/AuthContext.jsx`

- Usa **Supabase Auth** (email/password + Google OAuth)
- Ao fazer login, lê o perfil em `user_profiles` (campo `role`)
- Se não existir perfil, cria automaticamente com `role = "admin"`
- Roles disponíveis: `admin`, `operador`, `motorista`

**Guards de rota:**
- `ProtectedRoute` — qualquer autenticado
- `OperatorRoute` — admin ou operador
- `AdminRoute` — somente admin
- `DriverRoute` — somente motorista

---

## 6. Estrutura de pastas

```
C:/vl/velox-tms/
├── src/
│   ├── api/
│   │   ├── supabaseClient.js     # Camada de compatibilidade + cliente Supabase
│   │   └── base44Client.js       # Re-export de supabaseClient (mantém imports legados)
│   ├── lib/
│   │   ├── AuthContext.jsx       # Context de autenticação
│   │   ├── app-params.js         # Parâmetros globais da app
│   │   ├── PageNotFound.jsx      # Página 404
│   │   ├── query-client.js       # Configuração do React Query
│   │   └── utils.js              # Utilitários (cn, etc.)
│   ├── hooks/
│   │   ├── useCompanySettings.js # Hook + cache em memória de CompanySettings; sempre retorna objeto com SETTINGS_DEFAULTS — nunca undefined
│   │   ├── useFileUpload.js      # Hook para upload de arquivos
│   │   └── useFormValidation.js  # Hook para validação de formulários
│   ├── utils/
│   │   ├── freightCalculator.js  # Motor de cálculo de frete (calcCubicWeight, calculateFreightFull)
│   │   ├── availabilityChecker.js # Disponibilidade de frota por data
│   │   ├── coverageChecker.js    # Verificação de área de cobertura
│   │   ├── dateUtils.js          # Datas timezone-safe (todayLocalISO, toLocalISO, parseLocalDate, formatDateBR) — USAR SEMPRE para datas YYYY-MM-DD
│   │   ├── revenueHelper.js      # ensureRevenueForOrder (anti-duplicação) e cancelRevenuesForOrder (estorno)
│   │   ├── nfeUtils.js           # validateNFeKey (DV mod-11), nfNumberFromKey, formatNFeKey
│   │   ├── nfeXml.js             # parseNFeXML — lê XML da NF-e e extrai destinatário/itens (import no Novo Pedido)
│   │   ├── generateDeliveryReceipt.js # Geração de PDF de comprovante
│   │   ├── generateTripManifest.js # Romaneio de carga (manifesto de viagem) em PDF
│   │   ├── generateShipmentDoc.js # Documento interno de transporte (espelho/pré-CT-e, PDF) — Fase 5
│   │   ├── dispatchPlanner.js    # Separação automática de carga (planLoads) — Fase 1
│   │   ├── routeOptimizer.js     # Roteirização heurística por CEP (optimizeStops) — Fase 2
│   │   ├── routePlanner.js       # Planejamento de rotas
│   │   └── index.ts              # Re-exports de utils
│   ├── pages/
│   │   ├── LandingPage.jsx       # Site público - homepage
│   │   ├── BookingForm.jsx       # Formulário público de agendamento (5 passos)
│   │   ├── QuoteForm.jsx         # Cotação de frete (3 passos)
│   │   ├── QuickQuote.jsx        # Calculadora rápida de frete
│   │   ├── Tracking.jsx          # Rastreamento público por protocolo/CT-e/NF
│   │   ├── Login.jsx             # Login (email + Google OAuth)
│   │   ├── Register.jsx          # Cadastro de usuário
│   │   ├── ForgotPassword.jsx    # Recuperação de senha
│   │   ├── ResetPassword.jsx     # Redefinição de senha
│   │   ├── admin/
│   │   │   ├── OperationsHub.jsx # ★ Painel de Operações (torre de controle: fila de ação + pipeline + hoje + frota)
│   │   │   ├── OrdersWorkspace.jsx # ★ Pedidos — fila do pipeline com abas e ações inline (confirmar/recusar/despachar)
│   │   │   ├── DispatchBoard.jsx # ★ Despacho — quadro caminhões × dias; arrasta fila → célula → cria viagem
│   │   │   ├── OrderWorkspace.jsx # ★ Workspace do pedido (stepper de ciclo de vida + ação primária + abas)
│   │   │   ├── NewOrder.jsx      # Nova Coleta — assistente TMS de 4 passos (NF-e multi-import, defaults do cliente, repetir último, cotação ao vivo)
│   │   │   ├── FrotaPage.jsx     # Container: Frota + Motoristas + Simulador
│   │   │   ├── Fleet.jsx         # Lista de caminhões
│   │   │   ├── TruckDetailPage.jsx # Detalhe de caminhão + manutenções
│   │   │   ├── Drivers.jsx       # Lista de motoristas
│   │   │   ├── DriverDetailPage.jsx # Detalhe de motorista
│   │   │   ├── Trips.jsx         # Lista de viagens
│   │   │   ├── NewTrip.jsx       # Criar nova viagem
│   │   │   ├── TripDetailPage.jsx # Detalhe de viagem + paradas + encerramento
│   │   │   ├── CadastrosPage.jsx # Container: Clientes + Fornecedores
│   │   │   ├── Clients.jsx       # Lista de clientes
│   │   │   ├── ClientDetailPage.jsx # Detalhe de cliente + histórico
│   │   │   ├── Suppliers.jsx     # Lista de fornecedores
│   │   │   ├── FinanceiroPage.jsx # Container: módulo financeiro
│   │   │   ├── Financial.jsx     # Resumo financeiro + gráfico
│   │   │   ├── Revenues.jsx      # Contas a receber
│   │   │   ├── Expenses.jsx      # Despesas
│   │   │   ├── DRE.jsx           # DRE mensal com export PDF/CSV
│   │   │   ├── CashFlow.jsx      # Fluxo de caixa projetado
│   │   │   ├── ConfigPage.jsx    # Container: Configurações
│   │   │   ├── AdminSettings.jsx # Parâmetros (prop `only` define grupo: company/site, pricing/routes, coverage/scheduling, alerts)
│   │   │   ├── AlertsPage.jsx    # Lista de alertas ativos (/admin/alertas, via sino do topbar)
│   │   │   ├── Documents.jsx     # Documentos: NFs assinadas, CRLV, CNH (/admin/documentos)
│   │   │   ├── Messages.jsx      # Caixa de contatos do site (/admin/mensagens, badge não lidas)
│   │   │   ├── MapPage.jsx       # Mapa operacional (placeholder GPS — /admin/mapa redireciona p/ config)
│   │   │   └── LoadingSimulator.jsx # Simulador de carregamento de baú
│   │   └── driver/
│   │       ├── DriverHome.jsx    # Home do motorista (viagem ativa)
│   │       ├── DriverTrip.jsx    # Paradas + confirmar chegada/entrega/ocorrência
│   │       └── DriverHistory.jsx # Histórico de viagens do motorista
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.jsx   # Layout base do painel admin
│   │   │   ├── AdminSidebar.jsx  # Sidebar de navegação
│   │   │   ├── AdminTopbar.jsx   # Topbar do admin (busca global Ctrl+K, sino de alertas)
│   │   │   ├── CoverageSettings.jsx # Configuração de área de cobertura
│   │   │   └── StatusBadge.jsx   # Badge de status (pedidos/viagens/motorista/caminhão)
│   │   ├── auth/
│   │   │   ├── AdminRoute.jsx    # Guard: somente admin
│   │   │   ├── DriverRoute.jsx   # Guard: somente motorista
│   │   │   └── OperatorRoute.jsx # Guard: admin ou operador
│   │   ├── public/
│   │   │   ├── HeroSection.jsx   # Seção hero da landing
│   │   │   ├── AboutSection.jsx  # Seção sobre a empresa
│   │   │   ├── ServicesSection.jsx # Seção de serviços
│   │   │   ├── HowItWorksSection.jsx # Como funciona
│   │   │   ├── StatsSection.jsx  # Estatísticas/números
│   │   │   ├── TestimonialsSection.jsx # Depoimentos
│   │   │   ├── ContactSection.jsx # Formulário de contato
│   │   │   ├── PublicNavbar.jsx  # Navbar do site público
│   │   │   ├── PublicFooter.jsx  # Footer do site público
│   │   │   ├── VeloxDatePicker.jsx # Seletor de data com dias úteis
│   │   │   └── WhatsAppButton.jsx # Botão flutuante WhatsApp
│   │   ├── shared/
│   │   │   ├── DataTable.jsx          # Tabela densa ordenável + busca inline (listas de cadastro)
│   │   │   ├── FormSection.jsx        # FormSection + Field (formulários seccionados)
│   │   │   ├── CollapsibleSection.jsx # Seção colapsável (telas de detalhe)
│   │   │   ├── PageHeader.jsx         # Cabeçalho de página padrão + estilo de abas dos containers
│   │   │   ├── SignaturePad.jsx       # Captura de assinatura em canvas (POD do motorista)
│   │   │   ├── TableSkeleton.jsx      # Skeletons de tabela/cards
│   │   │   ├── EmptyState.jsx         # Estado vazio reutilizável
│   │   │   ├── FileUploadButton.jsx   # Botão de upload com Supabase Storage
│   │   │   ├── FormField.jsx          # Campo de formulário (legado)
│   │   │   ├── FreightBreakdown.jsx   # Detalhamento de cálculo de frete
│   │   │   └── NumericInput.jsx       # Input numérico com máscara
│   │   ├── AuthLayout.jsx             # Layout de telas de autenticação
│   │   ├── GoogleIcon.jsx             # Ícone Google SVG
│   │   ├── ProtectedRoute.jsx         # Guard genérico de rota
│   │   └── ScrollToTop.jsx            # Scroll ao topo na troca de rota
│   ├── App.jsx                        # Roteamento principal
│   └── CONTEXT.md                     # Contexto original do projeto (Base44)
│   (pasta components/schedule/ e exports DOCS.md/DOCS-TMS5.md removidos na limpeza 2026)
├── supabase/
│   └── schema.sql                     # Schema completo do banco de dados
├── VELOX_CONTEXT.md                   # Este arquivo
├── VELOX_SYSTEM.md                    # Documento geral do sistema
├── VELOX_MAPEAMENTO.md                # Mapeamento completo de telas
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env.local                         # Variáveis de ambiente (NÃO versionar)
```

---

## 7. Variáveis de ambiente

Arquivo: `.env` local (nunca commitar — listado no `.gitignore`)

```env
VITE_SUPABASE_URL=https://[projeto].supabase.co
VITE_SUPABASE_ANON_KEY=[chave_anon]
```

**Produção (Vercel):** as variáveis devem ser configuradas manualmente em **Vercel → Project Settings → Environment Variables**. Elas **não** estão no repositório. Se não configuradas, o Supabase client cria com `undefined` e todas as queries falham silenciosamente — o site fica em branco.

A chave da Google Maps API é armazenada no banco (`company_settings.google_maps_api_key`) e lida em runtime — não é uma variável de ambiente.

---

## 8. Como rodar localmente

```bash
# 1. Clonar e instalar
cd C:/vl/velox-tms
npm install

# 2. Criar .env.local com as variáveis acima

# 3. Rodar dev server
npm run dev
# → http://localhost:5173

# 4. Build de produção
npm run build

# 5. Preview do build
npm run preview
```

---

## 9. Deploy

| Etapa | Detalhe |
|-------|---------|
| Plataforma | **Vercel** |
| Trigger | Push para branch `main` no GitHub |
| Automático | Sim — Vercel detecta mudanças e publica em ~1-2 min |
| Variáveis de ambiente | Configuradas no dashboard Vercel (não no repositório) |

```bash
# Deploy = apenas:
git add .
git commit -m "descrição"
git push
```

---

## 10. Design system

| Token | Valor |
|-------|-------|
| `velox-amber` | `#F5A623` — cor primária (ação, destaques) |
| `velox-dark` | `#1A1A2E` — fundo escuro, app motorista |
| `velox-blue` | `#1E3A5F` — azul secundário |
| Fonte display | Família `font-display` (headings grandes) |
| Fonte heading | Família `font-heading` (subtítulos) |
| Toast delay | 5000ms |
| Timezone | Todas as datas usam `T12:00:00` para evitar bug de UTC-3 |

---

## 11. Padrões de código

- Imports: `@/` aponta para `src/` (alias Vite)
- Queries: `useQuery` com `queryKey` descritivo + `staleTime` quando cacheável
- Mutações: `useMutation` com `onSuccess` invalidando queries relacionadas; sempre incluir `onError` com toast
- Formulários: state local com `useState`, sem react-hook-form
- Toasts: `useToast()` do shadcn/ui, duração padrão 5000ms
- Datas: `date-fns` com locale `ptBR`
- Valores monetários: `Number.toLocaleString("pt-BR", { minimumFractionDigits: 2 })`
- CEP: busca automática via ViaCEP `https://viacep.com.br/ws/{cep}/json/`

### Regras obrigatórias (lições de bugs corrigidos)

1. **Datas de negócio (`YYYY-MM-DD`) — NUNCA usar `toISOString()` nem `new Date("YYYY-MM-DD")` direto.**
   `toISOString()` devolve UTC (após ~21h no Brasil vira o dia seguinte) e `new Date("YYYY-MM-DD")` interpreta como UTC-midnight (exibe -1 dia). Usar `src/utils/dateUtils.js`: `todayLocalISO()`, `toLocalISO(date)`, `parseLocalDate(str)`, `formatDateBR(str)`.

2. **Receita de frete — nunca criar `Revenue` direto na confirmação de pedido.**
   Usar `ensureRevenueForOrder(order, { amount, dueDate, paymentMethod })` de `src/utils/revenueHelper.js` (verifica duplicata por `order_id`). No cancelamento do pedido, chamar `cancelRevenuesForOrder(orderId)` para estornar.

3. **Protocolo — `base44.functions.invoke("generateProtocol")` retorna `{ data: { protocol } }`.**
   Implementação em `supabaseClient.js`: sequencial por ano (consulta o maior `VLX-{ano}-NNNNN` no banco e incrementa), com fallback aleatório + verificação de colisão.

4. **Páginas públicas não devem carregar dados de outras entidades** (pedidos, frota) — privacidade e performance.

### Migrations do Supabase (aplicar no SQL Editor)

1. `supabase/migrations/20260612_revenue_status_cancelled.sql` — adiciona `'cancelled'` ao CHECK de `revenues.status` (✅ aplicada). Fallback no código: DELETE da receita.
2. `supabase/migrations/20260612_trip_advance.sql` — adiciona `advance_amount`/`advance_date` em `trips` (adiantamento de viagem). Fallback no código: cria a viagem sem os campos.
3. **`supabase/migrations/20260615_rls_public_functions.sql`** — segurança: remove a leitura pública de `orders`/`clients` e cria as funções `SECURITY DEFINER` `track_order`, `client_by_cnpj`, `next_protocol` (anon). O front tenta a RPC e faz fallback ao comportamento antigo, então a ordem de deploy é indiferente. **Aplicar para fechar o vazamento de leitura.**
4. `supabase/migrations/20260615_company_documents.sql` — adiciona `documents` (JSONB) em `company_settings` (upload manual em Documentos → Empresa).

### Simulação de 30 dias

`supabase/seed_simulation.sql` popula uma operação fictícia (frota, clientes, ~36 pedidos em todos os status, viagens, financeiro com aging). Idempotente, marcado com `[SIM]`. Instruções e limpeza em `supabase/SIMULACAO.md`.

### Deploy no Vercel — `vercel.json` obrigatório

O arquivo `vercel.json` na raiz contém o rewrite SPA (`/(.*) → /index.html`). **Sem ele, qualquer rota client-side (ex.: `/login`, `/admin`) retorna 404** ao ser acessada diretamente. Não remover.

---

## 12. Regra de atualização de documentação

**A cada alteração de código, o desenvolvedor (ou IA) deve:**

1. Identificar quais dos 3 documentos são afetados pela mudança
2. Atualizar os documentos antes do commit
3. Incluir os arquivos `.md` no mesmo commit do código
4. Fazer `git push` ao final

```bash
git add src/ VELOX_CONTEXT.md VELOX_SYSTEM.md VELOX_MAPEAMENTO.md
git commit -m "feat/fix/refactor: descrição da mudança + docs atualizados"
git push
```

---

## Ondas operacionais 0–4 (jun/2026)

Melhorias de operação real (situações do dia a dia). Detalhe completo
("como era → como ficou" e "problema → solução") em **`VELOX_MELHORIAS_OPERACIONAIS.md`**.

**Novas páginas/rotas**
- `src/pages/admin/Replanning.jsx` → `/admin/replanejamento` (caminhão quebrou / motorista faltou)
- `src/pages/admin/Incidents.jsx` → `/admin/ocorrencias` (central de ocorrências)

**Novos utilitários**
- `src/utils/replanner.js` — caminhões/motoristas indisponíveis com carga + sugestão de redistribuição
- `src/utils/cargoVolume.js` — volume físico (m³) de caminhão e carga (cubagem)
- `src/utils/deliveryWindow.js` — janela de recebimento (dias/horário) e conflitos
- `src/utils/incidents.js` — gravidade, linha do tempo e duração das ocorrências

**Novos componentes**
- `src/components/shared/DeliveryWindowEditor.jsx` — editor da janela de recebimento

**Migrations** (rodar no Supabase, em ordem): `20260619_onda1_operacional.sql`,
`20260619_onda2_cubagem_janela.sql`, `20260619_onda4_tms.sql`.

## Ondas 5–8 (nível enterprise, jun/2026)

Detalhe em **`VELOX_MELHORIAS_OPERACIONAIS.md`** (seção Ondas 5–8).

**Novas páginas/rotas**
- `src/pages/admin/Indicators.jsx` → `/admin/indicadores` (KPIs operacionais)
- `src/pages/admin/Recipients.jsx` → aba "Destinatários" em Cadastros (entidade própria)
- `src/pages/admin/Branches.jsx` → aba "Filiais & CDs" em Cadastros
- `src/pages/admin/Transfers.jsx` → `/admin/transferencias` (cross-docking)

**Novos utilitários**
- `src/utils/sla.js` — prazo previsto × realizado (OTD)

**Novas entidades** (TABLE_MAP): `Recipient`→recipients, `Branch`→branches, `Transfer`→transfers

**Migrations**: `20260620_onda5_profundidade.sql`, `20260620_onda6_recipients.sql`,
`20260620_onda7_multiveiculo.sql`, `20260620_onda8_crossdocking.sql`.

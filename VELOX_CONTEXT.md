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

## 2. Histórico e migração

| Fase | Descrição |
|------|-----------|
| Origem | Sistema desenvolvido na plataforma **Base44** (no-code/low-code) |
| Migração | Exportado para código React + reescrito para rodar em **Vercel + Supabase + GitHub** |
| Compatibilidade | `src/api/supabaseClient.js` implementa uma camada de compatibilidade que imita a API da Base44, evitando a reescrita de ~46 arquivos existentes |

A migração manteve a assinatura original das chamadas `base44.entities.EntityName.method()` funcionando, apenas trocando o backend por Supabase.

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
│   │   ├── generateDeliveryReceipt.js # Geração de PDF de comprovante
│   │   ├── generateTripManifest.js # Romaneio de carga (manifesto de viagem) em PDF
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
│   │   │   ├── Dashboard.jsx     # Dashboard com KPIs e agenda
│   │   │   ├── Orders.jsx        # Lista de pedidos
│   │   │   ├── NewOrder.jsx      # Criar pedido interno
│   │   │   ├── OrderDetailPage.jsx # Detalhe completo de pedido
│   │   │   ├── AgendaPage.jsx    # Agenda + programação de coletas
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
│   │   │   ├── AdminSettings.jsx # Configurações da empresa + preços + alertas
│   │   │   ├── AlertsPage.jsx    # Alertas ativos (CNH, CRLV, etc.)
│   │   │   ├── Documents.jsx     # Documentos: NFs assinadas, CRLV, CNH
│   │   │   ├── MapPage.jsx       # Mapa operacional (GPS em desenvolvimento)
│   │   │   └── LoadingSimulator.jsx # Simulador de carregamento de baú
│   │   └── driver/
│   │       ├── DriverHome.jsx    # Home do motorista (viagem ativa)
│   │       ├── DriverTrip.jsx    # Paradas + confirmar chegada/entrega/ocorrência
│   │       └── DriverHistory.jsx # Histórico de viagens do motorista
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminLayout.jsx   # Layout base do painel admin
│   │   │   ├── AdminSidebar.jsx  # Sidebar de navegação
│   │   │   ├── AdminTopbar.jsx   # Topbar do admin
│   │   │   ├── AlertsPanel.jsx   # Painel de alertas (Dashboard)
│   │   │   ├── CoverageSettings.jsx # Configuração de área de cobertura
│   │   │   ├── KPICard.jsx       # Card de KPI reutilizável
│   │   │   ├── OrderDetail.jsx   # Componente de detalhe de pedido
│   │   │   ├── StatusBadge.jsx   # Badge de status de pedido
│   │   │   └── WeekAvailabilityBanner.jsx # Banner de disponibilidade semanal
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
│   │   ├── schedule/
│   │   │   ├── SmartScheduleModal.jsx # Modal de agendamento inteligente
│   │   │   ├── AutoScheduleModal.jsx  # Modal de auto-agendamento
│   │   │   ├── AddOrderModal.jsx      # Modal para adicionar pedido à agenda
│   │   │   ├── AvailabilityPanel.jsx  # Painel de disponibilidade
│   │   │   ├── OrderDetailPanel.jsx   # Painel de detalhe de pedido
│   │   │   ├── OrderQueueCard.jsx     # Card de pedido na fila
│   │   │   ├── ScheduleCell.jsx       # Célula do calendário de agenda
│   │   │   └── ScheduleTimeModal.jsx  # Modal de horário de agendamento
│   │   ├── shared/
│   │   │   ├── EmptyState.jsx         # Estado vazio reutilizável
│   │   │   ├── FileUploadButton.jsx   # Botão de upload com Supabase Storage
│   │   │   ├── FormField.jsx          # Campo de formulário reutilizável
│   │   │   ├── FreightBreakdown.jsx   # Detalhamento de cálculo de frete
│   │   │   └── NumericInput.jsx       # Input numérico com máscara
│   │   ├── AuthLayout.jsx             # Layout de telas de autenticação
│   │   ├── GoogleIcon.jsx             # Ícone Google SVG
│   │   ├── ProtectedRoute.jsx         # Guard genérico de rota
│   │   └── ScrollToTop.jsx            # Scroll ao topo na troca de rota
│   ├── App.jsx                        # Roteamento principal
│   ├── CONTEXT.md                     # Contexto original do projeto (fonte primária)
│   └── DOCS.md                        # Documentação de entidades (fonte primária)
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

### Migration pendente de aplicação no Supabase

`supabase/migrations/20260612_revenue_status_cancelled.sql` — adiciona `'cancelled'` ao CHECK de `revenues.status`. Enquanto não aplicada, o estorno faz fallback para DELETE da receita.

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

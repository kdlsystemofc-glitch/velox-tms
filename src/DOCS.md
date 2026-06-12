# VELOX TRANSPORTADORA — DOCUMENTAÇÃO VIVA
> Gerado por auditoria completa de código em 05/06/2026
> Atualizar obrigatoriamente após cada alteração no sistema

---

## ÍNDICE
1. [Banco de Dados — Entidades e Schema](#1-banco-de-dados--entidades-e-schema)
2. [Site Público — Landing Page](#2-site-público--landing-page)
3. [Site Público — Formulário de Agendamento](#3-site-público--formulário-de-agendamento)
4. [Site Público — Rastreamento](#4-site-público--rastreamento)
5. [Painel — Layout Base](#5-painel--layout-base)
6. [Painel — Dashboard](#6-painel--dashboard)
7. [Painel — Pedidos](#7-painel--pedidos)
8. [Painel — Clientes](#8-painel--clientes)
9. [Painel — Frota](#9-painel--frota)
10. [Painel — Motoristas](#10-painel--motoristas)
11. [Painel — Viagens](#11-painel--viagens)
12. [Painel — Financeiro](#12-painel--financeiro)
13. [Painel — Documentos](#13-painel--documentos)
14. [Painel — Mapa](#14-painel--mapa)
15. [Painel — Configurações](#15-painel--configurações)
16. [App do Motorista](#16-app-do-motorista)
17. [Componentes Compartilhados](#17-componentes-compartilhados)
18. [Funções de Backend](#18-funções-de-backend)
19. [Fluxos do Sistema](#19-fluxos-do-sistema)
20. [Sistema de Alertas](#20-sistema-de-alertas)
21. [Integrações](#21-integrações)
22. [Rotas da Aplicação](#22-rotas-da-aplicação)
23. [Bugs e Débitos Técnicos](#23-bugs-e-débitos-técnicos)
24. [Instrução para IA](#24-instrução-para-ia)

---

## 1. BANCO DE DADOS — ENTIDADES E SCHEMA

### ENTIDADE: Order
Descrição: Pedido de frete. Unidade central do negócio. Criado pelo cliente via site ou pelo admin via painel.

```
CAMPOS:
  protocol            string    SIM    Formato VLX-YYYY-NNNNN. Gerado no frontend (random).
  client_id           string    NÃO    ID do cliente (se vinculado à entidade Client)
  client_name         string    SIM    Nome/razão social do solicitante
  client_cpf_cnpj     string    NÃO    CPF ou CNPJ
  client_phone        string    NÃO    Telefone
  client_email        string    NÃO    E-mail
  preferred_contact   string    NÃO    enum: phone | whatsapp | email. Default: whatsapp
  status              string    NÃO    enum: new | confirmed | collecting | in_transit | delivered | cancelled. Default: new
  freight_type        string    NÃO    enum: dedicated | shared | urgent. Default: shared
  
  origin              object    NÃO    Endereço de coleta
    origin.cep          string
    origin.street       string
    origin.number       string
    origin.complement   string
    origin.neighborhood string
    origin.city         string
    origin.state        string
  
  collection_date     string(date)  NÃO  Data desejada de coleta
  collection_time     string        NÃO  enum: morning | afternoon | to_arrange
  collection_notes    string        NÃO  Obs de coleta (portaria, restrições)
  
  recipients          array     NÃO    Lista de destinatários. Cada item:
    recipients[].name              string   Nome/razão social
    recipients[].cpf_cnpj          string
    recipients[].phone             string
    recipients[].cep               string
    recipients[].street            string
    recipients[].number            string
    recipients[].complement        string
    recipients[].neighborhood      string
    recipients[].city              string
    recipients[].state             string
    recipients[].delivery_notes    string
    recipients[].delivery_status   string  enum: pending | collected | delivered | failed. Default: pending
    recipients[].items             array   Lista de itens/NFs por destinatário:
      items[].nf_number       string
      items[].description     string
      items[].volumes         number
      items[].weight_kg       number
      items[].height_cm       number
      items[].width_cm        number
      items[].length_cm       number
      items[].declared_value  number
      items[].fragile         boolean  Default: false
      items[].dangerous       boolean  Default: false
      items[].nf_original_url string
      items[].nf_signed_url   string

  total_volumes         number    NÃO    Calculado no frontend
  total_weight_kg       number    NÃO    Calculado no frontend
  total_declared_value  number    NÃO    Calculado no frontend
  freight_value         number    NÃO    Valor do frete definido pelo admin
  payment_method        string    NÃO    enum: pix | boleto | transfer | check | cash
  payment_status        string    NÃO    enum: pending | paid | overdue. Default: pending
  
  driver_id             string    NÃO    ID do motorista atribuído
  truck_id              string    NÃO    ID do caminhão atribuído
  trip_id               string    NÃO    ID da viagem vinculada
  
  general_notes         string    NÃO    Observações internas do admin
  
  status_history        array     NÃO    Histórico de mudanças de status:
    status_history[].status     string
    status_history[].timestamp  string (ISO)
    status_history[].user       string
    status_history[].note       string

RELACIONAMENTOS:
  driver_id → Driver (belongs_to)
  truck_id  → Truck  (belongs_to)
  trip_id   → Trip   (belongs_to)
  client_id → Client (belongs_to, opcional)

REGRAS:
  - protocol obrigatório, gerado como VLX-{year}-{5 dígitos random} no frontend
  - Transição de status é linear: new→confirmed→collecting→in_transit→delivered. Qualquer estado pode ir para cancelled.
  - status_history registra cada transição com timestamp, user e nota
```

---

### ENTIDADE: Truck
Descrição: Caminhão da frota. Inclui dados técnicos, documentos, status operacional e histórico de manutenção.

```
CAMPOS:
  plate              string    SIM    Placa do veículo
  model              string    NÃO    Modelo (ex: FH 460)
  manufacturer       string    NÃO    Fabricante (ex: Volvo, Scania)
  year               number    NÃO    Ano de fabricação
  truck_type         string    NÃO    enum: truck | carreta | vuc | toco | bitruck | outro
  capacity_kg        number    NÃO    Capacidade de carga em kg
  dimensions         object    NÃO
    dimensions.length_m  number
    dimensions.width_m   number
    dimensions.height_m  number
  renavam            string    NÃO
  chassis            string    NÃO
  color              string    NÃO
  status             string    NÃO    enum: available | on_route | maintenance | inactive. Default: available
  main_driver_id     string    NÃO    ID do motorista titular
  photo_url          string    NÃO
  crlv_url           string    NÃO    URL do documento CRLV
  crlv_expiry        string(date) NÃO  Vencimento do CRLV — usado para alertas (60 dias)
  insurance_url      string    NÃO
  insurance_expiry   string(date) NÃO  Vencimento do seguro — alerta 30 dias
  tachograph_last    string(date) NÃO  Data da última aferição do tacógrafo
  tachograph_next    string(date) NÃO  Data da próxima aferição — tratada como expiry para alertas
  total_km           number    NÃO    Default: 0
  maintenance_history array   NÃO    Histórico de manutenções (campo extra, não no schema base):
    maintenance_history[].type         string  enum: preventiva|corretiva|revisão|pneu|óleo|freios|outro
    maintenance_history[].date         string
    maintenance_history[].km           number
    maintenance_history[].description  string
    maintenance_history[].amount       number
    maintenance_history[].provider     string
    maintenance_history[].next_date    string
    maintenance_history[].created_at   string (ISO)

RELACIONAMENTOS:
  main_driver_id → Driver (belongs_to)

REGRAS:
  - plate é o identificador principal exibido na UI
  - status "on_route" é setado manualmente; não há automação que o altere
  - maintenance_history é um array dentro do objeto Truck (campo não definido no schema formal, guardado como JSON)
```

---

### ENTIDADE: Driver
Descrição: Motorista ou colaborador da empresa.

```
CAMPOS:
  name              string    SIM
  cpf               string    SIM
  cnh_number        string    NÃO
  cnh_category      string    NÃO    enum: A|B|C|D|E|AB|AC|AD|AE
  cnh_expiry        string(date) NÃO  Vencimento da CNH — alerta 60 dias
  birth_date        string(date) NÃO
  phone             string    NÃO
  email             string    NÃO
  address           object    NÃO
    address.cep           string
    address.street        string
    address.number        string
    address.complement    string
    address.neighborhood  string
    address.city          string
    address.state         string
  photo_url         string    NÃO
  hire_date         string(date) NÃO
  role              string    NÃO    enum: motorista|ajudante|administrativo. Default: motorista
  base_salary       number    NÃO
  contract_type     string    NÃO    enum: clt|pj|diarista
  bank_info         object    NÃO
    bank_info.bank    string
    bank_info.agency  string
    bank_info.account string
  status            string    NÃO    enum: active|away|terminated. Default: active
  notes             string    NÃO
  user_id           string    NÃO    ID do usuário do sistema vinculado ao motorista

RELACIONAMENTOS:
  user_id → User (belongs_to, opcional — para login no app do motorista)
```

---

### ENTIDADE: Client
Descrição: Empresa ou pessoa física cliente da transportadora.

```
CAMPOS:
  type                string    NÃO    enum: pj|pf. Default: pj
  company_name        string    SIM    Razão social ou nome
  cpf_cnpj            string    SIM    CPF ou CNPJ
  state_registration  string    NÃO    Inscrição estadual
  email               string    NÃO
  phone               string    NÃO
  address             object    NÃO    Endereço principal
    address.cep, street, number, complement, neighborhood, city, state
  additional_addresses  array   NÃO    Endereços adicionais de coleta/entrega
    [].label, cep, street, number, complement, neighborhood, city, state
    [].type  enum: sede|coleta|entrega
  notes               string    NÃO
  client_type         string    NÃO    enum: recorrente|eventual. Default: eventual
  custom_pricing      object    NÃO    Tabela de preço personalizada
    custom_pricing.price_per_kg  number
    custom_pricing.price_per_km  number
    custom_pricing.fixed_fee     number
  status              string    NÃO    enum: active|inactive. Default: active

RELACIONAMENTOS:
  Nenhum FK formal. Pedidos referem client_id via campo livre.
```

---

### ENTIDADE: Trip
Descrição: Viagem que agrupa pedidos. Vincula motorista, caminhão e paradas.

```
CAMPOS:
  status            string    NÃO    enum: planned|in_progress|completed|cancelled. Default: planned
  driver_id         string    SIM    ID do motorista
  driver_name       string    NÃO    Nome desnormalizado para exibição
  truck_id          string    SIM    ID do caminhão
  truck_plate       string    NÃO    Placa desnormalizada para exibição
  order_ids         array     NÃO    Lista de IDs de pedidos vinculados
  order_protocols   array     NÃO    Lista de protocolos desnormalizados
  departure_date    string(datetime) NÃO
  arrival_date      string(datetime) NÃO
  stops             array     NÃO    Lista de paradas:
    stops[].type            string  enum: departure|collection|delivery
    stops[].order_id        string
    stops[].recipient_name  string
    stops[].address         string  (string montada: rua, número, cidade - UF)
    stops[].city            string
    stops[].state           string
    stops[].status          string  enum: pending|arrived|completed. Default: pending
    stops[].arrived_at      string
    stops[].completed_at    string
    stops[].notes           string
    stops[].photo_url       string
    stops[].nf_signed_url   string
  estimated_km      number    NÃO
  real_km           number    NÃO    Preenchido ao encerrar
  fuel_liters       number    NÃO
  fuel_cost         number    NÃO
  tolls_cost        number    NÃO
  other_costs       array     NÃO    [{description, amount}]
  total_revenue     number    NÃO    Soma do freight_value dos pedidos
  total_cost        number    NÃO    Calculado ao encerrar: fuel_cost + tolls_cost + other_costs
  net_profit        number    NÃO    total_revenue - total_cost
  notes             string    NÃO
  events            array     NÃO    Log de eventos da viagem:
    events[].type         string
    events[].description  string
    events[].timestamp    string (ISO)
    events[].user         string
    events[].photo_url    string

RELACIONAMENTOS:
  driver_id → Driver (belongs_to)
  truck_id  → Truck  (belongs_to)
  order_ids → Order[] (has_many via array)
```

---

### ENTIDADE: Expense
Descrição: Despesa da empresa.

```
CAMPOS:
  category        string    SIM    enum: fuel|maintenance|tires|tolls|salaries|taxes|insurance|rent|administrative|marketing|other
  description     string    NÃO
  amount          number    SIM
  date            string(date) SIM
  payment_method  string    NÃO    enum: pix|boleto|transfer|check|cash|card
  status          string    NÃO    enum: pending|paid|installment. Default: pending
  due_date        string(date) NÃO
  paid_date       string(date) NÃO
  trip_id         string    NÃO
  truck_id        string    NÃO
  driver_id       string    NÃO
  receipt_url     string    NÃO
  notes           string    NÃO
```

---

### ENTIDADE: Revenue
Descrição: Conta a receber / receita da empresa.

```
CAMPOS:
  order_id        string    NÃO
  description     string    NÃO
  amount          number    SIM
  due_date        string(date) SIM
  status          string    NÃO    enum: receivable|received|overdue. Default: receivable
  payment_method  string    NÃO    enum: pix|boleto|transfer|check|cash
  received_date   string(date) NÃO
  client_id       string    NÃO
  notes           string    NÃO
```

---

### ENTIDADE: Incident
Descrição: Ocorrência registrada durante o transporte — avaria, atraso, tentativa de entrega, roubo, acidente, etc.

```
CAMPOS:
  order_id          string    SIM    ID do pedido relacionado
  trip_id           string    NÃO    ID da viagem relacionada
  type              string    NÃO    enum: avaria|atraso|tentativa_entrega|roubo|acidente|carga_recusada|outro
  description       string    SIM    Descrição detalhada
  photo_urls        array     NÃO    URLs das fotos da ocorrência
  reported_by_name  string    NÃO    Nome de quem registrou
  reported_by_role  string    NÃO    enum: motorista|admin|operador
  status            string    NÃO    enum: open|in_progress|resolved. Default: open
  resolution_notes  string    NÃO    Descrição da resolução
  resolved_at       string(datetime) NÃO  Timestamp da resolução
  notify_client     boolean   NÃO    Default: false

RELACIONAMENTOS:
  order_id → Order (belongs_to)
  trip_id  → Trip  (belongs_to, opcional)

CRIADO POR:
  - DriverTrip.jsx → via handleIncident() (reported_by_role: motorista)
  - (Futuro) Admin pode criar ocorrências diretamente no painel
```

---

### ENTIDADE: Alert
Descrição: Alerta operacional gerado pelo sistema.

```
CAMPOS:
  type            string    SIM    enum: cnh_expiring|cnh_expired|crlv_expiring|crlv_expired|insurance_expiring|insurance_expired|maintenance_due|order_no_driver|bill_due|bill_overdue
  level           string    NÃO    enum: info|warning|critical. Default: warning
  message         string    SIM    Texto do alerta
  reference_id    string    NÃO    ID da entidade relacionada
  reference_type  string    NÃO    Nome da entidade (ex: "Driver", "Truck")
  read            boolean   NÃO    Default: false
  resolved        boolean   NÃO    Default: false

NOTA: A entidade Alert existe no schema mas NÃO é usada pelo sistema atual. Os alertas são gerados em tempo real pela função generateAlerts() no componente AlertsPanel, sem persistência no banco.
```

---

### ENTIDADE: CompanySettings
Descrição: Configurações da empresa — informações do site, tabela de preços e limiares de alertas.

```
CAMPOS:
  company_name      string    SIM    Default: "Velox Transportadora"
  cnpj              string    NÃO
  address           string    NÃO    Endereço completo (campo único, não objeto)
  phone             string    NÃO
  email             string    NÃO
  whatsapp          string    NÃO
  logo_url          string    NÃO
  mission           string    NÃO    Default: "Conectar origens a destinos..."
  vision            string    NÃO    Default: "Ser referência regional..."
  values            string    NÃO    Default: "Pontualidade, Responsabilidade, Transparência, Segurança"
  about_text        string    NÃO    Texto da seção "Sobre Nós" do site
  fleet_photo_url   string    NÃO
  region            string    NÃO
  social_instagram  string    NÃO
  social_linkedin   string    NÃO
  social_facebook   string    NÃO
  hero_title        string    NÃO    Default: "Sua carga, no prazo certo."
  hero_subtitle     string    NÃO    Default: "Transporte de cargas com segurança, tecnologia e pontualidade."
  pricing           object    NÃO
    pricing.price_per_kg    number  Default: 0.5
    pricing.price_per_km    number  Default: 2.0
    pricing.fixed_fee       number  Default: 50
    pricing.minimum_freight number  Default: 150
  alert_days_cnh        number  NÃO  Default: 60
  alert_days_crlv       number  NÃO  Default: 60
  alert_days_insurance  number  NÃO  Default: 30
  tax_rate_percent      number  NÃO  Default: 5
  monthly_depreciation  number  NÃO  Default: 800
  service_type          string  NÃO  enum: dedicated_only|fractional|both. Default: dedicated_only
  coverage_type         string  NÃO  enum: states|cities|cep_range
  coverage_states       array   NÃO  Lista de UFs atendidas
  coverage_cities       array   NÃO  [{city, state}]
  coverage_cep_ranges   array   NÃO  [{from, to, label}]
  coverage_message      string  NÃO  Mensagem para clientes fora da área

REGRAS:
  - Apenas 1 registro deve existir. AdminSettings lê o primeiro via .list()[0]
  - Tabela de preços é configurável mas NÃO é usada no cálculo automático (débito técnico)
```

---

### ENTIDADE: Testimonial
Descrição: Depoimento de cliente exibido no site público.

```
CAMPOS:
  name    string    SIM    Nome do cliente
  company string    NÃO    Empresa do cliente
  text    string    SIM    Texto do depoimento
  rating  number    NÃO    Default: 5 (escala 1–5)
  active  boolean   NÃO    Default: true

NOTA: A entidade existe mas TestimonialsSection.jsx NÃO lê do banco. Usa defaultTestimonials hardcoded no componente.
```

---

## 2. SITE PÚBLICO — LANDING PAGE

**Rota:** `/`
**Componente:** `pages/Home.jsx`
**Stack:** `PublicNavbar + HeroSection + StatsSection + ServicesSection + HowItWorksSection + AboutSection + TestimonialsSection + ContactSection + PublicFooter + WhatsAppButton`

---

### NAVBAR — `components/public/PublicNavbar.jsx`

- Logo: ícone Truck (amber) + "VELOX" (display bold) + "Transportadora" (tiny amber)
- Links desktop: Início (âncora `#`) · Serviços (`#servicos`) · Sobre (`#sobre`) · Contato (`#contato`) · Rastrear (`/rastrear`)
- Botão CTA: **"Cotar Frete"** → `/agendar` (amber, rounded-full)
- Mobile: menu hambúrguer com AnimatePresence slide-down
- Comportamento: muda de fundo transparente para branco/sombra ao scroll > 50px

---

### SEÇÃO 1 — HERO
**Componente:** `HeroSection.jsx`
**Posição:** 1ª

Conteúdo:
- Badge: ícone Package + "TRANSPORTE DE CONFIANÇA" (amber, uppercase, tracking-wider)
- H1: "Sua carga," + quebra + span amber: "no prazo certo."
- Parágrafo: "Transporte de cargas com segurança, tecnologia e pontualidade. Mais de 20 anos de experiência conectando origens a destinos."
- Botão primário: **"Cotar Frete"** → `/agendar` (amber, rounded-full, shadow, ícone ArrowRight animado)
- Botão secundário: **"Agendar Coleta"** → `/agendar` (outline branco, rounded-full)
- Scroll indicator: animação bounce no rodapé

Visuais:
- Fundo: gradiente navy `#0c1929 → #152238 → #0A1628` com estrelas (50 dots aleatórios)
- Parallax: imagem de estrada (Unsplash) + imagem de caminhão (Unsplash), múltiplas camadas com velocidades diferentes
- Overlay gradiente esquerda→direita

---

### SEÇÃO 2 — STATS
**Componente:** `StatsSection.jsx`
**Posição:** 2ª (sobrepõe o hero com `-mt-20 z-30`)

Cards animados (contadores ao entrar em viewport):
- **20+** Anos de mercado (ícone Calendar)
- **3** Frotas próprias (ícone Truck)
- **5000+** Entregas realizadas (ícone Package)
- **100+** Cidades atendidas (ícone MapPin)

Container: branco, rounded-2xl, shadow-2xl, p-12

---

### SEÇÃO 3 — SERVIÇOS
**Componente:** `ServicesSection.jsx`
**Posição:** 3ª
**ID âncora:** `#servicos`
**Fundo:** cinza claro (`bg-gray-50`)

Cabeçalho: "Nossos Serviços" (amber, uppercase) + H2: "Soluções completas em transporte" + P: "Oferecemos diferentes modalidades de frete para atender exatamente o que você precisa."

4 cards com hover (border amber + shadow) e animação whileInView:
1. **Frete Dedicado** (ícone Truck) — "Caminhão exclusivo para sua carga. Coleta e entrega direta, sem paradas intermediárias." — Link: "Saiba mais →" (`#`, sem destino real)
2. **Frete Fracionado** (ícone Package) — "Compartilhe o transporte e reduza custos. Ideal para cargas menores que não exigem veículo exclusivo." — Link "Saiba mais →"
3. **Coleta Programada** (ícone Clock) — "Agende coletas recorrentes com dia e horário fixos. Perfeito para operações regulares." — Link "Saiba mais →"
4. **Entrega Expressa** (ícone Zap) — "Prazo reduzido para cargas urgentes. Prioridade total na coleta e entrega." — Link "Saiba mais →"

---

### SEÇÃO 4 — COMO FUNCIONA
**Componente:** `HowItWorksSection.jsx`
**Posição:** 4ª
**Fundo:** branco

Cabeçalho: "Como funciona" (amber) + H2: "Simples, rápido e seguro"

3 passos conectados por linha horizontal (desktop):
1. **"01 — Solicite o frete"** (ícone ClipboardList) — "Preencha nosso formulário com os dados da carga, origem e destino. É rápido e simples."
2. **"02 — Confirmamos e coletamos"** (ícone Truck) — "Nossa equipe confirma o agendamento e envia o caminhão no dia e horário combinados."
3. **"03 — Entrega com NF assinada"** (ícone CheckCircle2) — "Sua carga chega ao destino com segurança. Você recebe a NF assinada como comprovante."

---

### SEÇÃO 5 — SOBRE NÓS
**Componente:** `AboutSection.jsx`
**Posição:** 5ª
**ID âncora:** `#sobre`
**Fundo:** `velox-dark` (navy escuro), texto branco

Layout 2 colunas (desktop):
- Esquerda: imagem (Unsplash frota) + badge flutuante amber "20+ Anos de experiência"
- Direita:
  - "Sobre nós" (amber, uppercase)
  - H2: "Tradição que se reinventa"
  - P1: "Com mais de duas décadas no setor de transportes, a Velox nasceu da experiência e da vontade de fazer diferente. Combinamos a solidez de quem conhece o mercado com a modernidade de quem abraça a tecnologia."
  - P2: "Nossa missão é conectar origens a destinos com pontualidade, segurança e compromisso. Cada carga que transportamos carrega a confiança dos nossos clientes."
  - 4 badges de valores (glass): Pontualidade (Clock) · Responsabilidade (Shield) · Transparência (Eye) · Segurança (Target)

---

### SEÇÃO 6 — DEPOIMENTOS
**Componente:** `TestimonialsSection.jsx`
**Posição:** 6ª
**Fundo:** `bg-gray-50`

Carrossel automático (6s) com 3 depoimentos hardcoded (NÃO usa banco):
1. **Carlos Mendes** / Distribuidora Brasil — "Profissionalismo e pontualidade. A Velox transformou nossa logística. Entregas sempre no prazo e cargas chegam em perfeito estado." ★★★★★
2. **Ana Paula Silva** / Indústria Textil SP — "Desde que começamos a trabalhar com a Velox, nossos problemas de transporte acabaram. Atendimento excelente e preço justo." ★★★★★
3. **Roberto Oliveira** / Comércio Atacadista RJ — "Confiança total. Transportam nossas mercadorias há anos e nunca tivemos nenhuma ocorrência. Recomendo fortemente." ★★★★★

Controles: setas ChevronLeft/Right + dots de navegação

---

### SEÇÃO 7 — CONTATO
**Componente:** `ContactSection.jsx`
**Posição:** 7ª
**ID âncora:** `#contato`
**Fundo:** branco

Layout 2 colunas:
- Esquerda: "Fale conosco" + H2: "Vamos conversar?" + P + dados de contato:
  - Telefone: `(00) 0000-0000` (hardcoded — placeholder)
  - E-mail: `contato@velox.com.br` (hardcoded — placeholder)
  - Endereço: "A definir" (hardcoded)
- Direita: formulário de contato
  - `name` (text, required) — label: "Nome", placeholder: "Seu nome completo"
  - `email` (email, required) — label: "E-mail", placeholder: "seu@email.com"
  - `phone` (text) — label: "Telefone", placeholder: "(00) 00000-0000"
  - `message` (textarea, 5 rows, required) — label: "Mensagem", placeholder: "Como podemos ajudar?"
  - Botão: **"Enviar Mensagem"** + ícone Send

  **ATENÇÃO:** Ao submeter, simula envio com `setTimeout(1000)` e exibe toast "Mensagem enviada! Entraremos em contato em breve." — NÃO envia nada de verdade.

---

### FOOTER — `components/public/PublicFooter.jsx`

4 colunas:
1. Logo + tagline "Conectando origens a destinos com pontualidade, segurança e compromisso."
2. **Links Rápidos:** Início · Serviços · Sobre Nós · Contato (todos `href="#"`, sem navegação real)
3. **Serviços:** Frete Dedicado · Frete Fracionado · Coleta Programada · Entrega Expressa (todos `href="#"`)
4. **Contato:** `(00) 0000-0000` · `contato@velox.com.br` · `CNPJ: 00.000.000/0001-00` (todos placeholder)

Rodapé: `© {ano} Velox Transportadora. Todos os direitos reservados.` + links "Política de Privacidade" e "Termos de Uso" (ambos `href="#"`)

---

### WHATSAPP BUTTON — `components/public/WhatsAppButton.jsx`

Botão fixo (bottom-right). Número hardcoded: `+5500000000000`. Mensagem: "Olá! Gostaria de mais informações sobre o serviço de transporte."

---

## 2.5 SITE PÚBLICO — COTAÇÃO RÁPIDA

**Rota:** `/cotacao`
**Componente:** `pages/QuoteForm.jsx`
**Descrição:** Formulário de 3 passos para simular o valor do frete **sem criar pedido**. Não gera protocolo nem reserva carreta.

### Fluxo em 3 passos

```
Passo 1 — Rota (origem + destino por UF)
Passo 2 — Carga (múltiplos lotes, peso/dimensões/valor/NFs)
Passo 3 — Resultado (valor estimado + prazo + FreightBreakdown)
```

**Passo 1 — Rota:** Selects de UF de origem e destino. Ambos obrigatórios para avançar.

**Passo 2 — Carga:** Por lote: volumes, peso (kg), dimensões (opcional), valor declarado, qtd NFs. Botão "+ Adicionar lote" para múltiplas cargas.

**Passo 3 — Resultado:**
- Valor total em font-mono amber
- Prazo estimado por estado (via `delivery_days_table` em CompanySettings)
- `FreightBreakdown` colapsável com detalhamento completo
- CTA "Agendar coleta com este frete →" navega para `/agendar` passando `location.state.prefill` com os dados do formulário e o breakdown da cotação

**Integração com BookingForm:**
Quando `BookingForm` detecta `location.state?.prefill`, exibe banner amber "✓ Cotação importada — valor estimado: R$ X.XXX,XX" no cabeçalho.

**Navbar:** Link "Cotar Frete" (texto, branco/amber no hover) separado do botão CTA "Agendar Coleta" (amber, rounded-full).

---

## 3. SITE PÚBLICO — FORMULÁRIO DE AGENDAMENTO

**Rota:** `/agendar`
**Componente:** `pages/BookingForm.jsx` (aceita `location.state.prefill` vindo do QuoteForm)
**Componente:** `pages/BookingForm.jsx`
**Título:** "Solicitar Frete"
**Subtítulo:** "Preencha os dados para cotação ou agendamento de coleta."

### Fluxo em 5 passos

```
Passo 1 — Solicitante
Passo 2 — Origem
Passo 3 — Destinatários e Cargas
Passo 4 — Tipo de Serviço
Passo 5 — Resumo
```

Progress bar visual com números 1–5 e labels abaixo (visíveis em sm+). Barra de conexão entre passos (amber = concluído).

---

#### Passo 1 — Dados do Solicitante
- `client_name` (text, required*) — label: "Nome Completo / Razão Social *", placeholder: "Nome ou razão social"
- `cpf_cnpj` (text, required*) — label: "CPF / CNPJ *", placeholder: "000.000.000-00"
- `phone` (text, required*) — label: "Telefone *", placeholder: "(00) 00000-0000"
- `email` (email, required*) — label: "E-mail *", placeholder: "seu@email.com"
- `preferred_contact` (select) — label: "Preferência de contato" — opções: Telefone | WhatsApp | E-mail. Default: WhatsApp

*_Obrigatório visualmente (label com *), mas sem validação real — botão Próximo não bloqueia_

---

#### Passo 2 — Origem da Coleta
- `origin_cep` (text) — label: "CEP *", placeholder: "00000-000" — **onBlur → busca ViaCEP**
- `origin_street` (text) — label: "Endereço *" — autopreenchido pelo ViaCEP
- `origin_number` (text) — label: "Número *"
- `origin_complement` (text) — label: "Complemento"
- `origin_neighborhood` (text) — label: "Bairro" — autopreenchido
- Cidade/UF (readonly) — exibe `origin_city / origin_state` — autopreenchido pelo ViaCEP
- `collection_date` (date) — label: "Data desejada para coleta *"
- `collection_time` (select) — label: "Horário preferencial" — opções: Manhã | Tarde | A combinar
- `collection_notes` (textarea, 3 rows) — label: "Observações de coleta", placeholder: "Portaria, restrições de acesso..."

---

#### Passo 3 — Destinatários e Cargas
Seção dinâmica. 1 destinatário inicial, pode adicionar mais.

Por **destinatário**:
- `name` (text) — label: "Nome / Razão Social *"
- `cep` (text) — label: "CEP *" — **onBlur → busca ViaCEP para destinatário**
- Cidade/UF (readonly) — autopreenchido
- `street` (text) — label: "Endereço *"
- `number` (text) — label: "Número"
- Botão **"+ Destinatário"** — adiciona novo destinatário
- Botão trash (vermelho) — remove destinatário (desabilitado se só 1)

Por **item/NF** dentro de cada destinatário:
- `description` (text) — placeholder: "Descrição *"
- `volumes` (number) — placeholder: "Volumes"
- `weight_kg` (number) — placeholder: "Peso (kg)"
- `nf_number` (text) — placeholder: "NF"
- `declared_value` (number) — placeholder: "Valor (R$)"
- `fragile` (checkbox) — label: "Frágil"
- `dangerous` (checkbox) — label: "Perigosa"
- Botão **"+ Item"** — adiciona item
- Botão trash — remove item (desabilitado se só 1)

---

#### Passo 4 — Tipo de Serviço
3 botões de seleção visual (toggle com border amber ao selecionar):
- **"Frete Dedicado"** / desc: "Caminhão exclusivo" — value: `dedicated`
- **"Frete Fracionado"** / desc: "Compartilhado" — value: `shared` (default)
- **"Urgente"** / desc: "Prazo reduzido" — value: `urgent`

Textarea: "Observações gerais", placeholder: "Informações adicionais...", 4 rows

---

#### Passo 5 — Resumo da Solicitação
4 cards amber: Destinatários · Volumes · Peso (kg) · Valor Declarado (R$)

Blocos de revisão:
- Solicitante: nome, CPF/CNPJ, telefone
- Origem: endereço, data de coleta, horário
- Cada destinatário: nome, endereço, qtd de itens

Botão final: **"Solicitar Cotação"** → chama `handleSubmit()` → cria Order no banco → exibe tela de sucesso

---

#### Tela de Sucesso
- Ícone CheckCircle2 (verde grande)
- H2: "Solicitação Enviada!"
- P: "Seu protocolo é:"
- Box com protocolo em font-mono (ex: VLX-2026-04823)
- P: "Você receberá uma confirmação por e-mail. Use o protocolo para rastrear sua carga." *(Nota: não envia e-mail)*
- Botão **"Rastrear Carga"** → `window.location.href = "/rastrear"`

---

#### Lógica de Negócio

- Protocolo gerado: chama `generateProtocol` via `base44.functions.invoke("generateProtocol", {})` → retorna próximo sequencial único `VLX-{ano}-{NNNNN}`
- Validação por passo: Passo 1 valida client_name (min 3 chars) + phone ou email; Passo 2 valida CEP (8 dígitos), street, number, collection_date (hoje ou futura); Passo 3 valida name/CEP por destinatário + description/volumes/weight por item. Campos inválidos exibem borda vermelha + mensagem de erro.
- Status inicial: `new`
- Totais calculados: volumes, peso e valor declarado somados de todos os itens
- status_history: 1 entrada inicial: `{status:"new", user:client_name, note:"Solicitação via site"}`
- ViaCEP: chamada a `https://viacep.com.br/ws/{cep}/json/` no onBlur do CEP

---

## 4. SITE PÚBLICO — RASTREAMENTO

**Rota:** `/rastrear`
**Componente:** `pages/Tracking.jsx`
**Título:** "Rastrear Carga"
**Subtítulo:** "Insira o número do protocolo para acompanhar sua carga em tempo real."

### Formulário de busca
- Input: placeholder "Ex: VLX-2025-00001" (font-mono) — busca por `protocol` (uppercase automático)
- Botão busca (amber) com ícone Search (ou Clock animado se loading)

### Resultado — Timeline de Status
5 etapas visuais: Solicitado (Package) · Confirmado (CheckCircle2) · Em Coleta (MapPin) · Em Trânsito (Truck) · Entregue (CheckCircle2)

- Etapas concluídas: fundo amber + ícone preenchido
- Etapa atual: ring amber (glow)
- Etapas futuras: cinza claro

### Resultado — Destinatários
Cards por destinatário com nome, cidade/estado e badge de status:
- `delivered` → badge verde "Entregue"
- `collected` → badge amber "Coletado"
- `failed` → badge vermelho "Falha"
- `pending` → badge amber "Pendente"

### Estado de erro
Exibe ícone Package + "Nenhum pedido encontrado com esse protocolo."

---

## 5. PAINEL — LAYOUT BASE

**Componente:** `components/admin/AdminLayout.jsx`
**Rota base:** `/admin/*` (protegida por ProtectedRoute)

Estrutura:
- `AdminSidebar` (fixo, esquerda, 240px expandido / 64px colapsado)
- Área principal: `AdminTopbar` (sticky top, 64px) + `<main className="p-6">` com `<Outlet />`
- Transição CSS 300ms ao colapsar/expandir

---

### SIDEBAR — `components/admin/AdminSidebar.jsx`

**Header:** Logo (Truck amber) + "VELOX" + "Transportadora" (ocultado se colapsado)

**5 Grupos de navegação (labels em português simples):**

**Hoje:**
- Início (`/admin`) — LayoutDashboard
- Alertas (`/admin/alertas`) — Bell + badge com qtd não lidos

**Coletas:**
- Pedidos (`/admin/pedidos`) — Package + badge com qtd novos
- Programação (`/admin/programacao`) — Calendar
- Clientes (`/admin/clientes`) — Building2

**Frota:**
- Carretas (`/admin/frota`) — Truck
- Motoristas (`/admin/motoristas`) — Users
- Viagens (`/admin/viagens`) — Route

**Dinheiro** (**admin only**):
- Visão Geral (`/admin/financeiro`) — BarChart3
- Receitas (`/admin/financeiro/receitas`) — TrendingUp
- Despesas (`/admin/financeiro/despesas`) — TrendingDown
- DRE (`/admin/financeiro/dre`) — FileText
- Fluxo (`/admin/financeiro/fluxo`) — Activity

**Configurações** (**admin only**):
- Empresa (`/admin/configuracoes`) — Settings
- Documentos (`/admin/documentos`) — FolderOpen
- Mapa (`/admin/mapa`) — MapPin

**Footer da sidebar:**
- Nome + role do usuário logado
- Botão "Sair" → `base44.auth.logout("/")`
- Botão recolher/expandir (ChevronLeft/Right)

**Item ativo:** destaque amber. Labels grupos: 10px uppercase tracking-widest texto claro. Badges: vermelho com contagem.
Nota: "Novo Pedido" removido da sidebar — acesso via botão na lista de pedidos.

---

### TOPBAR — `components/admin/AdminTopbar.jsx`

- Input de busca (desktop): debounce 300ms, 3+ chars dispara busca em Order, Client, Truck e Driver. Dropdown agrupado por tipo, clicável. Atalho: Ctrl+K / Cmd+K.
- Botão Bell (notificações): badge vermelho com contagem de alertas não lidos. Dropdown com os 5 alertas mais recentes, "Marcar todos lidos", link "Ver todos" → `/admin/alertas`.
- Avatar do usuário: primeira letra do nome + nome completo + role

---

## 6. PAINEL — DASHBOARD

**Rota:** `/admin`
**Componente:** `pages/admin/Dashboard.jsx`
**Título:** "Início"
**Subtítulo:** data atual formatada em pt-BR

### Linha 1 — O que está acontecendo agora (4 KPI cards)
| Card | Valor |
|---|---|
| Pedidos Novos | pedidos status=new aguardando confirmação |
| Em Coleta Hoje | pedidos status=collecting com collection_date=hoje |
| Entregues Hoje | pedidos entregues (último status_history timestamp = hoje) |
| Alertas Ativos | qtd alertas não resolvidos (badge vermelho se > 0) |

### Linha 2 — Programação desta semana
Calendário de 7 dias (hoje + 6 próximos). Cada dia exibe:
- Número de coletas programadas (verde=ok, âmbar=quase cheio, vermelho=sem capacidade)
- Indicador colorido de disponibilidade da frota
- Link "Ver programação →" → `/admin/programacao`

### Linha 3 — Últimos Pedidos (6) + Alertas (4)
- Tabela: Protocolo · Cliente · Status · Valor
- Card Alertas: max 4 alertas com ícone por nível

**Nota:** Gráficos de "Fretes por Semana" e "Tipos de Frete" foram movidos para `/admin/financeiro`.

---

## 7. PAINEL — PEDIDOS

### Lista — `/admin/pedidos`
**Componente:** `pages/admin/Orders.jsx`
**Título:** "Pedidos"
**Subtítulo:** "{total} pedido(s) total · {filtrados} exibindo"

**Filtros:**
- Busca de texto (protocolo ou nome do cliente)
- Status: Todos | Novo | Confirmado | Em Coleta | Em Trânsito | Entregue | Cancelado
- Tipo: Todos | Dedicado | Fracionado | Urgente

**Tabela:**
| Coluna | Visível |
|---|---|
| Protocolo (link) | sempre |
| Cliente | sempre |
| Origem → Destinos | lg+ |
| Data Coleta | md+ |
| Status (badge) | sempre |
| Valor (R$) | sm+ |
| Ação (ícone Eye) | sempre |

**Botão:** "+ Novo Pedido" → `/admin/pedidos/novo`

**Estado vazio:** ícone Package + "Nenhum pedido encontrado" + botão "Criar primeiro pedido" (se sem filtros)

---

### Novo Pedido — `/admin/pedidos/novo`
**Componente:** `pages/admin/NewOrder.jsx`
**Título:** "Novo Pedido" / "Cadastro interno de frete"

Seções em Cards:

**1. Solicitante** (ícone User)
- `client_name` (text) — "Razão Social / Nome *"
- `client_cpf_cnpj` (text) — "CPF / CNPJ *"
- `client_phone` (text) — "Telefone / WhatsApp"
- `client_email` (email) — "E-mail"
- `freight_type` (select) — Dedicado | Fracionado | Urgente

**2. Origem da Coleta** (ícone MapPin)
- CEP (autopreenchimento ViaCEP ao digitar 8 dígitos)
- Número, Complemento, Rua, Bairro, Cidade, Estado
- Data de coleta (date), Horário (Manhã/Tarde/A combinar)
- Observações (textarea, 2 rows)

**3. Destinatários e Cargas** (dinâmico, idêntico ao formulário público)
Por destinatário: Nome, Telefone, CEP+endereço completo
Por item: Descrição*, Volumes, Peso (kg), Valor R$
Botões: "+ Destinatário" · "+ Item" · trash por destinatário e item

**4. Valor e Atribuição** (ícone DollarSign)
- Valor do frete (number, step 0.01)
- Forma de pagamento (PIX | Boleto | Transferência | Dinheiro)
- Motorista (select — filtra status=active)
- Caminhão (select — filtra status=available)
- Observações internas (textarea, col-span-2)

**Validações:** client_name (min 3 chars), origin.cep (8 dígitos), origin.street, origin.number, collection_date (hoje ou futura). Erros exibem borda vermelha + FieldError abaixo do campo.

**Botões:** "Cancelar" (volta lista) · "Criar Pedido" (amber)

---

### Detalhe do Pedido — `/admin/pedidos/:id`
**Componente:** `pages/admin/OrderDetailPage.jsx`

**Header:**
- Botão voltar, Protocolo (font-mono) + StatusBadge, data de criação
- Botão de ação de status (amber):
  - Novo → "Confirmar Pedido"
  - Confirmado → "Marcar Em Coleta"
  - Em Coleta → "Marcar Em Trânsito"
  - Em Trânsito → "Confirmar Entrega"

**Timeline de Status** (horizontal): Novo → Confirmado → Em Coleta → Em Trânsito → Entregue (amber = concluído, ring = atual)

**Coluna principal (2/3):**
- Card Solicitante: Nome/Razão Social · CPF/CNPJ · Telefone · E-mail
- Card Origem: Endereço completo · Data Coleta · Período · Obs
- Destinatários (acordeão): cada destinatário tem nome/cidade, badge de delivery_status, ao expandir: endereço completo + tabela de itens (Descrição · Volumes · Peso · Valor)
- Histórico de Eventos: timeline com dot amber, texto da nota, user e timestamp

**Coluna lateral (1/3):**
- Card Atribuição: select Motorista (filtra active) + select Caminhão (filtra available ou on_route)
- Card Financeiro: campo valor do frete, peso total, volumes, badge payment_status, botão "Marcar como Pago"
- Card Observações: textarea + botão "Salvar" (amber)
- Cancelar Pedido: botão outline vermelho → confirmação de 2 passos (Não/Cancelar)

---

## 8. PAINEL — CLIENTES

### Lista — `/admin/clientes`
**Componente:** `pages/admin/Clients.jsx`
**Título:** "Clientes" / "Base de clientes"

- Busca por nome ou CPF/CNPJ
- Grid de cards (1/2/3 cols)
- Cada card: avatar Building2 + nome + CPF/CNPJ + email + telefone
- Botão "+ Novo Cliente" → modal

**Modal "Cadastrar Cliente":**
- `company_name` (text, required) — label explícito
- `cpf_cnpj` (text, required) — label explícito
- `type` (select) — Pessoa Jurídica | Pessoa Física — label explícito
- `email` (text) — label explícito
- `phone` (text) — label explícito
- `client_type` (select) — Recorrente | Eventual — label explícito
- `status` (select) — Ativo | Inativo — label explícito
- Botão "Cadastrar" (amber, desabilitado se sem company_name ou cpf_cnpj)
- **Reset:** formulário reseta para EMPTY_CLIENT no onSuccess e ao fechar o modal

---

### Detalhe do Cliente — `/admin/clientes/:id`
**Componente:** `pages/admin/ClientDetailPage.jsx`

**Header:** Avatar Building2 + nome + CPF/CNPJ + badge status + botão "Editar/Cancelar"

**3 KPIs:**
- Fretes Realizados (contagem de orders do cliente)
- Total Faturado (soma freight_value)
- Ticket Médio (Total / Qtd)

**Card Dados Cadastrais:** CPF/CNPJ, Tipo, Telefone, E-mail, Observações
**Modo edição:** form inline com labels explícitos nos campos: Razão Social/Nome, CPF/CNPJ, Tipo de pessoa (select pj/pf), Telefone, E-mail, Perfil de cliente (select recorrente/eventual), Status (select active/inactive), Observações + botão "Salvar"

**Card Últimos Pedidos:** lista dos 5 mais recentes com protocolo + StatusBadge

---

## 9. PAINEL — FROTA

### Lista — `/admin/frota`
**Componente:** `pages/admin/Fleet.jsx`
**Título:** "Frota" / "{N} veículo(s) cadastrado(s)"

- Busca por placa ou modelo
- Grid de cards (1/2/3 cols)

Cada card:
- Header (navy→blue gradient): placa (font-mono bold), badge status (canto direito), alerta "Doc. vencendo" (se CRLV/seguro/tacógrafo ≤ 60 dias)
- Body: Fabricante + Modelo, Ano + tipo, Capacidade (kg)
- Botão "Ver detalhes" → `/admin/frota/:id`

Botão "+ Novo Caminhão" → modal

**Modal "Cadastrar Caminhão":**
- `plate` (text, required, uppercase automático) — label explícito
- `model` (text) — label explícito
- `manufacturer` (text) — label explícito
- `year` (number) — label explícito
- `capacity_kg` (number) — label explícito
- `color` (text) — label explícito
- `renavam` (text) — label explícito
- `truck_type` (select) — Truck|Carreta|VUC|Toco|Bitruck|Outro — label explícito
- `dimensions` (3 campos numéricos em grid 3 cols): comprimento_m · largura_m · altura_m — label explícito
- Botão "Cadastrar" → redireciona para detalhe
- **Reset:** formulário reseta para EMPTY_TRUCK no onSuccess e ao fechar o modal

---

### Detalhe do Caminhão — `/admin/frota/:id`
**Componente:** `pages/admin/TruckDetailPage.jsx`

**Header:** Placa (font-mono bold) + badge status + Fabricante Modelo Ano + botão "Editar/Cancelar"

**Card Dados do Veículo (modo view):** Placa · Modelo · Fabricante/Modelo · Ano · Tipo · Capacidade · Motorista titular · Cor · RENAVAM · Dimensões (C×L×A em metros) · Status

**Modo edição:** grid com inputs e labels explícitos: Placa, Fabricante, Modelo, Ano, Cor, RENAVAM, Capacidade (kg — type=text inputMode=numeric), Status (select), Dimensões (comprimento × largura × altura em metros — type=text inputMode=decimal, grid 3 cols), Motorista titular (select). Ao salvar: `capacity_kg` convertido com `Number(String.replace(/\D/g,""))`, `dimensions.*` convertidos com `parseFloat()`.

**Card Manutenções:**
- Tabela: Data · Tipo · Descrição · Valor
- Botão "+ Registrar"

**Modal "Registrar Manutenção":**
- `type` (select) — preventiva|corretiva|revisão|pneu|óleo|freios|outro
- `date` (date)
- `km` (number) — "Km no momento"
- `description` (textarea, 2 rows)
- `amount` (number, step 0.01)
- `provider` (text) — "Fornecedor / Oficina"
- `next_date` (date) — "Próxima manutenção"
- Botão "Registrar Manutenção"

**Card Documentos (lateral):**
- CRLV: vencimento + badge status
- Seguro: vencimento + badge
- Tacógrafo (próxima): vencimento + badge
- Em modo edição: input date para cada

Lógica de badges de documentos:
- Vencido (dias < 0): vermelho "Vencido"
- ≤ 30 dias: vermelho "{N}d"
- 31–60 dias: amber "{N}d"
- > 60 dias: verde "OK"

---

## 10. PAINEL — MOTORISTAS

### Lista — `/admin/motoristas`
**Componente:** `pages/admin/Drivers.jsx`
**Título:** "Motoristas" / "{N} motorista(s) cadastrado(s)"

- Busca por nome ou CPF
- Tabela com colunas: Motorista (avatar+nome+alerta CNH) · CPF (md+) · CNH categoria+vencimento (lg+) · Telefone (md+) · Status (badge) · Ação (Eye)

Botão "+ Novo Motorista" → modal

**Modal "Cadastrar Motorista":**
- `name` (text, required)
- `cpf` (text, required)
- `birth_date` (date)
- `hire_date` (date)
- `phone` (text)
- `email` (text)
- `cnh_number` (text)
- `cnh_category` (select) — A|B|C|D|E|AB|AC|AD|AE
- `cnh_expiry` (date)
- `role` (select) — motorista|ajudante|administrativo
- `contract_type` (select) — CLT|PJ|Diarista
- `base_salary` (text, inputMode=decimal) — parseFloat ao salvar
- `status` (select) — Ativo|Afastado|Desligado
- Botão "Cadastrar" → redireciona para detalhe

Alerta CNH: se vencimento ≤ 60 dias, exibe "CNH vencendo" (vermelho + AlertTriangle) abaixo do nome

Badges de status:
- `active` → verde "Ativo"
- `away` → amber "Afastado"
- `terminated` → vermelho "Desligado"

---

### Detalhe do Motorista — `/admin/motoristas/:id`
**Componente:** `pages/admin/DriverDetailPage.jsx`

**Header:** Avatar (inicial) + nome + status + botão Editar

**3 KPIs do mês:** Fretes realizados · Receita gerada · Ticket médio

**Card Dados do Motorista (modo view):** CPF · Data de nascimento · Telefone · E-mail · Função · CNH (nº+categoria+vencimento) · Validade CNH · Admissão · Contrato · Salário base (formatado pt-BR)
**Modo edição:** form com labels explícitos em todos os campos: Nome, Data de nascimento (date), CPF, Telefone, E-mail, Número CNH, Categoria CNH (select), Validade CNH (date), Data de admissão (date), Função (select motorista/ajudante/administrativo), Tipo contrato (select), Salário base (text inputMode=decimal), Status (select active/away/terminated) + botão Salvar

**Card Últimos Pedidos:** tabela simplificada dos pedidos do mês vinculados ao motorista

---

## 11. PAINEL — VIAGENS

### Lista — `/admin/viagens`
**Componente:** `pages/admin/Trips.jsx`
**Título:** "Viagens" / "Gestão de rotas e viagens"

Tabs: **Ativas** (contador badge amber) · Planejadas · Concluídas · Canceladas

Cada tab exibe grid de TripCards (1/2/3 cols).

**TripCard:**
- Avatar Truck (amber on dark) + nome do motorista + placa
- Badge de status (amber/blue/green/red)
- Barra de progresso: paradas concluídas / total
- Data de saída + qtd de pedidos
- Botão "Ver Detalhes" → `/admin/viagens/:id`

Botão "+ Nova Viagem" → `/admin/viagens/nova`

---

### Nova Viagem — `/admin/viagens/nova`
**Componente:** `pages/admin/NewTrip.jsx`
**Título:** "Nova Viagem" / "Agrupar pedidos e definir rota"

**Card 1 — Pedidos para esta viagem:**
Lista apenas pedidos com `status="confirmed"` e `trip_id` vazio.
Cada pedido: checkbox + protocolo + StatusBadge + cliente + rota (origem→destinos) + kg + R$
Barra de totais: {N} pedido(s) · {total}kg · R$ {receita}

**Card 2 — Equipe e Veículo:**
- Motorista (select, filtra `status=active`)
- Caminhão (select, filtra `status=available`, exibe placa, modelo, capacidade)
- Alerta vermelho se peso total > capacidade do caminhão selecionado

**Card 3 — Agendamento:**
- `departure_date` (datetime-local)
- `notes` (textarea, 2 rows)
- Checkbox "Iniciar imediatamente (status: Em Andamento)"

Botão "Criar Viagem" ou "Criar e Iniciar Viagem" (se checkbox marcado)
Desabilitado se: nenhum pedido selecionado, sem motorista ou sem caminhão

**Ao criar:** registra Trip + atualiza todos os Orders selecionados com `trip_id`, `driver_id`, `truck_id`

---

### Detalhe da Viagem — `/admin/viagens/:id`
**Componente:** `pages/admin/TripDetailPage.jsx`

**Header:** "Viagem" + badge status + motorista · placa
- Se `planned`: botão "▶ Iniciar" (amber)
- Se `in_progress`: botão "⬛ Encerrar Viagem" (verde)

**Barra de Progresso:** paradas concluídas / total

**Lista de Paradas (2/3):**
Cada parada: número/ícone (pending=cinza, arrived=amber, completed=verde) + tipo badge (Partida/Coleta/Entrega em cores) + recipient_name + endereço + hora de conclusão

Ações (só se `in_progress` e não completed):
- "Chegou" (outline) → status = `arrived`
- "Concluir" (verde) → status = `completed`

**Card Financeiro (1/3):**
- Receita total (verde)
- Se completed: Custo total (vermelho) + Lucro líquido (verde/vermelho) + Km real + Combustível (L + R$) + Pedágios

**Card Eventos:** log reverso de eventos da viagem

**Modal "Encerrar Viagem":**
- `real_km` (number) — "Km Final (odômetro)"
- `fuel_liters` (number, step 0.1) — "Combustível (litros)"
- `fuel_cost` (number, step 0.01)
- `tolls_cost` (number, step 0.01)
- Outros gastos: lista dinâmica com {descrição + valor R$} + botão "+ Adicionar" + trash
- `notes` (textarea, 2 rows) — "Observações finais"
- Preview: Receita · Custo estimado
- Botão "Confirmar Encerramento" (verde)

**Cálculo ao encerrar:** `total_cost = fuel_cost + tolls_cost + Σother_costs`, `net_profit = total_revenue - total_cost`

---

## 12. PAINEL — FINANCEIRO

### Visão Geral — `/admin/financeiro`
**Componente:** `pages/admin/Financial.jsx`
**Acesso:** admin only (sidebar oculta para outros roles, mas rota não protegida por código)

3 KPI Cards do mês corrente:
- Receita do mês: soma de `freight_value` dos pedidos com freight_value no mês
- Despesas do mês: soma de `amount` das despesas com date no mês
- Resultado: Receita - Despesas (azul se positivo, vermelho se negativo)

Gráfico de barras (6 meses): Receita (verde) + Despesa (vermelho) — Recharts BarChart

---

### Receitas — `/admin/financeiro/receitas`
**Componente:** `pages/admin/Revenues.jsx`

2 KPI Cards: A Receber (amber) · Recebido (verde)

Filtros: busca por descrição + select de status

Tabela: Descrição · Valor (verde) · Vencimento (md+) · Status · Ação
Ação: botão "✓ Recebido" (se status=receivable) → atualiza para received + received_date=hoje

Botão "+ Nova Receita" → modal

**Modal "Nova Receita":**
- `description` (text, required)
- `amount` (number, step 0.01, required)
- `due_date` (date, required)
- `payment_method` (select) — PIX|Boleto|Transferência|Dinheiro
- Botão "Cadastrar" → cria com status=receivable

Badges: A Receber (amber) · Recebido (verde) · Atrasado (vermelho)

---

### Despesas — `/admin/financeiro/despesas`
**Componente:** `pages/admin/Expenses.jsx`

2 KPI Cards: A Pagar (amber) · Total Pago (vermelho)

Filtros: busca + select de categoria

Tabela: Data · Categoria · Descrição (md+) · Valor (vermelho) · Status · Ação
Ação: botão "✓ Pago" (se pending) → atualiza status=paid + paid_date=hoje

Botão "+ Nova Despesa" → modal

**Modal "Nova Despesa":**
- `category` (select, required) — Combustível|Manutenção|Pneus|Pedágios|Salários|Impostos|Seguros|Aluguel|Administrativo|Marketing|Outros
- `description` (text, required)
- `amount` (number, step 0.01, required)
- `date` (date, required)
- `status` (select) — Pago|A Pagar|Parcelado. Default: Pago
- `payment_method` (select) — PIX|Boleto|Transferência|Cartão|Dinheiro
- `notes` (textarea, 2 rows)
- Botão "Registrar Despesa"

---

### DRE — `/admin/financeiro/dre`
**Componente:** `pages/admin/DRE.jsx`

Filtros: mês (Jan–Dez) + ano (2024/2025/2026)

**Demonstrativo de Resultado:**
```
(+) Receita Bruta         = soma freight_value dos pedidos do período
  Fretes realizados
(-) Deduções estimadas (5%)  = Receita Bruta × 0.05  [HARDCODED]
(=) Receita Líquida
(-) Custos Variáveis:
  Combustível, Manutenção, Pneus, Pedágios
(-) Total Variável
(-) Custos Fixos:
  Salários, Impostos/Enc., Seguros, Aluguel, Administrativo, Marketing
(-) Total Fixo
(=) Resultado Operacional (EBITDA)
(-) Depreciação estimada (frota) = R$ 800,00/mês  [HARDCODED]
(=) LUCRO / PREJUÍZO LÍQUIDO
Margem líquida: {%}
```

PieChart: composição dos custos por categoria

Rodapé: "Documento gerencial — não tem validade fiscal."

**Parâmetros do DRE** (lidos de CompanySettings via `useCompanySettings`):
- `tax_rate_percent` (default 5) → usado como `grossRevenue × (tax_rate_percent / 100)`
- `monthly_depreciation` (default 800) → valor subtraído do EBITDA

Rodapé exibe os parâmetros usados: "Alíquota fiscal: X% · Depreciação mensal: R$ Y"

**Botões de exportação:**
- "Gerar PDF" — ✅ Implementado com jsPDF. Gera DRE completo com cabeçalho da empresa, tabela de resultados e rodapé com parâmetros. Salva como `DRE-Velox-{Mês}-{Ano}.pdf`.
- "Exportar Excel" — ✅ Implementado. Exporta CSV com BOM UTF-8 (compatível com Excel). Salva como `DRE-Velox-{Mês}-{Ano}.csv`.

---

### Fluxo de Caixa — `/admin/financeiro/fluxo`
**Componente:** `pages/admin/CashFlow.jsx`

Filtro: 30 | 60 | 90 dias

**Lógica:** Projeção dia a dia baseada em:
- Entradas: `Revenue` com `status=receivable` e `due_date` definido
- Saídas: `Expense` com `status=pending` e `due_date` definido

**Alerta de saldo negativo:** banner vermelho se algum dia projetado tiver saldo < 0

**Gráfico de área:** saldo projetado (verde se sempre positivo, vermelho se negativo), linha de referência Y=0

**Tabela de movimentações** (até 30 linhas): Data · Descrição · Entrada (verde) · Saída (vermelho) · Saldo (verde/vermelho)

---

## 13. PAINEL — DOCUMENTOS

**Rota:** `/admin/documentos`
**Componente:** `pages/admin/Documents.jsx`
**Status:** ✅ Implementado

3 abas com busca global:

**Aba "Pedidos e Viagens":** Tabela de todos os itens com `nf_signed_url` preenchido nos Orders. Colunas: Protocolo · Cliente · Destinatário · NF nº · Data · Botão Visualizar (abre em nova aba).

**Aba "Frota":** Cards por caminhão (placa + modelo). Para cada caminhão: CRLV (vencimento + badge + link), Seguro (vencimento + badge + link), Tacógrafo (vencimento + badge).

**Aba "Motoristas":** Cards por motorista (nome + badge status). Para cada motorista: CNH (categoria + vencimento + badge).

---

## 14. PAINEL — MAPA

**Rota:** `/admin/mapa`
**Componente:** `pages/admin/MapPage.jsx`
**Título:** "Mapa Operacional" / "Visão em tempo real das operações"

**4 KPI Cards:**
- Viagens Ativas (amber) — `status=in_progress`
- Viagens Planejadas (azul) — `status=planned`
- Pedidos em Trânsito (laranja) — `status=in_transit`
- Em Coleta (roxo) — `status=collecting`

**Mapa visual (placeholder):**
- Fundo: gradiente navy (`velox-dark → velox-blue`)
- Grid de linhas decorativas (opacidade 10%)
- Se sem viagens ativas: ícone MapPin + "Nenhuma viagem em andamento" + "O mapa será exibido quando houver viagens ativas"
- Se com viagens ativas: chips com truck_plate + driver_name + texto "Integração com GPS em desenvolvimento"

**Seção Viagens em Andamento:**
Card por viagem: avatar Truck + motorista + placa + barra de progresso + próxima parada · link "→" para detalhe

**Seção Pedidos em Trânsito:**
Cards clicáveis (link para detalhe): protocolo + cliente + badge status

---

## 15. PAINEL — CONFIGURAÇÕES

**Rota:** `/admin/configuracoes`
**Componente:** `pages/admin/AdminSettings.jsx`

4 abas (Tabs):

### Aba Empresa
Campos: company_name · cnpj · phone · email · whatsapp · region · address (campo único) · mission (textarea) · vision (textarea) · values · social_instagram · social_linkedin · social_facebook · **google_maps_api_key** (type=password, placeholder "AIzaSy...")

**google_maps_api_key:** Chave da API do Google Maps Distance Matrix. Quando configurada, ao confirmar um pedido o sistema calcula a distância real (km) entre a origem e todos os destinos e propõe recalcular o frete com a distância real.

### Aba Preços
Campos: price_per_kg · price_per_km · fixed_fee · minimum_freight
Bloco informativo: "Fórmula: Frete = (Peso kg × R$/kg) + (Distância km × R$/km) + Taxa fixa. O valor final nunca será menor que o Frete Mínimo."

**Tabela de prazo por estado:** Campo UF é `<Select>` com todos os 27 estados + DF (não input livre). Adiciona linha com { state: "", days: 1 }, remove via botão ✕.

**Parâmetros do DRE (na mesma aba):**
- `tax_rate_percent` (number, default 5) — Alíquota fiscal estimada (%)
- `monthly_depreciation` (number, default 800) — Depreciação mensal da frota (R$)

### Aba Alertas
3 campos numéricos (dias antes do vencimento):
- CNH do motorista — default: 60
- CRLV do caminhão — default: 60
- Seguro do caminhão — default: 30

### Aba Site Público
- hero_title (text)
- hero_subtitle (text)
- about_text (textarea, 4 rows)

**Lógica:** Lê primeiro registro de CompanySettings. Se existir → update. Se não → create.

---

## 16. APP DO MOTORISTA

**Status: ✅ IMPLEMENTADO**

### Rota de proteção — `components/auth/DriverRoute.jsx`
Verifica `user.role === "motorista"`. Se não autenticado ou role diferente → redireciona para `/login`. Usa `<Outlet />` para páginas filhas.

### Redirect pós-login — `pages/Login.jsx`
Após login bem-sucedido, busca `base44.auth.me()` e redireciona:
- `role === "motorista"` → `/motorista`
- Qualquer outro role → `/admin`

### DriverHome — `pages/driver/DriverHome.jsx`
**Design:** mobile-first, max-width 480px, fundo `velox-dark`, cards com bordas coloridas.

**Lógica ao montar:**
1. Busca `Driver` onde `user_id === currentUser.id`
2. Se não encontrar: exibe "Perfil não configurado. Fale com o admin."
3. Busca `Trip` onde `driver_id === driver.id` e status `in_progress` ou `planned`

**Estados:**
- Sem viagem: card cinza com ícone Truck + "Nenhuma viagem hoje" + link para histórico
- Viagem `in_progress`: card verde com próxima parada + botão Maps + progresso + link "Ver todas"
- Viagem `planned`: card azul com data/hora de saída + placa + link "Ver detalhes"

### DriverTrip — `pages/driver/DriverTrip.jsx`
**Header:** botão voltar + "Viagem" + badge status

**Lista de paradas** (scroll vertical):
- `completed`: fundo verde + timestamp + link NF se houver
- `arrived + delivery`: campo notas + FileUploadButton NF (obrigatório) + botão "Confirmar Entrega" (desabilitado sem NF)
- `arrived + collection`: FileUploadButton foto (opcional) + notas + botão "Confirmar Coleta"
- `pending`: botão "Confirmar Chegada"

**Sincronização de status ao confirmar parada:**
- `collection completed` → `Order.status = "in_transit"`
- `delivery completed` → `recipients[].delivery_status = "delivered"`, `nf_signed_url` salvo no item
- Todos recipients entregues → `Order.status = "delivered"`

**Botão flutuante:** "⚠ Registrar Ocorrência" → modal com tipo/descrição/foto → `trip.events` entry tipo `"incident"`

### DriverHistory — `pages/driver/DriverHistory.jsx`
**Header:** "Histórico" + botão voltar para `/motorista`

Lista viagens `completed` e `cancelled` do motorista ordenadas por data DESC.
Cada card: data, placa, pedidos, badge status. Expandível: paradas com status e horário + km real se disponível.

---

## 17. COMPONENTES COMPARTILHADOS

### FormField — `components/shared/FormField.jsx`
Exporta: `FormField` (painel admin) e `PublicFormField` (site público)
Props: `label` (string), `required` (bool), `error` (string), `hint` (string), `children`, `className`
Uso: wrapper para qualquer campo de formulário — renderiza label, campo filho, hint e mensagem de erro padronizados.

### NumericInput — `components/shared/NumericInput.jsx`
Props: `value`, `onChange(numero)`, `currency` (bool, adiciona prefixo "R$" e formata em pt-BR), `integer` (bool, bloqueia decimais), `placeholder`, `className`
Uso: substitui `<Input type="number">` em todo o sistema para evitar bug do zero inicial (ex: "0,25" virando ",25"). Aceita vírgula e ponto como separador decimal.

### KPICard — `components/admin/KPICard.jsx`
Props: `title` (string, req), `value` (string|number, req), `icon` (component, req), `trend` (number, opt), `trendLabel` (string, opt), `color` (string, default "bg-velox-amber"), `subtitle` (string, opt)
Uso: Dashboard
Comportamento: card com ícone colorido, valor em font-mono, tendência opcional

### StatusBadge — `components/admin/StatusBadge.jsx`
Props: `status` (string, req), `config` (object, opt, default orderStatusConfig)
Uso: Pedidos (lista e detalhe), Dashboard, NewTrip, ClientDetailPage
Mapeamento padrão: new→azul, confirmed→índigo, collecting→amber, in_transit→laranja, delivered→verde, cancelled→vermelho

### AlertsPanel — `components/admin/AlertsPanel.jsx`
Props: `alerts` (array, req), `maxItems` (number, default 6)
Exporta também: `generateAlerts(drivers, trucks, orders)` — função pura que retorna array de alertas
Uso: Dashboard
Comportamento: lista de alertas clicáveis com ícone (AlertCircle/AlertTriangle/Info) colorido; se vazio, exibe "Nenhum alerta no momento"

### AdminLayout — `components/admin/AdminLayout.jsx`
Props: nenhuma (usa Outlet para páginas filhas)
Controla estado `collapsed` da sidebar

### AdminSidebar — `components/admin/AdminSidebar.jsx`
Props: `collapsed` (boolean, req), `setCollapsed` (function, req)

### useFileUpload — `hooks/useFileUpload.js`
Props: nenhuma
Retorna: `{ uploadFile(file) → Promise<url|null>, uploading: boolean, error: string|null }`
Usa: `base44.integrations.Core.UploadFile({ file })` para fazer upload de arquivos para o storage do Base44.
Usado por: `FileUploadButton`

### FileUploadButton — `components/shared/FileUploadButton.jsx`
Props: `onUpload(url)` (req), `label` (default "Anexar arquivo"), `accept` (default "*"), `capture` (opt, "environment" para câmera traseira), `preview` (boolean, default true), `className` (opt)
Estados: idle → uploading → uploaded. Se `currentUrl` preenchido ao renderizar, inicia em uploaded.
Comportamento: input file oculto, clique na área/botão abre picker. Durante upload: spinner + "Enviando...". Após: ícone FileText + nome + CheckCircle + botão "X" para substituir.
Usado por: `DriverTrip`, `OrderDetailPage`, `TripDetailPage`, modal de ocorrência.

### DriverRoute — `components/auth/DriverRoute.jsx`
Props: nenhuma (usa Outlet)
Verifica `user.role === "motorista"`. Redireciona para `/login` se não autenticado ou role diferente.

### freightCalculator — `utils/freightCalculator.js`
Exporta:
- `calculateFreight(totalWeightKg, distanceKm, settings, clientPricing = null) → number | null` — versão simplificada (compatibilidade)
- `calculateFreightFull({ items, distanceKm, nfCount, pricing, clientPricing, originState, destState, settings }) → objeto | null` — versão completa com peso cubado, GRIS, Ad Valorem, TDE/TDA, pedágio. Prioridade: clientPricing > route_pricing (por corredor) > pricing padrão.
- `calcCubicWeight(h, w, l, volumes) → number` — peso cubado (A×L×C/6000)
- `getTaxableWeight(item) → number` — maior entre peso real e cubado
- `getDeliveryDaysByState(state, settings, originState) → number|null` — prazo via route_pricing ou delivery_days_table
- `calcDeliveryDays(distanceKm, settings) → number|null` — prazo por km

Usada por: `OrderDetailPage`, `NewOrder`, `BookingForm`, `QuoteForm`, `QuickQuote`.

---

### generateDeliveryReceipt — `utils/generateDeliveryReceipt.js`
Exporta: `generateDeliveryReceipt(order, trip, company) → Blob`
Gera PDF de Comprovante de Entrega usando jsPDF + jspdf-autotable.

Conteúdo do PDF:
- Cabeçalho amber com nome da empresa e título "COMPROVANTE DE ENTREGA"
- Protocolo, CT-e, data de coleta
- CNPJ e endereço da empresa (se configurados)
- Bloco Remetente: nome + CPF/CNPJ
- Por destinatário: nome + endereço + tabela de NFs (Nº NF, Descrição, Vol., Peso, Valor declarado)
- Badge de NF assinada por destinatário (se disponível)
- Dados do motorista e caminhão (se `trip` fornecida)
- Campos de assinatura (destinatário + motorista)
- Rodapé com timestamp e nome da empresa

Usado por: `OrderDetailPage` — botão "Comprovante PDF" (visível apenas quando `order.status === "delivered"`)

### AdminTopbar — `components/admin/AdminTopbar.jsx`
Props: nenhuma

### AdminRoute — `components/auth/AdminRoute.jsx`
Props: nenhuma (usa Outlet para páginas filhas)
Uso: envolve todas as rotas `/admin/financeiro/*` e `/admin/configuracoes` em App.jsx
Comportamento: se `user.role !== "admin"` → exibe toast de acesso negado e redireciona para `/admin`. Se ainda carregando (`isLoadingAuth`) → renderiza null.

### PublicNavbar — `components/public/PublicNavbar.jsx`
Props: nenhuma

### PublicFooter — `components/public/PublicFooter.jsx`
Props: nenhuma

### WhatsAppButton — `components/public/WhatsAppButton.jsx`
Props: nenhuma. Número fixo `+5500000000000`

### HeroSection, StatsSection, ServicesSection, HowItWorksSection, AboutSection, TestimonialsSection, ContactSection
Todos sem props. Conteúdo fixo (ver seção 2 desta documentação).

---

## 18. FUNÇÕES DE BACKEND

### generateProtocol
**Arquivo:** `functions/generateProtocol.js`
**Chamada:** `await base44.functions.invoke("generateProtocol", {})`
**Auth:** usa service role (não requer usuário autenticado)
**Resposta:** `{ protocol: "VLX-2026-00042" }`
**Lógica:** busca todos os orders, filtra pelo prefixo `VLX-{anoAtual}-`, extrai o maior sequencial e retorna o próximo com padding de 5 dígitos.
**Usada por:** `BookingForm.jsx` e `NewOrder.jsx`.

---

### syncAlerts
**Arquivo:** `functions/syncAlerts.js`
**Chamada:** `await base44.functions.invoke("syncAlerts", {})`
**Auth:** usa service role
**Resposta:** `{ ok: true, count: N, alerts: [...] }`
**Lógica:**
1. Lê Drivers, Trucks, Orders e Alerts existentes via service role
2. Calcula alertas desejados (CNH, CRLV, seguro, pedidos sem motorista > 24h)
3. Para cada alerta desejado: cria no banco se não existir e não estiver resolvido
4. Para cada alerta ativo no banco: marca como `resolved=true` se a condição não se aplica mais
5. Retorna alertas não resolvidos atuais

**Chamada por:** `Dashboard.jsx` no `useEffect` de montagem.

---

Integrações externas utilizadas:
- **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`) — chamada direta do frontend em BookingForm.jsx e NewOrder.jsx
- **Imagens** — Unsplash URLs hardcoded no HeroSection e AboutSection

---

## 19. FLUXOS DO SISTEMA

### FLUXO 1: Cliente agenda pelo site público
```
Trigger: Cliente acessa /agendar ou /cotacao
1. Cliente preenche Passo 1 (dados pessoais)
2. Cliente preenche Passo 2 (origem + data de coleta)
3. Cliente adiciona N destinatários com N itens/NFs cada (Passo 3)
4. Cliente seleciona tipo de frete (Passo 4)
5. Cliente revisa resumo (Passo 5)
6. Cliente clica "Solicitar Cotação"
7. Sistema gera protocolo VLX-{ano}-{random 5 dígitos}
8. Sistema calcula totals (volumes, weight, value)
9. Sistema cria Order no banco com status=new
10. Sistema exibe tela de sucesso com o protocolo
Resultado: Order criada com status=new, sem motorista, sem valor de frete
Dados criados: Order (status=new, status_history[0]={status:new, user:client_name, note:"Solicitação via site"})
```

### FLUXO 2: Admin confirma pedido e atribui motorista
```
Trigger: Admin acessa /admin/pedidos/:id com pedido status=new
1. Admin visualiza dados do pedido
2. Admin seleciona motorista no card Atribuição
3. Admin seleciona caminhão no card Atribuição
4. Admin define freight_value no card Financeiro
5. Admin clica "Confirmar Pedido"
6. Sistema atualiza status=confirmed, adiciona status_history entry
Resultado: Order com status=confirmed, driver_id, truck_id e freight_value definidos
Dados modificados: Order
```

### FLUXO 3: Admin cria pedido manualmente
```
Trigger: Admin clica "+ Novo Pedido" em /admin/pedidos
1. Admin preenche solicitante, tipo de frete
2. Admin preenche origem com CEP (autopreenchimento ViaCEP)
3. Admin adiciona destinatários e itens
4. Admin define valor, pagamento, motorista, caminhão opcionais
5. Admin clica "Criar Pedido"
6. Sistema gera protocolo, calcula totais, cria Order com status=new
7. Sistema redireciona para /admin/pedidos (lista)
Resultado: Order criada com status=new
Dados criados: Order (status_history[0]={user:"Admin", note:"Pedido criado pelo painel"})
```

### FLUXO 4A: Motorista executa viagem pelo app do motorista
```
Trigger: Motorista acessa /motorista com viagem in_progress atribuída
1. DriverHome exibe próxima parada com botão "Abrir no Google Maps"
2. Motorista acessa /motorista/viagem/:id para ver todas as paradas
3. Para cada parada pendente: motorista clica "Confirmar Chegada" → stop.status=arrived
4. Se parada de coleta (arrived):
   - Upload foto (opcional)
   - Clica "Confirmar Coleta" → stop.status=completed, Order.status=in_transit
5. Se parada de entrega (arrived):
   - Upload NF assinada (OBRIGATÓRIO) via FileUploadButton, accept="image/*", capture="environment"
   - Botão "Confirmar Entrega" fica desabilitado até NF enviada
   - Após upload: clica "Confirmar Entrega" → stop.status=completed, nf_signed_url salvo
   - recipients[].delivery_status=delivered, nf_signed_url salvo no item[0]
   - Se todos recipients entregues: Order.status=delivered
6. Motorista pode registrar ocorrências a qualquer momento (tipo + descrição + foto opcional)
   → trip.events entry com type="incident"
Dados modificados: Trip (stops, events), Order (status, recipients)
```

### FLUXO 4: Admin cria viagem
```
Trigger: Admin acessa /admin/viagens/nova
1. Admin seleciona pedidos confirmados disponíveis (status=confirmed e trip_id vazio)
2. Sistema exibe totais: pedidos, kg, receita
3. Admin seleciona motorista (filtra active) e caminhão (filtra available)
4. Se peso > capacidade: alerta vermelho detalhado com excesso em kg — **bloqueia a criação** (botão desabilitado)
5. Admin define data/hora de saída
6. Admin pode marcar "Iniciar imediatamente"
7. Admin clica "Criar Viagem" ou "Criar e Iniciar Viagem"
8. Sistema cria Trip com stops gerados automaticamente dos pedidos
9. Sistema atualiza todos os Orders selecionados: trip_id, driver_id, truck_id
10. Sistema redireciona para detalhe da viagem
Resultado: Trip criada, pedidos vinculados
Dados criados/modificados: Trip, Order (múltiplos)
```

### FLUXO 5: Admin executa viagem (coleta → entrega)
```
Trigger: Admin acessa /admin/viagens/:id com status=planned
1. Admin clica "▶ Iniciar" → Trip.status=in_progress, departure_date=agora
   → Truck.status = "on_route"
   → Todos os Orders vinculados: status = "collecting", status_history entry adicionada
2. Para cada parada na lista:
   a. Admin clica "Chegou" → stop.status=arrived
   b. Admin clica "Concluir" → stop.status=completed, completed_at=agora
      → Se stop.type = "collection": Order.status = "in_transit"
      → Se stop.type = "delivery": recipients[].delivery_status = "delivered"
         - Se TODOS os recipients do Order entregues: Order.status = "delivered"
         - Se ainda há pendentes: Order.status = "in_transit"
3. Evento registrado no trip.events a cada atualização de parada
Dados modificados: Trip, Order (múltiplos), Truck
```

### FLUXO 6: Admin encerra viagem e vê fechamento financeiro
```
Trigger: Admin clica "⬛ Encerrar Viagem" em viagem in_progress
1. Modal exibe formulário de fechamento
2. Admin insere: Km final, combustível (L), custo combustível, pedágios
3. Admin pode adicionar outros gastos com descrição e valor
4. Preview mostra Receita vs Custo estimado
5. Admin confirma → Sistema calcula:
   total_cost = fuel_cost + tolls_cost + Σother_costs
   net_profit = total_revenue - total_cost
6. Trip atualizada: status=completed, arrival_date=agora, todos os campos financeiros
   → Truck.status = "available"
   → Qualquer Order não entregue: status = "delivered", status_history entry adicionada
7. Toast: "Viagem encerrada! Lucro líquido: R$ X"
Dados modificados: Trip, Truck, Order (múltiplos)
```

### FLUXO 7: Admin consulta DRE
```
Trigger: Admin acessa /admin/financeiro/dre
1. Admin seleciona mês e ano
2. Sistema filtra Orders do período (por created_date) e Expenses (por date)
3. Sistema calcula:
   - Receita Bruta = Σ freight_value das orders
   - Deduções = 5% da receita bruta [HARDCODED]
   - Custos Variáveis = Σ expenses de categorias variáveis
   - Custos Fixos = Σ expenses de categorias fixas
   - EBITDA = Receita Líquida - Variável - Fixo
   - Depreciação = R$ 800/mês [HARDCODED]
   - Lucro = EBITDA - Depreciação
4. Exibe DRE com gráfico de composição de custos
```

### FLUXO 9: Motorista registra ocorrência
```
Trigger: Motorista clica "Registrar Ocorrência" em DriverTrip
1. Modal exibe Select de tipo + Textarea de descrição + FileUploadButton de foto
2. Ao confirmar:
   a. Cria registro na entidade Incident (order_id, trip_id, type, description, photo_urls, reported_by_name, status=open)
   b. Adiciona entrada em trip.events com type="incident" (para timeline)
3. Toast "Ocorrência registrada!"
Resultado: Incident criada + entry no log da viagem
Dados criados: Incident
Dados modificados: Trip (events)
```

### FLUXO 10: Admin resolve ocorrência
```
Trigger: Admin acessa OrderDetailPage e vê painel "Ocorrências" com incidentes abertos
1. Clica "Resolver" no incidente
2. Prompt solicita descrição da resolução
3. Sistema atualiza Incident: status=resolved, resolution_notes, resolved_at=agora
4. Painel recarrega mostrando badge "Resolvida" verde
Dados modificados: Incident
```

### FLUXO 11: Admin baixa comprovante de entrega
```
Trigger: Admin acessa OrderDetailPage com pedido status=delivered
1. Botão "Comprovante PDF" aparece no header (ao lado dos botões de ação)
2. Admin clica → generateDeliveryReceipt(order, trip, settings) gera Blob
3. Link <a> é criado, download disparado, URL revogada
Arquivo gerado: Comprovante-{PROTOCOLO}.pdf
Conteúdo: cabeçalho amber, remetente, destinatários + NFs, motorista, campos de assinatura
```

### FLUXO 8: Sistema gera alertas de vencimento
```
Trigger: Componente AlertsPanel é montado (Dashboard)
1. generateAlerts(drivers, trucks, orders) é chamado
2. Para cada driver com cnh_expiry:
   - Se vencido: alerta crítico "CNH de {nome} está VENCIDA"
   - Se ≤ 60 dias: alerta warning ou critical (≤30 = critical)
3. Para cada truck com crlv_expiry:
   - Mesma lógica com threshold 60 dias
4. Para cada truck com insurance_expiry:
   - Threshold: 30 dias (todo alerta é critical)
5. Para cada order confirmada sem driver_id há mais de 24h:
   - Alerta warning "Pedido {protocol} sem motorista há {N}h"
6. Retorna array de alertas; NÃO persiste na entidade Alert
Dados lidos: Driver, Truck, Order
Dados criados: nenhum (apenas em memória)
```

---

## 20. SISTEMA DE ALERTAS

**Como são gerados:** Backend function `syncAlerts` chamada ao montar o Dashboard. Persiste alertas na entidade Alert e resolve automaticamente os que não se aplicam mais.

**São persistidos no banco** — entidade Alert é usada para histórico, leitura e resolução.

**NÃO geram e-mail** (sem backend function de e-mail ainda).

**Tipos gerados (com threshold real no código):**

| Condição | Threshold | Nível | Mensagem |
|---|---|---|---|
| CNH vencida (dias < 0) | — | critical | "CNH de {nome} está VENCIDA" |
| CNH a vencer (≤ 30 dias) | 30d | critical | "CNH de {nome} vence em {N} dias" |
| CNH a vencer (31–60 dias) | 60d | warning | "CNH de {nome} vence em {N} dias" |
| CRLV vencido | — | critical | "CRLV do caminhão {placa} está VENCIDO" |
| CRLV a vencer (≤ 30 dias) | 30d | critical | "CRLV do caminhão {placa} vence em {N} dias" |
| CRLV a vencer (31–60 dias) | 60d | warning | "CRLV do caminhão {placa} vence em {N} dias" |
| Seguro vencido | — | critical | "Seguro do caminhão {placa} está VENCIDO" |
| Seguro a vencer (≤ 30 dias) | 30d | critical | "Seguro do caminhão {placa} vence em {N} dias" |
| Pedido confirmado sem motorista > 24h | 24h | warning | "Pedido {protocol} sem motorista há {N}h" |

**Como são exibidos:** Lista no card "Alertas" do Dashboard (max 6). Cada item é clicável e navega para a entidade relacionada (motorista ou caminhão).

**Ícones:** critical = AlertCircle (vermelho), warning = AlertTriangle (amber), info = Info (azul)

---

## 21. INTEGRAÇÕES

| Integração | Status | Como é usada | Configuração |
|---|---|---|---|
| Base44 Auth | Ativa | Login, registro, sessão. Páginas: /login, /register, /forgot-password, /reset-password | Automática |
| Base44 Entities SDK | Ativa | Toda persistência de dados. `base44.entities.*` no frontend | Automática |
| ViaCEP | Ativa | Autopreenchimento de endereço via CEP. BookingForm.jsx e NewOrder.jsx | Pública, sem chave |
| Unsplash | Ativa | Imagens da landing page (HeroSection, AboutSection). URLs hardcoded | Pública, sem chave |
| Google Fonts | Ativa | Barlow Condensed (display) + Inter (body) + JetBrains Mono (mono). Import em index.css | Pública |
| SendEmail (Base44 Core) | Não implementada | Prevista para confirmação de pedido e reset de senha | Seria via base44.integrations.Core.SendEmail |
| UploadFile (Base44 Core) | Não implementada | Prevista para upload de NF assinada | Seria via base44.integrations.Core.UploadFile |
| GPS/Rastreamento | Não implementada | Mapa mostra "Integração com GPS em desenvolvimento" | — |

---

## 22. ROTAS DA APLICAÇÃO

| Rota | Componente | Autenticação | Descrição |
|---|---|---|---|
| `/` | Home | Pública | Landing page |
| `/agendar` | BookingForm | Pública | Formulário de 5 passos |
| `/cotacao` | QuoteForm | Pública | Cotação em 3 passos (sem criar pedido) |
| `/cotacao-avancada` | QuickQuote | Pública | Calculadora avançada (campo único) |
| `/rastrear` | Tracking | Pública | Rastreamento por protocolo |
| `/login` | Login | Pública | Login com email/senha ou Google |
| `/register` | Register | Pública | Cadastro + OTP |
| `/forgot-password` | ForgotPassword | Pública | Recuperação de senha |
| `/reset-password` | ResetPassword | Pública | Reset com token da URL |
| `/admin` | Dashboard | Protegida | Dashboard principal |
| `/admin/pedidos` | Orders | Protegida | Lista de pedidos |
| `/admin/pedidos/novo` | NewOrder | Protegida | Criar pedido interno |
| `/admin/pedidos/:id` | OrderDetailPage | Protegida | Detalhe/edição do pedido |
| `/admin/frota` | Fleet | Protegida | Lista de caminhões |
| `/admin/frota/:id` | TruckDetailPage | Protegida | Detalhe/edição do caminhão |
| `/admin/motoristas` | Drivers | Protegida | Lista de motoristas |
| `/admin/motoristas/:id` | DriverDetailPage | Protegida | Detalhe/edição do motorista |
| `/admin/viagens` | Trips | Protegida | Lista de viagens (abas) |
| `/admin/viagens/nova` | NewTrip | Protegida | Criar nova viagem |
| `/admin/viagens/:id` | TripDetailPage | Protegida | Detalhe/execução da viagem |
| `/admin/financeiro` | Financial | **Admin only** | Visão geral financeira |
| `/admin/financeiro/receitas` | Revenues | **Admin only** | Contas a receber |
| `/admin/financeiro/despesas` | Expenses | **Admin only** | Controle de despesas |
| `/admin/financeiro/dre` | DRE | **Admin only** | Demonstrativo de resultado |
| `/admin/financeiro/fluxo` | CashFlow | **Admin only** | Fluxo de caixa projetado |
| `/admin/clientes` | Clients | Protegida | Base de clientes |
| `/admin/clientes/:id` | ClientDetailPage | Protegida | Detalhe do cliente |
| `/admin/programacao` | Schedule | Protegida | Programação semanal de coletas |
| `/admin/alertas` | AlertsPage | Protegida | Central de alertas |
| `/admin/documentos` | Documents | Protegida | Documentos (NFs, frota, motoristas) |
| `/admin/mapa` | MapPage | Protegida | Mapa operacional |
| `/admin/configuracoes` | AdminSettings | **Admin only** | Configurações do sistema |
| `/motorista` | DriverHome | **Motorista only** | Home do app do motorista |
| `/motorista/viagem/:id` | DriverTrip | **Motorista only** | Paradas e ações da viagem |
| `/motorista/historico` | DriverHistory | **Motorista only** | Histórico de viagens do motorista |
| `*` | PageNotFound | — | 404 |

Proteção: `ProtectedRoute` redireciona para `/login` se não autenticado.

---

## 23. BUGS E DÉBITOS TÉCNICOS

### 🔴 Crítico (11 correções executadas em 06/06/2026)

1. ✅ **Receitas/despesas desvinculadas de pedidos/viagens** — Ao confirmar pedido, cria `Revenue` automático. Ao encerrar viagem, cria `Expense`s automáticos.

2. ✅ **AdminRoute não protege rotas operacionais** — `OperatorRoute` criado para `/admin/pedidos`, `/admin/frota`, `/admin/motoristas`, etc. Motorista → `/motorista`, Admin/Operador → acesso permitido.

3. ✅ **NF assinada vinculada ao item[0]** — Corrigido para `recipients[].nf_signed_url` (nível do destinatário, não do item).

4. ~~**Protocolo não é único.**~~ ✅ **RESOLVIDO** — Backend function `generateProtocol` busca o maior sequencial do ano e retorna o próximo. Protocolo nunca mais usa `Math.random()`.

2. ~~**Formulários sem validação real.**~~ ✅ **RESOLVIDO** — Hook `useFormValidation` implementado. BookingForm valida por passo (Passos 1, 2 e 3). NewOrder valida antes do submit. Campos inválidos exibem borda vermelha + mensagem de erro.

3. ~~**ContactSection não envia nada.**~~ ✅ **RESOLVIDO** — `ContactSection.jsx` persiste mensagens na entidade `ContactMessage`. Aba "Mensagens" em AdminSettings exibe todas as mensagens com badge de não lidas, expansão e marcação como lida.

4. ~~**NF assinada não implementada.**~~ ✅ **RESOLVIDO** — `FileUploadButton` + `useFileUpload` implementados. Upload funcional em: `DriverTrip` (NF obrigatória na confirmação de entrega pelo motorista), `OrderDetailPage` (por item do destinatário) e `TripDetailPage` (por parada de entrega pelo admin).

5. ~~**App do Motorista não existe.**~~ ✅ **RESOLVIDO** — Rotas `/motorista/*` implementadas com `DriverRoute` (proteção por role), `DriverHome`, `DriverTrip` e `DriverHistory`. Login redireciona motoristas para `/motorista` automaticamente.

### 🟡 Moderado

6. ~~**Fórmula de preço não usada.**~~ ✅ **RESOLVIDO** — `calculateFreight()` em `utils/freightCalculator.js`. Integrado em `OrderDetailPage` (estimativa + botão "Usar este valor") e `NewOrder` (estimativa automática com botão "Usar"). Usa `custom_pricing` do cliente quando disponível.

7. ~~**Deduções fiscais e depreciação hardcoded no DRE.**~~ ✅ **RESOLVIDO** — Campos `tax_rate_percent` e `monthly_depreciation` adicionados ao CompanySettings. DRE lê via `useCompanySettings`. Aba Preços em AdminSettings expõe os campos.

8. ~~**Testemunhos não leem do banco.**~~ ✅ **RESOLVIDO** — `TestimonialsSection.jsx` busca `Testimonial.filter({ active: true })` ao montar. Se banco retornar resultados, usa-os; caso contrário, mantém os 3 hardcoded como fallback.

9. ~~**Entidade Alert não é usada.**~~ ✅ **RESOLVIDO** — `syncAlerts` backend function persiste e resolve alertas no banco. Dashboard chama `syncAlerts` ao montar. `AlertsPanel` recebe alertas do banco como prop. Página `/admin/alertas` lista todos com filtros e ação "Resolver".

10. ~~**Busca na Topbar é visual.**~~ ✅ **RESOLVIDO** — Busca com debounce 300ms, 3+ chars, busca em Order/Client/Truck/Driver, dropdown agrupado por tipo, Ctrl+K.

11. ~~**Notificação Bell na Topbar é visual.**~~ ✅ **RESOLVIDO** — Dropdown com alertas recentes, badge vermelho com contagem, "Marcar todos lidos", link para `/admin/alertas`.

12. ~~**Página Documentos é placeholder.**~~ ✅ **RESOLVIDO** — Página funcional com 3 abas: NFs assinadas de pedidos, documentos da frota (CRLV/seguro/tacógrafo) e documentos de motoristas (CNH). Busca global por placa/protocolo/nome.

13. ~~**Links do footer são `href="#"`.**~~ ✅ **RESOLVIDO** — Links Rápidos apontam para `/#servicos`, `/#sobre`, `/#contato`, `/rastrear`. Política de Privacidade e Termos de Uso abrem modal com texto.

14. ~~**Links "Saiba mais" em ServicesSection são `href="#"`.**~~ ✅ **RESOLVIDO** — Substituídos por botões "Solicitar →" que rolam suavemente até `#contato`.

15. ~~**Contato do site é hardcoded.**~~ ✅ **RESOLVIDO** — `ContactSection`, `PublicFooter` e `WhatsAppButton` leem dados reais de `CompanySettings` via `useCompanySettings`. Exibem em itálico cinza quando campo não configurado.

16. ~~**WhatsApp número fictício.**~~ ✅ **RESOLVIDO** — `WhatsAppButton` lê `settings.whatsapp`, remove caracteres não numéricos e não exibe o botão se o número não estiver configurado.

17. ~~**Validação de capacidade não bloqueia.**~~ ✅ **RESOLVIDO** — Botão "Criar Viagem" fica desabilitado quando `isOverCapacity=true`. Alerta exibe peso total, capacidade e excesso em kg.

18. ~~**Orders não atualizam status automaticamente.**~~ ✅ **RESOLVIDO** — `startTrip` atualiza todos os Orders para `collecting` + Truck para `on_route`. `updateStop` atualiza Order para `in_transit` (coleta) ou `delivered` (entrega). `closeTrip` finaliza Orders restantes como `delivered` + Truck para `available`.

19. ~~**Módulo Financeiro sem controle de acesso por código.**~~ ✅ **RESOLVIDO** — Componente `AdminRoute` (`components/auth/AdminRoute.jsx`) verifica `user.role === "admin"`. Rotas `/admin/financeiro/*` e `/admin/configuracoes` envolvidas com `<Route element={<AdminRoute />}>` em `App.jsx`. Redireciona para `/admin` com toast de acesso negado.

20. ~~**`maintenance_history` não está no schema da entidade Truck.**~~ ✅ **RESOLVIDO** — Campo `maintenance_history` adicionado formalmente ao schema da entidade Truck como `array of objects` com sub-campos: type, date, km, description, amount, provider, next_date, created_at. TruckDetailPage já usa `[...existing, newEntry]` corretamente.

21. ~~**DriverDetailPage busca orders incorretamente.**~~ ✅ **RESOLVIDO** — Filtro corrigido para `o.driver_id === id`. KPIs do mês calculados corretamente: pedidos não cancelados do mês + receita (soma freight_value) + ticket médio.

### 🟡 Importantes (8 correções adicionais em 06/06/2026)

22. ✅ **Despesas e Receitas sem reset de formulário** — Agora resetam form no `onSuccess` da criação. Fechar modal não deixa dados antigos.

23. ✅ **Coluna origem→destinos não defensiva** — `Orders.jsx` agora exibe `r.city || r.address?.city` para ambas estruturas.

24. ✅ **Orders limitada a 200 (hardcoded)** — Aumentado para 1000 para suportar empresas com mais pedidos.

25. ✅ **useCompanySettings sem reset de cache** — Exportado `resetSettingsCache()`. `AdminSettings` chama ao salvar.

26. ✅ **DRE só inclui receitas recebidas** — Corrigido para `status === "receivable" OR status === "received"`.

27. ✅ **SchedulePage não limpa erro de capacidade** — Adicionado `setCapacityError(null)` ao trocar semana.

28. ✅ **trip.truck_plate pode estar vazio** — `NewTrip` agora salva `truck_plate` e `truck_model` ao criar viagem.

29. ✅ **Erros de API silenciados em TripDetailPage** — Adicionado logging de erro nos catches críticos + toast para falhas.

---

## 24. INSTRUÇÃO PARA IA

### Regras fundamentais ao editar este projeto

1. **Fonte da verdade:** Este `DOCS.md` e o `CONTEXT.md` são a referência. Não implemente nada que contradiga esses documentos sem atualizar ambos.

2. **Stack:** React 18 + Tailwind CSS + shadcn/ui + Base44 SDK. Não adicionar outros frameworks.

3. **Design System:** Palette navy/amber. Classes Tailwind: `velox-dark`, `velox-blue`, `velox-amber`, `velox-light`. Fontes: `font-display` (Barlow Condensed 800 para títulos grandes), `font-heading` (Inter para títulos de seção), `font-body` (Inter para corpo), `font-mono` (JetBrains Mono para dados/códigos).

4. **Padrão de cores de status:**
   - Pedidos: new=azul, confirmed=índigo, collecting=amber, in_transit=laranja, delivered=verde, cancelled=vermelho
   - Caminhão: available=verde, on_route=amber, maintenance=vermelho, inactive=cinza
   - Motorista: active=verde, away=amber, terminated=vermelho
   - Viagem: planned=azul, in_progress=amber, completed=verde, cancelled=cinza/vermelho
   - Documentos: OK=verde, ≤60d=amber, ≤30d=vermelho, vencido=vermelho

5. **Componentização:** Criar componentes focados (<50 linhas idealmente). Nunca colocar lógica de 2 páginas no mesmo arquivo.

6. **Edição de arquivos:** Usar `find_replace` para edições pontuais. `write_file` apenas para arquivos novos ou reescritas completas.

7. **Atualização da documentação:** Após qualquer alteração de schema de entidade, nova rota, novo componente ou mudança de fluxo, atualizar as seções relevantes deste `DOCS.md`.

8. **Regras de formulários (obrigatório seguir):**
   - Todo formulário de criação usa constante `EMPTY_*` e reseta para ela no `onSuccess` e ao fechar o modal
   - Todos os campos devem ter `<label>` explícito acima (não depender apenas de `placeholder`)
   - Selects de tipo/status/categoria devem estar visíveis na criação **e** edição
   - `TOAST_REMOVE_DELAY` = **4.000ms** — auto-dismiss após esse delay
   - Ao construir datas a partir de string `YYYY-MM-DD`, usar `new Date(date + "T12:00:00")` para evitar bugs de fuso horário
   - `DatePickerWithAvailability` gera **42 dias** (6 semanas) a partir da minDate

9. **Não remover funcionalidades existentes** sem instrução explícita do usuário.

10. **Validações:** Sempre adicionar validação client-side antes de chamar `base44.entities.*.create()` ou `.update()`.

11. **Cobertura geográfica:** Se `settings.coverage_type` não estiver configurado, **todas as regiões são aceitas** (comportamento correto). Para restringir regiões, configurar em Admin → Configurações → Cobertura.

12. **`workingDays` parsing:** Sempre usar `.map(d => parseInt(d, 10))` antes de `.includes(dayOfWeek)`. O banco pode retornar strings mesmo para campos numéricos.

13. **ViaCEP auto-fill:** O CEP de origem dispara via `useEffect` ao atingir 8 dígitos. O CEP de destinatários dispara via `onChange` ao atingir 8 dígitos. Manter o `onBlur` como fallback.

14. **Toast:** O `ToastClose` chama `dismiss(id)` via `onClick`. O `Toaster` filtra toasts com `open === false`. O `TOAST_REMOVE_DELAY = 4000ms`. O `toast()` chama `setTimeout(() => dismiss(), 4000)` automaticamente ao ser criado.

15. **Campos numéricos:** Usar sempre `<NumericInput>` (de `@/components/shared/NumericInput`) em vez de `<Input type="number">`. Suporta props `currency` (R$ + formato pt-BR) e `integer` (sem decimais).

16. **CEP de destinatários:** Armazenar somente 8 dígitos no estado. Exibir formatado com `formatCep()`. Implementar `onPaste` explícito para evitar race condition ao colar CEP com hífen.

---

## Seção 23 — Bugs Conhecidos e Resolvidos

| # | Descrição | Status |
|---|-----------|--------|
| 1 | Modal "+Novo Caminhão" não exibía Dimensões, RENAVAM, Cor, datas de documentos | ✅ Resolvido |
| 2 | Toast/popup não fechava ao clicar no X nem automaticamente | ✅ Resolvido |
| 3 | Campos dos formulários dependiam só de `placeholder`, sem `label` explícito | ✅ Resolvido |
| 4 | Modal "+Novo Motorista" com campos incompletos; modo edição sumia com campos | ✅ Resolvido |
| 5 | Modal "Novo Cliente" pré-preenchido com dados do cadastro anterior | ✅ Resolvido |
| 6 | ClientDetailPage edição não exibía `type`, `status`, `notes` | ✅ Resolvido |
| 7 | Calendário ignorava `working_days` da config (bug de parse string→int) | ✅ Resolvido |
| 8 | ViaCEP não preenchia endereço automaticamente ao digitar 8 dígitos | ✅ Resolvido |
| 9 | Calendário de agendamento ignorava dias não operacionais e antecedência mínima — recriado do zero | ✅ Resolvido |
| 10 | Labels ausentes em formulários do painel e site público — criado `FormField` e `PublicFormField` | ✅ Resolvido |
| 11 | Campos numéricos apagavam zero inicial — criado `NumericInput` com suporte a vírgula e formato BR | ✅ Resolvido |
| 12 | Toast não desaparecia automaticamente — TOAST_REMOVE_DELAY=4000ms + auto-dismiss no dispatch | ✅ Resolvido |
| 13 | Complemento e Obs. de entrega ausentes no formulário de destinatário (BookingForm e NewOrder) | ✅ Resolvido |
| 14 | CEP do destinatário apagava dígito ao digitar / colar — normalizado para 8 dígitos + onPaste fix | ✅ Resolvido |
| 15 | Bug CEP destinatário em NewOrder: `setRecipient` usava closure stale — múltiplas chamadas se sobrescreviam. Corrigido usando `setForm(prev => ...)` funcional em chamada única por evento. `handleCEP` removida. | ✅ Resolvido |
| 16 | Bug CEP truncava último dígito: `formatCep` só para display causava `slice(0,8)` incluir o hífen. Corrigido armazenando valor já formatado (`XXXXX-XXX`) no estado, com `maxLength={9}`. `applyRecipientAddress` centraliza update de endereço em uma chamada. | ✅ Resolvido |
| 17 | Formulários de item inconsistentes entre admin e site público — padronizados com schema completo: `nf_number`, `package_type` (11 opções), `volumes`, `description`, `weight_kg`, `height_cm`, `width_cm`, `length_cm`, `declared_value`, `fragile`, `dangerous`. Destinatário padronizado com `cnpj_cpf`, `phone`, `neighborhood`. Resumo do Step5 atualizado para exibir tipo de embalagem, dimensões, NF e flags. | ✅ Resolvido |
| 18 | Campos sem label em NewOrder (seção Valor e Atribuição: Valor do Frete, Forma de Pagamento, Motorista, Caminhão, Observações), NewTrip (Motorista, Caminhão, Data de saída, Observações) e modal de encerramento de viagem (Km, Combustível, Pedágios, Observações). Corrigido com `<label>` explícito em todos os campos. | ✅ Resolvido |
| 19 | [TMS-5] Alertas por km não existiam. syncAlerts sem automação agendada. Client sem billing_type/contacts. Ver DOCS-TMS5.md para detalhes completos. | ✅ Resolvido em 10/06/2026 |
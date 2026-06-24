# VELOX TMS — MAPA COMPLETO PARA SIMULAÇÃO (agente Chrome)

> Mapeamento **exato, granular e exaustivo** do sistema atual, lido do código-fonte (jun/2026), para um
> agente de testes navegar e executar **absolutamente tudo**. Cobre 3 domínios: **Site Público**, **Portal
> Admin** e **Portal do Motorista**.
>
> Para cada tela: **Arquivo · Rota · Acesso · Queries/Entidades (banco) · Campos (label + placeholder exatos) ·
> Botões (texto exato → destino/ação) · Estados/Fluxos · Comportamentos especiais.**
>
> Convenções: "*" = campo obrigatório. Login admin/operador: papel definido em **Usuários**. Login do motorista:
> criado no cadastro do motorista (Detalhe do Motorista → Acesso ao app). Stack: React + Vite + React Router +
> React Query + Tailwind + Supabase (Postgres/RLS). Camada de dados: `base44.entities.<Entidade>` (wrapper do
> Supabase) e `supabase.rpc(...)` para funções `SECURITY DEFINER`.

---

## PARTE 0 — VISÃO GERAL E NAVEGAÇÃO

### 0.1 Domínios e entrada
| Domínio | Entrada | Acesso |
|---|---|---|
| **Site Público** | `/` | Qualquer visitante (sem login) |
| **Portal Admin** | `/admin` | Papel `admin` ou `operator` |
| **Portal Motorista** | `/motorista` | Papel `motorista` |

**Login** (`/login`) redireciona pelo papel: `motorista`→`/motorista`; `admin`/`operator`→`/admin`; sem papel/desativado→`/sem-acesso`. O papel vem de `user_profiles.role` (`admin`/`operator`/`motorista`/`pending`); `active=false` perde acesso.

### 0.2 Tabela completa de rotas (exata, de `src/App.jsx`)

**Públicas (sem login):** `/` Home · `/agendar` BookingForm · `/cotacao` QuoteForm · `/cotacao-avancada` QuickQuote · `/rastrear` Tracking · `/login` · `/register` · `/sem-acesso` NoAccess · `/forgot-password` · `/reset-password`.

**Admin/Operador** (guard `OperatorRoute` dentro de `ProtectedRoute`+`AdminLayout`): `/admin` OperationsHub · `/admin/coletas` OrdersWorkspace · `/admin/coletas/nova` NewOrder · `/admin/coletas/:id` OrderWorkspace · `/admin/cotacao` Cotacao · `/admin/despacho` DispatchBoard · `/admin/replanejamento` Replanning · `/admin/ocorrencias` Incidents · `/admin/transferencias` Transfers · `/admin/viagens` Trips · `/admin/viagens/nova` NewTrip · `/admin/viagens/:id` TripDetailPage · `/admin/frota` FrotaPage · `/admin/frota/:id` TruckDetailPage · `/admin/motoristas/:id` DriverDetailPage · `/admin/cadastros` CadastrosPage · `/admin/clientes/:id` ClientDetailPage · `/admin/documentos` Documents · `/admin/mensagens` Messages · `/admin/alertas` AlertsPage.

**Admin somente** (guard `AdminRoute`): `/admin/financeiro` FinanceiroPage · `/admin/indicadores` Indicators · `/admin/usuarios` UserManagement · `/admin/config` ConfigPage.

**Motorista** (guard `DriverRoute`): `/motorista` DriverHome · `/motorista/viagem/:id` DriverTrip · `/motorista/historico` DriverHistory.

**Redirecionamentos legados:** `/admin/pedidos`→`/admin/coletas`; `/admin/pedidos/novo`→`/admin/coletas/nova`; `/admin/pedidos/:id`→`/admin/coletas`; `/admin/operacoes|programacao|agenda`→`/admin/despacho`; `/admin/motoristas`→`/admin/frota`; `/admin/carregamento`→`/admin/frota`; `/admin/clientes`→`/admin/cadastros`; `/admin/fornecedores`→`/admin/cadastros?aba=fornecedores`; `/admin/mapa`→`/admin/config`; `/admin/configuracoes`→`/admin/config`; `/admin/financeiro/{receitas,despesas,dre,fluxo}`→`/admin/financeiro?aba=...`. Rota inexistente → `PageNotFound`.

### 0.3 Casca do Admin (em todas as telas `/admin/*`)
**Arquivos:** `AdminLayout.jsx` (sidebar + topbar + `<Outlet/>` com animação de entrada por rota), `AdminSidebar.jsx`, `AdminTopbar.jsx`.

**Sidebar** (esquerda, recolhível 56px↔64px): logo **VELOX / Transportadora** (→ `/admin`).
- **Operações** (`/admin`)
- Grupo **Fluxo**: **Pedidos** (`/admin/coletas`, badge = pedidos `new`) · **Despacho** (`/admin/despacho`, badge = confirmados sem viagem) · **Replanejamento** (`/admin/replanejamento`, badge) · **Ocorrências** (`/admin/ocorrencias`, badge = não resolvidas) · **Viagens** (`/admin/viagens`) · **Transferências** (`/admin/transferencias`) · **Frota** (`/admin/frota`)
- Grupo **Cadastros & Gestão**: **Cadastros** (`/admin/cadastros`) · **Documentos** (`/admin/documentos`) · **Mensagens** (`/admin/mensagens`, badge = não lidas) · **Financeiro** (`/admin/financeiro`, só admin) · **Indicadores** (`/admin/indicadores`, só admin) · **Usuários** (`/admin/usuarios`, só admin) · **Configurações** (`/admin/config`, só admin)
- Rodapé: nome + papel · botão **Sair** (signOut→`/login`) · botão **Recolher**.
- **Queries (badges):** orders, trips, trucks, drivers, incidents, contact-messages, alertas via `replanner`.

**Topbar** (fixa, glass):
- **Busca global** (placeholder "Buscar pedidos, clientes, placas... (Ctrl+K)", atalho **Ctrl+K**): consulta orders/clients/trucks/drivers; grupos clicáveis **Pedidos** (→ `/admin/coletas/:id`), **Clientes** (→ `/admin/clientes/:id`), **Caminhões** (→ `/admin/frota/:id`), **Motoristas** (→ `/admin/motoristas/:id`).
- **Sino** (badge = alertas não resolvidos): dropdown **Notificações**, botão **Marcar todas lidas**, link **Ver todos os alertas →** (`/admin/alertas`); itens levam à entidade.
- **Avatar** (inicial) + nome + papel.

---

## PARTE 1 — SITE PÚBLICO

### 1.1 Home (landing)
**Arquivo:** `src/pages/Home.jsx` (+ `src/components/public/*`). **Rota:** `/`. **Acesso:** público.
**Queries:** `company_settings` (via RPC `public_settings` para anon — só campos seguros), `testimonials` (`active=true`).
**Seções em ordem:** PublicNavbar → HeroSection → StatsSection → ServicesSection → HowItWorksSection → AboutSection → TestimonialsSection → ContactSection → PublicFooter → WhatsAppButton.

**PublicNavbar** (`PublicNavbar.jsx`, fixa; opaca ao rolar >50px): logo VELOX. Links: **Início**(`/`), **Serviços**(`/#servicos`), **Sobre**(`/#sobre`), **Contato**(`/#contato`), **Rastrear**(`/rastrear`), **Cotar Frete**(`/cotacao`); CTA **Agendar Coleta**(`/agendar`). Menu mobile (hambúrguer) com os mesmos itens.

**HeroSection** (`HeroSection.jsx`): selo "Transporte de confiança"; título (`hero_title`, padrão "Sua carga, no prazo certo."); subtítulo (`hero_subtitle`); botões **Cotar Frete**(`/agendar`) e **Agendar Coleta**(`/agendar`); animação de scroll/parallax.

**StatsSection** (contadores animados): **20+ Anos de mercado** · **3 Frotas próprias** · **5000+ Entregas realizadas** · **100+ Cidades atendidas**.

**ServicesSection** (id `servicos`, título "Soluções completas em transporte"): cards **Frete Dedicado**, **Frete Fracionado**, **Coleta Programada**, **Entrega Expressa**; cada card botão **Solicitar** (rola até `#contato`).

**HowItWorksSection** ("Simples, rápido e seguro"): **01 Solicite o frete** · **02 Confirmamos e coletamos** · **03 Entrega com NF assinada**.

**AboutSection** (id `sobre`, "Tradição que se reinventa"): `about_text`, `mission`, valores (Pontualidade/Responsabilidade/Transparência/Segurança), bloco "Onde atuamos" (estados/cidades/região de `coverage_*`).

**TestimonialsSection** ("O que nossos clientes dizem"): depoimentos `active=true`.

**ContactSection** (id `contato`, "Vamos conversar?"): **cria `ContactMessage`**. Campos: **Nome \*** ("Seu nome completo"), **E-mail \*** ("seu@email.com"), **Telefone** ("(00) 00000-0000"), **Mensagem \*** ("Como podemos ajudar?"). Validação: nome, e-mail válido, mensagem ≥10 caracteres. Botão de envio.

**PublicFooter**: marca + redes sociais (se em `social_*`); colunas Links Rápidos / Serviços / Contato; modais Privacidade/Termos.
**WhatsAppButton**: botão flutuante (abre WhatsApp do número configurado).

### 1.2 Agendar / Cotar — BookingForm
**Arquivo:** `src/pages/BookingForm.jsx`. **Rota:** `/agendar`. **Acesso:** público.
**Queries/escritas:** `company_settings` (pricing, coverage, working_days, min_advance_days); ViaCEP (autofill); `client_by_cnpj` (RPC, busca cliente existente); `next_protocol` (RPC, gera protocolo); **`Order.create`** (insert anônimo). **Saída:** tela "Solicitação Enviada!" com o **protocolo** (ex.: VLX-2026-XXXXX) e botão copiar.
Assistente **5 passos** com barra de progresso; botões **Voltar** / **Avançar** (Avançar bloqueado no passo 2 se origem fora de cobertura).

**Passo 1 — Dados do Solicitante:** **Nome Completo / Razão Social \*** ("Nome ou razão social") · **CPF / CNPJ** ("000.000.000-00 / 00.000.000/0000-00"; ao sair do campo busca cliente) · **Responsável pelo agendamento \*** ("Nome de quem está solicitando") · **Cargo / Setor** ("ex: Expedição, Logística, Compras") · **Telefone** ("(00) 00000-0000") · **E-mail** ("seu@email.com") · **Preferência de contato** (Telefone/WhatsApp/E-mail).

**Passo 2 — Origem da Coleta:** **CEP \*** ("00000-000"; autofill; alerta "Região não atendida" se fora) · **Endereço \*** · **Número \*** · **Complemento** · **Bairro** · **Cidade / UF** · **Data desejada para coleta \*** (respeita antecedência mínima e dias de operação) · **Horário preferencial** (Manhã/Tarde/A combinar) · **Observações de coleta** ("Portaria, restrições de acesso...").

**Passo 3 — Destinatários e Cargas:** botão **Adicionar destinatário** (cada um com remover). Por destinatário: **Nome / Razão Social \*** ("ex: Comércio Central Ltda") · **CNPJ / CPF do destinatário** ("ex: 12.345.678/0001-90") · **Telefone do destinatário** ("ex: (11) 99999-0000") · **CEP de destino \*** ("ex: 01310-100") · **Cidade / UF** · **Endereço \*** ("ex: Av. Brasil") · **Número \*** ("ex: 500") · **Complemento** ("ex: Apto 42, Galpão 3") · **Bairro** ("ex: Centro") · **Observações de entrega** ("ex: Entregar somente ao gerente João. Portaria fecha às 17h."). **Itens / NFs** (botão adicionar item): **Nº da Nota Fiscal** ("ex: 001234") · **NCM** ("ex: 8471.30.12") · **Tipo de embalagem** (Caixa/Palete/Tambor/Bobina/Fardo/Saco/Engradado/Big Bag/Rolo/Peça solta/Outro) · **Quantidade de volumes \*** ("ex: 12") · **Chave de acesso da NF-e** (44 dígitos, opcional) · peso · dimensões · valor declarado. Mostra cubagem em tempo real.

**Passo 4 — Tipo de serviço:** conforme `service_type` (fracionado/dedicado/expresso).

**Passo 5 — Revisão:** totais + valor estimado (FreightBreakdown). Erro de envio aparece neste passo. Botão final cria o pedido.

### 1.3 Cotar Frete — QuoteForm
**Arquivo:** `src/pages/QuoteForm.jsx`. **Rota:** `/cotacao`. **Acesso:** público. **Queries:** `company_settings` (pricing/route_pricing/delivery_days_table) + `freightCalculator`.
Assistente 3 passos: **Passo 1 — "De onde para onde?"** (UF origem/destino, "Selecione"). **Passo 2 — "Dados da carga"** por lote: **Quantidade de volumes** ("ex: 10") · **Peso** ("ex: 500") · dimensões (cm) · **Valor declarado** ("ex: 50.000") · **Nº de NFs** ("ex: 2"). **Passo 3 — "Resultado"**: "Valor estimado do frete" + breakdown; botão **Agendar agora** (→ `/agendar` com prefill) e refazer.

### 1.4 Cotação avançada — QuickQuote
**Arquivo:** `src/pages/QuickQuote.jsx`. **Rota:** `/cotacao-avancada`. **Acesso:** público. Calculadora detalhada (peso real vs cubado, peso taxável, GRIS, ad valorem, taxas, total) com itens + UF/distância; usa `freightCalculator` e `company_settings`.

### 1.5 Rastreamento — Tracking
**Arquivo:** `src/pages/Tracking.jsx`. **Rota:** `/rastrear`. **Acesso:** público. **Query:** RPC `track_order` (retorna só campos seguros).
Campo de busca ("Protocolo VLX-2026-XXXXX, CT-e ou nº da NF") + botão rastrear. Busca por protocolo → CT-e → nº de NF nos itens. Estado "Nenhum pedido encontrado" ("Verifique o protocolo, CT-e ou número da NF..."). Resultado: **Protocolo** (+ CT-e), **Cliente**, linha do tempo de `status_history` (selo "Atual"), destinatários com status individual, ocorrências ("Ocorrência registrada"), **Histórico detalhado**.

### 1.6 Autenticação
- **Login** (`Login.jsx`, `/login`): **Continuar com Google** (`signInWithOAuth`), separador "ou", **E-mail** ("seu@email.com"), **Senha** ("••••••••"), link **Esqueceu sua senha?** (`/forgot-password`), botão **Entrar** (`signInWithPassword`→lê `user_profiles`→redireciona por papel), rodapé "Não tem conta? Criar conta". Layout 2 painéis (marca à esquerda).
- **Criar conta** (`Register.jsx`, `/register`): **Continuar com Google**; **E-mail** ("seu@email.com"), **Senha** ("Mínimo 6 caracteres"), **Confirmar senha** ("Repita a senha"); botão criar (`signUp`); rodapé "Já tem conta? Entrar". Novo usuário = `pending`.
- **Esqueceu a senha?** (`ForgotPassword.jsx`, `/forgot-password`): **E-mail cadastrado** ("seu@email.com"); botão enviar (`resetPasswordForEmail`); tela "E-mail enviado"; link **Voltar para o login**.
- **Nova senha** (`ResetPassword.jsx`, `/reset-password`): **Nova senha** ("Mínimo 6 caracteres"), **Confirmar nova senha** ("Repita a senha"); salva (`updateUser`)→`/login?reset=success`.
- **Acesso não liberado** (`NoAccess.jsx`, `/sem-acesso`): "Acesso não liberado" + botão sair/voltar (usuário `pending`/desativado).

---

## PARTE 2 — PORTAL ADMIN

### 2.1 Painel de Operações (torre de controle)
**Arquivo:** `OperationsHub.jsx`. **Rota:** `/admin`. **Acesso:** admin/operator. **onMount:** invoca `syncAlerts`. **Queries (auto-refresh ~45s):** orders, trips, trucks, alerts, drivers, incidents-all; (admin) revenues, expenses; settings.
**Cabeçalho:** título **Painel de Operações** + selo **● Ao vivo** + data por extenso. Botões: **Despacho**(→`/admin/despacho`), **Novo Pedido**(→`/admin/coletas/nova`).
**Métricas (StatCards, 8):** Frota disponível (X/Y) · Em rota agora · Ocupação da frota % · Coletas hoje · Entregas hoje · No prazo (hoje) % (OTD) · Atrasados / em risco · Ocorrências abertas.
**Fila de ação** (cards, só quando há pendência; cada um → destino): "N ocorrência(s) grave(s) em aberto"→**Tratar**(`/admin/ocorrencias`) · "N caminhão(ões) indisponível(eis) com carga programada"→**Replanejar**(`/admin/replanejamento`) · "N viagem(ns) sem motorista hoje"→**Reatribuir** · "N pedido(s) aguardando confirmação"→**Revisar**(`/admin/coletas?status=new`) · "N pedido(s) confirmado(s) sem viagem"→**Despachar**(`/admin/despacho`) · "N alerta(s) crítico(s)"→**Ver alertas** · "N recebimento(s) em atraso"→**Cobrar**(`/admin/financeiro?aba=receitas`). Vazio: banner "Nenhuma pendência. Operação em dia.".
**Pipeline** (clicável → lista filtrada): Novos · Confirmados · Em coleta · Em trânsito · (Em transferência) · Entregues.
**Exceções operacionais** (lista pedidos com problema, clique→detalhe) + **Capacidade do dia** (barras Peso e Volume vs frota).
**Operação de hoje/amanhã/semana** (toggle Hoje/Amanhã/Semana): coletas/entregas ordenadas por período (Manhã/Tarde/A combinar), selo SLA (Atrasado/Risco); clique→detalhe.
**Frota agora:** cada caminhão, ponto de status (em rota=verde pulsante / disponível / manutenção), progresso de paradas; clique→viagem ou caminhão.
**Financeiro resumido** (admin): cards **A receber**(→receitas) e **A pagar**(→despesas).

### 2.2 Pedidos — OrdersWorkspace
**Arquivo:** `OrdersWorkspace.jsx`. **Rota:** `/admin/coletas` (lê `?status=`). **Acesso:** admin/operator. **Queries/escritas:** orders, clients, trips; `confirm_order` (RPC) + `ensureRevenueForOrder`; `cancelRevenuesForOrder` ao recusar.
**Cabeçalho:** **Pedidos** — "Fila única — confirme, recuse e despache sem sair da tela". Botões **Cotação**(→`/admin/cotacao`), **Exportar** (CSV), **Novo Pedido**.
**Abas por status (contadores):** Todos · Novos · Confirmados · Em coleta · Em trânsito · Entregues · Cancelados.
**Tabela** (colunas ordenáveis: Protocolo/Cliente/Status...), linha clicável→`/admin/coletas/:id`, **seleção múltipla** (checkbox). Selecionados confirmados sem viagem → barra de ação **Criar viagem**(→`/admin/viagens/nova` com `preselectedOrderIds`).
**Ações por linha:** **Novo** → **Confirmar** (modal: **Valor do frete**, **Forma de pagamento**, **Data de coleta** → grava `confirmed`, cria receita) e recusar (→`cancelled`); **Confirmado sem viagem** → **Despachar**(→despacho).

### 2.3 Novo Pedido — NewOrder
**Arquivo:** `NewOrder.jsx`. **Rota:** `/admin/coletas/nova`. **Acesso:** admin/operator. **Queries/escritas:** clients, recipients, trucks, drivers, settings; `Order.create`; cria cliente opcional; consome `location.state.fromMessage`/`preselectedOrderIds`; ViaCEP; `freightCalculator`.
Assistente (STEPS). **Solicitante:** **Buscar cliente cadastrado** ("Buscar por nome ou CNPJ...") · **Razão Social / Nome** · **CPF / CNPJ** ("ex: 00.000.000/0001-00") · **Responsável pelo agendamento** ("Quem está solicitando") · **Cargo / Setor** ("ex: Logística") · **Telefone / WhatsApp** ("ex: (11) 98765-4321") · **E-mail** ("ex: contato@empresa.com.br"). **Coleta:** **Data de coleta** · **Período preferencial** · **Observações de coleta** ("ex: Portaria fecha às 18h, acesso pela rua lateral"); botão **Adicionar ponto de coleta** (multi-origem: **Contato no local**, **Observações deste ponto** "ex: coletar 10 caixas no setor B"). **Destinatários** (**Adicionar destinatário**, **Buscar destinatário na base**): **Nome do destinatário** ("ex: Comércio Central Ltda") · **CNPJ / CPF** ("ex: 12.345.678/0001-90") · endereço · **Observações de entrega** ("ex: Entregar somente ao gerente. Portaria fecha às 17h."). **Itens/NFs** (**Item**, **Adicionar chaves** — "Cole uma ou mais chaves (44 dígitos cada)…"): **Nº da NF** ("ex: 001234") · **NCM** ("ex: 8471.30") · **Chave de acesso NF-e (44 dígitos, opcional)** · **Embalagem** · **Descrição da mercadoria** ("ex: Caixas de produtos eletrônicos") · **Volumes** ("ex: 12") · **Peso (kg)** ("ex: 480") · **Valor declarado (R$)** ("ex: 28.500,00") · **Comp./Larg./Alt. (cm)**. **Carga total:** **Total de volumes** · **Peso total (kg)** · **Valor declarado total (R$)**. **Comercial:** **Tipo de frete** · **Responsabilidade pelo frete** · **Forma de pagamento** · **Condições de pagamento** · **Valor do frete cobrado (R$)** ("ex: 850") · **Observações internas** ("Notas para uso interno — não aparecem para o cliente"). **Despacho opcional:** **Caminhão**, **Motorista**.
Botões: **Cancelar** · **Criar Coleta**. Se cliente novo: prompt **Criar cadastro** / **Não, só o pedido**. **Usar estimativa** (peso, quando itens sem dimensão).

### 2.4 Detalhe do Pedido — OrderWorkspace
**Arquivo:** `OrderWorkspace.jsx`. **Rota:** `/admin/coletas/:id`. **Acesso:** admin/operator. **Queries/escritas:** order(id), settings; `Order.update`; `Incident.create`; `ensureRevenueForOrder`/`cancelRevenuesForOrder`; upload de anexo.
**Seções:** **Resumo do pedido** · **Cargas e destinatários** · **Financeiro** (**Valor do frete (R$)** "0,00", **Forma de pagamento**, **Condições**, **Cobranças adicionais**, **Taxa improdutiva (R$)**, **Fator de cubagem deste pedido (opcional)** "padrão 6000") · **Ocorrências** ("O que foi feito para resolver...", "Notas internas — não aparecem ao cliente") · **Anexos** (**Anexar** — "Adicionar anexo (foto da carga, documento)") · **Histórico de eventos**. Campo **nº CT-e**.
**Ações:** editar, registrar ocorrência, **Cancelar** pedido (modal: "Motivo do cancelamento (obrigatório)"), **Voltar**.

### 2.5 Cotação interna — Cotacao
**Arquivo:** `Cotacao.jsx`. **Rota:** `/admin/cotacao`. **Acesso:** admin/operator. **Queries:** settings + `freightCalculator`. Título **Cotação** — "Simule o frete e converta em pedido com um clique".
**Campos:** **UF origem** · **UF destino** · **CEP destino** · **Cidade destino** · **Peso (kg) \*** · **Volumes** · **Valor declarado** · **Nº de NFs** · **Dimensões (cm) — opcional, para cubagem** (Comp./Larg./Alt., "opcional") · **Tipo de frete**. Mostra frete calculado; botão converte em pedido (→ NewOrder com prefill).

### 2.6 Despacho — DispatchBoard
**Arquivo:** `DispatchBoard.jsx`. **Rota:** `/admin/despacho`. **Acesso:** admin/operator. **Queries/escritas:** orders, trucks, trips; programação atômica (`dispatch_tx`/scheduled_*); `runAutoPlan`. DnD `@hello-pangea/dnd`.
Título **Despacho** — "Selecione pedidos na fila e clique no dia/caminhão para programar". Fila (busca "Cliente, cidade, UF...") → arrastar para célula (dia × caminhão). Botão **Planejar automaticamente** (auto-plano). Célula mostra **peso · volume**; **Devolver à fila** desprograma. Botões **Limpar**, **Cancelar**.

### 2.7 Replanejamento — Replanning
**Arquivo:** `Replanning.jsx`. **Rota:** `/admin/replanejamento`. **Acesso:** admin/operator. **Queries/escritas:** trucks, orders, trips, drivers; `redistribute_truck`, `reassign_driver` (RPC); util `replanner`.
Título **Replanejamento** — "Central de disrupções — redistribua recursos com 1 clique.". Lista **caminhões indisponíveis com carga** e **viagens sem motorista**. Por caso: **Escolher caminhão disponível** / **Escolher motorista** + botão redistribuir/reatribuir (ciente de comboio e CNH). Estado vazio: card **"Tudo sob controle 🎉"**.

### 2.8 Ocorrências — Incidents
**Arquivo:** `Incidents.jsx`. **Rota:** `/admin/ocorrencias`. **Acesso:** admin/operator. **Queries/escritas:** incidents-all, orders; `Incident.update`; util `incidents`/`sla`.
**KPIs (StatCards):** Em aberto · Críticas · Atrasadas (prazo) · Resolvidas. **Indicadores:** Tempo médio resolução · Resolvidas no prazo % · Impacto financeiro · Tipos mais frequentes. Botão **Exportar** (CSV). Filtros por tipo/responsável/status.
**Por ocorrência:** tipo (avaria/atraso/tentativa_entrega/roubo/acidente/carga_recusada/outro), **impacto financeiro (R$)**, **causa-raiz**, anexos (fotos/docs), linha do tempo íntegra. **Ações:** salvar tratativa, notificar cliente, marcar seguro, **reabrir**, resolver.

### 2.9 Transferências — Transfers
**Arquivo:** `Transfers.jsx`. **Rota:** `/admin/transferencias`. **Acesso:** admin/operator. **Queries/escritas:** transfers, branches, orders, trucks, drivers, settings; `Transfer.create/update`; `receive_transfer`, `cancel_transfer` (RPC); `Expense.create` (custo); `Incident.create` (divergência); `Truck.update` (status); manifesto PDF.
**Cabeçalho:** **Transferências** — "Movimentação entre filiais / centros de distribuição (cross-docking)". Botão **Nova transferência** (exige ≥2 filiais; senão aviso com link "Cadastros → Filiais").
**KPIs (StatCards):** Em trânsito · Planejadas · Pedidos na malha · Peso na malha. Busca ("Buscar protocolo, filial, placa, motorista…") + filtro status (Todas/Planejadas/Em trânsito/Recebidas/Canceladas).
**Card por transferência:** protocolo, origem→destino, nº pedidos, peso, placa/motorista, custo·km (recebidas), selo de status. Botões: **Manifesto** (PDF), **Despachar** (planned→in_transit, caminhão→on_route), **Receber no destino** (in_transit→abre conferência), **Estornar** (planned/in_transit→devolve pedidos + libera caminhão).
**Modal Nova transferência:** **Origem** / **Destino** (filial) · **Caminhão disponível** · **Motorista livre** · lista **Pedidos a transferir (N)** (peso/pedido; **peso × capacidade** com alerta de excesso) · **Iniciar em trânsito agora** (checkbox). Botões **Cancelar** / **Criar transferência**.
**Conferência de recebimento (modal):** por pedido campo "Divergência? (avaria, falta de volume…) — opcional" (gera ocorrência de avaria) · **Distância (km)** · **Custo do trecho (R$)** (gera despesa). Botões **Cancelar** / **Confirmar recebimento**.

### 2.10 Viagens — Trips
**Arquivo:** `Trips.jsx`. **Rota:** `/admin/viagens`. **Acesso:** admin/operator. **Queries:** trips.
**Cabeçalho:** **Viagens** — "Gestão de rotas e viagens". Botões **Exportar** (CSV), **Nova Viagem**. **KPIs (StatCards):** Em rota · Planejadas · Concluídas no mês · Lucro do mês. Busca ("Buscar por motorista ou placa…") + filtro período (Tudo/7 dias/30 dias/Este mês). **Abas:** Ativas · Planejadas · Concluídas · Canceladas.
**Cards:** motorista (ou "sem motorista"), placa (+ selo **comboio N**), barra de progresso (paradas), data de saída, nº pedidos; concluídas: **Lucro · margem %**; botão **Ver Detalhes**(→`/admin/viagens/:id`).

### 2.11 Nova Viagem — NewTrip
**Arquivo:** `NewTrip.jsx`. **Rota:** `/admin/viagens/nova`. **Acesso:** admin/operator. **Queries/escritas:** trucks, drivers, orders; `Trip.create`; consome `preselectedOrderIds`.
**Campos:** **Caminhão \*** (Selecionar caminhão) · **Motorista \*** (Selecionar motorista) · **Data e hora de saída** · **Adiantamento ao motorista (R$) — opcional** ("ex: 500,00") · **Observações da viagem** ("Rota, instruções especiais, pontos de atenção..."). **Veículos adicionais (comboio):** botão **Adicionar veículo** (cada um: Caminhão + Motorista). Botões **Cancelar** / criar.

### 2.12 Detalhe da Viagem — TripDetailPage
**Arquivo:** `TripDetailPage.jsx`. **Rota:** `/admin/viagens/:id`. **Acesso:** admin/operator. **Queries/escritas:** trip(id) (auto-refresh em andamento), drivers, orders; `Trip.update`; `close_trip` (RPC, encerramento atômico) + `Expense.create` (gastos/comissões); `Truck.update` (km/L, status); geocode/`routeOptimizer`; romaneio PDF (`generateTripManifest`).
**Cabeçalho:** "Viagem" + status + motorista·placa. Botões: **Romaneio PDF** (ou **Romaneio (todos)** se comboio), **Iniciar** (planejada→in_progress, caminhões→on_route, pedidos→collecting), **Encerrar Viagem** (in_progress).
**Paradas:** arrastar para reordenar + botões ↑/↓; botões **Google Maps** e **Otimizar rota** (captura km/custo estimado). Por parada: tipo (Partida/Coleta/Entrega), endereço; comboio → select de veículo; ações **Chegou**, **Concluir**; entrega → **Anexar NF** / "Ver NF Assinada".
**Card Comboio** (se houver): placa·motorista·líder + link **Romaneio** por veículo.
**Card Financeiro:** Receita total, Adiantamento; concluídas: Custo total, **Lucro líquido**, **Margem**, **Custo por km**, **Eficiência (km/L)**, **Estimado × Real** (Km e Custo, desvio %), Km real, Combustível, Pedágios.
**Card Acerto do motorista / do comboio:** comissão (rateio por motorista/veículo), (−) adiantamento (vale-frete), **saldo a pagar/receber**.
**Sugestão de retorno (backhaul):** quando entregas terminam, sugere coleta na mesma região com botão **Adicionar à viagem**.
**Modal Encerrar Viagem:** **Km Final (odômetro)** · **Combustível (litros)** · **Custo combustível (R$)** · **Pedágios (R$)** · **Outros gastos da viagem** (botão Adicionar; categoria: Alimentação/Pernoite-Diária/Manutenção em rota/Pneu-Borracharia/Estacionamento/Chapa-Descarga/Multas/Outros + descrição + R$; chips de atalho) · **Observações finais**; resumo Receita/Custo estimado/Adiantamento; botão **Confirmar Encerramento**.

### 2.13 Frota — FrotaPage (3 abas)
**Arquivo:** `FrotaPage.jsx` (abas: `Fleet.jsx`, `Drivers.jsx`, `LoadingSimulator.jsx`). **Rota:** `/admin/frota`. **Acesso:** admin/operator. **Queries:** trucks, drivers.
**Cabeçalho:** **Frota** — "Carretas, motoristas e simulação de carregamento". **KPIs (StatCards):** Disponíveis · Em rota · Manutenção · Motoristas ativos · Documentos vencendo. **Abas: Carretas · Motoristas · Simulador.**

**Aba Carretas (Fleet):** botão **Novo Caminhão** (`Truck.create`; valida placa, bloqueia duplicada; ao salvar vai ao detalhe). Tabela (DataTable, busca placa/modelo/fabricante/renavam): Placa · Veículo · Tipo · Capacidade · **Volume útil (m³)** · Documentos (Vencendo/Em dia) · Status. Linha→`/admin/frota/:id`.
**Modal Cadastrar Caminhão:** *Identificação:* **Placa \*** ("ABC-1234") · **Tipo** (Carreta/Truck/VUC/Toco/Bitruck/Outro) · **Fabricante** ("Ex: Mercedes-Benz") · **Modelo** ("Ex: Actros 2651") · **Ano** ("Ex: 2022") · **Cor** ("Ex: Branco") · **RENAVAM** ("Ex: 01234567890") · **Chassi** ("Ex: 9BWZZZ377VT004251"). *Capacidade e dimensões:* **Capacidade (kg)** ("Ex: 25000") · **Dimensões do baú (m)** Comp./Larg./Alt. (mostra Volume útil). *Especificações e propriedade:* **Nº de eixos** ("Ex: 6") · **Tara (kg)** ("Ex: 9000") · **Carroceria** (Baú/Sider/Graneleiro/Frigorífico/Carga seca/Tanque/Caçamba/Prancha/Outro) · **Propriedade** (Próprio/Agregado/Terceiro) (+ **Proprietário** se ≠ próprio) · **Rastreador (provedor)** ("Ex: Sascar, Omnilink") · **ID do rastreador**. *Documentação:* **Vencimento CRLV** · **Vencimento do seguro** · **Última aferição do tacógrafo** · **Próxima aferição do tacógrafo**. *Quilometragem e manutenção:* **Km atual (odômetro)** ("Ex: 147832") · **Alerta — troca de óleo (km)** ("20000") · **Alerta — revisão geral (km)** ("40000") · **Alerta — troca de pneus (km)** ("60000"). *Observações:* **Anotações internas**. Botões **Cancelar** / **Cadastrar caminhão**.

**Aba Motoristas (Drivers):** botão **Novo Motorista** (`Driver.create`; valida CPF, bloqueia duplicado). Tabela (busca nome/CPF/CNH/telefone): Motorista (+ alerta "Pendência/A vencer: CNH/ASO/Toxicológico") · CPF · CNH (Cat. · venc. · EAR · pts) · Função · Telefone · Status. Linha→`/admin/motoristas/:id`.
**Modal Cadastrar Motorista:** *Dados pessoais:* **Nome completo \*** ("Ex: João da Silva") · **CPF \*** ("000.000.000-00") · **Data de nascimento** · **Telefone** ("(00) 00000-0000") · **E-mail** ("motorista@email.com"). *Habilitação (CNH):* **Número da CNH** ("Ex: 01234567890") · **Categoria** (A/B/C/D/E/AB/AC/AD/AE) · **Vencimento** · **Pontos na CNH** ("Ex: 0") · **EAR** (checkbox "CNH habilitada para atividade remunerada (EAR)"). *Saúde e veículo:* **Validade ASO** · **Validade toxicológico** · **Veículo padrão**. *Contrato:* **Função** (Motorista/Ajudante/Administrativo) · **Tipo de contrato** (CLT/PJ/Diarista) · **Data de admissão** · **Salário base (R$)** ("3.500,00") · **Comissão (% do frete)** ("ex: 10") · **Status** (Ativo/Afastado/Desligado). *Endereço* (CEP autofill) · *Dados bancários:* **Banco** ("Ex: Banco do Brasil") · **Agência** · **Conta** · **Chave PIX**. *Observações*. Botões **Cancelar** / **Cadastrar motorista**.

**Aba Simulador (LoadingSimulator):** **Queries:** trucks, orders (`confirmed`/`new`); util `loadPacker` + componente 3D `Truck3D` (three.js, lazy). Título **Simulador de Carregamento 3D** — "Arraste para girar, role para dar zoom.". Seletor de carreta + botão **Limpar**. Stats: **Peso (%)** · **Volume (%)** · **Volumes acomodados (x/y)**; barras **Peso** e **Espaço (m³)** com avisos (Peso excedido / Volume excedido / N volumes não couberam). **Baú 3D** com cor por pedido + legenda. **Inteligência de carga:** **Centro de gravidade** (faixa ideal 35–65%) · badges **Frágil — acomodar por cima** / **Carga perigosa — isolar e sinalizar** · **Aproveitamento %** · botão **Plano de carga** (CSV, sequência LIFO + zona do baú). Direita: "No caminhão (N pedidos)" (Remover) + **Adicionar pedidos**.

### 2.14 Detalhe do Caminhão — TruckDetailPage
**Arquivo:** `TruckDetailPage.jsx`. **Rota:** `/admin/frota/:id`. **Acesso:** admin/operator. **Queries/escritas:** truck(id), drivers, suppliers; `Truck.update`; manutenções (array).
**Cabeçalho:** placa (mono) + status + botão **Editar**. **Edição:** **Placa** ("ABC-1234") · **Fabricante** ("Mercedes, Volvo...") · **Modelo** ("Actros, FH...") · **Ano** ("2022") · **Cor** ("Branco, Cinza...") · **RENAVAM** ("00000000000") · **Capacidade (kg)** ("15000") · **Dimensões da carroceria (m)** Comprimento/Largura/Altura · **Quilometragem atual (km)** ("ex: 147832") · **Motorista titular** ("Sem titular") · **Status** · **Tipo**. **Alertas por quilometragem** (óleo/revisão/pneus).
**Manutenções** (adicionar): **Tipo de manutenção** (preventiva/...) · **Data** · **Quilometragem no momento** · **Descrição** ("ex: Troca de óleo motor e filtros. Óleo Mobil 15W40, 12L.") · **Valor (R$)** ("0,00") · **Fornecedor / Oficina** ("Buscar fornecedor...") · **Próxima manutenção prevista**. Documentos (CRLV/seguro/tacógrafo). Botão **Cancelar**.

### 2.15 Detalhe do Motorista — DriverDetailPage
**Arquivo:** `DriverDetailPage.jsx`. **Rota:** `/admin/motoristas/:id`. **Acesso:** admin/operator. **Queries/escritas:** driver(id), trips, orders; `Driver.update`; RPCs de acesso ao app `admin_create_driver_login`/`admin_reset_driver_password`/`admin_set_driver_access`/`admin_delete_driver_login`.
**Cabeçalho:** avatar (inicial) + nome + função·contrato + status + botão **Editar**. **Painel do Mês** (nº pedidos, faturamento, ticket médio). Seções: **Dados Pessoais e Profissionais** (edição: Nome/Data nasc./CPF/Telefone/E-mail/CNH/...), Documentos, **Acesso ao app** (criar login / **redefinir senha** / congelar / excluir), Histórico de viagens.

### 2.16 Cadastros — CadastrosPage (4 abas)
**Arquivo:** `CadastrosPage.jsx` (abas: `Clients.jsx`, `Recipients.jsx`, `Suppliers.jsx`, `Branches.jsx`). **Rota:** `/admin/cadastros` (lê `?aba=`). **Acesso:** admin/operator. **Queries:** clients, suppliers, recipients, branches.
**Cabeçalho:** **Cadastros** — "Clientes, destinatários, fornecedores e filiais". **KPIs (StatCards):** Clientes ativos · Destinatários · Fornecedores · Filiais & CDs. **Abas: Clientes · Destinatários · Fornecedores · Filiais & CDs.**

**Aba Clientes:** botões **Exportar** (CSV) + **Novo Cliente** (`Client.create`, gera código CLI). Tabela (busca nome/CNPJ/código/e-mail): Código · Razão Social/Nome · CPF/CNPJ · Tipo (PJ/PF) · Perfil · Contato · **Pedidos** · Cobrança · Status. Linha→painel lateral (Sheet) com botão **Ver cadastro completo**(→`/admin/clientes/:id`).
**Modal Cadastrar Cliente:** *Identificação:* **Razão Social / Nome \*** ("Empresa Ltda ou João Silva") · **Nome fantasia** · **CPF / CNPJ \*** ("00.000.000/0001-00"; máscara/validação/duplicado) · **Tipo de pessoa** (PJ/PF) · (**Inscrição Estadual** se PJ) · **E-mail** · **Telefone**. *Comercial:* **Perfil de cliente** (Recorrente/Eventual) · **Status** (Ativo/Inativo) · **Tipo de cobrança** (Por viagem/Faturamento mensal) (+ **Dia de fechamento (1-28)**, **Prazo de pagamento (dias)** se mensal) · **Limite de crédito (R$)** ("0 = sem limite"). *Contatos* (ContactsEditor: Nome/Função/Telefone/WhatsApp/E-mail/Principal). *Endereço principal* (CEP autofill). *Janelas (coleta e entrega)* (DeliveryWindowEditor). *Observações* ("Ex: portaria fecha às 17h, pagamento somente por PIX"). Botões **Cancelar** / **Cadastrar cliente**.

**Aba Destinatários:** botões **Exportar** + **Novo destinatário** (`Recipient.create`, gera DEST). Tabela (busca): Código · Nome · CNPJ/CPF · Cidade · Tipo (Fixo/Eventual). Linha→editar. **Modal:** **Nome / Razão Social \*** ("ex: Comércio Central Ltda") · **Nome fantasia** · **CNPJ / CPF** ("00.000.000/0001-00") · **Tipo** (Fixo (recorrente)/Eventual) · **Status** · **Telefone** · **E-mail** · **Cliente que costuma enviar (opcional)** · Endereço · **Janela de recebimento** · **Anotações**. Botões **Cancelar** / **Salvar**; remover (confirm).

**Aba Fornecedores:** botões **Exportar** + **Novo Fornecedor** (`Supplier.create`, gera FOR). Tabela (busca nome/CNPJ/código/contato): Código · Fornecedor · Categoria · CNPJ/CPF · Contato · Telefone/E-mail. **Modal:** **Razão social / Nome \*** ("ex: Posto Rodoviário Silva") · **CNPJ / CPF** ("00.000.000/0001-00") · **Categoria** (Combustível/Manutenção/Pneus/Seguros/Outros) · Endereço · **Responsável** · **Telefone** · **WhatsApp** · **E-mail** ("contato@fornecedor.com") · **Condições de pagamento** ("Ex: 30 dias") · **Chave PIX** ("CNPJ, telefone, e-mail...") · **Observações** · Contatos (ContactsEditor). Editar via linha.

**Aba Filiais & CDs:** botões **Exportar** + **Nova filial / CD** (`Branch.create`, gera FIL). Tabela (busca nome/código): Código · Nome · Tipo (Filial/Centro de Distribuição/Base) · Cidade · Telefone. **Modal:** **Nome \*** ("ex: CD Guarulhos") · **Tipo** · **Telefone** · Endereço. Botões **Cancelar** / **Salvar**; remover (bloqueia com aviso se referenciada por transferências/pedidos).

### 2.17 Detalhe do Cliente — ClientDetailPage
**Arquivo:** `ClientDetailPage.jsx`. **Rota:** `/admin/clientes/:id`. **Acesso:** admin/operator. **Queries/escritas:** client(id), orders; `Client.update`; `Revenue.create` (fatura).
**Cabeçalho:** avatar + razão social + código + CPF/CNPJ + status + botão **Fechar fatura** (se cobrança mensal) + **Editar**. **Métricas (StatCards):** Fretes Realizados · Total Faturado · Ticket Médio. Seções: **Dados Cadastrais** (edição com CEP autofill) · **Contatos** (**Adicionar contato**) · **Tabela de Frete** (personalizada; **Editar**/Limpar/Salvar) · **Últimos Pedidos** · **Histórico de preços** (R$/kg vs média; ▲ acima/▼ abaixo >30%). **Modal Fechar Fatura do Mês:** lista fretes do mês + total + datas; botão **Gerar fatura (R$ ...)**.

### 2.18 Documentos — Documents (5 abas)
**Arquivo:** `Documents.jsx`. **Rota:** `/admin/documentos`. **Acesso:** admin/operator. **Queries/escritas:** orders, trucks, drivers, settings; `Truck.update`/`Driver.update` (anexos/vencimentos); `CompanySettings.update` (docs da empresa); upload via `storage.uploadFile`.
**Abas: Vencimentos (padrão) · Pedidos e Viagens · Frota · Motoristas · Empresa.**
- **Vencimentos:** **KPIs (StatCards):** Vencidos · Vencem em 30 dias · Vencem em 60 dias. Filtro (Vencidos/≤30/≤60/Todos) + **Exportar**. Tabela: Grupo · Item · Documento · Vencimento · Situação · Arquivo (**Ver** ou "sem arquivo").
- **Pedidos e Viagens:** NFs assinadas (Protocolo/Cliente/Destinatário/NF nº/Data/**Visualizar**) + **Exportar NFs**.
- **Frota:** por caminhão (selo **x/3 anexados**) — CRLV, Seguro, Tacógrafo: editar vencimento (date) + **Anexar**/**Trocar** + **Ver**.
- **Motoristas:** por motorista (selo **x/3**) — CNH, ASO, Toxicológico: idem.
- **Empresa:** anexar (Categoria: Contrato social/Cartão CNPJ/Inscrição estadual/Alvará/Licença ANTT-RNTRC/Apólice de seguro/Certidão negativa/Procuração/Contrato comercial/Outro + **Vencimento (opcional)** + **Anexar arquivo**); filtro por categoria; tabela (**Ver**/excluir).

### 2.19 Mensagens — Messages
**Arquivo:** `Messages.jsx`. **Rota:** `/admin/mensagens`. **Acesso:** admin/operator. **Queries/escritas:** contact-messages; `ContactMessage.update` (status/nota/contato).
**Cabeçalho:** **Mensagens** — "Leads recebidos pelo site". Botões **Exportar** (CSV) + **Marcar todas como lidas**. **KPIs (StatCards):** Novos · Em contato · Convertidos · Taxa de conversão (+ "1ª resposta: ..."). Busca ("Buscar por nome, e-mail, telefone…") + abas (Ativos/Novos/Em contato/Convertidos/Perdidos/Arquivados/Todos).
**Por lead (expansível):** selo de status, mensagem, "via site", **Último contato**, link "✓ Pedido gerado" (se convertido), **Nota interna** ("Anotações sobre o atendimento deste lead…"). Botões: **Criar pedido** (→ NewOrder, marca em_contato e vincula na conversão), **Responder por e-mail** (mailto + em_contato), **WhatsApp** (wa.me + em_contato), **Perdido**, **Arquivar**/**Reabrir**.

### 2.20 Alertas — AlertsPage
**Arquivo:** `AlertsPage.jsx`. **Rota:** `/admin/alertas`. **Acesso:** admin/operator. **Queries/escritas:** alerts; `Alert.update`.
**Cabeçalho:** **Alertas**. Lista de alertas (documentos vencendo, manutenção por km, etc.) com nível (crítico/aviso/info), link para a entidade (motorista/caminhão/pedido), marcar como lido/resolvido.

### 2.21 Financeiro — FinanceiroPage (5 abas)
**Arquivo:** `FinanceiroPage.jsx` (abas: `Financial.jsx`, `Revenues.jsx`, `Expenses.jsx`, `DRE.jsx`, `CashFlow.jsx`). **Rota:** `/admin/financeiro` (lê `?aba=`). **Acesso:** **admin**.
**Abas: Resumo · Receitas · Despesas · DRE · Fluxo de Caixa.**

**Resumo (Financial):** Queries revenues/expenses/orders/settings. **KPIs (StatCards):** Saldo em caixa · Resultado do mês (caixa) · Dias de caixa (runway) · A receber (em aberto) · A pagar (em aberto) · Inadimplência. Gráfico **Recebido × Pago × Resultado (6 meses)**. Cards **Top clientes (90 dias)** · **Custos do mês por categoria** · **Vencem nos próximos 7 dias** (a receber/a pagar).

**Receitas (Revenues):** `Revenue.create/update`. Botões **Exportar** + **Nova Receita**. Cards **Total a receber**, **Recebido** + **Aging** clicável (Vence hoje/Vence ≤7 dias/8–30 dias/31–60 dias/Venceu <30d/Venceu >30d). Busca + filtro status (A Receber/Recebido/Atrasado/Cancelado). Tabela: Descrição/Valor/Vencimento/Status/Ação **Recebido**. **Modal Nova Receita:** **Descrição \*** ("ex: Frete VLX-2026-00042") · **Valor \*** · **Vencimento \*** · **Forma de pagamento** (PIX/Boleto/Transferência/Dinheiro). Botão **Cadastrar**.

**Despesas (Expenses):** `Expense.create/update`. Botões **Exportar** + **Nova Despesa**. Cards **Total a pagar**, **Total pago** + Aging (Vencidas/Vence ≤7 dias/8–30/31–60/>60). Busca + filtro categoria. Tabela: Data/Categoria/Descrição/Valor/Status/Ação **Dar Baixa**. **Modal Nova Despesa:** **Categoria \*** (Combustível/Manutenção/Pneus/Pedágios/Salários/Impostos/Seguros/Aluguel/Administrativo/Marketing/Outros) · **Valor (R$) \*** · **Descrição \*** ("ex: Abastecimento rota SP-RJ") · **Centro de custos** ("ex: Operação, Frota, Administrativo") · **Situação** (Pago/A Pagar/Parcelado) · **Forma de pagamento** (PIX/Boleto/Transferência/Cartão/Dinheiro) · **Data de competência \*** ("Quando a despesa foi gerada") · **Data do pagamento** ou **Vencimento** · **Fornecedor** / **Veículo** / **Motorista** · **Comprovante / Nota** (anexo) · **Observações** ("ex: Nota fiscal nº 1234"). Botão **Registrar despesa**. **Modal Baixa:** **Data do pagamento** · **Forma de pagamento** · Comprovante; botão **Confirmar pagamento**.

**DRE:** Queries orders/expenses/trucks/revenues/settings. Seletor Mês/Ano. Botões **Exportar Excel** + **Gerar PDF**. Demonstrativo: Receita Bruta → Deduções estimadas (%) → Receita Líquida → Custos Variáveis → Custos Fixos → EBITDA → Depreciação → **LUCRO/PREJUÍZO LÍQUIDO** + Margem líquida. Gráfico **Composição dos Custos** (pizza). Tabela **Resultado por Caminhão** (Receita/Custos diretos/Resultado). Cards **Comparativo com [mês anterior]** (variação ▲/▼ %) · **Acumulado do ano (YTD)** · **Conciliação: competência × caixa**.

**Fluxo de Caixa (CashFlow):** `CompanySettings.update` (saldo). Seletor 30/60/90 dias. **KPIs (StatCards):** **Saldo em caixa hoje** (editável — botão lápis + Check) · **Saldo projetado** · **Menor saldo no período** · **Atrasados (receber / pagar)**. Alerta de saldo negativo. Gráfico de saldo projetado (área) + tabela dia a dia (Data/Descrição/Entrada/Saída/Saldo, selo "atrasado").

### 2.22 Indicadores — Indicators
**Arquivo:** `Indicators.jsx`. **Rota:** `/admin/indicadores`. **Acesso:** **admin**. **Queries:** orders, trips, trucks, revenues, expenses, incidents-all, settings.
**Cabeçalho:** **Indicadores**. Seletor de período (Mês atual/Mês anterior/3 meses/6 meses/12 meses/Ano) + **Exportar** (CSV). **KPIs do período (StatCards, variação ▲/▼ + semáforo de meta):** Coletas realizadas · Entregas realizadas · OTD (no prazo) · Entregas atrasadas · Ocorrências no período · Faturamento (caixa) · Despesas (caixa) · Margem. **Eficiência do período:** Ticket médio · Custo / km · Receita / km · Lead time médio. **Frota agora:** Disponíveis · Em rota · Ocupação · Ocorrências abertas. **Tendências (12 meses):** Entregas + OTD (eixo duplo) · Receita × Despesa × Resultado · Ocorrências por mês. **Rankings:** Top clientes · Top motoristas · Top destinos.

### 2.23 Usuários & Acessos — UserManagement
**Arquivo:** `UserManagement.jsx`. **Rota:** `/admin/usuarios`. **Acesso:** **admin**. **Queries/escritas:** `admin_list_users` (RPC, com último acesso) / fallback `user_profiles`; `user_audit_log`; RPCs `admin_create_user`, `admin_reset_user_password`, `admin_set_user_role`, `admin_set_user_active`, `admin_delete_user`, `admin_log_action`.
**Cabeçalho:** **Usuários & Acessos** — "Crie usuários e defina quem é administrador, operador ou motorista". Botão **Novo usuário**. **KPIs (StatCards):** Administradores · Operadores · Motoristas · Pendentes. Filtros por papel (Todos/Admins/Operadores/Motoristas/Pendentes) + situação (Todas/Ativos/Desativados). Tabela (DataTable, busca nome/e-mail): Usuário (+ "você" / selo "app motorista") · Papel (**select inline**: Administrador/Operador/Motorista/Pendente) · Último acesso · Situação. Ações por linha: **Senha** (redefinir), **Ativar**/**Desativar**, excluir. **Card Atividade recente** (audit log: quem, ação, alvo, quando).
**Modal Novo usuário:** **Nome completo** · **E-mail \*** ("usuario@empresa.com") · **Papel** (Administrador/Operador) · **Senha temporária \*** ("mín. 6 caracteres"). Botão **Criar usuário**. **Modal Redefinir senha:** nova senha + **Redefinir senha**.
Proteções: não remove/desativa o último admin nem age sobre si.

### 2.24 Configurações — ConfigPage / AdminSettings
**Arquivo:** `ConfigPage.jsx` + `AdminSettings.jsx` (+ `CoverageSettings.jsx`). **Rota:** `/admin/config`. **Acesso:** **admin**. **Queries/escritas:** settings; `CompanySettings.update`; `freightCalculator` (simulador); `admin_log_action` (histórico).
**Cabeçalho:** **Configurações**. Navegação lateral por categorias: **Empresa** (abas Empresa+Site) · **Comercial & Preços** (Preços+Rotas) · **Operação** (Cobertura+Agendamento) · **Alertas**. Cada categoria renderiza abas internas; salvar **NÃO** sobrescreve campos de outros módulos (saldo/documentos).
- **Empresa:** Nome da empresa · **CNPJ** (validação) · Telefone · **E-mail** (validação) · WhatsApp · Região de atuação · Endereço da sede · Missão · Visão · Valores · Redes sociais (Instagram/LinkedIn/Facebook) · **Google Maps API Key** ("Opcional. Quando preenchida, o sistema calcula a distância real entre origem e destino para fretes e rotas." + link "Como obter uma chave →"). **Backup & histórico:** **Exportar config (JSON)** / **Importar config** + lista "Alterações recentes". Botão **Salvar**.
- **Site Público:** **Título do Hero** ("Ex: Sua carga, no prazo certo.") · **Subtítulo do Hero** · **Texto "Sobre Nós"**. Botão **Salvar**.
- **Preços (Tabela de Preços):** *Frete base:* **Preço por kg (R$)** ("ex: 0,85") · **Preço por km (R$)** ("ex: 3,20") · **Taxa fixa por pedido (R$)** ("ex: 120,00") · **Frete mínimo (R$)** ("ex: 450,00"). *Taxas adicionais:* **GRIS — %** · **Ad valorem — %** · **TDE por NF (R$)** · **TDA por NF (R$)** · **Pedágio — R$/kg** · **Taxa de coleta (R$)** · **Taxa de entrega (R$)** · **TRT por NF (R$)** · **Taxa de espera (R$/hora)** · **Taxa de devolução (R$)** · **Taxa de emergência (%)** · **Fator de cubagem (cm³ por kg)** ("6000") · **Adicional frete urgente (%)** · **Adicional frete dedicado (%)**. *Prazo de entrega:* **Velocidade média (km/dia)** ("ex: 600") + **Tabela de prazo por estado** (UF + Dias úteis; botão **Adicionar estado**). *Parâmetros financeiros:* **Alíquota fiscal (%)** · **Depreciação mensal da frota (R$)**. **Simulador de frete:** **Peso (kg)** · **Distância (km)** · **Valor NF (R$)** · **Qtd. NFs** · **Origem UF** · **Destino UF** · **Tipo** (Fracionado/Urgente/Dedicado) → breakdown + total ao vivo. Botão **Salvar**.
- **Tabela de Rotas (Preços por Corredor):** linhas com Origem/Destino (UF) · R$/kg · R$/km · Taxa fixa · Mínimo · Prazo (d) · **Vigente de** / **até**; botão **Adicionar corredor**. Botão **Salvar**.
- **Área de Atuação (CoverageSettings):** tipo de cobertura (nenhuma/estados/cidades/faixa de CEP) + seleção.
- **Agendamento:** **Antecedência mínima** (dias úteis antes da coleta) · **Dias de operação** (Seg/Ter/Qua/Qui/Sex/Sáb/Dom). Botão **Salvar**.
- **Alertas:** antecedência (dias antes) de **CNH do motorista** (60) · **CRLV do caminhão** (60) · **Seguro do caminhão** (30). Botão **Salvar**.

---

## PARTE 3 — PORTAL DO MOTORISTA (mobile)

Acesso com papel `motorista` → `/motorista`. Fundo escuro (gradiente). Guard: `DriverRoute`.

### 3.1 Início — DriverHome
**Arquivo:** `DriverHome.jsx`. **Rota:** `/motorista`. **Acesso:** motorista. **Queries:** my-driver (Driver por `user_id`), my-active-trip (Trip do motorista `in_progress`/`planned`).
**Cabeçalho:** "Bem-vindo" + nome + botão **Sair** (signOut→`/login`).
- **Sem viagem:** card "Nenhuma viagem hoje" — "Você será notificado quando uma viagem for atribuída." + botão **Ver histórico**(→`/motorista/historico`).
- **Com viagem:** card com selo **VIAGEM EM ANDAMENTO** ou **VIAGEM PLANEJADA**; **Saída:** data/hora; **Caminhão:** placa; **Próxima parada** (tipo + endereço) com link "abrir no mapa" (Google Maps); card clicável → `/motorista/viagem/:id`.

### 3.2 Viagem em execução — DriverTrip
**Arquivo:** `DriverTrip.jsx`. **Rota:** `/motorista/viagem/:id`. **Acesso:** motorista. **Queries/escritas:** trip(id), orders; `Trip.update` (paradas/checklist/eventos), `Order.update` (status/recipients), `Incident.create`; upload de NF + assinatura (SignaturePad).
**Cabeçalho:** "Viagem" + **Progresso** (x/y paradas).
**Antes de iniciar — Checklist de saída:** itens; ao concluir aparece "Checklist de saída concluído"; botão **Confirmar checklist** (toast "Checklist concluído!").
**Por parada** (Coleta/Entrega/Partida): botão **Confirmar Chegada** (toast "Chegada confirmada!"); depois:
- **Coleta:** botão **Confirmar Coleta** (toast "Parada concluída!").
- **Entrega:** seção "Comprovante de entrega (assinatura)" — **NF Assinada (obrigatório)** (anexar; "NF anexada") + **Assinatura** (assina na tela; "Assinatura capturada") + **Nome do recebedor** ("Quem recebeu a carga"); botão **Confirmar Entrega** (exige NF+assinatura; toasts "NF e assinatura obrigatórias" / "Assinatura salva!").
**Registrar Ocorrência** (botão): **Tipo** ("Selecionar...": Avaria na carga / Atraso / Tentativa sem sucesso / Roubo-furto / Acidente / Carga recusada pelo destinatário / Outro) · **Descrição** ("Descreva o que aconteceu...") · **Foto (opcional)**. Botões **Registrar e continuar** / **Registrar e seguir rota** (toasts "Preencha tipo e descrição." / "Ocorrência registrada!").
**Fluxos especiais (modais):**
- **Destinatário ausente** → "O que fazer com a carga?": **Tentar novamente amanhã** / **Aguardar instrução do gestor** / **Devolver ao remetente** → **Registrar e seguir rota**.
- **Carga não estava pronta** → "O que aconteceu? (ex: ainda em produção, separação incompleta)" → **Registrar** (toast "Registrado: carga não pronta").
- **Entrega parcial** → **Volumes entregues** ("ex: 8") + **Motivo dos demais** ("Selecionar...": Recusado pelo cliente/Volume errado/Avaria/Outro) → **Registrar entrega parcial** (toast "Entrega parcial registrada").
**Nota em ocorrência existente:** campo "Adicionar informação..." + botão **Enviar** (toast "Informação adicionada à ocorrência").
**Endereço atualizado:** selo "Endereço de entrega ATUALIZADO" quando o gestor mudou via cross-docking.
Observações: o **encerramento financeiro** (km/combustível/acerto) é feito pelo **admin** em Detalhe da Viagem.

### 3.3 Histórico — DriverHistory
**Arquivo:** `DriverHistory.jsx`. **Rota:** `/motorista/historico`. **Acesso:** motorista. **Queries:** trips concluídas do motorista.
**Cabeçalho:** **Histórico** (voltar). Lista de viagens concluídas (data, placa, paradas, resultado). Vazio: "Nenhuma viagem no histórico.".

---

> **Fim do mapeamento.** Cobre os 3 domínios, todas as rotas de `App.jsx`, a casca do admin (sidebar/topbar)
> e cada tela com Arquivo · Rota · Acesso · Queries/Entidades · campos (label+placeholder) · botões (texto→destino)
> · estados/fluxos · comportamentos especiais. Fonte da verdade atual (substitui o `VELOX_MAPEAMENTO.md` antigo).

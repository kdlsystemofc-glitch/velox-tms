# VELOX TMS — MAPA COMPLETO PARA SIMULAÇÃO (agente Chrome)

> Mapeamento **exato e exaustivo** do sistema atual, lido do código-fonte (jun/2026), para um agente
> de testes navegar e executar **absolutamente tudo**. Cobre 3 domínios: **Site Público**, **Portal Admin**
> e **Portal do Motorista**. Cada tela lista: rota, acesso, títulos, abas, KPIs, campos (com label e
> placeholder exatos), botões (texto exato), ações e fluxos.
>
> Convenções:
> - **Rota**: caminho da URL. **Acesso**: público / autenticado / papel (admin, operator, motorista).
> - "Botão [Texto]" = texto exato do botão. "Campo [Label] (placeholder)" = rótulo e placeholder exatos.
> - Login admin/operador: papel definido em **Usuários**. Login motorista: criado no cadastro do motorista.

---

## PARTE 0 — VISÃO GERAL E NAVEGAÇÃO

### 0.1 Domínios e como entrar em cada um
| Domínio | Entrada | Acesso |
|---|---|---|
| **Site Público** | `/` | Qualquer visitante (sem login) |
| **Portal Admin** | `/admin` (após login) | Papel `admin` ou `operator` |
| **Portal Motorista** | `/motorista` (após login) | Papel `motorista` |

Após o **Login** (`/login`), o destino é automático pelo papel:
- `motorista` → `/motorista`
- `admin` ou `operator` → `/admin`
- sem papel definido / desativado → `/sem-acesso`

### 0.2 Tabela completa de rotas (exata, de `App.jsx`)

**Públicas (sem login):**
- `/` — Home (landing)
- `/agendar` — Formulário de Agendamento/Cotação (BookingForm)
- `/cotacao` — Cotar Frete (QuoteForm)
- `/cotacao-avancada` — Cotação avançada (QuickQuote)
- `/rastrear` — Rastreamento (Tracking)
- `/login` — Login
- `/register` — Criar conta
- `/sem-acesso` — Acesso não liberado (NoAccess)
- `/forgot-password` — Esqueceu a senha
- `/reset-password` — Nova senha

**Admin/Operador (autenticado, papel admin ou operator):**
- `/admin` — Painel de Operações (torre de controle)
- `/admin/coletas` — Pedidos (fila)
- `/admin/coletas/nova` — Novo Pedido (assistente)
- `/admin/coletas/:id` — Detalhe do Pedido (OrderWorkspace)
- `/admin/cotacao` — Cotação interna (Cotacao)
- `/admin/despacho` — Despacho (quadro)
- `/admin/replanejamento` — Replanejamento
- `/admin/ocorrencias` — Ocorrências
- `/admin/transferencias` — Transferências
- `/admin/viagens` — Viagens (lista)
- `/admin/viagens/nova` — Nova Viagem
- `/admin/viagens/:id` — Detalhe da Viagem (TripDetailPage)
- `/admin/frota` — Frota (abas: Carretas, Motoristas, Simulador)
- `/admin/frota/:id` — Detalhe do Caminhão (TruckDetailPage)
- `/admin/motoristas/:id` — Detalhe do Motorista (DriverDetailPage)
- `/admin/cadastros` — Cadastros (abas: Clientes, Destinatários, Fornecedores, Filiais & CDs)
- `/admin/clientes/:id` — Detalhe do Cliente (ClientDetailPage)
- `/admin/documentos` — Documentos
- `/admin/mensagens` — Mensagens (leads)
- `/admin/alertas` — Alertas (AlertsPage)

**Admin somente (papel admin):**
- `/admin/financeiro` — Financeiro (abas: Resumo, Receitas, Despesas, DRE, Fluxo de Caixa)
- `/admin/indicadores` — Indicadores
- `/admin/usuarios` — Usuários & Acessos
- `/admin/config` — Configurações

**Motorista (papel motorista):**
- `/motorista` — Início (DriverHome)
- `/motorista/viagem/:id` — Viagem em execução (DriverTrip)
- `/motorista/historico` — Histórico de viagens

**Redirecionamentos legados** (levam ao destino novo): `/admin/pedidos`→`/admin/coletas`; `/admin/operacoes|programacao|agenda`→`/admin/despacho`; `/admin/motoristas`→`/admin/frota`; `/admin/clientes`→`/admin/cadastros`; `/admin/fornecedores`→`/admin/cadastros?aba=fornecedores`; `/admin/carregamento`→`/admin/frota`; `/admin/mapa`→`/admin/config`; `/admin/configuracoes`→`/admin/config`; `/admin/financeiro/{receitas,despesas,dre,fluxo}`→`/admin/financeiro?aba=...`.

### 0.3 Casca do Admin (presente em todas as telas `/admin/*`)

**Sidebar esquerda** (itens exatos, com badge de contagem quando indicado):
- **Operações** (`/admin`)
- Grupo **Fluxo**: **Pedidos** (badge: novos) · **Despacho** (badge: a despachar) · **Replanejamento** (badge) · **Ocorrências** (badge: abertas) · **Viagens** · **Transferências** · **Frota**
- Grupo **Cadastros & Gestão**: **Cadastros** · **Documentos** · **Mensagens** (badge: não lidas) · **Financeiro** (admin) · **Indicadores** (admin) · **Usuários** (admin) · **Configurações** (admin)
- Rodapé: nome do usuário + papel · botão **Sair** · botão **Recolher** (colapsa a sidebar para 64px).

**Topbar** (topo, fixa, com efeito glass):
- **Busca global** (placeholder "Buscar pedidos, clientes, placas... (Ctrl+K)") — atalho **Ctrl+K**. Resultados agrupados: Pedidos, Clientes, Caminhões, Motoristas (clicáveis).
- **Sino de notificações** (badge com nº de alertas não resolvidos). Dropdown "Notificações" com botão **Marcar todas lidas** e link **Ver todos os alertas →**.
- **Avatar** (inicial do nome) + nome + papel.

---

## PARTE 1 — SITE PÚBLICO

### 1.1 Home — landing (`/`, público)
Componentes na ordem: **PublicNavbar → HeroSection → StatsSection → ServicesSection → HowItWorksSection → AboutSection → TestimonialsSection → ContactSection → PublicFooter → WhatsAppButton**.

**PublicNavbar** (fixa no topo; fica opaca ao rolar): logo **VELOX / Transportadora**. Links: **Início** (`/`), **Serviços** (`/#servicos`), **Sobre** (`/#sobre`), **Contato** (`/#contato`), **Rastrear** (`/rastrear`), **Cotar Frete** (`/cotacao`). Botão CTA **Agendar Coleta** (`/agendar`). Menu mobile (hambúrguer) com os mesmos itens.

**HeroSection**: selo "Transporte de confiança"; título grande (do banco `hero_title`, padrão "Sua carga, no prazo certo."); subtítulo (`hero_subtitle`); botões **Cotar Frete** (`/agendar`) e **Agendar Coleta** (`/agendar`).

**StatsSection** (4 contadores animados): **20+ Anos de mercado** · **3 Frotas próprias** · **5000+ Entregas realizadas** · **100+ Cidades atendidas**.

**ServicesSection** (id `servicos`): título "Soluções completas em transporte". 4 cards: **Frete Dedicado**, **Frete Fracionado**, **Coleta Programada**, **Entrega Expressa** — cada um com botão **Solicitar** (rola até Contato).

**HowItWorksSection**: título "Simples, rápido e seguro". 3 passos: **01 Solicite o frete** · **02 Confirmamos e coletamos** · **03 Entrega com NF assinada**.

**AboutSection** (id `sobre`): título "Tradição que se reinventa"; texto `about_text`; missão `mission`; cards de valores (Pontualidade/Responsabilidade/Transparência/Segurança); bloco "Onde atuamos" (estados/cidades/região de cobertura).

**TestimonialsSection**: título "O que nossos clientes dizem" (depoimentos com `active=true`).

**ContactSection** (id `contato`): título "Vamos conversar?". Formulário (cria um lead `ContactMessage`):
- Campo **Nome \*** (placeholder "Seu nome completo")
- Campo **E-mail \*** (placeholder "seu@email.com")
- Campo **Telefone** (placeholder "(00) 00000-0000")
- Campo **Mensagem \*** (placeholder "Como podemos ajudar?")
- Botão de envio. Validação: nome, e-mail válido e mensagem (mín. 10 caracteres) obrigatórios.

**PublicFooter**: marca + redes sociais (Instagram/LinkedIn/Facebook se configurados); colunas **Links Rápidos**, **Serviços**, **Contato**; modais de Privacidade/Termos.

**WhatsAppButton**: botão flutuante de WhatsApp (canto inferior).

### 1.2 Agendar / Cotar (`/agendar`, público) — BookingForm
Assistente em **5 passos** (com barra de progresso). Ao final gera um **protocolo** (ex.: VLX-2026-XXXXX).

**Passo 1 — Dados do Solicitante:**
- **Nome Completo / Razão Social \*** (placeholder "Nome ou razão social")
- **CPF / CNPJ** (placeholder "000.000.000-00 / 00.000.000/0000-00") — ao sair do campo, busca cliente existente.
- **Responsável pelo agendamento \*** (placeholder "Nome de quem está solicitando")
- **Cargo / Setor** (placeholder "ex: Expedição, Logística, Compras")
- **Telefone** (placeholder "(00) 00000-0000")
- **E-mail** (placeholder "seu@email.com")
- **Preferência de contato**: Telefone / WhatsApp / E-mail

**Passo 2 — Origem da Coleta:**
- **CEP \*** (placeholder "00000-000") — autofill ViaCEP; alerta "Região não atendida" se fora da cobertura.
- **Endereço \***, **Número \***, **Complemento**, **Bairro**, **Cidade / UF**
- **Data desejada para coleta \*** (date)
- **Horário preferencial**: Manhã / Tarde / A combinar
- **Observações de coleta** (placeholder "Portaria, restrições de acesso...")

**Passo 3 — Destinatários e Cargas** (botão **Adicionar destinatário**; cada destinatário tem botão remover):
- Por destinatário: **Nome / Razão Social \*** ("ex: Comércio Central Ltda"), **CNPJ / CPF do destinatário** ("ex: 12.345.678/0001-90"), **Telefone do destinatário** ("ex: (11) 99999-0000"), **CEP de destino \*** ("ex: 01310-100"), **Cidade / UF**, **Endereço \*** ("ex: Av. Brasil"), **Número \*** ("ex: 500"), **Complemento** ("ex: Apto 42, Galpão 3"), **Bairro** ("ex: Centro"), **Observações de entrega**.
- **Itens / NFs** (botão adicionar item) por destinatário: **Nº da Nota Fiscal** ("ex: 001234"), **NCM** ("ex: 8471.30.12"), **Tipo de embalagem** (Caixa/Palete/Tambor/Bobina/Fardo/Saco/Engradado/Big Bag/Rolo/Peça solta/Outro), **Quantidade de volumes \*** ("ex: 12"), **Chave de acesso da NF-e** (44 dígitos, opcional), peso/dimensões/valor declarado.

**Passo 4 — Tipo de serviço** (conforme configuração: fracionado/dedicado/expresso).

**Passo 5 — Revisão**: mostra totais e valor estimado. Navegação: **Voltar** / **Avançar** (bloqueado se origem fora de cobertura). Ao enviar: tela "Solicitação Enviada!" com o **protocolo** e botão de cópia.

### 1.3 Cotar Frete (`/cotacao`, público) — QuoteForm
Assistente em 3 passos:
- **Passo 1 — De onde para onde?**: selects de estado de origem e destino (Selecione).
- **Passo 2 — Dados da carga**: por lote — **Quantidade de volumes** ("ex: 10"), **Peso** ("ex: 500"), dimensões (cm), **Valor declarado** ("ex: 50.000"), **Nº de NFs** ("ex: 2").
- **Passo 3 — Resultado**: "Valor estimado do frete"; botões **Agendar agora** (vai a `/agendar` com os dados) e refazer.

### 1.4 Cotação avançada (`/cotacao-avancada`, público) — QuickQuote
Calculadora detalhada de frete com itens/cubagem (mesma engine do `freightCalculator`), exibindo o breakdown (peso taxável, GRIS, ad valorem, taxas) e total.

### 1.5 Rastreamento (`/rastrear`, público) — Tracking
- Campo de busca (placeholder "Protocolo VLX-2026-XXXXX, CT-e ou nº da NF") + botão de rastrear.
- Estado "Nenhum pedido encontrado". Quando acha: mostra Protocolo, Cliente, linha do tempo de status (com selo "Atual"), CT-e (se houver), ocorrências registradas e **Histórico detalhado**.

### 1.6 Páginas de autenticação
- **Login** (`/login`): botão **Continuar com Google**; separador "ou"; **E-mail** (placeholder "seu@email.com"), **Senha** (placeholder "••••••••"); link **Esqueceu sua senha?**; botão **Entrar**; rodapé "Não tem conta? Criar conta". Layout em 2 painéis (painel de marca à esquerda).
- **Criar conta** (`/register`): **Continuar com Google**; **E-mail** ("seu@email.com"), **Senha** ("Mínimo 6 caracteres"), **Confirmar senha** ("Repita a senha"); botão criar; rodapé "Já tem conta? Entrar". (Novo usuário entra como `pending` até um admin liberar o papel.)
- **Esqueceu a senha?** (`/forgot-password`): **E-mail cadastrado** ("seu@email.com"); botão enviar; tela "E-mail enviado". Link **Voltar para o login**.
- **Nova senha** (`/reset-password`): **Nova senha** ("Mínimo 6 caracteres"), **Confirmar nova senha** ("Repita a senha"); ao salvar volta ao login.
- **Acesso não liberado** (`/sem-acesso`): mensagem "Acesso não liberado" + botão para sair/voltar (usado quando o usuário está `pending` ou desativado).

---

## PARTE 2 — PORTAL ADMIN

### 2.1 Painel de Operações (`/admin`, admin/operator) — torre de controle
Cabeçalho: título **Painel de Operações** + selo **● Ao vivo** (atualiza sozinho ~45s) + data por extenso. Botões: **Despacho** (vai a `/admin/despacho`) e **Novo Pedido** (`/admin/coletas/nova`).
**Faixa de métricas (StatCards):** Frota disponível (X/Y) · Em rota agora · Ocupação da frota (%) · Coletas hoje · Entregas hoje · No prazo (hoje) % (OTD) · Atrasados / em risco · Ocorrências abertas.
**Fila de ação** (cards clicáveis, só quando há pendência): ocorrências graves → **Tratar**; caminhões indisponíveis com carga → **Replanejar**; viagens sem motorista → **Reatribuir**; pedidos aguardando confirmação → **Revisar**; confirmados sem viagem → **Despachar**; alertas críticos → **Ver alertas**; recebimentos em atraso → **Cobrar**. Sem pendência: banner "Nenhuma pendência. Operação em dia.".
**Pipeline** (clicável): Novos · Confirmados · Em coleta · Em trânsito · (Em transferência) · Entregues.
**Exceções operacionais** + **Capacidade do dia** (barras Peso e Volume). **Operação de hoje/amanhã/semana** (toggle). **Frota agora**. **Alertas recentes** (+ Ver todos →). **Financeiro resumido** (admin): cards **A receber** / **A pagar**.

### 2.2 Pedidos (`/admin/coletas`, admin/operator) — OrdersWorkspace
Cabeçalho **Pedidos** — "Fila única — confirme, recuse e despache sem sair da tela". Botões **Cotação**, **Exportar** (CSV), **Novo Pedido**.
Abas por status: Todos · Novos · Confirmados · Em coleta · Em trânsito · Entregues · Cancelados (com contadores). Tabela ordenável; linha → detalhe. Seleção múltipla → barra com **Criar viagem**.
Ações por linha: **Novo** → **Confirmar** (modal: **Valor do frete**, **Forma de pagamento**, **Data de coleta**) / recusar; **Confirmado sem viagem** → **Despachar**.

### 2.3 Novo Pedido (`/admin/coletas/nova`, admin/operator) — NewOrder
Assistente. **Solicitante:** buscar cliente ("Buscar por nome ou CNPJ..."), **Razão Social / Nome**, **CPF / CNPJ**, **Responsável pelo agendamento** ("Quem está solicitando"), **Cargo / Setor** ("ex: Logística"), **Telefone / WhatsApp** ("ex: (11) 98765-4321"), **E-mail**. **Coleta:** **Data de coleta**, **Período preferencial**, **Observações de coleta**; botão **Adicionar ponto de coleta** (multi-origem: **Contato no local**, **Observações deste ponto**). **Destinatários:** botão **Adicionar destinatário** + **Buscar destinatário na base**; **Nome do destinatário**, **CNPJ / CPF**, endereço, **Observações de entrega**. **Itens/NFs:** botão **Item** e **Adicionar chaves** (cola chaves NF-e 44 díg.); **Nº da NF**, **NCM**, **Chave de acesso NF-e (44 dígitos, opcional)**, **Embalagem**, **Descrição da mercadoria**, **Volumes**, **Peso (kg)**, **Valor declarado (R$)**, **Comp./Larg./Alt. (cm)**. **Carga total:** **Total de volumes**, **Peso total (kg)**, **Valor declarado total (R$)**. **Comercial:** **Tipo de frete**, **Responsabilidade pelo frete**, **Forma de pagamento**, **Condições de pagamento**, **Valor do frete cobrado (R$)**, **Observações internas**. **Despacho opcional:** **Caminhão**, **Motorista**. Botões **Cancelar** / **Criar Coleta**; se cliente novo: **Criar cadastro** / **Não, só o pedido**; **Usar estimativa**.

### 2.4 Detalhe do Pedido (`/admin/coletas/:id`) — OrderWorkspace
Seções: **Resumo do pedido**, **Cargas e destinatários**, **Financeiro** (Valor do frete, Forma de pagamento, Condições, Cobranças adicionais, Taxa improdutiva, Fator de cubagem deste pedido), **Ocorrências** ("O que foi feito para resolver…"), **Anexos** (**Anexar** — "Adicionar anexo (foto da carga, documento)"), **Histórico de eventos**. Ações: editar, registrar ocorrência, **Cancelar** (exige "Motivo do cancelamento (obrigatório)"), **Voltar**; gera **CT-e**.

### 2.5 Cotação interna (`/admin/cotacao`) — Cotacao
Título **Cotação** — "Simule o frete e converta em pedido com um clique". Campos: **UF origem**, **UF destino**, **CEP destino**, **Cidade destino**, **Peso (kg) \***, **Volumes**, **Valor declarado**, **Nº de NFs**, **Dimensões (cm) — opcional, para cubagem**, **Tipo de frete**. Converte em pedido.

### 2.6 Despacho (`/admin/despacho`) — DispatchBoard
Título **Despacho** — "Selecione pedidos na fila e clique no dia/caminhão para programar". Quadro **arrastar-e-soltar** (fila → dia/caminhão). Busca "Cliente, cidade, UF...". Botão **Planejar automaticamente**. Célula mostra **peso · volume**; "Devolver à fila"; botões **Limpar**, **Cancelar**.

### 2.7 Replanejamento (`/admin/replanejamento`) — Replanning
Título **Replanejamento** — "Central de disrupções — redistribua recursos com 1 clique.". Casos de caminhão indisponível / motorista ausente: **Escolher caminhão disponível** / **Escolher motorista** + redistribuir/reatribuir. Vazio: **"Tudo sob controle 🎉"**.

### 2.8 Ocorrências (`/admin/ocorrencias`) — Incidents
**KPIs:** Em aberto · Críticas · Atrasadas (prazo) · Resolvidas. **Indicadores:** Tempo médio resolução · Resolvidas no prazo % · Impacto financeiro · Tipos mais frequentes. Botão **Exportar**. Filtros tipo/responsável/status. Por ocorrência: tipo (avaria/atraso/tentativa_entrega/roubo/acidente/carga_recusada/outro), **impacto financeiro (R$)**, **causa-raiz**, anexos, timeline; ações: tratativa, notificar cliente, seguro, **reabrir**, resolver.

### 2.9 Transferências (`/admin/transferencias`) — Transfers
Botão **Nova transferência** (≥2 filiais). **KPIs:** Em trânsito · Planejadas · Pedidos na malha · Peso na malha. Busca + filtro status. Card: protocolo, origem→destino, nº pedidos, peso, placa/motorista, custo/km, status; botões **Manifesto** (PDF), **Despachar**, **Receber no destino**, **Estornar**. Modal Nova: **Origem**/**Destino**, **Caminhão disponível**, **Motorista livre**, **Pedidos a transferir** (peso×capacidade), **Iniciar em trânsito agora**; **Cancelar**/**Criar transferência**. Conferência de recebimento: divergência por pedido (vira ocorrência), **Distância (km)**, **Custo do trecho (R$)** (vira despesa); **Confirmar recebimento**.

### 2.10 Viagens (`/admin/viagens`) — Trips
Botões **Exportar**, **Nova Viagem**. **KPIs:** Em rota · Planejadas · Concluídas no mês · Lucro do mês. Busca (motorista/placa) + período (Tudo/7 dias/30 dias/Este mês). Abas: Ativas · Planejadas · Concluídas · Canceladas. Cards: motorista, placa (+ **comboio N**), progresso, saída, nº pedidos; concluídas: **lucro · margem %**; botão **Ver Detalhes**.

### 2.11 Nova Viagem (`/admin/viagens/nova`) — NewTrip
Campos: **Caminhão** (Selecionar caminhão), **Motorista** (Selecionar motorista), **Data e hora de saída**, **Adiantamento ao motorista (R$) — opcional**, **Observações da viagem**. **Veículos adicionais (comboio):** **Adicionar veículo**. Botões **Cancelar** / criar.

### 2.12 Detalhe da Viagem (`/admin/viagens/:id`) — TripDetailPage
Cabeçalho: "Viagem" + status + motorista·placa. Botões **Romaneio PDF** / **Romaneio (todos)**, **Iniciar**, **Encerrar Viagem**. Paradas (reordenar arrastando ou ↑/↓; **Google Maps**, **Otimizar rota**); ações **Chegou**/**Concluir**; entrega: **Anexar NF**. Card Comboio (link **Romaneio** por veículo). Card Financeiro (Receita, Custo, Lucro, Margem, Custo/km, **Eficiência km/L**, **Estimado × Real**). Card Acerto (comissão/rateio, −adiantamento, saldo). Backhaul: **Adicionar à viagem**. Modal Encerrar: **Km Final (odômetro)**, **Combustível (litros)**, **Custo combustível (R$)**, **Pedágios (R$)**, **Outros gastos** (categoria+descrição+R$), **Observações finais**, **Confirmar Encerramento**.

### 2.13 Frota (`/admin/frota`, admin/operator) — FrotaPage
Cabeçalho **Frota** — "Carretas, motoristas e simulação de carregamento". **KPIs (StatCards):** Disponíveis · Em rota · Manutenção · Motoristas ativos · Documentos vencendo. **Abas: Carretas · Motoristas · Simulador.**

**Aba Carretas (Fleet):** botão **Novo Caminhão**. Tabela (DataTable: busca por placa/modelo/fabricante/renavam): Placa, Veículo, Tipo, Capacidade, **Volume útil**, Documentos (Vencendo/Em dia), Status. Linha → detalhe.
**Modal Cadastrar Caminhão** — seções:
- *Identificação:* **Placa \*** ("ABC-1234"; valida antiga e Mercosul, bloqueia duplicada), **Tipo** (Carreta/Truck/VUC/Toco/Bitruck/Outro), **Fabricante** ("Ex: Mercedes-Benz"), **Modelo** ("Ex: Actros 2651"), **Ano** ("Ex: 2022"), **Cor** ("Ex: Branco"), **RENAVAM** ("Ex: 01234567890"), **Chassi** ("Ex: 9BWZZZ377VT004251").
- *Capacidade e dimensões:* **Capacidade (kg)** ("Ex: 25000"), **Dimensões do baú (m)** (Comp./Larg./Alt.; mostra **Volume útil**).
- *Especificações e propriedade:* **Nº de eixos** ("Ex: 6"), **Tara (kg)** ("Ex: 9000"), **Carroceria** (Baú/Sider/Graneleiro/Frigorífico/Carga seca/Tanque/Caçamba/Prancha/Outro), **Propriedade** (Próprio/Agregado/Terceiro) (+ **Proprietário** se não próprio), **Rastreador (provedor)**, **ID do rastreador**.
- *Documentação:* **Vencimento CRLV**, **Vencimento do seguro**, **Última aferição do tacógrafo**, **Próxima aferição do tacógrafo**.
- *Quilometragem e manutenção:* **Km atual (odômetro)** ("Ex: 147832"), **Alerta — troca de óleo (km)** ("20000"), **Alerta — revisão geral (km)** ("40000"), **Alerta — troca de pneus (km)** ("60000").
- *Observações:* **Anotações internas**. Botões **Cancelar** / **Cadastrar caminhão**.

**Aba Motoristas (Drivers):** botão **Novo Motorista**. Tabela (busca nome/CPF/CNH/telefone): Motorista (+ alerta de pendência CNH/ASO/Toxicológico), CPF, CNH (Cat. · venc. · EAR · pts), Função, Telefone, Status. Linha → detalhe.
**Modal Cadastrar Motorista** — seções:
- *Dados pessoais:* **Nome completo \*** ("Ex: João da Silva"), **CPF \*** ("000.000.000-00"; valida dígitos, bloqueia duplicado), **Data de nascimento**, **Telefone** ("(00) 00000-0000"), **E-mail** ("motorista@email.com").
- *Habilitação (CNH):* **Número da CNH** ("Ex: 01234567890"), **Categoria** (A/B/C/D/E/AB/AC/AD/AE), **Vencimento**, **Pontos na CNH** ("Ex: 0"), **EAR** (checkbox "CNH habilitada para atividade remunerada (EAR)").
- *Saúde e veículo:* **Validade ASO**, **Validade toxicológico**, **Veículo padrão**.
- *Contrato:* **Função** (Motorista/Ajudante/Administrativo), **Tipo de contrato** (CLT/PJ/Diarista), **Data de admissão**, **Salário base (R$)** ("3.500,00"), **Comissão (% do frete)** ("ex: 10"), **Status** (Ativo/Afastado/Desligado).
- *Endereço* (com CEP autofill) · *Dados bancários:* **Banco**, **Agência**, **Conta**, **Chave PIX**. *Observações*. Botões **Cancelar** / **Cadastrar motorista**.

**Aba Simulador (LoadingSimulator):** título **Simulador de Carregamento 3D** — "Arraste para girar, role para dar zoom.". Seletor de carreta + botão **Limpar**. Stats: **Peso (%)**, **Volume (%)**, **Volumes acomodados (x/y)**; barras **Peso** e **Espaço (m³)** com avisos de excesso. **Baú 3D** (three.js) com cor por pedido + legenda. **Inteligência de carga:** **Centro de gravidade** (faixa ideal), badges **Frágil**/**Carga perigosa**, **Aproveitamento**, botão **Plano de carga** (CSV, sequência LIFO). Lado direito: lista "No caminhão" (remover) + **Adicionar pedidos**.

### 2.14 Detalhe do Caminhão (`/admin/frota/:id`) — TruckDetailPage
Cabeçalho: placa + status + botão **Editar**. Edição: **Placa** ("ABC-1234"), **Fabricante** ("Mercedes, Volvo..."), **Modelo** ("Actros, FH..."), **Ano** ("2022"), **Cor** ("Branco, Cinza..."), **RENAVAM** ("00000000000"), **Capacidade (kg)** ("15000"), **Dimensões da carroceria (m)** (Comprimento/Largura/Altura), **Quilometragem atual (km)** ("ex: 147832"), **Motorista titular** ("Sem titular"), **Status**, **Tipo**. **Alertas por quilometragem** (óleo/revisão/pneus). **Manutenções** (botão adicionar): **Tipo de manutenção** (preventiva/...), **Data**, **Quilometragem no momento**, **Descrição** ("ex: Troca de óleo motor e filtros..."), **Valor (R$)**, **Fornecedor / Oficina** ("Buscar fornecedor..."), **Próxima manutenção prevista**. Documentos (CRLV/seguro/tacógrafo).

### 2.15 Detalhe do Motorista (`/admin/motoristas/:id`) — DriverDetailPage
Cabeçalho: avatar + nome + função·contrato + status + **Editar**. **Painel do Mês** (nº pedidos, faturamento, ticket médio). Seções: **Dados Pessoais e Profissionais** (edição com Nome/CPF/Telefone/E-mail/CNH...), Documentos, **Acesso ao app** (criar login / redefinir senha / congelar / excluir): **Smartphone**, **KeyRound**, **Power**, **Trash2**. Histórico de viagens.

### 2.16 Cadastros (`/admin/cadastros`, admin/operator) — CadastrosPage
Cabeçalho **Cadastros** — "Clientes, destinatários, fornecedores e filiais". **KPIs (StatCards):** Clientes ativos · Destinatários · Fornecedores · Filiais & CDs. **Abas: Clientes · Destinatários · Fornecedores · Filiais & CDs.**

**Aba Clientes (Clients):** botão **Exportar** (CSV) + **Novo Cliente**. Tabela (busca nome/CNPJ/código/e-mail): Código, Razão Social/Nome, CPF/CNPJ, Tipo (PJ/PF), Perfil, Contato, **Pedidos**, Cobrança, Status. Linha → painel lateral (Sheet) com **Ver cadastro completo**.
**Modal Cadastrar Cliente:** *Identificação:* **Razão Social / Nome \***, **Nome fantasia**, **CPF / CNPJ \*** (máscara+validação+duplicado), **Tipo de pessoa** (PJ/PF), (**Inscrição Estadual** se PJ), **E-mail**, **Telefone**. *Comercial:* **Perfil de cliente** (Recorrente/Eventual), **Status**, **Tipo de cobrança** (Por viagem/Faturamento mensal) (+ **Dia de fechamento**, **Prazo de pagamento** se mensal), **Limite de crédito (R$)**. *Contatos* (ContactsEditor: nome/função/telefone/WhatsApp/e-mail/principal). *Endereço principal* (CEP autofill). *Janelas (coleta e entrega)*. *Observações*. Botões **Cancelar** / **Cadastrar cliente**.

**Aba Destinatários (Recipients):** botões **Exportar** + **Novo destinatário**. Tabela (busca): Código (DEST), Nome, CNPJ/CPF, Cidade, Tipo (Fixo/Eventual). Linha → editar. Modal: **Nome / Razão Social \***, **Nome fantasia**, **CNPJ / CPF** (máscara/validação), **Tipo** (Fixo/Eventual), **Status**, **Telefone**, **E-mail**, **Cliente que costuma enviar (opcional)**, Endereço, **Janela de recebimento**, Anotações. Botões **Cancelar** / **Salvar**; remover.

**Aba Fornecedores (Suppliers):** botões **Exportar** + **Novo Fornecedor**. Tabela (busca nome/CNPJ/código/contato): Código (FOR), Fornecedor, Categoria, CNPJ/CPF, Contato, Telefone/E-mail. Modal: **Razão social / Nome \***, **CNPJ / CPF** (máscara/validação), **Categoria** (Combustível/Manutenção/Pneus/Seguros/Outros), Endereço, **Responsável**, **Telefone**, **WhatsApp**, **E-mail**, **Condições de pagamento** ("Ex: 30 dias"), **Chave PIX**, **Observações**, Contatos (ContactsEditor). Editar via linha.

**Aba Filiais & CDs (Branches):** botões **Exportar** + **Nova filial / CD**. Tabela: Código (FIL), Nome, Tipo (Filial/Centro de Distribuição/Base), Cidade, Telefone. Modal: **Nome \*** ("ex: CD Guarulhos"), **Tipo**, **Telefone**, Endereço. Botões **Cancelar** / **Salvar**; remover (bloqueia se em uso).

### 2.17 Detalhe do Cliente (`/admin/clientes/:id`) — ClientDetailPage
Cabeçalho: avatar + razão social + código + CPF/CNPJ + status + **Fechar fatura** (se mensal) + **Editar**. **Métricas (StatCards):** Fretes Realizados · Total Faturado · Ticket Médio. Seções: **Dados Cadastrais** (edição), **Contatos** (**Adicionar contato**), **Tabela de Frete** (personalizada por cliente; **Editar**/Limpar/Salvar), **Últimos Pedidos**, **Histórico de preços** (R$/kg vs média). Modal **Fechar Fatura do Mês** → **Gerar fatura**.

### 2.18 Documentos (`/admin/documentos`, admin/operator) — Documents
**Abas: Vencimentos (default) · Pedidos e Viagens · Frota · Motoristas · Empresa.**
- **Vencimentos:** **KPIs (StatCards):** Vencidos · Vencem em 30 dias · Vencem em 60 dias. Filtro (Vencidos/≤30/≤60/Todos) + **Exportar**. Tabela: Grupo, Item, Documento, Vencimento, Situação, Arquivo.
- **Pedidos e Viagens:** NFs assinadas (Protocolo, Cliente, Destinatário, NF nº, Data, Visualizar) + **Exportar NFs**.
- **Frota:** por caminhão (selo **x/3 anexados**) — linhas CRLV, Seguro, Tacógrafo: **Anexar**/**Trocar** arquivo + editar vencimento + **Ver**.
- **Motoristas:** por motorista (selo **x/3**) — CNH, ASO, Toxicológico: **Anexar**/editar/**Ver**.
- **Empresa:** anexar documento (Categoria: Contrato social/Cartão CNPJ/Inscrição estadual/Alvará/Licença ANTT-RNTRC/Apólice de seguro/Certidão negativa/Procuração/Contrato comercial/Outro + **Vencimento (opcional)** + **Anexar arquivo**); filtro por categoria; tabela com **Ver**/excluir.

### 2.19 Mensagens (`/admin/mensagens`, admin/operator) — Messages
Cabeçalho **Mensagens** — "Leads recebidos pelo site". Botões **Exportar** (CSV) + **Marcar todas como lidas**. **KPIs (StatCards):** Novos · Em contato · Convertidos · Taxa de conversão (+ 1ª resposta). Busca + abas (Ativos/Novos/Em contato/Convertidos/Perdidos/Arquivados/Todos). Por lead (expansível): selo de status, mensagem, **Nota interna**, link "✓ Pedido gerado" (se convertido); botões **Criar pedido**, **Responder por e-mail**, **WhatsApp**, **Perdido**, **Arquivar**/**Reabrir**.

### 2.20 Alertas (`/admin/alertas`, admin/operator) — AlertsPage
Cabeçalho **Alertas**. Lista de alertas do sistema (documentos vencendo, manutenção por km, etc.) com nível (crítico/aviso/info), link para a entidade e marcar como lido/resolvido.

### 2.21 Financeiro (`/admin/financeiro`, **admin**) — FinanceiroPage
Cabeçalho **Financeiro**. **Abas: Resumo · Receitas · Despesas · DRE · Fluxo de Caixa.**

**Resumo (Financial):** **KPIs (StatCards):** Saldo em caixa · Resultado do mês (caixa) · Dias de caixa (runway) · A receber (em aberto) · A pagar (em aberto) · Inadimplência. Gráfico **Recebido × Pago × Resultado (6 meses)**. Cards **Top clientes (90 dias)**, **Custos do mês por categoria**, **Vencem nos próximos 7 dias** (a receber / a pagar).

**Receitas (Revenues):** botões **Exportar** + **Nova Receita**. Cards: **Total a receber**, **Recebido** + **Aging** clicável (Vence hoje / ≤7 dias / 8–30 / 31–60 / Venceu <30d / Venceu >30d). Busca + filtro status (A Receber/Recebido/Atrasado/Cancelado). Tabela: Descrição, Valor, Vencimento, Status, Ação **Recebido**. Modal Nova Receita: **Descrição \***, **Valor \***, **Vencimento \***, **Forma de pagamento** (PIX/Boleto/Transferência/Dinheiro); botão **Cadastrar**.

**Despesas (Expenses):** botões **Exportar** + **Nova Despesa**. Cards **Total a pagar**, **Total pago** + Aging (Vencidas/≤7/8–30/31–60/>60). Busca + filtro categoria. Tabela: Data, Categoria, Descrição, Valor, Status, Ação **Dar Baixa**. Modal Nova Despesa: **Categoria \***, **Valor (R$) \***, **Descrição \***, **Centro de custos**, **Situação** (Pago/A Pagar/Parcelado), **Forma de pagamento**, **Data de competência \***, **Data do pagamento**/**Vencimento**, **Fornecedor**/**Veículo**/**Motorista**, **Comprovante / Nota** (anexo), **Observações**; botão **Registrar despesa**. Modal Baixa: **Data do pagamento**, **Forma de pagamento**, comprovante; **Confirmar pagamento**.

**DRE:** seletor Mês/Ano. Botões **Exportar Excel** + **Gerar PDF**. Demonstrativo (Receita Bruta → Deduções → Receita Líquida → Custos Variáveis → Custos Fixos → EBITDA → Depreciação → **Lucro/Prejuízo Líquido** + Margem). Gráfico **Composição dos Custos**. **Resultado por Caminhão**. Cards **Comparativo** (mês anterior, variação %), **Acumulado do ano (YTD)**, **Conciliação competência × caixa**.

**Fluxo de Caixa (CashFlow):** seletor (30/60/90 dias). **KPIs (StatCards):** **Saldo em caixa hoje** (editável — ícone lápis), **Saldo projetado**, **Menor saldo no período**, **Atrasados (receber / pagar)**. Alerta de saldo negativo. Gráfico de saldo projetado + tabela dia a dia (entradas/saídas/saldo; selo "atrasado").

### 2.22 Indicadores (`/admin/indicadores`, **admin**) — Indicators
Cabeçalho **Indicadores**. Seletor de período (Mês atual/Mês anterior/3/6/12 meses/Ano) + **Exportar** (CSV). **KPIs do período (StatCards com variação e meta):** Coletas realizadas · Entregas realizadas · OTD (no prazo) · Entregas atrasadas · Ocorrências no período · Faturamento (caixa) · Despesas (caixa) · Margem. **Eficiência do período:** Ticket médio · Custo / km · Receita / km · Lead time médio. **Frota agora:** Disponíveis · Em rota · Ocupação · Ocorrências abertas. **Tendências (12 meses):** Entregas + OTD; Receita × Despesa × Resultado; Ocorrências por mês. **Rankings:** Top clientes · Top motoristas · Top destinos.

### 2.23 Usuários & Acessos (`/admin/usuarios`, **admin**) — UserManagement
Cabeçalho **Usuários & Acessos** — "Crie usuários e defina quem é administrador, operador ou motorista". Botão **Novo usuário**. **KPIs (StatCards):** Administradores · Operadores · Motoristas · Pendentes. Filtros por papel + situação. Tabela (DataTable, busca nome/e-mail): Usuário (+ selo "app motorista"), Papel (select inline: Administrador/Operador/Motorista/Pendente), Último acesso, Situação, Ações (**Senha** / **Ativar**/**Desativar** / excluir). **Card Atividade recente** (audit log). Modal **Novo usuário:** **Nome completo**, **E-mail \***, **Papel** (Administrador/Operador), **Senha temporária \***; botão **Criar usuário**. Modal **Redefinir senha**.

### 2.24 Configurações (`/admin/config`, **admin**) — ConfigPage/AdminSettings
Cabeçalho **Configurações**. Navegação lateral por categorias: **Empresa** · **Comercial & Preços** · **Operação** · **Alertas** (cada uma renderiza abas internas do AdminSettings). Abas internas existentes: **Empresa**, **Site Público**, **Preços**, **Tabela de Rotas**, **Área de Atuação**, **Agendamento**, **Alertas**.
- **Empresa:** Nome da empresa, **CNPJ** (com validação), Telefone, **E-mail** (validação), WhatsApp, Região de atuação, Endereço da sede, Missão, Visão, Valores, Redes sociais (Instagram/LinkedIn/Facebook), **Google Maps API Key** ("Opcional. Quando preenchida, o sistema calcula a distância real entre origem e destino…"). **Backup & histórico:** botões **Exportar config (JSON)** / **Importar config** + "Alterações recentes". Botão **Salvar**.
- **Preços (Tabela de Preços):** *Frete base:* Preço por kg, Preço por km, Taxa fixa por pedido, Frete mínimo. *Taxas adicionais:* GRIS %, Ad valorem %, TDE por NF, TDA por NF, Pedágio R$/kg, Taxa de coleta, Taxa de entrega, TRT por NF, Taxa de espera R$/h, Taxa de devolução, Taxa de emergência %, **Fator de cubagem (cm³/kg)** (6000), Adicional urgente %, Adicional dedicado %. *Prazo de entrega:* Velocidade média (km/dia) + **Tabela de prazo por estado** (UF + dias úteis; **Adicionar estado**). *Parâmetros financeiros:* Alíquota fiscal %, Depreciação mensal da frota. **Simulador de frete** (testa a tabela atual): **Peso (kg)**, **Distância (km)**, **Valor NF (R$)**, **Qtd. NFs**, **Origem UF**, **Destino UF**, **Tipo** (Fracionado/Urgente/Dedicado) → breakdown + total ao vivo. Botão **Salvar**.
- **Tabela de Rotas (Preços por Corredor):** linhas Origem/Destino (UF), R$/kg, R$/km, Taxa fixa, Mínimo, Prazo, **Vigente de**/**até**; **Adicionar corredor**.
- **Área de Atuação (CoverageSettings):** tipo de cobertura (estados/cidades/faixa de CEP).
- **Agendamento:** **Antecedência mínima** (dias úteis), **Dias de operação** (Seg–Dom).
- **Alertas:** antecedência (dias antes) de **CNH do motorista**, **CRLV do caminhão**, **Seguro do caminhão**.
- **Site Público:** **Título do Hero**, **Subtítulo do Hero**, **Texto "Sobre Nós"**.

---

## PARTE 3 — PORTAL DO MOTORISTA (mobile)

Login com papel `motorista` cai em `/motorista`. Fundo escuro (gradiente).

### 3.1 Início (`/motorista`) — DriverHome
Cabeçalho: "Bem-vindo" + nome + botão **Sair**.
- **Sem viagem:** card "Nenhuma viagem hoje" — "Você será notificado quando uma viagem for atribuída." + botão **Ver histórico**.
- **Com viagem:** card com selo **VIAGEM EM ANDAMENTO** ou **VIAGEM PLANEJADA**; **Saída:** data/hora; **Caminhão:** placa; **Próxima parada** (tipo + endereço) com botão de abrir no mapa; botão para abrir a viagem (`/motorista/viagem/:id`).

### 3.2 Viagem em execução (`/motorista/viagem/:id`) — DriverTrip
Cabeçalho: "Viagem" + **Progresso** (x/y paradas). Antes de iniciar: **Checklist de saída** (itens + "Checklist de saída concluído") → botão **Confirmar checklist** (toast "Checklist concluído!").
**Por parada** (Coleta/Entrega/Partida): botão **Confirmar Chegada** (toast "Chegada confirmada!"); depois:
- **Coleta:** botão **Confirmar Coleta** (toast "Parada concluída!").
- **Entrega:** **Comprovante de entrega (assinatura)** — **NF Assinada (obrigatório)** (anexar) + **Assinatura** (assina na tela; "Assinatura capturada"), **Nome do recebedor** ("Quem recebeu a carga"); botão **Confirmar Entrega** (exige NF + assinatura; toast "Assinatura salva!").
**Registrar Ocorrência** (botão): **Tipo** (Avaria na carga / Atraso / Tentativa sem sucesso / Roubo-furto / Acidente / Carga recusada pelo destinatário / Outro), **Descrição** ("Descreva o que aconteceu..."), **Foto (opcional)**; botões **Registrar e continuar** / **Registrar e seguir rota** (toast "Ocorrência registrada!").
**Fluxos especiais (modais):**
- **Destinatário ausente:** "O que fazer com a carga?" → **Tentar novamente amanhã** / **Aguardar instrução do gestor** / **Devolver ao remetente** → **Registrar e seguir rota**.
- **Carga não estava pronta:** "O que aconteceu? (ex: ainda em produção, separação incompleta)" → **Registrar**.
- **Entrega parcial:** **Volumes entregues** ("ex: 8"), **Motivo dos demais** (Carga recusada/Volume errado/Avaria/Outro) → **Registrar entrega parcial**.
**Nota em ocorrência existente:** "Adicionar informação..." + **Enviar**.
Ao final: **Km real** informado; viagem encerra (encerramento financeiro é feito pelo admin).

### 3.3 Histórico (`/motorista/historico`) — DriverHistory
Cabeçalho **Histórico** (voltar). Lista de viagens concluídas do motorista. Vazio: "Nenhuma viagem no histórico.".

---

## PARTE 4 — NOTAS PARA A SIMULAÇÃO DE 30 DIAS

### 4.1 Pré-requisitos de dados (criar nesta ordem)
1. **Configurações → Empresa** (nome, contatos) e **Comercial & Preços** (frete base + alíquota/depreciação) — senão fretes e DRE saem zerados.
2. **Cadastros → Filiais & CDs** (criar ≥2 para habilitar **Transferências**).
3. **Frota → Carretas** (≥2 caminhões com **capacidade** e **dimensões** — necessárias p/ Simulador 3D e ocupação) e **Motoristas** (com **comissão %** p/ acerto).
4. **Usuários:** criar 1 operador e confirmar papéis.
5. **Detalhe do Motorista → Acesso ao app:** criar **login do motorista** (e-mail+senha) para testar o Portal do Motorista.
6. **Financeiro → Fluxo de Caixa:** definir **Saldo em caixa hoje** (lápis) p/ runway/projeção valerem.

### 4.2 Fluxo fim-a-fim recomendado (cobre tudo)
1. **Site:** `/` → enviar **Contato** (gera lead) → `/agendar` (criar pedido público, anotar protocolo) → `/rastrear` (rastrear o protocolo).
2. **Admin → Mensagens:** abrir o lead → **Criar pedido** (vira "convertido").
3. **Admin → Pedidos:** **Novo Pedido** completo (multi-destinatário, itens com NF) → **Confirmar** (frete/forma/data).
4. **Admin → Despacho:** programar pedidos (drag-and-drop ou **Planejar automaticamente**) **ou** **Pedidos → Criar viagem**.
5. **Admin → Viagens:** **Nova Viagem** (testar **comboio** com 2 veículos) → abrir detalhe → **Otimizar rota** → **Iniciar**.
6. **Motorista:** login → abrir viagem → **Checklist** → **Confirmar Chegada/Coleta** → na entrega anexar **NF** + **assinatura** → testar **ocorrência**, **ausente**, **entrega parcial**.
7. **Admin → Viagem:** **Encerrar Viagem** (km, combustível, pedágios, outros gastos) → conferir **acerto/comissão** e **Estimado × Real**.
8. **Admin → Transferências:** criar transferência entre 2 filiais → **Despachar** → **Receber no destino** (com divergência + custo).
9. **Admin → Ocorrências / Replanejamento:** tratar uma ocorrência; pôr um caminhão em manutenção com carga para acionar o Replanejamento.
10. **Admin → Frota → Simulador:** montar carga 3D, ver CG e exportar **Plano de carga**.
11. **Admin → Documentos:** anexar CRLV/CNH e conferir **Vencimentos**.
12. **Admin → Financeiro:** lançar **Receita** e **Despesa**, **Dar Baixa**, ver **DRE** (PDF) e **Fluxo de Caixa**.
13. **Admin → Indicadores:** trocar período e conferir KPIs/tendências/rankings + **Exportar**.
14. **Admin → Usuários / Configurações:** criar usuário, redefinir senha; alterar um preço e usar o **Simulador de frete**; **Exportar config (JSON)**.

### 4.3 Pontos de atenção (não são bugs)
- Telas **admin only** (Financeiro, Indicadores, Usuários, Configurações) não aparecem para o papel **operator**.
- O **valor estimado** de frete depende da tabela de preços estar preenchida.
- O **CT-e/NF-e fiscal** não é emitido de verdade (campos são informativos).
- **Transferências** exige ≥2 filiais; **Simulador 3D** exige carreta com dimensões.

---

> **Fim do mapeamento.** Cobre os 3 domínios, todas as rotas de `App.jsx`, navegação (sidebar/topbar),
> e cada tela com seus títulos, abas, KPIs, campos (label+placeholder), botões e ações exatos.

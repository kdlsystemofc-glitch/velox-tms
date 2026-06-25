# Velox QA Runner — IA que testa o sistema pelo navegador

Um agente **Claude** que testa o Velox TMS **100% pela interface**, dirigindo um navegador real
via **Playwright MCP**. Ele recebe **apenas** ferramentas de navegador + leitura do repositório —
**não tem Bash, banco de dados, API nem fetch**. Por isso ele **não consegue "trapacear"** rodando
SQL/scripts (o que inflou o falso "100%" da rodada anterior): o único caminho até o sistema é a tela.

Ele lê o roteiro **`VELOX_SIMULACAO_30DIAS.md`** (v4) e o mapa **`VELOX_MAPA_SIMULACAO.md`**, executa
o plano, tira **screenshots como evidência** e entrega um **relatório consolidado** no formato §0.3.

---

## Pré-requisitos
- **Node.js 18+**
- Uma **chave da API Anthropic** (`ANTHROPIC_API_KEY`)
- Login **admin** do Velox (obrigatório — é por ele que o agente entra)
- (Opcional) **Google Maps API Key** para testar "Otimizar rota" com distância real

> **Operador e motorista NÃO precisam existir antes.** O agente **cria** esses logins durante o
> pré-voo (Usuários → Novo usuário; e Frota → Motorista → Acesso ao app). No `.env` você só **define
> quais credenciais** ele deve usar ao criar (`OPERATOR_*`, `DRIVER_*`) — assim você fica sabendo;
> se deixar em branco, ele inventa e informa no relatório.

## Antes de rodar: reset do banco (recomendado)
Para a simulação de "30 dias" ter números críveis, comece com o banco limpo. Abra o **SQL Editor do
Supabase** e rode **`qa-runner/db-reset.sql`**. Ele **apaga todos os dados operacionais** (pedidos,
viagens, frota, financeiro, cadastros…) mas **preserva os logins, as configurações e os depoimentos**.
Há um bloco OPCIONAL (comentado) para também remover logins de motorista antigos.

## Instalação
```bash
cd qa-runner
npm install            # instala o SDK, o Playwright MCP e baixa o Chromium
cp .env.example .env   # depois edite o .env com suas credenciais
```
> Se o `postinstall` não baixar o navegador, rode: `npx playwright install chromium`.

## Configuração
Edite **`.env`** (nunca versionado):
- `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (mínimo)
- `OPERATOR_*`, `DRIVER_*` = credenciais que **o agente vai usar ao CRIAR** esses logins (não precisam
  existir; em branco = ele inventa e reporta)
- `GOOGLE_MAPS_API_KEY` (recomendado), `VELOX_URL` (padrão = produção)

> **Importante:** rode contra um ambiente onde criar dados de teste seja aceitável. As **migrations**
> `20260643` e `20260644` precisam estar aplicadas no Supabase, senão as features novas (prioridade,
> aprovação, pedido parado) não aparecem e o agente vai (corretamente) reportar como ausentes.

## Executar
```bash
npm run qa
```
O agente faz streaming no terminal. Ao fim:
- **Relatório**: `qa-runner/reports/qa-report-<timestamp>.md`
- **Evidências (screenshots)**: `qa-runner/reports/artifacts/`

## Por que ele não consegue trapacear
Em `run-qa.mjs`, o agente roda com `disallowedTools` removendo **Bash, Write, Edit, WebFetch,
WebSearch, Task, Glob, Grep**. Sobram **apenas** as ferramentas do **Playwright MCP** (navegador) e a
leitura de arquivos. Sem terminal e sem fetch, é **impossível** falar com o Supabase/REST/SQL — todo
registro e toda verificação acontecem pela interface renderizada. Um teste só "passa" se a tela foi
realmente aberta.

## Ajustes
- `QA_MODEL` (padrão `claude-opus-4-8`) e `MAX_TURNS` (padrão `1500`) no `.env`.
- Para ver o navegador (modo visível p/ depurar), remova `--headless` dos args do Playwright em
  `run-qa.mjs`.
- Uma sessão pode não cobrir os 30 dias inteiros; o prompt manda **priorizar** pré-voo + fluxo
  crítico + as 5 features novas e ir o mais fundo que o orçamento permitir. Rode de novo para
  continuar a cobertura (cada sessão começa do zero, então peça no `.env`/prompt para focar nos dias
  ainda não cobertos, se quiser).

## Notas de versão
Os nomes exatos das ferramentas e opções do **`@anthropic-ai/claude-agent-sdk`** e do
**`@playwright/mcp`** podem mudar entre versões. Se o SDK reclamar de alguma opção
(`disallowedTools`, `mcpServers`, `permissionMode`), ajuste em `run-qa.mjs` conforme a versão
instalada — a ideia central (dar **só** o navegador ao agente) permanece a mesma.

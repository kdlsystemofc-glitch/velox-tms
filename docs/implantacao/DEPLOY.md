# Implantação — Runbook (Velox TMS)

Consolida os avisos de implantação (⚠️) que estavam espalhados no `PLANO-EXECUCAO.md`.
Fonte de verdade da ordem: os arquivos em `supabase/migrations/` (nome = ordem).

## 1. Pré-requisitos
- Projeto **Supabase** (Postgres + Auth + Storage + Realtime).
- Node 18+ (`npm ci`), Supabase CLI (para Edge Functions).
- `.env` do app: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 2. Banco — aplicar migrations (em ordem)
Aplicar **todas** as migrations em `supabase/migrations/` na ordem do nome, no SQL Editor
do Supabase (ou via CLI). São **idempotentes**. Marcos recentes que exigem atenção:

| Migration | Projeto | Após aplicar, testar |
|---|---|---|
| `20260662`–`20260664` | P03 Tarifa versionada | cotação + edição de tarifa (padrão/cliente) |
| `20260665`–`20260666` | P04 Razão financeiro | baixa/estorno/conciliação + aba **Razão** (reconciliação bate) |
| `20260667`–`20260669` | P05 Eventos/Realtime/Jobs | telas ao vivo + "Rodar jobs agora" |
| `20260670`–`20260671` | P06 Automação | faturamento por corte, conciliação auto, notificações |
| `20260672`–`20260673` | P07 Identidade/MFA | login com 2FA + reset por admin |
| `20260674` | P08 Documentos | fila de documentos |
| `20260675` | P09 Fiscal (arquitetura) | painel fiscal (fica `provider_pending` sem provedor) |
| `20260676` | PA-01 Analítico server-side | Análises (views `v_lane_analysis`/`v_client_analysis`/`v_monthly_financials`) — antes da migração, cai no fallback cliente |

Verificação pós-migração: rodar `supabase/verificacoes.sql` (as linhas `RAZAO` devem ficar em 0).

### Backup / recriação em um único arquivo
Para recriar o banco de uma vez (ou guardar um snapshot do schema), use o consolidado
**`supabase/schema_full.sql`** (schema + todas as migrations num único script idempotente).
É **gerado** — regenere após adicionar migrations:
```
npm run db:full        # gera supabase/schema_full.sql
```
Rodar num projeto Supabase novo reconstrói toda a estrutura (não inclui dados;
`seed_simulation.sql` é separado).

## 3. Configurações do painel Supabase (uma vez)
- **Realtime:** habilitar Realtime nas tabelas publicadas (as migrations já as adicionam à `supabase_realtime`).
- **pg_cron:** habilitar a extensão (Database → Extensions) e reexecutar `20260669` para o job diário `velox-daily-jobs`. Sem pg_cron, usar o botão **"Rodar jobs agora"** (Torre de Controle).
- **MFA/TOTP:** habilitar o fator TOTP em Authentication → MFA (necessário para o enroll em `/admin/seguranca`).
- **Storage:** o bucket privado `documents` é criado pela migration `20260674`.

## 4. Edge Functions (deploy)
```
supabase functions deploy render-documents   # P08 — gera/arquiva PDFs no servidor
supabase functions deploy fiscal-emit         # P09 — esqueleto do provedor fiscal (stub)
```
- `verify_jwt` **on** por padrão (só autenticado invoca; a função usa `service_role` internamente).
- `render-documents`: se o bundler não seguir o import para `../src`, copiar
  `src/services/documentModel.js` para `supabase/functions/_shared/` e ajustar o import.

## 5. Build & testes (gate)
```
npm ci
npm run lint
npx vitest run        # 232 testes
npm run build
npx playwright test   # 5 E2E (smoke)
```

## 6. Pendências de decisão de produto (adaptadores adiados)
Não bloqueiam o build; ficam como adaptadores prontos até a decisão:
- **E-mail** (notificações externas P06): implementar o canal `email` em `dispatch_notifications`.
- **Provedor fiscal** (P09): escolher provedor + certificado, preencher `company_settings.fiscal_provider`
  e implementar `emitViaProvider` na Edge Function `fiscal-emit`.
- **Banco/gateway** (boleto/CNAB/PIX): não iniciado.

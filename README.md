# Velox TMS

Sistema de gestão de transportes (TMS) para transporte rodoviário de cargas.
SPA **React 18 + Vite** com backend **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions).

> **Documentação oficial:** ver [`docs/`](docs/README.md).
> **Planejamento/execução:** [`PLANO-EXECUCAO.md`](PLANO-EXECUCAO.md) e [`ROADMAP-ESTRATEGICO.md`](ROADMAP-ESTRATEGICO.md).

## Stack
- **Front:** React 18, Vite, React Router, Tailwind, shadcn/ui, `@tanstack/react-query` v5.
- **Back:** Supabase (Postgres + RLS + RPCs `SECURITY DEFINER`, Auth, Storage, Realtime), Edge Functions (Deno).
- **Testes:** Vitest (unit) + Playwright (E2E smoke).

## Setup local
1. Clonar o repositório e entrar na pasta.
2. `npm ci` (ou `npm install`).
3. Criar `.env.local` com as credenciais do Supabase:
   ```
   VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<sua-anon-key>
   ```
4. Aplicar as migrations do banco — ver [`docs/implantacao/DEPLOY.md`](docs/implantacao/DEPLOY.md).
5. `npm run dev`.

## Scripts
| Comando | O quê |
|---|---|
| `npm run dev` | servidor de desenvolvimento (Vite) |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
| `npx vitest run` | testes unitários |
| `npx playwright test` | testes E2E (smoke) |

## Estrutura
- `src/` — aplicação (páginas, componentes, hooks, serviços, repositórios).
- `supabase/migrations/` — schema/RPCs (fonte de verdade do banco; ordenadas por nome).
- `supabase/functions/` — Edge Functions (`render-documents`, `fiscal-emit`).
- `docs/` — documentação oficial (funcional, arquitetura, implantação, operacional).
- `qa-runner/` — harness de QA (simulação de 30 dias).

## Implantação
Ordem de migrations, deploy de Edge Functions e configurações do painel Supabase
(pg_cron, MFA, Realtime): [`docs/implantacao/DEPLOY.md`](docs/implantacao/DEPLOY.md).

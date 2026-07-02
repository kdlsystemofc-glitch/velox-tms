# Documentação Oficial — Velox TMS

Índice único da documentação. **Fonte de verdade por trilha** — evita a duplicação
que existia antes (múltiplos roadmaps/contextos/simulações na raiz).

## Governança (raiz do repositório)
- [`README.md`](../README.md) — visão geral e setup rápido do projeto.
- [`PLANO-EXECUCAO.md`](../PLANO-EXECUCAO.md) — execução gated (P01–P09), status oficial.
- [`ROADMAP-ESTRATEGICO.md`](../ROADMAP-ESTRATEGICO.md) — roadmap oficial + itens adiados/futuro.

## As 7 trilhas de documentação

| Trilha | Onde | Fonte de verdade |
|---|---|---|
| **1. Técnica** | [`../README.md`](../README.md) | stack, scripts npm, `.env`, deps (`package.json`) |
| **2. Funcional** | [`funcional/`](funcional/) | módulos, perfis, fluxos e **portais** |
| **3. Arquitetura** | [`arquitetura/`](arquitetura/) | camadas, domínios, backbone de eventos, RLS |
| **4. SQL** | `../supabase/` | **migrations** = verdade; `schema.sql` = referência; `verificacoes.sql`/`seed_simulation.sql` |
| **5. APIs** | código | RPCs `SECURITY DEFINER` (`supabase/migrations/*`) + Edge Functions (`supabase/functions/*`) |
| **6. Implantação** | [`implantacao/DEPLOY.md`](implantacao/DEPLOY.md) | ordem de migrations, deploy de functions, pg_cron/MFA/Realtime, `.env` |
| **7. Operacional** | [`operacional/`](operacional/) | runbook, jobs, simulação de 30 dias |

## Conteúdo por pasta

- **funcional/**
  - [`PORTAIS.md`](funcional/PORTAIS.md) — **oficial**: canais de acesso (portais), perfis, fluxos, comunicação.
  - [`INVENTARIO-SISTEMA.md`](funcional/INVENTARIO-SISTEMA.md) — inventário de módulos/telas.
  - [`MAPA-FLUXOS-PERFIS.md`](funcional/MAPA-FLUXOS-PERFIS.md) — fluxos por perfil.
- **arquitetura/**
  - [`ARQUITETURA-FUNCIONAL.md`](arquitetura/ARQUITETURA-FUNCIONAL.md) — arquitetura funcional.
- **implantacao/**
  - [`DEPLOY.md`](implantacao/DEPLOY.md) — runbook de implantação (consolida os avisos ⚠️ do PLANO).
- **operacional/**
  - [`SIMULACAO-30DIAS.md`](operacional/SIMULACAO-30DIAS.md) — roteiro de simulação/QA (ver também `qa-runner/`).
- **historico/** — diagnóstico de referência (não é doc viva):
  - [`RELATORIO-CONSULTORIA.md`](historico/RELATORIO-CONSULTORIA.md) — diagnóstico que originou o PLANO.
  - [`GAP-ANALYSIS-ENTERPRISE.md`](historico/GAP-ANALYSIS-ENTERPRISE.md) — análise de gaps enterprise.

## Notas de fonte de verdade
- **Permissões/SoD:** a autoridade é o **código** — `src/lib/permissions.js` (`can`) + `has_capability` no banco. Documentos descrevem, não definem.
- **Schema do banco:** as **migrations** (`supabase/migrations/*`, ordenadas) mandam; `schema.sql` é snapshot de referência/bootstrap.
- **Adaptadores adiados (decisão de produto):** e-mail (notificações externas), banco/gateway, provedor fiscal — ver `ROADMAP-ESTRATEGICO.md` e as memórias do projeto.

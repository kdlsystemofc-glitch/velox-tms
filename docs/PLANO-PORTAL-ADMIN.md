# Plano de Execução — Portal Administrativo (por projetos)

> Derivado da auditoria do Portal Administrativo (2026-07-02). Recomendações
> agrupadas por **objetivo** (não por categoria). Ordem ideal + backlog ao final.
> Regras permanentes do projeto valem no fechamento de cada PA-XX (doc-sync,
> higiene, revisão multi-skill, gates lint/test/build/E2E).

## Ordem ideal
**Trilha interna (sem bloqueio externo):** PA-01 → PA-02 → PA-04 → PA-05 → PA-03.
**Trilha decisão-gated (paralela, ao sair a decisão de produto):** PA-07 → PA-06.
**Plataforma (porte maior/externo):** PA-08 → PA-09.

---

## PA-01 · Núcleo Analítico Server-side  ·  ✅ CONCLUÍDO (2026-07-02)
- **Objetivo:** mover a computação de KPIs/agregações do navegador para o servidor; telas instantâneas e escaláveis.
- **Problema:** Indicadores/Análises varrem 500–1000 registros no cliente (teto de escala + latência); bundle pesado.
- **Itens:** Agregações no servidor [Essencial] · Isolar Truck3D + bundle [Alta/Baixa] · Report/export mínimo (mantido: `downloadCsv`) [Média] · Performance [Essencial].
- **Entregue:**
  - **Agregações centralizadas + testadas** em `src/utils/analytics.js` (extraídas do inline de `Indicators.jsx`): `computeIndicators`/`computePeriodKpis`/`buildMonthlySeries`/rankings/`tripEconomics`/`leadTimeAvgDays` — 13 testes. `Indicators.jsx` refatorado (memoizado; ~60 linhas inline removidas).
  - **Views server-side** (migration `20260676`): `v_lane_analysis`, `v_client_analysis`, `v_monthly_financials` (`security_invoker`, staff). `Analytics.jsx` consome com **fallback** ao cálculo cliente (seguro pré-migração).
  - **Bundle:** `LoadingSimulator` tornado **lazy** na Frota (chunk próprio de 14 KB); Truck3D já era lazy (484 KB só ao renderizar o 3D).
- **Re-escopo:** **Busca + paginação server-side [Alta] → movida para PA-02** (pertence ao trabalho de listas/produtividade; exige validação em runtime com dados reais).
- **Complexidade:** Alta · **Impacto:** Alto · **Esforço real:** ~1 ciclo.
- **Conclusão (atingida):** agregações via serviço testado + views server-side com fallback; bundle da Frota reduzido; export CSV mantido. 241 testes/lint/build verdes.

## PA-02 · Produtividade Operacional
- **Objetivo:** cortar cliques/tempo do operador na triagem e execução.
- **Problema:** precificar/confirmar exige muitos passos; sem fila pessoal; sem ações rápidas.
- **Itens:** Precificar/confirmar em lote [Essencial] · Fila "minhas pendências" [Alta] · Command palette com ações [Alta] · Edição inline [Média] · **Busca + paginação server-side (herdado do PA-01)** [Alta] · Favoritos/atalhos [Média/Baixa].
- **Dependências:** PA-01 recomendado. **Complexidade:** Média · **Impacto:** Alto · **Esforço:** M.
- **Conclusão:** precificar+confirmar em massa; painel de pendências; Ctrl+K executa ações; edição inline.

## PA-03 · Contrato de API & Documentação Técnica
- **Objetivo:** desacoplar UI do schema e documentar contratos/decisões.
- **Problema:** front chama RPCs direto; trilha de APIs só aponta ao código; sem ADRs.
- **Itens:** BFF/contrato [Alta] · Catálogo de APIs [Alta] · Doc por módulo [Média] · ADRs [Média].
- **Dependências:** nenhuma. **Complexidade:** Média · **Impacto:** Médio · **Esforço:** M.
- **Conclusão:** `docs/apis/` versionado; camada de contrato UI↔RPC; docs por módulo; ADRs.

## PA-04 · Acessibilidade & Consistência de UI
- **Objetivo:** WCAG AA nos fluxos críticos + estados padronizados + IA financeira.
- **Problema:** ~4 `aria-*` no portal; estados vazio/erro inconsistentes; Financeiro denso.
- **Itens:** Acessibilidade [Alta] · Estados loading/empty/erro/sucesso [Média] · Financeiro em subáreas [Média] · Densidade/labels [Baixa].
- **Dependências:** sinergia com PA-02. **Complexidade:** Média · **Impacto:** Médio · **Esforço:** M.
- **Conclusão:** WCAG AA nos fluxos críticos; componentes de estado únicos; Financeiro reorganizado.

## PA-05 · Segurança Operacional (Hardening)
- **Objetivo:** elevar segurança de ações críticas e superfícies públicas.
- **Problema:** MFA só no login; sem rate limit nas RPCs anônimas; sem review de permissões.
- **Itens:** Step-up MFA [Alta] · Rate limiting [Média] · Timeout de sessão [Média] · Review de permissões [Baixa].
- **Dependências:** P07. **Complexidade:** Média · **Impacto:** Médio-Alto · **Esforço:** S-M.
- **Conclusão:** step-up MFA em pagar/aprovar/cancelar; rate limit nas RPCs públicas; timeout; processo de review.

## PA-06 · Fiscal Operacional (CT-e/MDF-e/CIOT) — *decisão-gated*
- **Objetivo:** tornar a arquitetura fiscal (P09) operante na SEFAZ.
- **Problema:** sem provedor+certificado não emite; sem isso não há operação legal.
- **Itens:** Emissão fiscal operacional [Essencial] · Guarda XML/DACTE (P08, feito) · CIOT [Média].
- **Dependências:** provedor fiscal (pago) + certificado (externo/produto); P03/P08.
- **Complexidade:** Alta · **Impacto:** Alto · **Esforço:** L. **Conclusão:** CT-e/MDF-e autorizados homolog+prod; contingência; XML/DACTE.

## PA-07 · Notificação Proativa Multicanal — *decisão-gated*
- **Objetivo:** avisar cliente/operador nos marcos e exceções.
- **Problema:** motor P06 só tem canal in-app; externo adiado.
- **Itens:** Notificação multicanal [Alta] · Envio da fatura [Média].
- **Dependências:** provedor de e-mail/WhatsApp (externo); P06.
- **Complexidade:** Média · **Impacto:** Alto · **Esforço:** S-M. **Conclusão:** ≥1 canal externo; marcos + ocorrências + fatura notificados.

## PA-08 · Roteirização Otimizada & Rastreamento Real — *provider-gated*
- **Objetivo:** otimizar rotas e rastrear de verdade (ETA dinâmico, torre prescritiva).
- **Problema:** roteirização heurística/manual; sem GPS/telemetria; Torre reativa.
- **Itens:** VRP [Alta] · GPS/telemetria + geofence [Alta] · Torre prescritiva/ETA [Média].
- **Dependências:** provedores de mapa/roteamento + telemetria (Projetos 10/12); PA-01.
- **Complexidade:** Alta · **Impacto:** Alto · **Esforço:** XL. **Conclusão:** rotas otimizadas; posição real; ETA dinâmico; recomendações na Torre.

## PA-09 · Multimodal (Aéreo/Ferroviário) — *futuro/baixa*
- **Objetivo:** suportar modais além do rodoviário. **Itens:** Multimodal [Baixa].
- **Dependências:** tarifa/documentos por modal. **Complexidade:** Alta · **Impacto:** Baixo-Médio · **Esforço:** L.

---

## Product Backlog (épicos = projetos)
Sequenciamento por releases: **R1** PA-01 + início PA-03 · **R2** PA-02 + PA-04 · **R3** PA-05 + fim PA-03 · **R-gated** PA-07 → PA-06 · **R-plataforma** PA-08 → PA-09.

Detalhe completo dos itens/prioridade/esforço: ver a auditoria de origem em `docs/historico/`.

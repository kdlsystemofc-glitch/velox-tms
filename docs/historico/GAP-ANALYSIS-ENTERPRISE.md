# 🔍 Gap Analysis — Velox TMS × TMS Enterprise

> Comparação do **produto como um todo** (não só o código) com um TMS Enterprise
> de mercado, derivada dos documentos das etapas anteriores
> (`INVENTARIO-SISTEMA.md`, `ARQUITETURA-FUNCIONAL.md`, `MAPA-FLUXOS-PERFIS.md`).
>
> **Esta etapa apenas identifica diferenças. Não contém propostas de
> implementação.**
>
> Gerado em 2026-06-30 (skills aplicadas: `vibe-code-auditor`, `ui-review`,
> `ux-audit`, `redesign-existing-projects`, `ui-ux-designer`).
> Referências de mercado consideradas: SAP TM, Oracle OTM, MercuryGate,
> Manhattan, Blue Yonder; no Brasil ESL, TOTVS/Microsiga, Senior, Brudam,
> Datamex, e marketplaces (Fretebras, TruckPad).

---

## Contexto da comparação
O Velox cobre bem o **ciclo operacional nacional rodoviário** (pedido → despacho
→ viagem → entrega → financeiro), com portais de cliente/parceiro, rastreio e
conciliação. Um TMS Enterprise adiciona camadas de **otimização, compliance
fiscal, integração corporativa, automação e governança** que abaixo aparecem
como lacunas.

---

## 1. Funcionalidades ausentes
- **Motor de tarifação (rating engine):** existe tabela de frete por cliente, mas não há motor de tarifas com **contratos por lane, faixas de peso/cubagem, acessoriais, tabela de combustível (fuel surcharge), generalidades, sazonalidade**. Enterprise calcula contrato × spot e versiona tabelas.
- **Cotação como processo comercial:** há cotação pública, mas sem **funil de cotação** (proposta → negociação → aprovação → contrato), histórico de versões, validade, conversão em pedido.
- **Consolidação/otimização de carga e modais:** não há **consolidação automática (pooling/continuous moves)**, LTL/FTL real, intermodal (rodo+cabotagem/aéreo), nem seleção de modo por custo/serviço. Há roteirização heurística e simulador 3D, mas não um **otimizador de rede/VRP com janelas** de nível enterprise.
- **Gestão de devoluções / logística reversa / sinistros (claims):** ausente como módulo (avarias, faltas, indenização, processo de sinistro com workflow).
- **Gestão de pátio/doca/agendamento (yard & dock appointment):** sem agendamento de docas, janelas de carga/descarga, fila de pátio.
- **Gestão de contratos e SLA contratual:** SLA existe para ocorrências; falta **SLA contratual por cliente/lane** com penalidades e medição de OTIF.
- **Scorecard de transportadoras:** subcontratação existe, mas sem **avaliação de parceiro** (pontualidade, avarias, aceitação), ranking, alocação por desempenho.
- **Pricing/freight quote no portal:** o portal cria pedido, mas não cota/contrata com regras tarifárias.

## 2. Módulos ausentes
- **Fiscal/Documentos eletrônicos (Brasil):** há `nfeUtils`/`nfeXml` (utilitários), mas **não há emissão/integração de CT-e e MDF-e com a SEFAZ**, nem **CIOT, vale-pedágio (ANTT), averbação de seguro**. Para um TMS Enterprise BR isso é núcleo.
- **Freight Audit & Payment (auditoria de frete):** conciliação bancária existe; falta **auditoria automática da fatura do transportador** (3-way match: contratado × executado × cobrado), accruals e settlement.
- **BI/Analytics dedicado:** há Indicadores/DRE/Fluxo, mas não um **módulo analítico** (freight spend, custo por lane/cliente/rota, OTIF, predição de ETA, benchmarking).
- **Control Tower / gestão de exceções centralizada:** alertas e ocorrências existem isolados; falta uma **torre de controle** unificada com eventos, exceções e ação proativa.
- **WMS/cross-dock operacional:** há simulador de carregamento; não há gestão de armazém/estoque/cross-dock real.
- **Gestão documental (DMS):** documentos da empresa e uploads existem; falta **repositório de documentos de transporte com OCR, validade, versionamento e vínculo fiscal**.

## 3. Automações ausentes
- **Motor de notificações (e-mail/SMS/WhatsApp/push):** hoje só **toasts in-app + tabela `alerts`**. Não há notificação proativa a cliente/motorista/parceiro por canais externos (documentado como futuro no roadmap).
- **Tendering/leilão automático de frete:** oferta é manual a um parceiro por vez; falta **roteamento automático de oferta** (waterfall por tarifa/scorecard, leilão simultâneo).
- **Faturamento automático:** faturamento mensal é manual; falta **job agendado** que fecha faturas por regra (corte/cliente).
- **Status automático por telemetria:** o status depende de ação manual (motorista/parceiro); falta **atualização automática por geofence/telemetria** (chegada/saída, POD automático).
- **Workflows de exceção:** sem **regras automáticas** (escalonamento, reatribuição, replanejamento sugerido) — hoje é decisão manual.
- **Jobs/agendador e eventos:** arquitetura é **request/response + polling (20s)**; sem fila/eventos/cron para automações assíncronas.

## 4. Integrações ausentes
- **ERP (SAP/TOTVS/Oracle/Senior):** sem integração contábil/fiscal/financeira com ERP corporativo.
- **EDI (X12/EDIFACT) e APIs de parceiros:** sem troca eletrônica padronizada com embarcadores/transportadores.
- **SEFAZ / e-fiscal:** sem CT-e/MDF-e/NF-e transacional (item 2).
- **Telemetria/rastreadores (Sascar, Omnilink, etc.) e marketplaces (Fretebras, TruckPad):** rastreio é via GPS do app próprio; sem integração com rastreadores embarcados nem bolsas de carga.
- **Roteirização/mapas enterprise (HERE, Google Directions com tráfego/pedágio):** Google é opcional e o mapa usa OSM; sem cálculo de pedágio/tempo com tráfego real, restrições de veículo.
- **Gateways de pagamento / bancos (CNAB, PIX, boleto):** conciliação importa OFX/CSV, mas não há **emissão de boleto/CNAB, baixa por retorno bancário, PIX**.
- **SSO / diretório corporativo (SAML/OIDC):** autenticação é Supabase Auth (e-mail/Google); sem SSO empresarial/SCIM.

## 5. Processos incompletos
- **Ciclo financeiro do parceiro (acerto/pagamento):** subcontratação registra valor combinado, mas o **pagamento ao parceiro** (fatura do terceiro, auditoria, repasse) não fecha o ciclo.
- **Faturamento ↔ recebimento ↔ conciliação:** os três existem, porém a baixa concilia **receita/despesa** e não a **fatura/boleto** diretamente (documentado como futuro).
- **Onboarding de parceiro/cliente:** há cadastro + aprovação, mas sem **qualificação documental** (CNPJ/ANTT/seguro/validade) nem fluxo de compliance.
- **Gestão de pedido público anônimo:** cria `orders` sem vínculo forte de cliente/qualificação — processo de triagem/aprovação existe, mas a origem anônima é um ponto de entrada amplo.

## 6. Fluxos incompletos
- **Exceções do motorista → resolução:** o app registra parcial/ausente/carga não pronta/ocorrência, mas o **fluxo de resolução** (reentrega, reagendamento, tratativa comercial) não é formalizado ponta a ponta.
- **Devolução/reentrega:** sem fluxo dedicado de reverse logistics.
- **ETA e milestones ao cliente:** rastreio mostra posição, mas **sem ETA calculado, marcos (coletado/em rota/saiu para entrega) e notificação** correspondente.
- **Aprovação financeira (alçadas):** faturar/pagar/cancelar fatura não tem **níveis de alçada/aprovação** (segregação de funções).

## 7. Permissões inadequadas (em relação a enterprise)
- **RBAC de granularidade grossa:** só 5 papéis fixos (`admin/operator/motorista/client/carrier`); sem **papéis customizáveis, permissões por funcionalidade/campo, multi-filial por usuário**.
- **Sem segregação de funções (SoD) no financeiro:** quem fatura pode pagar/cancelar; enterprise separa lançar × aprovar × pagar.
- **Operator amplo:** operator acessa toda a operação e cadastros sem escopo por filial/cliente/região.
- **Sem MFA/SSO e política de senha corporativa.**
- **Trilha de auditoria parcial:** há `status_history`/eventos por entidade, mas não um **audit log central imutável** de todas as ações por usuário.
- **Entrada anônima de pedidos** (público/`/agendar`) amplia a superfície de confiança.

## 8. Oportunidades de melhoria operacional (diferenças)
- **Torre de controle única** com exceções priorizadas (hoje espalhadas em Central/Alertas/Ocorrências).
- **Otimização automática** de carga/rota/modo (hoje manual/heurística).
- **OTIF e indicadores de nível de serviço** por cliente/lane (hoje DRE/indicadores genéricos).
- **Automação de comunicação** com cliente/motorista (hoje manual/in-app).
- **Programação de docas/janelas** para reduzir espera (estadia é medida, não prevenida).

## 9. Problemas de UX
- **Dois sistemas de design coexistentes:** admin usa **tokens semânticos + dark mode**; os portais (cliente/parceiro) e app motorista usam **paleta clara fixa** (`bg-gray-50`, cinzas hardcoded). Inconsistência visual entre áreas.
- **God-components** ainda presentes (`NewOrder`, `OrderWorkspace`, `BookingForm` ~1.2k linhas) afetam manutenibilidade e consistência de interação.
- **Estados de feedback desiguais:** portais já têm loading/empty/error; várias telas admin dependem de spinners genéricos, sem skeletons padronizados (cobertura parcial de loading/empty/error/sucesso).
- **Densidade e navegação:** admin com navegação por áreas no topo (boa para hub-and-spoke), mas fluxos longos (pedido/viagem) concentram muita ação numa só tela.
- **Acessibilidade não verificada:** sem evidência de foco/teclado/contraste/aria validados (a `ui-visual-validator` exigiria prova visual — ausente).
- **Sem 404 branded/erros globais ricos, sem skip-link, sem consentimento/LGPD** no público.

## 10. Inconsistências entre módulos
- **Status de fatura** foi centralizado (`invoiceStatusConfig`), mas **outros chips de status** ainda têm cores locais espalhadas (≈30 arquivos com cores hardcoded no inventário).
- **Baixa financeira:** conciliação atua em `revenues`/`expenses`; `invoices` têm `pay_invoice` próprio — **dois caminhos de baixa** que não se cruzam.
- **Camada de acesso mista:** parte via `base44.entities` (CRUD direto + RLS), parte via **RPCs** `SECURITY DEFINER`; regra de quando usar cada um não é uniforme.
- **Tema:** dark mode só no admin; portais claros — divergência de marca.

## 11. Riscos arquiteturais
- **Single-tenant por design:** `company_settings` é linha única; isolamento por empresa inexistente (multi-tenant adiado por decisão de produto) — limita oferta SaaS.
- **Acoplamento via tabelas compartilhadas:** domínios se comunicam pelo banco; **sem contratos de evento/serviço** — mudança de schema propaga risco amplo.
- **Lógica de negócio no front:** processos críticos (encerramento, frete, despacho) vivem em componentes React; parte é protegida por RPCs transacionais, mas há **regras no cliente** (risco de divergência/bypass).
- **base44 com fallback a "Edge Function não implementada":** caminho previsto e não construído (ponto frágil documentado).
- **Migrations aplicadas manualmente:** sem pipeline de migração versionada automatizada; risco de drift entre código e banco (3 migrations pendentes hoje).
- **Cobertura de testes limitada:** testes só de utils + smoke E2E; **fluxos críticos sem teste** (risco de regressão).

## 12. Limitações para escalabilidade
- **Polling de 20s** para rastreio/mapa (sem realtime/eventos) — custo e latência crescem com volume.
- **Listas com `.list(..., 500/1000)`** e filtragem no cliente em vários módulos — não paginado/server-side; degrada com massa de dados.
- **Sem fila/processamento assíncrono** para jobs (faturamento, notificações, auditoria) — tudo síncrono no request.
- **Sem observabilidade** (logs estruturados, métricas, tracing, alertas de produção).
- **Sem multi-tenant/multi-filial real** para crescer em clientes/operações isoladas.
- **PDFs/3D no cliente** (jsPDF/Three) — pesado no navegador para grandes volumes/documentos em lote.

---

## Síntese das diferenças
O Velox está posicionado como **TMS operacional sólido para transporte rodoviário
nacional** (operação + portais + financeiro básico + rastreio + subcontratação +
conciliação). As diferenças para um **TMS Enterprise** concentram-se em:

1. **Compliance fiscal eletrônico** (CT-e/MDF-e/SEFAZ, CIOT, vale-pedágio).
2. **Motor de tarifação e auditoria de frete** (rating + freight audit & pay).
3. **Otimização e automação** (rota/carga/modo, tendering, notificações, jobs).
4. **Integrações corporativas** (ERP, EDI, telemetria, bancos/CNAB/PIX, SSO).
5. **Governança** (RBAC granular, segregação de funções, auditoria, LGPD).
6. **Escalabilidade** (multi-tenant, eventos/realtime, paginação, observabilidade).

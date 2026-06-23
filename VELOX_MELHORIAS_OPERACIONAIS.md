# Velox TMS — Melhorias Operacionais (Ondas 0–8)

> Registro de cada problema identificado pelo dono da operação, com o mapa **como era → como ficou**
> e a confirmação **problema → solução**. Implementado em ondas, por impacto operacional real.

Legenda de origem: `S#` = Situação do Bloco 1 · `B2/B3/B4` = Blocos 2/3/4 · `5.x` = Bloco 5.

---

## ONDA 0 — Correção crítica

### 🐞 Bug: encerrar viagem quebrava o sistema

**Como era:**
Ao clicar em "Encerrar Viagem", o código chamava `drivers.find(...)` para calcular a comissão,
mas a lista de motoristas nunca era carregada naquela tela. Resultado: `ReferenceError` —
a viagem **não encerrava**, não gravava custo/lucro, não lançava as despesas de combustível/
pedágio/comissão e não concluía os pedidos. Tudo travava.

**Como ficou:**
A tela da viagem agora carrega os motoristas (`useQuery ["drivers"]`). O encerramento calcula a
comissão corretamente, grava lucro líquido, lança as despesas e conclui os pedidos da viagem.

**Problema → Solução:** Encerramento de viagem travado → consulta de motoristas adicionada;
fluxo de acerto (Fase 6) volta a funcionar de ponta a ponta.

---

## ONDA 1 — Exceções que acontecem toda semana

### S12 — A entrega foi parcial

**Como era:** O motorista só tinha "Confirmar Entrega" (tudo ou nada). Se o cliente
recebia 8 de 10 volumes, não havia como registrar — ou marcava tudo entregue (errado)
ou nada.

**Como ficou:** No app, na parada de entrega, botão **"Entrega parcial"**: informa
quantos volumes foram entregues e o motivo dos demais (recusado / avaria / volume errado).
O pedido fica **"Entrega parcial"**, o destinatário fica marcado como parcial com o número
de volumes, abre uma ocorrência automática e o gestor é avisado do que voltou.

**Problema → Solução:** Não dava para registrar entrega incompleta → fluxo de entrega
parcial no app + status próprio + ocorrência + alerta ao gestor.

### S13 — O destinatário não estava no local

**Como era:** Só existia a ocorrência genérica "tentativa sem sucesso", sem decidir o
destino da carga e sem acompanhamento.

**Como ficou:** Botão **"Destinatário ausente"** pergunta o que fazer: **tentar amanhã**
(agenda nova tentativa automática para o dia seguinte), **aguardar instrução** ou
**devolver ao remetente**. Registra a tentativa no histórico do destinatário, abre
ocorrência, avisa o gestor e o motorista pode pular a parada e seguir a rota.

**Problema → Solução:** Ausência do destinatário sem tratamento → opções de destino da
carga + nova tentativa automática + contador de tentativas pendentes para o gestor.

### S5 — A carga não estava pronta quando o motorista chegou

**Como era:** Não havia botão para isso. O motorista ficava sem ação.

**Como ficou:** Na coleta, botão **"Carga não estava pronta"**: registra a hora da chegada
(automática) e o que aconteceu. O pedido fica **"Aguardando liberação de carga"**, abre
ocorrência e o gestor é alertado. O motorista segue para a próxima parada e pode voltar
depois que a carga estiver pronta.

**Problema → Solução:** Carga não pronta sem registro → botão dedicado + status especial
+ alerta + possibilidade de retornar.

### S1 + B4-A — O caminhão programado quebrou

**Como era:** Caminhão ia para "manutenção" e nada acontecia. O gestor tinha que entrar
em cada pedido/viagem manualmente para trocar de veículo.

**Como ficou:** Nova tela **Replanejamento** (no menu e no Painel). Caminhão em
manutenção/inativo com carga aparece com **todos os pedidos e viagens afetados**, a lista
de **caminhões disponíveis com espaço livre (kg)** e um botão **"Redistribuir tudo"** que
move tudo para o substituto de uma vez. Aparece também um aviso no Painel de Operações.

**Problema → Solução:** Quebra de caminhão sem reação automática → detecção + tela de
replanejamento + redistribuição em massa com 1 clique.

### S2 + B4-B — O motorista faltou

**Como era:** Viagens ficavam órfãs sem destaque; reatribuição uma a uma.

**Como ficou:** No Painel, card **"N viagens sem motorista hoje"**. Na tela de
Replanejamento, o motorista ausente/afastado mostra suas viagens e um seletor de
**motorista substituto** (marca quem está livre × já em viagem) com **"Reatribuir viagens"**
em massa.

**Problema → Solução:** Motorista ausente sem fila clara → card no Painel + reatribuição
em massa por substituto disponível.

### S10 + B4-C — Cliente cancelou com viagem em andamento

**Como era:** Cancelar só estornava a receita. A parada continuava no roteiro do motorista
e não havia cobrança pelo deslocamento perdido.

**Como ficou:** Ao cancelar um pedido que está em viagem ativa, o sistema avisa que a
parada será removida e pergunta a **taxa de deslocamento improdutivo** (vira receita a
cobrar). A parada do motorista é marcada como **"pular"**, a receita prevista da viagem é
recalculada e um evento avisa o motorista para seguir a rota.

**Problema → Solução:** Cancelamento em viagem sem tratamento → remoção da parada +
recálculo da viagem + taxa improdutiva + aviso ao motorista.

### S4 — O endereço de entrega mudou depois da viagem criada

**Como era:** Não dava para alterar o endereço de um destinatário pela tela do pedido, e
nada chegava ao motorista.

**Como ficou:** Botão **"Alterar endereço"** em cada destinatário (com busca por CEP). Se o
pedido já tem viagem, ao salvar o sistema **atualiza a parada do roteiro**, registra um
aviso ("a rota do motorista foi atualizada") e o motorista vê o **novo endereço destacado**
no app ("Endereço de entrega ATUALIZADO").

**Problema → Solução:** Mudança de endereço sem propagação → edição com sincronização da
parada + destaque no app do motorista + alerta.

---

## ONDA 2 — Inteligência do despacho

### S7 + B2-A — A carga não coube por tamanho, não por peso

**Como era:** O despacho só somava o **peso**. Caixas grandes e leves "estouravam" o
baú sem o sistema perceber.

**Como ficou:** Cada caminhão usa **comprimento × largura × altura** (já no cadastro) para
o volume interno (m³); cada item gera volume pelo tamanho. No quadro, cada célula tem
**duas barras: peso e volume**. Ao programar, o sistema bloqueia se o **volume** estourar,
mesmo dentro do peso.

**Problema → Solução:** Só media peso → passou a medir peso **e** espaço físico (m³) com
indicador duplo e bloqueio por volume.

### S6 + B2-B — Destinatário só recebe em horários específicos

**Como era:** Não havia onde registrar a janela; entregas eram programadas às cegas.

**Como ficou:** Campo **"Janela de recebimento"** (dias da semana + horário) no cadastro do
cliente e no destinatário do pedido. Ao programar para um dia fora da janela, o despacho
**avisa** antes de confirmar.

**Problema → Solução:** Sem janela de recebimento → campo configurável + aviso ao
programar fora do dia aceito.

### B2-C — Pedidos urgentes primeiro

**Como era:** A separação automática ordenava por região e peso; urgente competia igual.

**Como ficou:** O motor aloca **todos os urgentes primeiro** e só depois distribui os
normais no espaço restante.

**Problema → Solução:** Urgente sem prioridade → urgentes alocados antes de tudo.

### S3 + B4-D — Surgiu uma coleta urgente

**Como era:** Para um pedido urgente, o gestor ia ao despacho procurar espaço na mão.

**Como ficou:** No pedido urgente confirmado, card **"Urgente — encaixe rápido"** mostra os
caminhões com **espaço livre (kg) hoje e amanhã** e, em **1 clique**, programa o pedido
naquele caminhão/dia — sem abrir o despacho. Verde = cabe o peso do pedido.

**Problema → Solução:** Urgente sem visão de capacidade → sugestão de caminhões com espaço
nos próximos 2 dias + encaixe direto.

### S8 — Dois destinatários na mesma região

**Como era:** Pedidos próximos podiam cair em caminhões diferentes sem aviso.

**Como ficou:** Na fila do despacho, pedidos para a **mesma cidade+bairro** ganham o selo
**"Mesma região"**, e o motor prioriza colocá-los no mesmo caminhão.

**Problema → Solução:** Sem visão de proximidade → selo "Mesma região" + agrupamento no
automático.

### S9 — O caminhão vai voltar vazio

**Como era:** Terminava as entregas e voltava vazio, mesmo havendo coleta na região.

**Como ficou:** Quando **todas as entregas** da viagem terminam, o detalhe da viagem mostra
**"Aproveitar o retorno?"** com as coletas pendentes na mesma cidade e um botão
**"Adicionar à viagem"** que insere a coleta no roteiro.

**Problema → Solução:** Retorno vazio → sugestão de backhaul + inclusão da coleta na viagem.

### B2-D / B2-E — Explicar as sugestões e os não-alocados

**Como era:** A separação automática só dizia "X não couberam", sem motivo nem raciocínio.

**Como ficou:** Cada pedido alocado mostra **por que** ("urgente — alocado primeiro",
"mesma região já neste caminhão", "caminhão com mais espaço para Curitiba"). Cada
não-alocado mostra o **motivo específico** ("nenhum caminhão tem capacidade para 12.000 kg
na coleta de 15/06").

**Problema → Solução:** Sugestão opaca → explicação por pedido + motivo detalhado de
não-alocação.

---

## ONDA 3 — Central de Ocorrências com fluxo completo (Bloco 3)

### Como era

O motorista registrava uma ocorrência (tipo, descrição, foto) e ela **sumia para ele**.
O gestor via dentro de cada pedido, com um único botão "Resolver" — sem responsável, sem
plano de ação, sem registrar notificação ao cliente/seguro, sem linha do tempo e sem visão
única de tudo o que estava aberto.

### Como ficou

Nova página **Ocorrências** (menu + Painel), com tudo numa torre só:

- **F1 — Registro:** tipos ampliados (avaria, atraso, ausente, **carga não pronta**,
  **entrega parcial**, roubo, acidente, recusada, outros). O motorista passou a **ver as
  ocorrências em aberto** da viagem no app e **adicionar informações** durante o percurso.
- **F2 — Tratativa do gestor:** lista **ordenada por gravidade** (roubo/acidente no topo,
  atraso por último). Para cada uma: **responsável**, **plano de ação**, **prazo**, marcar
  **cliente notificado** (com data/hora), **acionar seguro**.
- **F3 — Acompanhamento:** **linha do tempo** com registro, tratativa, notificação, notas
  e resolução. Gestor e motorista adicionam notas a qualquer momento.
- **F4 — Resolução:** registra como foi resolvida, calcula o **tempo total de resolução** e
  guarda no histórico do pedido/cliente.

**Problema → Solução:** Ocorrência sem fluxo (sumia e travava) → central única por
gravidade, com responsável, plano, notificação, seguro, prazo, linha do tempo, resolução
cronometrada e acompanhamento pelo motorista.

---

## ONDA 4 — Recursos de grandes TMS (Bloco 5) + Modelos (S11)

### 5.1 — Autofill inteligente no pedido
**Como era:** Selecionar o cliente só preenchia o remetente. **Como ficou:** aparece "Este
cliente tem N pedidos anteriores", com **destinatários frequentes** em chips (1 clique
adiciona) e o **valor médio declarado** como referência.
**Problema → Solução:** Preenchimento cego → sugestões a partir do histórico do cliente.

### 5.6 — Histórico de preço por cliente
**Como era:** Só dava para ver protocolo + status. **Como ficou:** aba **"Histórico de
preços"** no cliente, com cada pedido em ordem (peso, valor declarado, frete e **R$/kg**),
média de R$/kg e marcação ▲/▼ de quem ficou **>30% fora da média**.
**Problema → Solução:** Sem comparação de preço → tabela de R$/kg por pedido com desvio.

### 5.5 — Custo e margem real por viagem
**Como era:** Ao encerrar, só registrava lucro líquido. **Como ficou:** o resumo da viagem
mostra **margem (R$ e %)** e **custo por km rodado**, além de receita e custos.
**Problema → Solução:** Sem leitura de rentabilidade → margem % e custo/km por viagem.

### S11 — Modelos de pedido salvos
**Como era:** Só "Repetir último pedido". **Como ficou:** **"Salvar como modelo"** (com nome,
ex.: "Remessa mensal Curitiba") e **"Usar modelo"** reaplicam remetente, destinatários, tipo
de carga e valores. Serve para cliente recorrente e uso interno.
**Problema → Solução:** Sem modelos nomeados → biblioteca de modelos reutilizáveis.

### 5.9 — Rastreamento com linha do tempo detalhada
**Como era:** Timeline só dos 5 status. **Como ficou:** além dos marcos, um **histórico
detalhado** com **todos os eventos** (inclusive ocorrências e notas), cada um com **hora
exata**, e status por destinatário.
**Problema → Solução:** Rastreio resumido → linha do tempo completa com horários.

### 5.3 — Fator de cubagem por rota e por pedido
**Como era:** Fator de cubagem só global. **Como ficou:** pode ser definido **por corredor**
(tabela de rotas) e **por pedido** (campo no financeiro do pedido). Prioridade: pedido >
rota/cliente > global > 6.000.
**Problema → Solução:** Cubagem única → fator ajustável por rota e por pedido.

### 5.4 — Aging de recebíveis no padrão TMS
**Como era:** Faixas genéricas. **Como ficou:** **Vence hoje · ≤7 dias · 8–30 · 31–60 ·
venceu <30d · venceu >30d**, cada faixa clicável com total e recebimento ali mesmo.
**Problema → Solução:** Aging impreciso → faixas exatas do padrão pedido.

### 5.7 — Romaneio completo
**Como era:** Romaneio sem telefone/CEP/valor de seguro e com uma assinatura só. **Como
ficou:** cada parada traz **CEP, telefone, NFs, volumes, peso e valor declarado (seguro)** e
uma **linha de assinatura de recebimento por parada**; o rodapé soma peso e **valor total
declarado** da viagem.
**Problema → Solução:** Romaneio incompleto → todos os campos de uma transportadora
profissional + assinatura por parada.

### 5.2 — Vigência de tabela (observação)
A vigência **por corredor** (início/fim) já existe e é aplicada pela data do pedido. O
versionamento com histórico da **tabela base** fica como evolução futura (não-bloqueante).

### Itens deixados para decisão de negócio
- **5.10 Pedágio por eixo** — o cálculo é grátis, mas depende da **tabela ANTT** por eixo.
- **5.8 Portal do cliente com login** — viável sem custo, mas é um módulo próprio; sugerido
  tratar à parte. O rastreio público já cobre consulta por protocolo/CT-e/NF.

---

---

## ONDAS 5–8 — Rumo ao nível enterprise

Após o dono apontar que o sistema, embora funcional, ainda não tinha a **profundidade** dos
grandes TMS, fizemos um diagnóstico honesto dos 18 módulos enterprise e abrimos 4 ondas.

### Onda 5 — Profundidade de cadastros e tabelas
- **Janela com pausa (almoço)** — o ponto que o dono notou: a janela agora é
  `{dias, início, fim, pausa_início, pausa_fim}` e o sistema respeita o intervalo.
- **Janela de coleta** separada da de entrega no cadastro do cliente.
- **Nome fantasia** e **limite de crédito** do cliente (com card de exposição vs limite no pedido).
- **Taxas faltantes**: taxa de entrega, **TRT por NF**, espera (R$/h), devolução, emergência (%) —
  configuráveis e somadas ao frete; cobranças avulsas por pedido (espera/devolução/emergência).
- **SLA no prazo**: prazo previsto (coleta + dias úteis do destino) × entregue; selo
  **No prazo / Em risco / Atrasado** no pedido.
- **Indicadores** (`/admin/indicadores`): coletas/entregas, **OTD**, frota disponível/em viagem,
  **ocupação da frota**, faturamento e **margem operacional** do mês.
- **Centro de custos** nas despesas.

**Problema → Solução:** Cadastros/tabelas rasos e sem SLA/indicadores → janela com pausa,
crédito, taxas completas, SLA e torre de KPIs.

### Onda 6 — Destinatários como cadastro próprio
Entidade independente (`recipients`): fixo/eventual, endereço, **janela de recebimento**,
vínculo opcional ao cliente. Nova aba em Cadastros e busca priorizada na criação do pedido.

**Problema → Solução:** Destinatário só existia dentro do pedido → cadastro reutilizável próprio.

### Onda 7 — Múltiplos veículos/motoristas por viagem (comboio)
A viagem deixou de ser 1 caminhão + 1 motorista: agora tem um **comboio** (`vehicles`),
capacidade somada, **paradas atribuíveis a cada veículo** e **comissão por motorista**
calculada sobre a receita do seu veículo.

**Problema → Solução:** Viagem mono-veículo → comboio com acerto individual por motorista.

### Onda 8 — Transferências e cross-docking
**Filiais & CDs** (`branches`) + **Transferências** (`transfers`): movimentação entre
unidades, **troca de veículo/motorista**, status **"Em transferência"** no rastreio e
**entrada no CD → liberação para nova rota** (o pedido volta à fila com origem no CD).

**Problema → Solução:** Sem filiais/cross-docking → módulo de transferências com
rastreabilidade e re-roteirização a partir do CD.

---

## Onde o sistema está agora (vs. checklist enterprise dos 18 itens)
Fechados nas Ondas 5–8: destinatário-entidade, multi-veículo, cross-docking, janela com
pausa, crédito, taxas, SLA, indicadores, centro de custos.
**Ainda fora (decisão/custo):** portal do cliente com login (5.8), roteirização real por
estrada (API), pedágio ANTT por eixo (5.10), fiscal SEFAZ (CT-e/MDF-e). Versionamento da
tabela-base de preços segue como evolução (a vigência por corredor já existe).

---

---

## ROBUSTEZ (item 1) — confiabilidade de engenharia

> O dono perguntou se estava no nível de um TMS profissional. Resposta honesta: na
> amplitude/UX sim; na **robustez de engenharia** ainda não. Início do fechamento dessa
> lacuna (tudo **custo zero**):

- **Rede de segurança (testes):** suíte **Vitest** com 38 testes da lógica de negócio
  (frete, cubagem, taxas, vigência, separação, janela com pausa, SLA, ocorrências,
  replanejamento, distância). Rode com `npm test`. Pega regressão antes de chegar em produção.
- **Encerrar viagem ATÔMICO:** a operação com mais gravações virou **uma transação no
  servidor** (`close_trip` no Postgres) — ou grava tudo, ou nada. A matemática continua no
  JS testado; a função só aplica. Há **fallback** para o caminho antigo se a migration não
  foi aplicada (não quebra nada).
- **Geocodificação (Google Maps):** atrás da chave que já existe em Configurações
  (`google_maps_api_key`). "Otimizar rota" passa a usar **distância geográfica real** quando
  há chave (heurística por CEP sem chave); botão **"Google Maps"** abre a rota (URL, custo
  zero). Sem chave configurada = **R$ 0**.

- **Operações críticas atômicas (completo):** além de encerrar viagem, agora **confirmar
  pedido**, **cancelar (com viagem)**, **receber transferência** e **replanejar
  (redistribuir caminhão / reatribuir motorista)** também rodam como transação no servidor
  (`confirm_order`, `cancel_order`, `receive_transfer`, `redistribute_truck`,
  `reassign_driver`), todas com fallback para o caminho antigo.

**Ainda falta (mesma linha, quando quiser):** ampliar os testes para componentes de tela
(hoje a suíte cobre a lógica pura de negócio).

---

---

## AUDITORIA — correções (jun/2026)

Revisão geral do código. Corrigido:
- **A1** — `/admin` e `/admin/viagens/:id` agora exigem papel (OperatorRoute); usuário pendente/motorista não acessa mais o Painel.
- **A2** — encerrar viagem **não sobrescreve** estados de exceção (entrega parcial / aguardando carga / falhou); só conclui quem estava em coleta/trânsito (cliente + `close_trip`).
- **A3** — geocodificação migrada para o **Geocoder do Maps JS API** (funciona no navegador com a chave restrita por referenciador; o web service dava CORS).
- **M1** — detalhamento do frete passou a listar coleta/entrega/TRT/adicional urgente/cobranças avulsas (a soma agora bate com o total).
- **M2** — `close_trip` com cast seguro de valores; cliente filtra linhas de custo vazias.
- **M3** — Indicadores (faturamento/margem) restritos a admin.
- **M4** — Despesas com `useMutation` real (trava de duplo-clique + tratamento de erro).
- **M5** — "Confirmar pedido" unificado e atômico (lista e detalhe usam `confirm_order`).
- **B1** — `maybeSingle()` (sem ruído 406). **B4** — limpa a flag `awaiting_cargo` ao concluir a coleta.

**Pendências conhecidas (não bloqueantes):** validar a criação de login do motorista na sua
instância (M6); código possivelmente morto `Financial.jsx`/`MapPage.jsx`/`LoadingSimulator.jsx` (B2);
pipeline do Painel não conta status de exceção (B3).

---

---

## MELHORIAS & OTIMIZAÇÕES (jun/2026)

- **Onda A — Performance (grátis):** páginas em `React.lazy` + `Suspense` e `manualChunks`
  no Vite → bundle principal **2,2 MB → 331 KB** (PDF/gráficos/canvas carregam só quando
  usados). Compressão de imagem no cliente antes do upload (`compressImage`) — fotos leves
  no app do motorista. (Cache do React Query já tinha `staleTime`.)
- **Onda B — Exportação (grátis):** `exportCsv.js` (CSV separado por `;` + BOM, abre direto
  no Excel pt-BR) com botão **Exportar** em Pedidos, Receitas, Despesas e Viagens. +testes.
- **Onda C — Produtividade:** *correção do diagnóstico* — a **busca global já existia**
  (`AdminTopbar`, Ctrl+K, com debounce e agrupamento); não havia o que adicionar. Em vez
  disso, **aviso de limite de crédito** na confirmação do pedido (bloqueio efetivo do que
  já estava só informativo).

- **Onda D — Cadastros profissionais (grátis):** veículo ganhou **eixos** (pedágio ANTT),
  **tara**, **carroceria**, **propriedade** (próprio/agregado/terceiro + proprietário) e
  **rastreador**; motorista ganhou **validade ASO/toxicológico** e **veículo padrão**.
  Migration `20260624_cadastros.sql`.
- **Onda E — Observabilidade (grátis):** **ErrorBoundary** no root (acaba a "tela branca";
  mostra recarregar) + `reportError` (console e, se o Sentry for carregado depois, encaminha
  sem mexer no código) + captura global de `unhandledrejection`/`error`.
- **Drag-and-drop:** **reordenar paradas da viagem arrastando** (`@hello-pangea/dnd`, que
  estava instalada e ociosa); as setas ↑↓ continuam. O **DnD da tabela de Despacho** foi
  deixado para uma sessão com validação visual (tela central — risco de fazer às cegas).

**Ainda fora (decisão/custo ou invasivo):** soft-delete e trilha de auditoria global
(invasivos — recomendado em etapa própria); e-mails automáticos de status; GPS ao vivo,
push, WhatsApp, EDI, conciliação OFX (pagos).

---

---

## MÓDULO A MÓDULO — Operações (torre de controle)

Aprofundamento do `OperationsHub` rumo ao nível TMS global.

**Correções:** card de alertas críticos apontava para Configurações (→ `/admin/alertas`);
"A receber" não somava os títulos vencidos (→ inclui `overdue`).

- **Op-1 — Torre viva e precisa:** auto-refresh (45s) + selo "Ao vivo"; "Frota agora" e
  "Em rota" cientes de **comboio** (Onda 7); KPIs ampliados — **ocupação da frota**, **OTD do
  dia**, **atrasados/em risco (SLA)**, **ocorrências abertas**.
- **Op-2 — Visão do dia completa:** **painel de exceções** (aguardando carga, entrega parcial,
  em transferência, tentativa sem sucesso, prazo estourado — o que sumia do pipeline);
  **capacidade do dia** (barras de peso e volume × frota); **selo de SLA** na agenda.
- **Op-3 — Produtividade:** **seletor de período** (Hoje/Amanhã/Semana) na agenda + **feed de
  alertas ao vivo** com link contextual.

**Teto restante (Op-4):** mapa dos veículos/rotas. Parte grátis (mapa estático/embed) viável;
**GPS ao vivo depende de rastreador (pago)**.

---

---

## MÓDULO A MÓDULO — Pedidos

Aprofundamento das três telas (fila, workspace, assistente) rumo ao nível TMS global.

**Limpeza:** removido código morto na fila (`suggestTruckForOrder` + query `trucks` ociosa
+ campo `truck_id` não usado).

- **Pe-1 — Robustez na criação:** **aviso de cobertura** (destinos/origem fora da área),
  **detecção de duplicado** (mesmo cliente/origem/data), **revalidação dos destinatários no
  envio**, e **data desejada × confirmada** (`collection_date_desired`).
- **Pe-2 — Documentação:** **anexos do pedido** (foto da carga/documentos, com compressão) e
  **etiquetas de volume em PDF** (1 por volume: protocolo, destinatário, cidade, X/N).
- **Pe-3 — Produtividade na fila:** **ações em lote** (selecionar, exportar selecionados,
  criar viagem com os confirmados sem viagem).

- **Pe-4a — Coleta consolidada (multi-origem):** `orders.origins` (vários pontos de coleta
  numa OS); seção "Pontos de coleta adicionais" no NewOrder; o `buildStops` cria **uma parada
  de coleta por ponto** (roteirizada); exibição no pedido.
- **Pe-4b — Cotação→pedido interna:** página **Cotação** (`/admin/cotacao`) simula o frete
  (rota/peso/cubagem/taxas) com breakdown e prazo, e **"Criar pedido com esta cotação"**
  pré-preenche o NewOrder.

**Pago (único restante):** vínculo fiscal **CT-e** (SEFAZ).

---

---

## MÓDULO A MÓDULO — Despacho

Aprofundamento do `DispatchBoard` rumo ao nível TMS global. Sem bugs de quebra encontrados.

- **Des-1 — Produtividade no quadro:** **busca + filtro "Urgentes"** na fila; o quadro
  **respeita `working_days`** (mostra/oculta domingo); **ocupação da frota por dia** (% do
  peso programado) no cabeçalho.
- **Des-2 — Drag-and-drop:** **arrastar o pedido da fila para a célula** (caminhão+dia) com as
  mesmas validações de peso/volume/janela; célula destaca ao receber; clique+seleção continua
  como alternativa (`@hello-pangea/dnd`, antes ociosa).
- **Des-3 — Inteligência do motor + atômico:** `planLoads` prioriza **urgentes e
  atrasados/em risco (SLA)** com o motivo no card; **programar/separar/devolver** viraram
  **transações no servidor** (`schedule_orders`, `unschedule_orders`, `apply_dispatch_plan`)
  com fallback.

**Teto pago:** mapa com **GPS ao vivo** dos veículos (rastreador).

---

---

## MÓDULO A MÓDULO — Replanejamento

Transformou a tela numa **central de gestão de disrupções**. Sem bugs de quebra.

**Correção:** redistribuição agora **bloqueia se o caminhão substituto não tem capacidade**.

- **Rep-1 — Precisão:** detecção/troca **ciente de comboio** (líder OU veículo secundário);
  substituto entra **"em rota"** se herda viagem ativa; substituição de motorista checa
  **CNH (categoria + validade)** e avisa **conflito** (já em viagem).
- **Rep-2 — Central única de disrupções:** detecta também **excesso de carga** (célula
  programada acima da capacidade), **viagens sem recurso** (sem motorista/caminhão) e
  **urgentes sem recurso**, com link para resolver.
- **Rep-3 — Inteligência + preview:** **melhor substituto pré-selecionado**; botão **"Resolver
  automaticamente"** aplica em todos os casos; **preview de impacto** (pedidos com prazo
  crítico/SLA) por caso.

**Teto pago:** reotimização por **distância real de estrada** (API).

---

---

## MÓDULO A MÓDULO — Ocorrências

**Bug corrigido:** ações em sequência no modal (tratativa → notificar → seguro) **perdiam
entradas da linha do tempo** (gravavam sobre uma cópia local desatualizada). Agora a timeline
é íntegra.

- **Oc-1 — Robustez & consistência:** **SLA** (selo "Prazo vencido" + card "Atrasadas" +
  atrasadas no topo), **reabrir** ocorrência, **filtros** por tipo/responsável, e o **resolver
  pelo pedido também registra na timeline**.
- **Oc-2 — Documentação & impacto:** **impacto financeiro (R$)** + **causa-raiz**; o gestor
  **anexa fotos/documentos** na ocorrência (migration `20260629_incidents_impact.sql`).
- **Oc-3 — Analytics:** indicadores (**tempo médio de resolução, % no prazo, impacto
  financeiro total, tipos mais frequentes**) + **export CSV**.

**Teto pago:** notificação automática ao cliente (e-mail/WhatsApp).

---

## MÓDULO A MÓDULO — Viagens

**Bug corrigido:** o auto-refresh da viagem em andamento usava a assinatura do React Query v4
(`refetchInterval: (data) => ...`); no v5 o callback recebe o objeto **Query**, então `data.status`
era `undefined` e o polling ficava **silenciosamente desligado**. Corrigido para ler
`query.state.data[0].status` — a tela volta a atualizar sozinha a cada 30s.

- **Vi-1 — Lista profissional:** **busca** por motorista/placa + **filtro de período**
  (7d/30d/mês), **KPIs** no topo (em rota, planejadas, concluídas no mês, **lucro do mês**),
  **lucro e margem** nos cards concluídos e **selo de comboio** (N veículos) + alerta de
  viagem sem motorista.
- **Vi-2 — Detalhe mais rico:** **estimado × real** de **km e custo** com **desvio %**
  (a estimativa de trajeto é captada na otimização de rota — haversine dos CEPs
  geocodificados — e o custo previsto usa o **custo/km médio da frota**); **eficiência km/L**
  apurada no encerramento e **gravada no histórico de consumo do veículo**; **romaneio PDF
  por veículo** do comboio. (migration `20260630_trip_efficiency.sql`)
- **Vi-3 — Custos & acerto completos:** **gastos categorizados** no encerramento
  (alimentação, pernoite, manutenção, pneu, estacionamento, chapa/descarga, multas) que
  viram **despesa na categoria certa**; **acerto do comboio com rateio por motorista/veículo**
  (cada comissão é uma despesa "a pagar"), com total e saldo. (migration
  `20260631_trip_settlement.sql`)

**Teto pago:** roteirização/pedágio com API real, telemetria/GPS ao vivo.

---

## MÓDULO A MÓDULO — Transferências (malha de filiais / cross-docking)

**Auditoria:** núcleo funcional (fluxo `planned → in_transit → received` com RPC atômico
`receive_transfer`), mas com lacunas de consistência: sem cancelar/estornar (pedidos
travavam em "Em transferência"), caminhão/motorista não mudavam de status (mesmo veículo
podia estar em viagem **e** transferência), e o filtro de elegíveis permitia **double-booking**
do mesmo pedido. Nenhum crash — problemas de fluxo, resolvidos no Tr-1.

- **Tr-1 — Operação robusta & segura:** **estornar** transferência (devolve cada pedido ao
  status anterior + libera o caminhão, via RPC atômico `cancel_transfer`); **caminhão vai a
  on_route ao sair e volta a available ao receber/estornar**; seleção só mostra **caminhão
  disponível / motorista livre** e esconde **pedidos já em transferência ativa** (fim do
  double-booking). (migration `20260632_transfer_ops.sql`)
- **Tr-2 — Visão & manifesto:** lista profissional (**busca + filtro por status**, **KPIs**:
  em trânsito, planejadas, pedidos na malha, **peso na malha**), **peso por transferência** e
  **peso × capacidade do caminhão** com alerta de excesso, **manifesto PDF** da transferência,
  e **"Em transferência" no pipeline da torre de controle**.
- **Tr-3 — Cross-dock & malha:** **conferência de recebimento** (divergência por pedido vira
  **ocorrência de avaria** automática); **custo + km do trecho** lançados no recebimento →
  **despesa no Financeiro**; **`branch_history`** registra cada hop do pedido pela malha de
  filiais/CDs. (migration `20260633_transfer_mesh.sql`)

**Teto pago:** roteirização real entre CDs, EDI entre filiais, leitor físico de código de barras.

---

## MÓDULO A MÓDULO — Frota (Carretas · Motoristas · Simulador)

**Auditoria:** os cadastros de Carretas e Motoristas já eram fortes; sem crash. Achados reais:
falha **silenciosa** no cadastro (mutations sem `onError` — placa duplicada/erro de banco não
avisavam), **sem máscara/validação** de placa e CPF (e CPF não-único permitia motorista
duplicado), e **código morto** (`filtered`/`search`). O **Simulador** era o ponto fraco: 2D
ingênuo, só peso (ignorava volume m³, mesmo com o util pronto).

- **Fr-1 — Cadastros profissionais + saúde da frota:** Carretas com **validação/máscara de
  placa** (antiga e Mercosul), bloqueio de duplicada e `onError`; **volume útil (m³)** no form
  e na lista. Motoristas com **máscara/validação de CPF**, bloqueio de duplicado, campos **EAR**
  e **pontos na CNH**, e **alerta combinado de pendências** (CNH/ASO/toxicológico). **KPIs** no
  topo da Frota. `validators.js` + 6 testes. (migration `20260634_fleet_pro.sql`)
- **Fr-2 — Simulador 3D (three.js):** **baú 3D realista** da carreta (cabine/chassi/rodas) com
  órbita/zoom, caixas posicionadas por **empacotamento 3D** (`loadPacker`), **cor por pedido +
  legenda**, e **peso E volume** em barras separadas com avisos de excesso e de volumes que não
  couberam. three.js isolado em chunk **lazy**. `loadPacker.js` + 4 testes.
- **Fr-3 — Inteligência de carga:** **centro de gravidade** longitudinal com faixa ideal e aviso
  de desbalanceamento; **restrições** (frágil por cima, carga perigosa isolada); **aproveitamento**
  (o que limita, peso ou volume); **plano de carga** exportável (CSV) com sequência **LIFO** e
  zona do baú (frente/meio/fundo).

**Teto pago:** empacotamento de nível industrial (solver comercial), física de colisão real.

---

## Migrations a aplicar (Supabase SQL Editor, em ordem)
1. `20260619_onda1_operacional.sql`
2. `20260619_onda2_cubagem_janela.sql`
3. `20260619_onda4_tms.sql`
4. `20260620_onda5_profundidade.sql`
5. `20260620_onda6_recipients.sql`
6. `20260620_onda7_multiveiculo.sql`
7. `20260620_onda8_crossdocking.sql`
8. `20260621_close_trip_tx.sql`
9. `20260621_critical_ops_tx.sql`
10. `20260622_driver_access.sql`
11. `20260622_user_roles.sql`
12. `20260623_audit_fixes.sql`  ← correções da auditoria (recria close_trip/confirm_order)
13. `20260624_cadastros.sql`    ← campos profissionais de veículo/motorista
14. `20260625_pedidos.sql`      ← agendamento desejado/confirmado + anexos do pedido
15. `20260626_multiorigem.sql`  ← coleta consolidada (vários pontos de coleta na OS)
16. `20260627_dispatch_tx.sql`  ← despacho atômico (programar/separar/devolver)
17. `20260628_replan_comboio.sql` ← replanejamento ciente de comboio
18. `20260629_incidents_impact.sql` ← ocorrências: impacto financeiro + causa-raiz
19. `20260630_trip_efficiency.sql` ← viagens: custo estimado + histórico de consumo (km/L)
20. `20260631_trip_settlement.sql` ← viagens: rateio de comissão por veículo + custo categorizado (recria close_trip)
21. `20260632_transfer_ops.sql` ← transferências: estorno (cancel_transfer) + sincronização de frota (recria receive_transfer)
22. `20260633_transfer_mesh.sql` ← transferências: malha de filiais (branch_history) + custo/km do trecho
23. `20260634_fleet_pro.sql` ← frota: EAR + pontos na CNH do motorista

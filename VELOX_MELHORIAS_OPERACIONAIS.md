# Velox TMS — Melhorias Operacionais (Ondas 0–4)

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

## Migrations a aplicar (Supabase SQL Editor, em ordem)
1. `20260619_onda1_operacional.sql`
2. `20260619_onda2_cubagem_janela.sql`
3. `20260619_onda4_tms.sql`

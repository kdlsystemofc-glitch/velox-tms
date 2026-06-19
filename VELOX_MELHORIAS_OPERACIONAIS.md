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

---

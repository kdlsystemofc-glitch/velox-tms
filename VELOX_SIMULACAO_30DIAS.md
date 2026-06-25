# VELOX TMS — SIMULAÇÃO DE 30 DIAS v4 (EXAUSTIVA — testar ABSOLUTAMENTE TUDO)

> **Objetivo:** operar o Velox TMS como uma transportadora real por "30 dias", **clicando e preenchendo
> TUDO pela interface**, em todos os 3 domínios (Site Público, Portal Admin, Portal do Motorista),
> **preenchendo todos os campos de todos os formulários (obrigatórios E opcionais)**, **conferindo os KPIs
> e os dados a cada ação**, e registrando todo erro, falha de lógica, inconsistência, atrito de UX e
> melhoria de UI/UX.
>
> **Fonte da verdade da UI:** `VELOX_MAPA_SIMULACAO.md` (nomes exatos de telas, abas, campos, placeholders,
> botões, KPIs). Localize cada elemento por lá. Este documento diz **o que fazer**, **com quais valores**,
> **em que ordem** e **o que verificar**.

---

## 0. REGRAS CRÍTICAS (LEIA ANTES DE COMEÇAR)

### 0.0 ⛔ PROTOCOLO ANTI-TRAPAÇA (motivo desta versão)
A rodada anterior reportou **"39/39 — 100% aprovado"** e mesmo assim **uma tela de viagem nem abria**
(crash). Isso aconteceu porque o agente **testou pelo banco/SQL/scripts**, não pela tela. Um teste que
nunca clicou em "abrir viagem" **não pode** dizer que Viagens funciona. Portanto, **nesta simulação:**
- **PROIBIDO** usar SQL, `supabase.*` direto, REST/RPC manual, `curl`, scripts de seed/inserção, ou
  qualquer caminho que não seja **a interface renderizada no navegador**. Todo registro (cliente, pedido,
  viagem, despesa…) é criado **preenchendo o formulário e clicando no botão**.
- **Nenhum teste "passa" sem evidência de UI:** print/descrição da tela após a ação + o KPI conferido.
  "Passou" sem ter aberto a tela = **inválido** (reporte como não testado).
- Se algo **não abre, trava, fica em branco ou dá "Algo deu errado"**, isso é **BUG CRÍTICO** — registre e
  siga; **não** contorne pelo banco.
- O Console (F12) e a aba **Network** ficam **abertos o tempo todo**; todo erro vermelho / 4xx / 5xx vira item.

### 0.1 As 6 regras inegociáveis
1. **EXECUTE PELA INTERFACE (UI), NÃO PELA API.** Clique nos botões, digite nos campos, abra os modais,
   arraste os cards, gere os PDFs. Testar pelo banco/API **pula** bugs de interface, validação, máscara,
   estado de botão, cálculo no front e UX. (Ver §0.0 — isto é inegociável.)
2. **PREENCHA TODOS OS CAMPOS** de cada formulário — obrigatórios **e** opcionais. Nada de "pular o que não
   é obrigatório". Se um formulário tem 20 campos, preencha os 20. Use os valores de exemplo deste roteiro.
3. **CONFIRA OS KPIs E OS DADOS APÓS CADA AÇÃO.** Toda vez que criar/confirmar/encerrar/dar baixa, **volte
   às telas afetadas** e verifique se o número mudou corretamente (ver "✅ VERIFICAR" em cada passo). Anote
   qualquer KPI que não atualizou ou ficou errado.
4. **CRUZE 2+ FONTES** sempre: o mesmo número aparece em telas diferentes (ex.: "Frota disponível" em
   Operações × Frota × Indicadores; "Faturamento" em Resumo × DRE × Indicadores). Aponte divergências.
5. **TESTE OS LIMITES E OS ERROS DE PROPÓSITO:** obrigatórios vazios, valores negativos, datas no passado,
   CPF/CNPJ inválido e duplicado, placa inválida e duplicada, peso acima da capacidade, **CEP inexistente
   (ex.: 10000-000) e CEP fora da cobertura**, agendar fora dos dias de operação, senha < 6, excluir
   registro em uso, remover o último admin, agir sobre si mesmo.
6. **TESTE OS 3 PAPÉIS:** admin (tudo), operator (NÃO vê Financeiro/Indicadores/Usuários/Configurações),
   motorista (app mobile).

### 0.2 O que foi PULADO antes e AGORA é obrigatório testar
- ❌ **API de rotas / distância real (Google Maps):** configurar a chave e testar **"Otimizar rota"** na
  viagem (deve usar distância geográfica real e gravar km/custo estimado). Ver Pré-voo §1.4 e Dia 10.
- ❌ **Tabela de Preços vazia:** preencher **TODOS** os campos de Preços + **Tabela de Rotas (corredores)** +
  **Tabela de prazo por estado**, e validar com o **Simulador de frete**. Ver Pré-voo §1.3.
- ❌ **Replanejamento:** acionar cada tipo de disrupção e redistribuir/reatribuir. Ver Dia 14.
- ❌ **Transferências:** ciclo completo (criar→despachar→manifesto→receber com divergência+custo→estornar).
  Ver Dia 15.
- ❌ **Simulador de Carregamento 3D, Documentos (anexos reais), todos os Exports (CSV/PDF), Faturamento
  mensal, Conciliação competência×caixa, Auditoria de Usuários, Backup/Importar Config.** Ver dias 16–29.
- ❌ **Execução real pelo Portal do Motorista** (checklist, POD com assinatura, exceções). Ver dias 11–12.

### 0.2.1 Funcionalidades NOVAS (jun/2026) — testar OBRIGATORIAMENTE
Foram lacunas recém-fechadas; a rodada anterior não as conhecia. **Exercite todas:**
1. **Prioridade operacional** (Normal/Urgente/Crítica) no pedido — criar (Dia 5), editar no detalhe (Dia 7),
   ver ordenação na fila do **Despacho** e na **Separação automática** (Dia 8). É **independente** do "Tipo
   de frete".
2. **Pedido parado** — deixe 1 pedido em "Novo" sem programar e confirme que após o limite (Config
   `stale_order_days`, padrão 3) ele vira **alerta na fila de exceções** da Central (Dia 21).
3. **Tempo de espera / estadia** — no app do motorista, deixe um intervalo entre **Confirmar Chegada** e
   **Concluir**; confira "tempo no local" e a **estadia** lançável como receita no Detalhe da Viagem (Dia 13).
4. **Planejamento automático ciente de prioridade** — a "Separação automática" deve alocar os **críticos
   primeiro** (Dia 8).
5. **Fluxo de aprovação** — ligue o toggle no Pré-voo (§1.4); confirme que o pedido novo nasce **"Aguardando
   aprovação"** e só anda após **Aprovar** (Dia 6); depois **desligue** e confirme o fluxo direto.

### 0.2.2 Cobertura de mercado (os 57 comportamentos)
Ao fim, preencha a **§6 — Cenários de mercado**: para cada um dos 57 comportamentos de transportadora
informados, diga se o sistema **suporta e você testou**, **suporta mas falhou**, ou **não existe (lacuna)**.

### 0.3 Formato do relatório (use para CADA achado)
```
[ID] Título curto
- Domínio/Tela/Rota: (ex.: Admin / Viagens / /admin/viagens/:id)
- Tipo: BUG | LÓGICA | UX | UI | COPY | MELHORIA | SEGURANÇA | PERFORMANCE
- Severidade: CRÍTICA | ALTA | MÉDIA | BAIXA
- Passos para reproduzir: 1) ... 2) ... 3) ...
- Esperado: ... | Obtido: ...
- Evidência: (print / erro de console / request 4xx-5xx)
- Sugestão: ...
```
Entregue **resumo ao fim de cada dia** e **relatório consolidado ao fim** (bugs por severidade;
inconsistências de lógica/números; melhorias de UX; melhorias de UI; avaliação por módulo nota 0–10 +
3 fortes/3 fracos; top 10 ações por impacto × esforço).

### 0.4 Heurísticas de UX/UI (aplicar em toda tela)
Feedback de toda ação (toast/erro) · estados vazio/carregando/erro úteis · botão primário consistente em
todo o app · cores de status iguais entre telas · hierarquia clara (título→KPIs→conteúdo) · placeholders
úteis, validação clara, foco/tab, campos não cortam o texto, máscaras (CPF/CNPJ/CEP/telefone) · mobile
≤414px sem quebra · microcopy em PT-BR claro (nada "de dev"/jargão/frase cortada) · navegação por teclado
e foco visível.

---

## 1. PRÉ-VOO (preencher TUDO antes do "Dia 1")

### 1.0 Acesso e smoke test
- URL: **`https://velox-tms.vercel.app`**. Login admin → deve cair em **`/admin`**. (Se "Acesso não
  liberado", o perfil precisa do papel `admin` — avise o gestor.)
- Abra **todas** as rotas (mapa §0.2), uma a uma: carregou? título certo? **console (F12) limpo**? sem
  request 4xx/5xx? Teste Ctrl+K (busca), o sino, recolher a sidebar e o modo mobile.

### 1.1 Configurações → Empresa (preencher TODOS os campos)
Nome da empresa, **CNPJ** (use um válido; teste depois um inválido p/ ver a validação), Telefone, **E-mail**
(teste um inválido), WhatsApp, Região de atuação, Endereço da sede, Missão, Visão, Valores, Instagram,
LinkedIn, Facebook. **Salvar** (botão deve mostrar "Salvo!"). ✅ VERIFICAR: abra o site público `/` e veja
se nome/contatos/missão/valores aparecem (AboutSection/Footer).

### 1.2 Configurações → Empresa → Google Maps API Key (API de rotas)
Cole uma **chave válida do Google Maps** no campo **Google Maps API Key** e **Salvar**. (Sem ela, "Otimizar
rota" cai na heurística por CEP; com ela, usa distância geográfica real.) ✅ VERIFICAR no Dia 10.
> Se não houver chave disponível, **registre como bloqueio** ("não foi possível testar a API de rotas por
> falta de chave") e teste o fallback por CEP mesmo assim.

### 1.3 Configurações → Comercial & Preços (PREENCHER A TABELA TODA)
**Aba Preços — Frete base:** Preço por kg = **2,50** · Preço por km = **3,20** · Taxa fixa por pedido =
**25,00** · Frete mínimo = **120,00**. **Taxas adicionais:** GRIS = **0,30**% · Ad valorem = **0,20**% ·
TDE por NF = **8,00** · TDA por NF = **8,00** · Pedágio R$/kg = **0,05** · Taxa de coleta = **15,00** · Taxa
de entrega = **12,00** · TRT por NF = **6,00** · Taxa de espera R$/h = **60,00** · **Tempo livre de estadia
(min) = 30** · Taxa de devolução = **80,00** · Taxa de emergência = **20**% · **Fator de cubagem = 6000** ·
Adicional urgente = **50**% ·
Adicional dedicado = **20**%. **Prazo de entrega:** Velocidade média = **600** km/dia · **Tabela de prazo
por estado**: adicione SP=1, RJ=2, MG=2, PR=3, BA=5 (botão **Adicionar estado** para cada). **Parâmetros
financeiros:** Alíquota fiscal = **6**% · Depreciação mensal = **1.200,00**. **Salvar.**
**Simulador de frete** (no rodapé da aba): Peso=**500**, Distância=**430**, Valor NF=**20.000**, Qtd
NFs=**2**, Origem=**SP**, Destino=**RJ**, Tipo=**Fracionado** → ✅ VERIFICAR: o breakdown mostra frete por
peso, GRIS, ad valorem, taxas e um **Total** coerente (> frete mínimo). Anote o total. Mude Tipo p/
**Urgente** e veja o adicional de 50%.
**Aba Tabela de Rotas:** adicione 2 corredores: SP→RJ (R$/kg=**2,20**, R$/km=**3,00**, Taxa fixa=**20**,
Mínimo=**100**, Prazo=**2**, Vigente de hoje) e SP→MG (R$/kg=**2,40**, Prazo=**2**). **Salvar.** ✅
VERIFICAR no Simulador: SP→RJ agora usa o preço do corredor (prioridade sobre o padrão) — o total muda.
**Exportar config (JSON)** e depois **Importar config** (o mesmo arquivo) → não deve quebrar nada; o
**Histórico de alterações** deve registrar a edição.

### 1.4 Configurações → Operação e Alertas
**Área de Atuação:** escolha "Estados" e marque **SP, RJ, MG, PR** (define a cobertura — afeta o
agendamento público). **Agendamento:** Antecedência mínima = **1** dia útil; Dias de operação = Seg–Sáb;
**Fluxo de aprovação = DESLIGADO** por enquanto (o fluxo principal roda sem aprovação; o teste dedicado do
toggle é no **Dia 6**). **Alertas:** CNH=60, CRLV=60, Seguro=30. **Salvar** cada aba. ✅ VERIFICAR no Dia 3
(CEP fora de SP/RJ/MG/PR deve bloquear o agendamento).

### 1.5 Cadastros (todos os campos)
- **Filiais & CDs (2):** "Matriz SP" (Tipo=Filial, telefone, endereço completo via CEP) e "CD Guarulhos"
  (Tipo=Centro de Distribuição). ✅ VERIFICAR: aparecem com código FIL e habilitam Transferências.
- **Fornecedores (2):** "Posto Ipiranga BR-116" (Categoria=Combustível, CNPJ, responsável, telefone,
  WhatsApp, e-mail, condições "30 dias", PIX, + 1 contato no ContactsEditor) e "Mecânica Diesel Forte"
  (Categoria=Manutenção, idem).
- **Clientes (3):** "Indústria Alfa Ltda" (PJ, CNPJ válido, IE, cobrança **Faturamento mensal** dia 25,
  prazo 30, limite de crédito 50.000, 2 contatos, endereço, **janelas de coleta e entrega**), "Comércio
  Beta" (PJ, Por viagem) e "João Transportes ME" (PF/CPF, Por viagem). No detalhe do "Indústria Alfa",
  configure uma **Tabela de Frete personalizada** (R$/kg menor). Teste 1 CPF/CNPJ **inválido** e 1
  **duplicado** (deve bloquear).
- **Destinatários (4):** em SP, RJ, MG e PR (com CEP/endereço, janela de recebimento, tipo Fixo/Eventual).
  ✅ VERIFICAR: códigos DEST gerados; busca e ordenação funcionam.

### 1.6 Frota (todos os campos)
- **Carretas (3):** preencha **TUDO** (placa válida, tipo, fabricante, modelo, ano, cor, RENAVAM, chassi,
  **capacidade kg**, **dimensões do baú m**, eixos, tara, carroceria, propriedade, rastreador, **CRLV** e
  **seguro** — coloque 1 com vencimento em ~20 dias p/ gerar alerta, km atual, alertas de km). Ex.: VUC
  (3.500 kg), Toco (7.000 kg), Truck (12.000 kg). ✅ VERIFICAR: coluna **Volume útil (m³)** calculada; KPI
  "Disponíveis" subiu. Teste placa **inválida** e **duplicada**.
- **Motoristas (3):** preencha tudo (nome, CPF válido, nascimento, telefone, e-mail, CNH nº, categoria,
  **vencimento** — 1 vencendo em ~30 dias, **pontos**, **EAR**, ASO, toxicológico, veículo padrão, função,
  contrato, admissão, salário, **comissão %** — use 10%, status, endereço, banco/PIX). Teste CPF inválido e
  duplicado.

### 1.7 Usuários e acesso do motorista
- **Usuários → Novo usuário:** crie 1 **Operador** (nome, e-mail, papel Operador, senha temporária). ✅
  VERIFICAR: aparece na lista; **Atividade recente** registra "Criou usuário"; teste **Redefinir senha**.
- **Detalhe de 1 Motorista → Acesso ao app:** crie o **login do app** (e-mail + senha). Guarde para o
  Portal do Motorista.

### 1.8 Saldo de caixa
- **Financeiro → Fluxo de Caixa:** clique no lápis de **Saldo em caixa hoje** e defina **R$ 20.000,00**. ✅
  VERIFICAR: KPIs de runway/projeção passam a usar esse saldo.

> A partir daqui começa a "operação". Reporte tudo no formato §0.3.

---

## 2. PLANO DIA A DIA (cada passo tem ✅ VERIFICAR — confira os KPIs/dados na hora)

### SEMANA 1 — Demanda e cadastro
**Dia 1 — Site público.** Percorra `/` inteira; clique em TODOS os links/CTAs (Início/Serviços/Sobre/
Contato/Rastrear/Cotar/Agendar e os "Solicitar" dos serviços). Envie o **Contato** uma vez **válido** e uma
**inválido** (nome vazio, e-mail errado, mensagem < 10). Em `/rastrear`: protocolo inexistente (estado
vazio) e, depois que houver pedidos, um real. Teste responsividade (≤414px). ✅ VERIFICAR: o lead aparece
em **Admin → Mensagens** (KPI "Novos" +1).

**Dia 2 — Cotação pública.** `/cotacao` (3 passos) e `/cotacao-avancada`: faça 3 simulações com pesos/
dimensões diferentes (inclua uma carga **leve e volumosa** p/ ver o **peso cubado > real**). ✅ VERIFICAR: o
total bate com o Simulador de Configurações (mesma engine); taxas/GRIS aparecem. Teste **Agendar agora** →
abre `/agendar` com os dados.

**Dia 3 — Agendamento público (`/agendar`) + COBERTURA.** Faça **2 agendamentos completos** preenchendo
TODOS os 5 passos (multi-destinatário, ≥2 itens com NF e chave de 44 díg., dimensões). Anote os
**protocolos**. **Testes de cobertura (obrigatório):** (a) CEP de origem **inexistente** `10000-000` → o
botão **Avançar** deve **bloquear** (correção recém-aplicada); (b) CEP de origem **fora** de SP/RJ/MG/PR
(ex.: um de SC) → bloqueia com "não atendemos esta região"; (c) data **fora dos dias de operação** (domingo)
→ não deve permitir; (d) obrigatórios vazios → erros inline. ✅ VERIFICAR: pedidos válidos entram em
**Pedidos → Novos** (KPI/contador e badge da sidebar +).

**Dia 4 — Conversão de lead (Mensagens).** Abra o lead do Dia 1 → **Criar pedido** (➜ vira "convertido" e
vincula). Teste **Responder por e-mail** e **WhatsApp** (status→em contato + "Último contato"), **Nota
interna**, **Perdido**, **Arquivar/Reabrir**, **Exportar** (CSV). ✅ VERIFICAR: KPIs **Em contato/
Convertidos/Taxa de conversão** atualizam; "1ª resposta" aparece; link "✓ Pedido gerado" abre o pedido.

**Dia 5 — Novo Pedido interno (assistente COMPLETO) + PRIORIDADE.** Crie **3 pedidos** preenchendo todos os
campos: P1 com **coleta consolidada** (Adicionar ponto de coleta) e **Prioridade = Crítica**, P2
multi-destinatário com itens via **Adicionar chaves** e **Prioridade = Urgente**, P3 com **cliente novo**
(prompt **Criar cadastro**), **Usar estimativa** e **Prioridade = Normal**. Defina **Valor do frete cobrado**
manualmente em cada um. ✅ VERIFICAR: totais (volumes/peso/valor) somam certo; o frete calculado aparece; ao
criar, o pedido surge na fila **com o selo de prioridade** (Crítica/Urgente; Normal sem selo) e, na lista de
Pedidos, o selo aparece junto ao protocolo.

**Dia 6 — Confirmação e fila + FLUXO DE APROVAÇÃO.** Confirme ~5 pedidos (modal: Valor do frete, Forma de
pagamento — varie PIX/Boleto/Dinheiro, Data de coleta). Recuse 1 (vai p/ Cancelados). Teste abas/contadores,
ordenação de colunas, busca, **Exportar**, seleção múltipla. ✅ VERIFICAR: cada confirmação **cria uma
Receita** em **Financeiro → Receitas** (status A Receber, valor = frete); recusar **não** deixa receita
ativa; KPI "A receber" sobe.
**Teste do fluxo de aprovação (dedicado):** (1) Em **Configurações → Agendamento**, **ligue** "Exigir
aprovação antes de operar" e salve. (2) Crie **1 pedido novo** (Novo Pedido) → ✅ deve nascer **"Aguardando
aprovação"** (aba **Aprovação** na lista e card de pipeline + item "N aguardando aprovação" na fila de
exceções da Central). (3) Abra-o → botão **Aprovar Pedido** → vira **"Novo"** e o histórico registra
"Pedido aprovado". (4) Crie outro e, no detalhe, **recuse** (Cancelar com motivo) → vai p/ Cancelados. (5)
Faça também um **agendamento público `/agendar`** com o toggle ligado → também deve nascer "Aguardando
aprovação". (6) **Desligue** o toggle e salve, e confirme que um novo pedido volta a nascer **"Novo"**
direto. ✅ VERIFICAR: só **admin/operador** conseguem aprovar; o stepper do pedido mostra a etapa
"Aguardando aprovação" apenas para quem passou por ela.

**Dia 7 — Detalhe do Pedido + override de PRIORIDADE.** Em 2 pedidos: **mude a Prioridade** pelo seletor do
cabeçalho (ex.: Normal→Crítica) e confirme que o **histórico** registra "Prioridade alterada para …" (override
do operador); edite o Financeiro (Cobranças adicionais, Taxa improdutiva, Fator de cubagem), registre uma
**Ocorrência**, **anexe** um arquivo, gere **CT-e**. **Cancele** 1 pedido (motivo obrigatório). ✅ VERIFICAR:
o selo de prioridade muda na lista e no Despacho; histórico de eventos registra tudo; o status aparece em
Operações e em `/rastrear`; cancelar **estorna** a receita.

### SEMANA 2 — Programação, viagens e motorista (o coração)
**Dia 8 — Despacho + PRIORIDADE + SEPARAÇÃO AUTOMÁTICA.** Observe que a **fila vem ordenada por prioridade**
(crítica no topo) com selo; teste o filtro **"urgentes"**. Programe pedidos confirmados **arrastando** para
dia×caminhão; **Devolver à fila** em 1. Tente sobrecarregar 1 caminhão acima da capacidade (deve avisar
peso/volume). Depois teste a **Separação automática**: abra o modal, ✅ confira que os **pedidos críticos são
alocados primeiro**, que cada pedido tem a **explicação ("↳ por quê", citando a prioridade)**, que os **não
alocados** trazem motivo, e clique **Aplicar separação**. ✅ VERIFICAR: pedidos somem de "a despachar" (badge
da sidebar cai); Operações reflete; a alocação respeitou prioridade e capacidade.

**Dia 9 — Viagens (criação).** Crie **2 viagens**: uma via **Pedidos → Criar viagem** (seleção múltipla) e
uma via **Nova Viagem** com **COMBOIO** (Adicionar veículo — 2 caminhões/2 motoristas) e **Adiantamento ao
motorista** preenchido. ✅ VERIFICAR: KPIs de Viagens (Planejadas +), cards mostram selo **comboio 2**.

**Dia 10 — Viagem (preparação) + API DE ROTAS.** Abra uma viagem: **Otimizar rota** (➜ com a chave do
Google, deve reordenar por distância real e **gravar km/custo estimado**; sem chave, usa CEP). Reordene
paradas arrastando e com ↑/↓; abra **Google Maps**; gere **Romaneio PDF** e, no comboio, o **Romaneio por
veículo**. **Iniciar** a viagem. ✅ VERIFICAR: aparece "Trajeto previsto: ~X km"; o caminhão vira **on_route**
em Frota/Operações; pedidos viram **collecting**; PDF abre com os dados certos.

**Dia 11 — Portal do Motorista (execução real) + TEMPO NO LOCAL.** Logue como **motorista** (janela ≤414px).
Abra a viagem: **Checklist de saída** → **Confirmar checklist**; em cada parada **Confirmar Chegada** e, numa
delas, **espere de propósito alguns minutos** (ou registre chegada e só conclua depois) antes de **Confirmar
Coleta** — para gerar tempo no local/estadia; numa entrega anexe **NF (obrigatório)** + **Assinatura** (assine
na tela) + **Nome do recebedor** → **Confirmar Entrega**. Veja o **Histórico**. ✅ VERIFICAR: o **Progresso
(x/y)** sobe; aparece **"⏱ X no local"** na parada onde você esperou; admin → Detalhe da Viagem mostra as
paradas concluídas, o tempo no local e a NF anexada; pedidos mudam status.

**Dia 12 — Motorista (exceções — testar TODOS os fluxos).** **Registrar Ocorrência** (escolha cada Tipo ao
menos uma vez, com Descrição e Foto), **Destinatário ausente** (teste as 3 opções), **Carga não estava
pronta**, **Entrega parcial** (Volumes entregues + Motivo dos demais), **Adicionar informação** a uma
ocorrência existente. ✅ VERIFICAR: cada ocorrência aparece em **Admin → Ocorrências** (KPI "Em aberto" +) e
em `/rastrear`; entrega parcial reflete no status do pedido.

**Dia 13 — Encerramento da viagem (financeiro) + ESTADIA.** **Antes de encerrar**, no Detalhe da Viagem,
localize o card **"Estadia / tempo de espera"** (deve listar a parada onde você esperou no Dia 11, com tempo
no local, horas cobráveis e valor) e clique **Lançar estadia como receita** → ✅ deve criar uma **Receita** em
Financeiro → Receitas e marcar a parada como "estadia cobrada" (clicar de novo não cobra em dobro). Depois
**Encerrar Viagem:** Km final, Combustível (litros + R$), Pedágios, **Outros gastos** (adicione ≥3 categorias
diferentes: Alimentação, Pernoite, Manutenção em rota), Observações. Confira na hora: **Lucro líquido**,
**Margem**, **Custo por km**, **Eficiência km/L**, **Estimado × Real (km e custo, desvio %)**,
**Acerto/comissão** (no comboio, **rateio por veículo**). ✅ VERIFICAR (cruzando telas): os gastos viraram
**Despesas** (Financeiro → Despesas, status Pago); a comissão virou despesa **a pagar** (salaries); o
**caminhão voltou available**; o **km** foi gravado no veículo; o km/L entrou no histórico de consumo do
veículo; a **estadia** aparece como receita a receber.

**Dia 14 — Replanejamento (testar a central inteira).** Provoque disrupções: (a) coloque um caminhão **com
carga/viagem** em **Manutenção** (no Detalhe do Caminhão → Status); (b) coloque um motorista **com viagem**
em **Afastado**. Vá a **Replanejamento** → para cada caso use **Escolher caminhão disponível** /
**Escolher motorista** e redistribua/reatribua. Teste o caso de **não haver recurso disponível** (deve
avisar). ✅ VERIFICAR: badge da sidebar reflete os casos; ao resolver tudo, aparece o estado **"Tudo sob
controle 🎉"**; os pedidos/viagens passam para o novo recurso.

### SEMANA 3 — Malha, frota, documentos, ocorrências
**Dia 15 — Transferências (ciclo COMPLETO).** **Nova transferência** Matriz SP → CD Guarulhos: escolha
caminhão disponível, motorista livre, **selecione pedidos** (veja **peso × capacidade** com alerta se
exceder), **Iniciar em trânsito agora**. Gere **Manifesto** (PDF). **Despachar** (se planejada). **Receber
no destino**: na conferência, marque **divergência** em 1 pedido (avaria) e informe **Distância (km)** e
**Custo do trecho (R$)**. Depois crie outra transferência e **Estorne**. ✅ VERIFICAR: "Em transferência"
aparece no **Pipeline de Operações**; a divergência criou uma **Ocorrência**; o custo criou uma **Despesa**;
estornar **devolveu** os pedidos ao status anterior e **liberou** o caminhão; KPIs (Em trânsito/Pedidos na
malha/Peso na malha) corretos.

**Dia 16 — Simulador de Carregamento 3D.** **Frota → Simulador:** escolha a carreta, **Adicione pedidos**,
gire/zoom no 3D. Observe **Peso %**, **Volume %**, **Volumes acomodados (x/y)**, **Centro de gravidade**
(faixa ideal), badges **Frágil/Carga perigosa**, **Aproveitamento**. Force **excesso de peso** e **de
volume** (deve avisar) e um pedido **sem dimensões** (usa caixa estimada). Gere **Plano de carga (CSV)**. ✅
VERIFICAR: barras e avisos coerentes; CSV baixa com ordem LIFO + zona do baú.

**Dia 17 — Frota (detalhe, manutenção, acesso).** No **Caminhão**: edite todos os campos, registre uma
**Manutenção** (com fornecedor, valor, próxima prevista), configure **alertas por km** e **force um alerta**
(coloque km atual > limite de óleo). No **Motorista**: edite, veja **Painel do Mês**, no **Acesso ao app**
teste **Redefinir senha** e **congelar/reativar**. ✅ VERIFICAR: o alerta de km aparece em **Alertas** e no
**sino**; o Painel do Mês bate com os pedidos do motorista.

**Dia 18 — Documentos (anexos reais).** Anexe **CRLV/Seguro/Tacógrafo** em 1 caminhão e **CNH/ASO/
Toxicológico** em 1 motorista (edite o vencimento inline). Na aba **Empresa**, anexe um doc com categoria e
vencimento. Veja a **Central de Vencimentos** (KPIs Vencidos/30/60; filtros; **Exportar**). Veja **Pedidos e
Viagens** (NFs assinadas do Dia 11) e **Exportar NFs**. ✅ VERIFICAR: selos **x/3 anexados** sobem;
documentos vencendo (CRLV/CNH que você datou perto) aparecem em Vencidos/30/60 e batem com o KPI de Frota
"Documentos vencendo".

**Dia 19 — Ocorrências (gestão completa).** Para cada ocorrência aberta (criadas nos dias 7, 12, 15):
registre tratativa ("O que foi feito..."), **impacto financeiro (R$)**, **causa-raiz**, **anexos**,
**notificar cliente**, marcar **seguro**, depois **resolver** uma e **reabrir** outra. ✅ VERIFICAR: KPIs (Em
aberto/Críticas/Atrasadas/Resolvidas) e indicadores (Tempo médio, % no prazo, **Impacto financeiro total**,
Tipos mais frequentes) atualizam; **Exportar** funciona.

**Dia 20 — Alertas.** Em **Alertas**: percorra a lista (docs vencendo, manutenção por km do Dia 17), clique
em cada um até a entidade, marque lido/resolvido. ✅ VERIFICAR: o **sino** da topbar e a **Fila de ação** de
Operações refletem os mesmos alertas; resolver remove da contagem.

**Dia 21 — Torre de Operações (consolidação + cruzamento) + PEDIDO PARADO.** Releia o **Painel de Operações**
com toda a massa de dados. **Cruze cada métrica** com a tela de origem: "Frota disponível/Em rota/Ocupação" ×
**Frota** × **Indicadores**; "Entregas hoje/OTD" × **Indicadores**; "A receber/A pagar" × **Financeiro**;
Pipeline × **Pedidos**; "Ocorrências abertas" × **Ocorrências**. Confira **Fila de ação**, **Exceções**,
**Capacidade do dia** (Peso/Volume), **Operação (Hoje/Amanhã/Semana)**, **Frota agora**.
**Teste do "pedido parado":** garanta que existe ao menos **1 pedido em "Novo"/"Confirmado" sem
programação** (não despachado). Em **Configurações → Agendamento**, ponha **"Dias sem programação para
alertar" = 0** e salve → volte à Central → ✅ deve surgir o item **"N pedido(s) parado(s)"** na fila de
exceções, citando o mais antigo, com botão **Resolver**. Depois volte o limite para **3**. ✅ VERIFICAR e
**listar toda divergência numérica entre telas**.

### SEMANA 4 — Financeiro, indicadores, governança, fechamento
**Dia 22 — Receitas.** Crie 2 receitas avulsas (todos os campos). Dê **baixa (Recebido)** em algumas
(varie a data). Teste o **Aging** clicável (cada faixa filtra), busca, filtro de status, **Exportar**. ✅
VERIFICAR: "Total a receber" cai e "Recebido" sobe ao dar baixa; as faixas de aging somam certo.

**Dia 23 — Despesas.** Crie **6 despesas fixas do mês** em categorias variadas (Salários, Aluguel, Seguros,
Manutenção, Pneus, Impostos), preenchendo **fornecedor/veículo/motorista/centro de custos/anexo**; deixe
algumas **A Pagar** e outras **Pago**; teste **Parcelado**. **Dar Baixa** (com comprovante) em 1 pendente.
Teste **Aging**, filtros, **Exportar**. ✅ VERIFICAR: "Total a pagar/Total pago" coerentes; categorias
batem.

**Dia 24 — Faturamento mensal do cliente.** No cliente **"Indústria Alfa" (mensal)** → **Fechar fatura** →
confira a lista de fretes do mês, total e datas (fechamento dia 25, vencimento +30) → **Gerar fatura**. ✅
VERIFICAR: cria uma **Receita** com o vencimento certo; o **Histórico de preços** (R$/kg vs média) e a
**Tabela de Frete personalizada** aparecem no detalhe.

**Dia 25 — DRE.** Selecione o mês corrente. Confira linha a linha: Receita Bruta → Deduções (alíquota) →
Receita Líquida → Custos Variáveis → Custos Fixos → **EBITDA** → Depreciação → **Lucro/Prejuízo Líquido** +
Margem. Veja **Resultado por Caminhão**, **Comparativo (mês anterior)**, **YTD**, **Conciliação competência
× caixa**. **Gerar PDF** e **Exportar Excel**. ✅ VERIFICAR: a Receita Bruta da DRE bate com os fretes dos
pedidos do mês; os custos batem com as Despesas por categoria; a **diferença competência×caixa** = receitas
não recebidas.

**Dia 26 — Fluxo de Caixa.** Ajuste o **Saldo em caixa hoje**, varie **30/60/90 dias**. Confira **Saldo
projetado**, **Menor saldo no período**, **Atrasados (receber/pagar)**, o **alerta de saldo negativo** e a
tabela dia a dia (entradas/saídas/saldo; selo "atrasado" para vencidos). ✅ VERIFICAR: a projeção parte do
saldo definido (não de zero); contas **vencidas** entram em "Hoje"; o menor saldo bate com a tabela.

**Dia 27 — Indicadores.** Troque **todos os períodos** (Mês atual/anterior/3/6/12/Ano). Confira **KPIs com
variação ▲/▼ e semáforo de meta** (OTD/Margem), **Eficiência** (Ticket, **Custo/km**, **Receita/km**, **Lead
time**), **Tendências (12 meses)** (Entregas+OTD, Receita×Despesa×Resultado, Ocorrências) e **Rankings**
(Top clientes/motoristas/destinos). **Exportar**. ✅ VERIFICAR: OTD/Faturamento/Margem **batem** com
Operações e Financeiro; custo/km e km/L batem com o encerramento da viagem (Dia 13).

**Dia 28 — Usuários & segurança.** Crie mais 1 usuário; **mude papéis** (Operador↔Admin), **desative/
ative**, **redefina senha**. Tente **remover o último admin** (deve **bloquear**) e **agir sobre si mesmo**
(deve bloquear). Veja **Atividade recente** (auditoria registra cada ação). **Faça login como o Operador** e
confirme que **NÃO** vê Financeiro/Indicadores/Usuários/Configurações (tente abrir as URLs direto → deve
barrar). ✅ VERIFICAR: filtros por papel/situação; "Último acesso" do operador atualiza após o login dele.

**Dia 29 — Configurações (governança) + regressão de preços.** Altere **1 preço** (ex.: Preço por kg) e
confirme o impacto no **Simulador de frete** e ao criar **uma nova cotação/pedido**. Teste **Exportar/
Importar config (JSON)** e o **Histórico de alterações**. Edite Configurações e **confirme que NÃO apagou**
o **Saldo de caixa** (Fluxo) nem os **Documentos da empresa** (Documentos). ✅ VERIFICAR: o histórico mostra
"Alterou configurações" com os grupos mudados.

**Dia 30 — Regressão total + VERIFICAÇÃO FINAL DE DADOS + relatório.**
1. Refaça **1 fluxo fim-a-fim** novo (lead → pedido → confirmar → despachar → viagem → motorista (POD) →
   encerrar → receita/despesa → DRE/Indicadores) e confirme que **cada número se propagou**.
2. **Varredura de UI/UX** em TODAS as telas (consistência de botões/cores/estados/cópia; mobile; foco/
   teclado; nada cortando texto).
3. **Verificação final de dados** (§4).
4. Entregue o **relatório consolidado** (§0.3).

---

## 3. CHECKLIST TRANSVERSAL (rodar o tempo todo)
**Lógica/consistência:** confirmar pedido→receita; encerrar viagem→despesas+comissão; recusar/cancelar
pedido→estorna receita; transferência estorno→devolve pedido+libera caminhão; receber→despesa(+ocorrência
se divergência); documentos selo x/3 atualiza; vencimentos consolidam Frota+Motoristas+Empresa; comboio
rateia comissão por veículo; acerto = comissão − adiantamento.
**Cruzamentos numéricos:** Frota disponível/em rota/ocupação (Operações×Frota×Indicadores); faturamento/
margem/OTD (Resumo×DRE×Indicadores — atenção caixa vs competência); saldo (Fluxo) reflete o definido;
custo/km e km/L (Viagem×Indicadores).
**Técnico:** console sem erros vermelhos; sem 4xx/5xx; sem loading infinito; F5 mantém rota/estado; voltar
do navegador funciona; PDFs/CSVs abrem com dados certos.
**UX/UI:** feedback em toda ação; estados vazio/carregando/erro; botão primário e cores de status
consistentes; máscaras/validação; mobile sem quebra; microcopy claro (nada "de dev").
**Segurança:** operator barrado nas telas admin-only (URL direta); logout limpa sessão; "Acesso não
liberado" p/ perfil pendente; não dá pra remover/desativar o último admin nem agir sobre si.

---

## 4. VERIFICAÇÃO FINAL DE DADOS (batimento ao fim — preencha e reporte)
Preencha esta tabela com os números do sistema ao final e diga se cada um **bate** com o esperado pela sua
operação simulada:

| Indicador | Onde conferir | Valor no sistema | Bate? |
|---|---|---|---|
| Nº de pedidos por status (Novos/Confirmados/Em coleta/Em trânsito/Entregues/Cancelados) | Pedidos (abas) | | |
| Receita bruta do mês (soma dos fretes) | DRE | | |
| Total recebido (caixa) | Financeiro → Receitas / Resumo | | |
| Total a receber (aberto) + aging | Receitas | | |
| Total de despesas por categoria | Despesas / DRE | | |
| Total pago (caixa) | Despesas / Resumo | | |
| Total a pagar (aberto) + aging | Despesas | | |
| Resultado líquido (DRE) | DRE | | |
| Saldo de caixa atual e projetado | Fluxo de Caixa | | |
| OTD do período | Indicadores | | |
| Custo/km e Receita/km | Indicadores | | |
| Comissões a pagar (motoristas) | Despesas (salaries) | | |
| Frota: disponíveis / em rota / manutenção | Frota / Operações | | |
| Ocorrências por status + impacto financeiro | Ocorrências | | |
| Documentos vencidos / vencendo | Documentos → Vencimentos | | |
| Leads e taxa de conversão | Mensagens | | |
| Transferências por status + peso na malha | Transferências | | |

Para **cada divergência**, abra um item no formato §0.3 (Tipo=LÓGICA).

---

## 5. ENVIO AO AGENTE (Antigravity lê o repo direto)
O agente lê estes arquivos no projeto: `VELOX_SIMULACAO_30DIAS.md` (este) e `VELOX_MAPA_SIMULACAO.md`
(mapa). Você só fornece as **credenciais**: **Admin**, **Operador** e **Motorista (app)**, e a URL
`https://velox-tms.vercel.app`. Instrução inicial sugerida:
> "Você é um QA sênior. Execute a **Simulação v4 (EXAUSTIVA)** do `VELOX_SIMULACAO_30DIAS.md` **100% pela
> interface (clicando/preenchendo), JAMAIS pela API/SQL/scripts** (leia o **§0.0 — Protocolo anti-trapaça**;
> nenhum teste 'passa' sem ter aberto a tela). Use o `VELOX_MAPA_SIMULACAO.md` para os nomes exatos. Comece
> pelo **Pré-voo (§1)** preenchendo **todos** os campos (Tabela de Preços, tempo livre de estadia, chave do
> Google Maps). Faça **um dia por vez**; em cada passo execute os **✅ VERIFICAR** conferindo os KPIs/dados na
> hora. Teste **obrigatoriamente** as 5 funcionalidades novas (§0.2.1: prioridade, pedido parado, estadia,
> separação automática por prioridade, fluxo de aprovação). Mantenha Console (F12) e Network abertos e
> registre todo erro/4xx/5xx — se uma tela travar/der 'Algo deu errado', é **BUG CRÍTICO**, não contorne
> pelo banco. Use o **formato §0.3**; entregue resumo por dia, a **Verificação final de dados (§4)**, a
> **cobertura dos 57 cenários (§6)** e o **relatório consolidado** no fim. Não exclua dados que não sejam de
> teste. Pergunte se faltar credencial ou a chave do Google Maps."

### Critérios de "passou/não passou" (resumo executivo esperado)
Fluxo crítico inteiro funciona? · Números consistentes entre telas? · Bugs CRÍTICOS/ALTOS? · Top 10
melhorias (impacto × esforço) · Nota por módulo (0–10) e nota geral.

---

## 6. CENÁRIOS DE MERCADO — OS 57 COMPORTAMENTOS (cobertura obrigatória)
Para **cada** comportamento abaixo, marque na coluna **Resultado**: **OK** (suportado e testado pela UI),
**FALHOU** (existe mas deu erro/inconsistência — abra item §0.3) ou **LACUNA** (não existe no sistema).
Legenda da coluna *Status atual*: ✅ existe (teste de verdade) · ⚠️ parcial (teste e diga o que falta) ·
❌ lacuna conhecida (confirme que realmente não há na UI).

| # | Comportamento | Onde testar (tela) | Status atual | Resultado |
|---|---|---|---|---|
| 1 | Data desejada × confirmada de coleta | Agendar/NewOrder (data desejada) → Confirmar (data efetiva) | ✅ | |
| 2 | Pedido não vinculado a caminhão na criação | NewOrder cria sem caminhão; vínculo só no Despacho | ✅ | |
| 3 | Agrupamento de coletas próximas | Despacho (selo "Mesma região") / Separação automática | ✅ | |
| 4 | Controle de capacidade da operação | Operações → "Capacidade do dia" (Peso/Volume) | ✅ | |
| 5 | Replanejamento por imprevisto | Replanejamento (Dia 14) | ✅ | |
| 6 | Prioridade (normal/urgente/crítica) | Pedido (Prioridade) + Despacho (Dia 5/8) | ✅ (novo) | |
| 7 | Janelas de coleta/entrega | Cadastro de Cliente/Destinatário (DeliveryWindowEditor) | ✅ | |
| 8 | Peso E volume (cubagem) | Cubagem no pedido/cotação; Simulador 3D; Despacho (volume) | ✅ | |
| 9 | Aproveitamento de retorno (backhaul) | Detalhe da Viagem → "Aproveitar o retorno?" | ✅ | |
| 10 | Central de ocorrências | Ocorrências (Dia 19) + app do motorista (Dia 12) | ✅ | |
| 11 | Consolidação de cargas | NewOrder coleta consolidada / multi-destinatário | ⚠️ | |
| 12 | Múltiplas NFs por coleta | NewOrder/Agendar → Itens/NFs (várias) | ✅ | |
| 13 | Rastreamento por evento | `/rastrear` + histórico de status | ✅ | |
| 14 | Transferências entre unidades | Transferências (Dia 15) | ✅ | |
| 15 | Confirmação de coleta no local | App motorista: Confirmar Coleta / "carga não pronta" | ⚠️ (ajuste de peso/volume no local: confirmar se há) | |
| 16 | Coleta parcial | App motorista (carga não pronta / saldo) | ⚠️ | |
| 17 | Entrega parcial | App motorista → Entrega parcial (Dia 12) | ✅ | |
| 18 | Programação por região | Despacho (região) | ✅ | |
| 19 | Programação por tipo de veículo | Despacho valida **peso/volume**; compatibilidade por TIPO | ⚠️/❌ (confirmar se alerta por tipo) | |
| 20 | Agendamento com horário/janela | Janela no cadastro; aviso de janela no Despacho | ⚠️ | |
| 21 | Múltiplas coletas na mesma viagem | Viagem com várias paradas de coleta | ✅ | |
| 22 | Múltiplas entregas na mesma viagem | Viagem com vários destinatários (status individual) | ✅ | |
| 23 | Consolidação de pedidos | Criar viagem com vários pedidos do mesmo destino | ⚠️ | |
| 24 | Desconsolidação | Cross-docking / Transferências | ⚠️ | |
| 25 | Cross docking | Transferências (entrada CD → nova expedição) | ✅ | |
| 26 | Ocupação da frota | Operações/Indicadores (Ocupação %); Capacidade do dia | ✅ | |
| 27 | Monitoramento de atrasos | Selo SLA (Atrasado/Risco) em Operações/Pedido | ✅ | |
| 28 | Devoluções | App motorista → "Devolver ao remetente" | ⚠️ | |
| 29 | Torre de controle | Painel de Operações (Dia 21) | ✅ | |
| 30 | Planejamento automático | Despacho → Separação automática (Dia 8) | ✅ (novo) | |
| 31 | Mudar data após programado | Despacho: Devolver à fila e reprogramar | ⚠️ | |
| 32 | Antecipar (encaixe urgente) | OrderWorkspace → "Encaixe urgente em [caminhão]" | ⚠️ | |
| 33 | Pedido em duplicidade | NewOrder → aviso "possível duplicidade" | ✅ | |
| 34 | NF esquecida (incluir depois) | Editar itens/NFs do pedido após criado | ⚠️ (confirmar edição de itens) | |
| 35 | Peso errado → recalcula frete | Editar pedido/itens e recalcular | ⚠️ | |
| 36 | Destinatário mudou de endereço | Cross-docking: "Endereço de entrega ATUALIZADO" | ✅ | |
| 37 | Caminhão lotou no meio do dia | Despacho/validação de capacidade ao exceder | ⚠️ | |
| 38 | Cliente acompanha o caminhão | "Próxima parada" (app); `/rastrear` por status | ⚠️ | |
| 39 | Entregou sem comprovar | App: Confirmar Entrega EXIGE NF + assinatura | ✅ | |
| 40 | Recebeu com ressalva/avaria | App: entrega parcial / ocorrência de avaria | ⚠️ | |
| 41 | Dividir uma carga (A/B) | — | ❌ (confirmar; provável lacuna) | |
| 42 | Pedido esquecido (parado) | Operações → alerta "pedido parado" (Dia 21) | ✅ (novo) | |
| 43 | Tempo de espera / estadia | Viagem → card Estadia (Dia 11/13) | ✅ (novo) | |
| 44 | Veículo em manutenção bloqueia | Caminhão→Manutenção dispara Replanejamento | ✅ | |
| 45 | Prioridade contratual do cliente | Prioridade operacional (crítica) no pedido | ✅ (novo) | |
| 46 | Aprovação antes de operar | Toggle + "Aguardando aprovação" (Dia 6) | ✅ (novo) | |
| 47 | Cancelar após a coleta | Cancelar pedido em coleta/trânsito (motivo) | ⚠️ | |
| 48 | Carga troca de veículo várias vezes | Transferências/cross-dock encadeados | ⚠️ | |
| 49 | Prazo (SLA), não data | Selo SLA / prazo de entrega por estado | ✅ | |
| 50 | Operador sobrescreve a sugestão | Despacho manual ignora a Separação automática | ✅ | |
| 51 | Coleta recorrente automática | "Repetir último pedido" / modelos de pedido | ⚠️/❌ (confirmar se há recorrência automática) | |
| 52 | Motorista recusou a viagem | — | ❌ (provável lacuna) | |
| 53 | Níveis de rastreamento (cliente×interno) | `/rastrear` (público) × histórico interno | ⚠️ | |
| 54 | Dividir entre veículos (comboio) | Viagem em comboio (vários caminhões) | ✅ | |
| 55 | Volta com devoluções | Devolução + nova tentativa | ⚠️ | |
| 56 | Por que atrasou (motivo) | Ocorrência com tipo/causa-raiz | ⚠️ | |
| 57 | Indicadores de saúde da operação | Indicadores (OTD, ocupação, custo/km, ocorrências…) (Dia 27) | ✅ | |

**Importante:** onde marquei ⚠️/❌, **confirme pela UI** se existe de fato — se não existir, registre como
**LACUNA** (Tipo=MELHORIA/LÓGICA no §0.3); se existir e funcionar, corrija o status para OK. O objetivo é um
veredito honesto de cobertura de mercado, não um "100%" automático.

---

> Fim do roteiro v4. (Fonte da UI: `VELOX_MAPA_SIMULACAO.md`.) Cobre: pré-voo completo, 30 dias com ✅
> VERIFICAR por passo, as 5 funcionalidades novas, verificação final de dados (§4) e os 57 cenários de
> mercado (§6). Execução **100% pela interface** (§0.0) — sem SQL/API.

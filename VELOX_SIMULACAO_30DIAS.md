# VELOX TMS — SIMULAÇÃO DE 30 DIAS v3 (EXAUSTIVA — testar ABSOLUTAMENTE TUDO)

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

### 0.1 As 6 regras inegociáveis
1. **EXECUTE PELA INTERFACE (UI), NÃO PELA API.** Clique nos botões, digite nos campos, abra os modais,
   arraste os cards, gere os PDFs. Testar pelo banco/API **pula** bugs de interface, validação, máscara,
   estado de botão, cálculo no front e UX. (A simulação anterior rodou muito por API e por isso deixou de
   pegar vários problemas.)
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
de entrega = **12,00** · TRT por NF = **6,00** · Taxa de espera R$/h = **60,00** · Taxa de devolução =
**80,00** · Taxa de emergência = **20**% · **Fator de cubagem = 6000** · Adicional urgente = **50**% ·
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
agendamento público). **Agendamento:** Antecedência mínima = **1** dia útil; Dias de operação = Seg–Sáb.
**Alertas:** CNH=60, CRLV=60, Seguro=30. **Salvar** cada aba. ✅ VERIFICAR no Dia 3 (CEP fora de SP/RJ/MG/PR
deve bloquear o agendamento).

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

**Dia 5 — Novo Pedido interno (assistente COMPLETO).** Crie **3 pedidos** preenchendo todos os campos: P1
com **coleta consolidada** (Adicionar ponto de coleta), P2 multi-destinatário com itens via **Adicionar
chaves**, P3 com **cliente novo** (prompt **Criar cadastro**) e **Usar estimativa**. Defina **Valor do frete
cobrado** manualmente em cada um. ✅ VERIFICAR: totais (volumes/peso/valor) somam certo; o frete calculado
aparece; ao criar, o pedido surge na fila e (se houver cliente) no histórico do cliente.

**Dia 6 — Confirmação e fila.** Confirme ~5 pedidos (modal: Valor do frete, Forma de pagamento — varie
PIX/Boleto/Dinheiro, Data de coleta). Recuse 1 (vai p/ Cancelados). Teste abas/contadores, ordenação de
colunas, busca, **Exportar**, seleção múltipla. ✅ VERIFICAR: cada confirmação **cria uma Receita** em
**Financeiro → Receitas** (status A Receber, valor = frete); recusar **não** deixa receita ativa; KPI "A
receber" sobe.

**Dia 7 — Detalhe do Pedido.** Em 2 pedidos: edite o Financeiro (Cobranças adicionais, Taxa improdutiva,
Fator de cubagem), registre uma **Ocorrência**, **anexe** um arquivo, gere **CT-e**. **Cancele** 1 pedido
(motivo obrigatório). ✅ VERIFICAR: histórico de eventos registra tudo; o status aparece em Operações e em
`/rastrear`; cancelar **estorna** a receita.

### SEMANA 2 — Programação, viagens e motorista (o coração)
**Dia 8 — Despacho.** Programe os pedidos confirmados **arrastando** para dia×caminhão; depois teste
**Planejar automaticamente**; confira **peso·volume** por célula; **Devolver à fila** em 1. Tente
sobrecarregar 1 caminhão acima da capacidade. ✅ VERIFICAR: pedidos somem de "a despachar" (badge da sidebar
cai); Operações reflete.

**Dia 9 — Viagens (criação).** Crie **2 viagens**: uma via **Pedidos → Criar viagem** (seleção múltipla) e
uma via **Nova Viagem** com **COMBOIO** (Adicionar veículo — 2 caminhões/2 motoristas) e **Adiantamento ao
motorista** preenchido. ✅ VERIFICAR: KPIs de Viagens (Planejadas +), cards mostram selo **comboio 2**.

**Dia 10 — Viagem (preparação) + API DE ROTAS.** Abra uma viagem: **Otimizar rota** (➜ com a chave do
Google, deve reordenar por distância real e **gravar km/custo estimado**; sem chave, usa CEP). Reordene
paradas arrastando e com ↑/↓; abra **Google Maps**; gere **Romaneio PDF** e, no comboio, o **Romaneio por
veículo**. **Iniciar** a viagem. ✅ VERIFICAR: aparece "Trajeto previsto: ~X km"; o caminhão vira **on_route**
em Frota/Operações; pedidos viram **collecting**; PDF abre com os dados certos.

**Dia 11 — Portal do Motorista (execução real).** Logue como **motorista** (janela ≤414px). Abra a viagem:
**Checklist de saída** → **Confirmar checklist**; em cada parada **Confirmar Chegada** → **Confirmar
Coleta**; numa entrega anexe **NF (obrigatório)** + **Assinatura** (assine na tela) + **Nome do recebedor**
→ **Confirmar Entrega**. Veja o **Histórico**. ✅ VERIFICAR: o **Progresso (x/y)** sobe; admin → Detalhe da
Viagem mostra as paradas concluídas e a NF anexada; pedidos mudam status.

**Dia 12 — Motorista (exceções — testar TODOS os fluxos).** **Registrar Ocorrência** (escolha cada Tipo ao
menos uma vez, com Descrição e Foto), **Destinatário ausente** (teste as 3 opções), **Carga não estava
pronta**, **Entrega parcial** (Volumes entregues + Motivo dos demais), **Adicionar informação** a uma
ocorrência existente. ✅ VERIFICAR: cada ocorrência aparece em **Admin → Ocorrências** (KPI "Em aberto" +) e
em `/rastrear`; entrega parcial reflete no status do pedido.

**Dia 13 — Encerramento da viagem (financeiro).** **Encerrar Viagem:** Km final, Combustível (litros + R$),
Pedágios, **Outros gastos** (adicione ≥3 categorias diferentes: Alimentação, Pernoite, Manutenção em rota),
Observações. Confira na hora: **Lucro líquido**, **Margem**, **Custo por km**, **Eficiência km/L**,
**Estimado × Real (km e custo, desvio %)**, **Acerto/comissão** (no comboio, **rateio por veículo**). ✅
VERIFICAR (cruzando telas): os gastos viraram **Despesas** (Financeiro → Despesas, status Pago); a comissão
virou despesa **a pagar** (salaries); o **caminhão voltou available**; o **km** foi gravado no veículo; o
km/L entrou no histórico de consumo do veículo.

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

**Dia 21 — Torre de Operações (consolidação + cruzamento).** Releia o **Painel de Operações** com toda a
massa de dados. **Cruze cada métrica** com a tela de origem: "Frota disponível/Em rota/Ocupação" × **Frota**
× **Indicadores**; "Entregas hoje/OTD" × **Indicadores**; "A receber/A pagar" × **Financeiro**; Pipeline ×
**Pedidos**; "Ocorrências abertas" × **Ocorrências**. Confira **Fila de ação**, **Exceções**, **Capacidade
do dia** (Peso/Volume), **Operação (Hoje/Amanhã/Semana)**, **Frota agora**. ✅ VERIFICAR e **listar toda
divergência numérica entre telas**.

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
> "Você é um QA sênior. Execute a **Simulação v3 (EXAUSTIVA)** do `VELOX_SIMULACAO_30DIAS.md` **pela
> interface (clicando/preenchendo), não pela API**, usando o `VELOX_MAPA_SIMULACAO.md` para os nomes
> exatos. Comece pelo **Pré-voo (§1)** preenchendo **todos** os campos (inclusive a Tabela de Preços e a
> chave do Google Maps). Faça **um dia por vez**; em cada passo, execute os **✅ VERIFICAR** conferindo os
> KPIs/dados na hora. Mantenha o Console (F12) e a aba Network abertos e registre todo erro/4xx/5xx. Use o
> **formato de relatório §0.3**; entregue resumo ao fim de cada dia, a **Verificação final de dados (§4)** e
> o **relatório consolidado** no fim. Não exclua dados que não sejam de teste. Pergunte se faltar
> credencial ou a chave do Google Maps."

### Critérios de "passou/não passou" (resumo executivo esperado)
Fluxo crítico inteiro funciona? · Números consistentes entre telas? · Bugs CRÍTICOS/ALTOS? · Top 10
melhorias (impacto × esforço) · Nota por módulo (0–10) e nota geral.

> Fim do roteiro v3. (Fonte da UI: `VELOX_MAPA_SIMULACAO.md`.)

# SIMULAÇÃO DE 30 DIAS — VELOX TRANSPORTADORA

**Versão:** 1.0 — Cenário Transportadora Rodoviária de Cargas
**Base:** `VELOX_MAPEAMENTO.md` / `VELOX_SYSTEM.md`
**Objetivo:** Validação **manual, passo a passo**, de TODAS as telas, formulários, botões e regras de negócio do Velox TMS, em uma operação fictícia de 30 dias com 3 carretas. Ao final, há o **batimento matemático** de DRE, fluxo de caixa, aging de recebíveis e estado da frota.

---

> ## ⚠️ LEIA ANTES DE COMEÇAR — REGRAS DE OURO
>
> 1. **Sequência estrita:** faça cada ação na ordem e no "dia" indicado. O batimento final do financeiro depende da fidelidade dos dados.
> 2. **Valores definidos:** sempre que indicado um **Valor do frete (R$)**, digite exatamente o valor informado (a calculadora dá uma *estimativa*; aqui fixamos o valor confirmado para o caixa fechar).
> 3. **Datas relativas:** "Hoje − N dias" significa contar N dias para trás a partir da data em que você está testando. Use o seletor de data de cada tela.
> 4. **Migrations:** antes de começar, garanta que as migrations do Supabase foram aplicadas (status `cancelled` de receitas, `advance` de viagens, `documents` da empresa, e as funções de segurança). Veja `supabase/SIMULACAO.md`.
> 5. **Papéis:** o roteiro é executado como **admin**. No Dia 7 há um teste de restrição do papel **operador**.

---

## 🚚 PERFIL DA TRANSPORTADORA

```
┌──────────────────────────────────────────────────────────────┐
│                     VELOX TRANSPORTADORA                       │
├──────────────────┬─────────────────────────────────────────────┤
│ Segmento         │ Transporte rodoviário de cargas (carga seca)│
│ Frota            │ 3 veículos (2 carretas + 1 truck)           │
│ Cidade / Estado  │ São Paulo / SP                              │
│ Telefone         │ (11) 3322-1100                              │
│ WhatsApp         │ (11) 97777-6655                             │
│ E-mail           │ contato@veloxtransportes.com.br             │
│ CNPJ             │ 55.444.333/0001-22                          │
│ Endereço         │ Rod. Anhanguera, km 18 — Galpão 4           │
└──────────────────┴─────────────────────────────────────────────┘
```

## ⚙️ PARÂMETROS COMERCIAIS (tabela de frete padrão)

| Parâmetro | Valor |
|---|---|
| Preço por kg | R$ 0,90 |
| Preço por km | R$ 2,50 |
| Taxa fixa | R$ 80,00 |
| Frete mínimo | R$ 250,00 |
| GRIS | 0,30% |
| Ad Valorem | 0,15% |
| TDE (por NF) | R$ 15,00 |
| TDA (por NF) | R$ 12,00 |
| Pedágio (por kg) | R$ 0,02 |
| Alíquota fiscal (deduções DRE) | 8% |
| Depreciação mensal | R$ 1.500,00 |
| Dias úteis de operação | Seg a Sex |
| Antecedência mínima de coleta | 2 dias úteis |
| Alerta CNH / CRLV / Seguro | 60 / 60 / 30 dias |

## 🚛 FROTA

| Apelido | Placa | Veículo | Tipo | Capacidade | CRLV vence | Seguro vence | Obs. |
|---|---|---|---|---|---|---|---|
| T1 | RKT-1A23 | Mercedes Actros 2651 | Carreta | 27.000 kg | +80 dias | +120 dias | — |
| T2 | RKT-2B45 | Volvo FH 540 | Carreta | 30.000 kg | **+20 dias** | +200 dias | dispara alerta CRLV |
| T3 | RKT-3C67 | VW Constellation 24.280 | Truck | 12.000 kg | +200 dias | **+8 dias** | seguro vencendo + manutenção |

## 👷 MOTORISTAS

| Apelido | Nome | CNH | Vence | Contrato | Salário |
|---|---|---|---|---|---|
| D1 | João da Silva | E | +300 dias | CLT | R$ 3.800 |
| D2 | Carlos Pereira | E | **+45 dias** | CLT | R$ 3.800 |
| D3 | Marcos Antônio | D | +600 dias | PJ | por viagem |

> D2 deve disparar **alerta de CNH** (≤ 60 dias) no Dia 28.

## 🧑‍💼 CLIENTES

| Apelido | Nome | Tipo | Perfil | Cobrança |
|---|---|---|---|---|
| CL1 | Distribuidora Brasil Ltda | PJ | Recorrente | **Mensal** (dia 25, prazo 30d) |
| CL2 | Indústria Aurora S.A. | PJ | Recorrente | Por viagem (**tabela negociada**) |
| CL3 | Comércio Pinheiro ME | PJ | Eventual | Por viagem |
| CL4 | AgroPeças MG Ltda | PJ | Eventual | Por viagem |
| CL5 | Mariana Lima | PF | Eventual | Por viagem |

## 🏭 FORNECEDORES

| Apelido | Nome | Categoria |
|---|---|---|
| F1 | Posto Rodoviário BR-116 | Combustível |
| F2 | Oficina TruckCenter | Manutenção |
| F3 | Carga Segura Seguros | Seguros |

---

# ══════════════════════════════════════════════════
# SEMANA 1 — CONFIGURAÇÃO E CADASTROS (Dias 1–7)
# ══════════════════════════════════════════════════

## DIA 1 — ACESSO E DADOS DA EMPRESA
**Módulos:** Login · Configurações → Empresa

- [ ] **1.1 — Acesso:** acesse `/login`. Entre com o usuário admin (criado no Supabase). **✅ VERIFICAR:** cai no **Painel de Operações** (`/admin`) com a sidebar mostrando os grupos *Fluxo* e *Cadastros & Gestão*.
- [ ] **1.2 — Dados da empresa:** vá em **Configurações** (`/admin/config`) → categoria **Empresa**. Preencha: Nome `Velox Transportadora`, CNPJ `55.444.333/0001-22`, Telefone `(11) 3322-1100`, WhatsApp `(11) 97777-6655`, E-mail `contato@veloxtransportes.com.br`, Endereço `Rod. Anhanguera, km 18 — Galpão 4`, Região `Grande SP e interior`. Clique em **Salvar**. **✅ VERIFICAR:** toast de sucesso.
- [ ] **1.3 — Categorias de Configurações:** confirme que a navegação lateral mostra **só parâmetros**: Empresa, Comercial & Preços, Operação, Alertas. **✅ VERIFICAR:** *Documentos*, *Mensagens* e *Mapa* **não** estão dentro de Configurações (são itens próprios do menu).

## DIA 2 — TABELA DE FRETE E ROTAS
**Módulos:** Configurações → Comercial & Preços

- [ ] **2.1 — Frete base e taxas:** em Configurações → **Comercial & Preços**, preencha a tabela de frete conforme a seção "Parâmetros comerciais" acima (kg 0,90; km 2,50; taxa fixa 80; mínimo 250; GRIS 0,30; Ad Valorem 0,15; TDE 15; TDA 12; pedágio 0,02). Salve.
- [ ] **2.2 — Parâmetros financeiros:** ainda em Preços, defina **Alíquota fiscal 8%** e **Depreciação mensal R$ 1.500**. Salve.
- [ ] **2.3 — Prazo de entrega por estado:** adicione na tabela de prazos: SP = 1, PR = 3, RJ = 2, MG = 2, SC = 4 (dias úteis). Salve.
- [ ] **2.4 — Tabela de Rotas:** adicione uma rota SP → PR com R$/kg `1,10` (corredor mais caro). **✅ VERIFICAR:** a linha aparece na grade de rotas.

## DIA 3 — OPERAÇÃO E ALERTAS
**Módulos:** Configurações → Operação · Alertas

- [ ] **3.1 — Área de atuação:** Configurações → **Operação** → cobertura por **estados**: adicione SP, PR, RJ, MG, SC. Salve. **✅ VERIFICAR:** os estados aparecem como tags.
- [ ] **3.2 — Agendamento:** ainda em Operação, marque dias de operação **Seg–Sex** e antecedência mínima **2** dias úteis. Salve.
- [ ] **3.3 — Alertas:** categoria **Alertas** → defina CNH `60`, CRLV `60`, Seguro `30` dias. Salve.

## DIA 4 — CADASTRO DA FROTA
**Módulos:** Frota → Carretas

- [ ] **4.1 — Cadastrar os 3 veículos:** vá em **Frota** (`/admin/frota`) → aba **Carretas** → "Novo Caminhão". Cadastre T1, T2 e T3 com **todos** os campos da tabela "Frota" (placa, fabricante, modelo, ano, tipo, capacidade, cor, RENAVAM, dimensões, vencimentos de CRLV/Seguro/Tacógrafo, km atual). Defina T3 com status **Manutenção**.
  - **✅ VERIFICAR:** a aba Carretas lista os 3 na **tabela densa** (DataTable). Clique no cabeçalho **Capacidade** → ordena. T2 e T3 mostram badge **"Vencendo"** na coluna Documentos.

## DIA 5 — CADASTRO DE MOTORISTAS
**Módulos:** Frota → Motoristas

- [ ] **5.1 — Cadastrar os 3 motoristas:** aba **Motoristas** → "Novo Motorista". Cadastre D1, D2, D3 com nome, CPF, telefone, CNH (número/categoria/vencimento), função, tipo de contrato e salário. Use os vencimentos da tabela "Motoristas".
  - **✅ VERIFICAR:** D2 aparece na lista com o aviso **"CNH vencendo"** (vence em 45 dias ≤ 60).

## DIA 6 — CADASTRO DE CLIENTES
**Módulos:** Cadastros → Clientes

- [ ] **6.1 — Cadastrar os 5 clientes:** vá em **Cadastros** (`/admin/cadastros`) → aba **Clientes** → "Novo Cliente". Cadastre CL1–CL5 com razão social, CNPJ/CPF, e-mail, telefone, perfil e endereço (use o CEP para auto-preencher).
  - Em **CL1 (Distribuidora Brasil)**: tipo de cobrança **Mensal**, dia de fechamento `25`, prazo `30` dias.
  - **✅ VERIFICAR:** a aba Clientes mostra a tabela ordenável; ordene por **Razão Social**.

## DIA 7 — FORNECEDORES, TABELA NEGOCIADA E PAPEL OPERADOR
**Módulos:** Cadastros → Fornecedores · Cliente (detalhe) · Configurações → Usuários

- [ ] **7.1 — Fornecedores:** aba **Fornecedores** → "Novo Fornecedor". Cadastre F1 (Combustível), F2 (Manutenção), F3 (Seguros).
- [ ] **7.2 — Tabela de frete negociada (CL2):** abra **CL2 (Indústria Aurora)** em `/admin/clientes/:id`. No card **Tabela de Frete**, clique em **Editar** e defina R$/kg `0,75` e frete mínimo `300`. Salve. **✅ VERIFICAR:** aparece "★ Tabela negociada".
- [ ] **7.3 — (Opcional) Restrição de operador:** se quiser testar papéis, crie um usuário operador no Supabase. Logado como operador, **✅ VERIFICAR:** os itens **Financeiro** e **Configurações** não aparecem na sidebar; `/admin/financeiro` redireciona/bloqueia.

---

# ══════════════════════════════════════════════════
# SEMANA 2 — PEDIDOS, DESPACHO E VIAGENS (Dias 8–15)
# ══════════════════════════════════════════════════

> A partir daqui usamos o **catálogo de pedidos** abaixo. Cada pedido tem um **Valor do frete** fixo (confirme exatamente esse valor).

| Pedido | Cliente | Rota | Peso | **Frete (R$)** | Status final | Forma pgto |
|---|---|---|---|---|---|---|
| P01 `VLX-2026-90001` | CL1 | SP → Campinas/SP | 8.000 kg | **1.950,00** | Entregue | PIX |
| P02 `90002` | CL2 | SP → Curitiba/PR | 12.000 kg | **3.400,00** | Entregue | Boleto |
| P03 `90003` | CL3 | SP → Santos/SP | 3.000 kg | **1.200,00** | Entregue | PIX |
| P04 `90004` | CL1 | SP → Belo Horizonte/MG | 6.000 kg | **2.500,00** | Entregue | Transferência |
| P05 `90005` | CL4 | SP → Ribeirão Preto/SP | 4.500 kg | **1.700,00** | Entregue | PIX |
| P06 `90006` | CL5 | SP → Sorocaba/SP | 800 kg | **550,00** | Entregue | Dinheiro |
| P07 `90007` | CL3 | SP → Rio de Janeiro/RJ | 5.000 kg | **2.700,00** | Entregue | Boleto |
| P08 `90008` | CL1 | SP → Campinas/SP | 7.000 kg | **1.850,00** | Entregue | PIX |
| P09 `90009` | CL2 | SP → Joinville/SC | 9.000 kg | **3.100,00** | Entregue | Transferência |
| P10 `90010` | CL4 | SP → Belo Horizonte/MG | 3.500 kg | **1.550,00** | Entregue | PIX |
| P11 `90011` | CL5 | SP → Santos/SP | 1.200 kg | **650,00** | Entregue | PIX |
| P12 `90012` | CL2 | SP → Curitiba/PR | 11.000 kg | **3.200,00** | Em trânsito | — |
| P13 `90013` | CL3 | SP → Rio de Janeiro/RJ | 5.500 kg | **2.800,00** | Confirmado | — |
| P14 `90014` | CL1 | SP → Campinas/SP | 6.500 kg | **1.800,00** | Confirmado | — |
| P15 `90015` | CL4 | SP → BH/MG | 3.500 kg | _(sem frete)_ | Novo | — |
| P16 `90016` | CL3 | SP → Curitiba/PR | — | _(cancelado)_ | Cancelado | — |

## DIA 8 — COTAÇÃO E AGENDAMENTO PELO SITE PÚBLICO
**Módulos:** Site público (`/cotacao`, `/agendar`)

- [ ] **8.1 — Cotação:** abra `/cotacao`. Informe origem SP → destino PR, 1 item de 12.000 kg, valor declarado R$ 80.000. **✅ VERIFICAR:** o `FreightBreakdown` mostra peso taxável, GRIS, Ad Valorem, TDE/TDA e o total estimado; e o prazo (PR = 3 dias úteis).
- [ ] **8.2 — Agendamento (gera P01):** abra `/agendar`. Preencha os 5 passos como **CL1**, origem SP, destino Campinas/SP, 1 destinatário com 1 item de 8.000 kg. **✅ VERIFICAR:** ao concluir, é gerado um **protocolo `VLX-2026-…`** e a tela de sucesso aparece.
- [ ] **8.3 — Cobertura:** ainda em `/agendar`, teste um CEP de estado fora da cobertura (ex.: BA). **✅ VERIFICAR:** aparece o aviso "Região não atendida" e o botão Próximo bloqueia.
- [ ] **8.4 — No painel:** vá em **Operações** (`/admin`). **✅ VERIFICAR:** a **fila de ação** mostra "1 pedido aguardando confirmação" e a sidebar mostra o badge em **Pedidos**.

## DIA 9 — CONFIRMAR E CRIAR PEDIDOS INTERNOS
**Módulos:** Pedidos (`/admin/coletas`) · Novo Pedido

- [ ] **9.1 — Confirmar P01:** em **Pedidos**, aba **Novos**, clique em **Confirmar** na linha do P01. No painel lateral: data de coleta (Hoje − 22 dias), caminhão sugerido **T1**, **Valor do frete R$ 1.950,00**, forma **PIX**. Confirme. **✅ VERIFICAR:** o pedido vira **Confirmado** e foi criada uma **receita** (Financeiro → Receitas) de R$ 1.950,00 — sem duplicar.
- [ ] **9.2 — Novo Pedido interno (P02, cliente com tabela negociada):** clique em **Novo Pedido**. Busque o cliente **CL2**. **✅ VERIFICAR:** o resumo indica "cliente com tabela de frete negociada". Preencha origem/destino (Curitiba/PR), 1 destinatário, 1 item 12.000 kg. Defina **Valor do frete R$ 3.400,00**, CIF, forma Boleto, motorista D2, caminhão T2. Salve.
- [ ] **9.3 — Importar XML da NF-e:** ainda criando um pedido, no bloco do destinatário clique em **"Importar XML da NF-e"** e selecione um XML de NF-e real. **✅ VERIFICAR:** nome/CNPJ/endereço do destinatário, número da NF, peso, volumes e valor são preenchidos automaticamente.
- [ ] **9.4 — Criar P03, P04, P05:** repita o Novo Pedido para P03, P04 e P05 (valores da tabela). Deixe-os como **Novo** (serão confirmados/despachados nos próximos dias) ou confirme conforme preferir — o importante é existir.

## DIA 10 — DESPACHO (QUADRO CAMINHÕES × DIAS)
**Módulos:** Despacho (`/admin/despacho`)

- [ ] **10.1 — Programar pela fila:** em **Despacho**, veja a **fila** à esquerda (confirmados sem viagem). Marque **P01 + P03** (checkbox). **✅ VERIFICAR:** a barra mostra "2 selecionados · 11.000 kg".
- [ ] **10.2 — Alocar na célula:** clique na célula **T1 × (dia da coleta)** do quadro. **✅ VERIFICAR:** os dois pedidos aparecem na célula com a barra de capacidade; se o peso passar da capacidade, o sistema bloqueia.
- [ ] **10.3 — Ações em lote:** selecione novamente os pedidos e use **"Criar viagem"** na barra de seleção (atalho que leva à Nova Viagem já com os pedidos marcados). Volte sem salvar para testar o fluxo pela célula no próximo dia.

## DIA 11 — VIAGEM V1: EXECUÇÃO COMPLETA + POD
**Módulos:** Nova Viagem · Detalhe da Viagem · App do Motorista

- [ ] **11.1 — Criar viagem V1:** na célula T1 do despacho, clique em **"Viagem"** (ou vá em `/admin/viagens/nova`). Selecione **P01 + P03**, motorista **D1**, caminhão **T1**, **Adiantamento R$ 500,00**, data de saída. Crie a viagem. **✅ VERIFICAR:** foi criada uma **despesa pendente** de adiantamento (R$ 500) em Financeiro → Despesas.
- [ ] **11.2 — Romaneio:** no detalhe da viagem, clique em **Romaneio PDF**. **✅ VERIFICAR:** baixa um PDF com motorista, placa, paradas, NFs e campos de assinatura.
- [ ] **11.3 — Iniciar:** clique em **Iniciar**. **✅ VERIFICAR:** status vira "Em andamento" e os pedidos vão para **Em coleta**.
- [ ] **11.4 — App do motorista (POD):** abra `/motorista` (logado como o motorista, ou apenas percorra a tela). **✅ VERIFICAR:** aparece o **checklist de saída** (pneus, luzes, CRLV, carga, óleo) — marque todos e confirme. Em uma parada de **entrega**, anexe a NF, informe o **nome do recebedor** e capture a **assinatura** no canvas. **✅ VERIFICAR:** "Confirmar Entrega" só habilita com NF **e** assinatura.
- [ ] **11.5 — Encerrar V1:** de volta ao detalhe da viagem (admin), clique em **Encerrar Viagem**: Km final, litros, **Custo combustível R$ 1.100,00**, **Pedágios R$ 180,00**. Confirme. **✅ VERIFICAR:** status "Concluída"; pedidos P01 e P03 viram **Entregue**; foram criadas **despesas** de combustível/pedágio; odômetro de T1 atualizado.
- [ ] **11.6 — Comprovante:** abra o pedido P01 → menu **⋯** → **Comprovante PDF**. **✅ VERIFICAR:** o PDF embute a **assinatura** do recebedor e o nome.

## DIA 12 — VIAGENS V2 e V3
**Módulos:** Despacho · Viagens

- [ ] **12.1 — V2 (T2/D2):** confirme/despache **P02** e crie a viagem V2. Encerre com **combustível R$ 1.600,00 · pedágios R$ 240,00**. P02 → Entregue.
- [ ] **12.2 — V3 (T1/D1):** confirme/despache **P04 + P05**, crie V3, encerre com **combustível R$ 1.050,00 · pedágios R$ 160,00**. P04 e P05 → Entregue.

## DIA 13 — RASTREAMENTO E HISTÓRICO DO MOTORISTA
**Módulos:** Site público (`/rastrear`) · App motorista

- [ ] **13.1 — Rastreamento público:** abra `/rastrear` e busque pelo protocolo do P02. **✅ VERIFICAR:** a timeline mostra os status e o status por destinatário, **sem** exigir login (usa a função segura `track_order`).
- [ ] **13.2 — Histórico do motorista:** em `/motorista/historico`, **✅ VERIFICAR:** as viagens concluídas de D1 aparecem com km e paradas.

## DIA 14 — CANCELAMENTO E DUPLICAÇÃO
**Módulos:** Pedido (workspace)

- [ ] **14.1 — Pedido cancelado (P16):** crie um pedido rápido para CL3 (P16) e, no workspace dele, menu **⋯ → Cancelar pedido**. Informe o motivo "Cliente desistiu da carga". **✅ VERIFICAR:** status **Cancelado**; eventual receita pendente é **estornada**; o motivo fica no histórico.
- [ ] **14.2 — Duplicar:** em um pedido entregue (ex.: P04), menu **⋯ → Duplicar**. **✅ VERIFICAR:** abre o Novo Pedido pré-preenchido (datas e status zerados).

## DIA 15 — MENSAGENS DO SITE → PEDIDO
**Módulos:** Site público (Contato) · Mensagens

- [ ] **15.1 — Enviar contato:** no site público, seção Contato, envie uma mensagem como um lead. **✅ VERIFICAR:** em **Mensagens** (`/admin/mensagens`) ela aparece com badge de não lida na sidebar.
- [ ] **15.2 — Converter em pedido:** abra a mensagem e clique em **"Criar pedido"**. **✅ VERIFICAR:** abre o Novo Pedido já com nome/telefone/e-mail e o texto do contato nas observações.

---

# ══════════════════════════════════════════════════
# SEMANA 3 — MAIS OPERAÇÃO + FINANCEIRO (Dias 16–23)
# ══════════════════════════════════════════════════

## DIA 16–18 — VIAGENS V4, V5, V6 (entregas restantes)
**Módulos:** Despacho · Viagens

- [ ] **16.1 — V4 (T2/D3):** despache **P06 + P07**, encerre com **combustível R$ 900,00 · pedágios R$ 130,00**. P06, P07 → Entregue.
- [ ] **17.1 — V5 (T1/D1):** despache **P08 + P09**, encerre com **combustível R$ 1.500,00 · pedágios R$ 220,00**. P08, P09 → Entregue.
- [ ] **18.1 — V6 (T2/D2):** despache **P10 + P11**, encerre com **combustível R$ 750,00 · pedágios R$ 110,00**. P10, P11 → Entregue.
- [ ] **✅ VERIFICAR (parcial):** ao fim do Dia 18, há **11 pedidos entregues** (P01–P11) e 6 viagens concluídas. Total de combustível lançado = **R$ 6.900,00**; pedágios = **R$ 1.040,00**.

## DIA 19 — MANUTENÇÃO DO T3
**Módulos:** Frota → Detalhe do Caminhão

- [ ] **19.1 — Registrar manutenção:** abra **T3** (`/admin/frota/:id`) → seção Manutenções → "Registrar": tipo Revisão, descrição "Revisão preventiva + freios", **valor R$ 1.850,00**, fornecedor **F2 (Oficina TruckCenter)**. Salve. **✅ VERIFICAR:** foi criada uma **despesa pendente** de manutenção de R$ 1.850,00.
- [ ] **19.2 — Dar baixa:** em Financeiro → Despesas, dê baixa nessa despesa (PIX, hoje − 6 dias). **✅ VERIFICAR:** status vira **Pago**.

## DIA 20 — DOCUMENTOS
**Módulos:** Documentos (`/admin/documentos`)

- [ ] **20.1 — NFs assinadas:** aba **Pedidos e Viagens**. **✅ VERIFICAR:** as NFs assinadas das entregas aparecem com link "Ver".
- [ ] **20.2 — Frota / Motoristas:** abas correspondentes — **✅ VERIFICAR:** CRLV/Seguro/Tacógrafo (com badges de vencimento) e CNH dos motoristas.
- [ ] **20.3 — Upload manual (Empresa):** aba **Empresa** → categoria "Licença ANTT/RNTRC", anexe um arquivo. **✅ VERIFICAR:** o documento entra na lista com categoria e data; o botão "Ver" abre o arquivo.

## DIA 21 — DESPESAS FIXAS DO MÊS
**Módulos:** Financeiro → Despesas

- [ ] **21.1 — Lançar despesas (todas Pagas, datas dentro do mês):**
  - [ ] Salários (motoristas CLT): Categoria **Salários**, **R$ 7.600,00**, Transferência, Hoje − 5 dias.
  - [ ] Aluguel do galpão: Categoria **Aluguel**, **R$ 4.500,00**, Boleto, Hoje − 10 dias.
  - [ ] Seguro da frota (parcela): Categoria **Seguros**, **R$ 1.800,00**, Boleto, Hoje − 12 dias.
  - [ ] Administrativo (contador/telefonia): Categoria **Administrativo**, **R$ 900,00**, PIX, Hoje − 8 dias.
  - **✅ VERIFICAR:** o painel de **aging de despesas** soma corretamente; estas entram como **Pagas**.

## DIA 22 — RECEITAS E AGING
**Módulos:** Financeiro → Receitas

- [ ] **22.1 — Marcar recebidas:** as receitas dos 11 pedidos entregues (P01–P11) devem ser marcadas como **Recebido** (botão "Recebido"). Total recebido = **R$ 21.150,00**.
- [ ] **22.2 — Aging dos abertos:** ajuste as datas de vencimento para exercitar o aging:
  - P13 (R$ 2.800) → **vencida** (vencimento no passado).
  - P12 (R$ 3.200) → **vence em ≤ 7 dias**.
  - P14 (R$ 1.800) → **vence em 8–30 dias**.
  - **✅ VERIFICAR:** as faixas de aging mostram Vencidas R$ 2.800, ≤7 dias R$ 3.200, 8–30 dias R$ 1.800. Clicar numa faixa filtra a lista.

## DIA 23 — VIAGEM EM ANDAMENTO (V7)
**Módulos:** Despacho · Viagens

- [ ] **23.1 — Confirmar e iniciar V7 (P12):** confirme o P12 (R$ 3.200), despache para **T2/D2** e **Inicie** a viagem (não encerre). **✅ VERIFICAR:** no Painel de Operações, **Frota agora** mostra T2 "Em rota" com progresso de paradas; o P12 fica **Em trânsito**.

---

# ══════════════════════════════════════════════════
# SEMANA 4 — FECHAMENTO E AUDITORIA (Dias 24–30)
# ══════════════════════════════════════════════════

## DIA 24 — PEDIDOS CONFIRMADOS A DESPACHAR
**Módulos:** Pedidos

- [ ] **24.1 — Confirmar P13 e P14** (sem criar viagem ainda): confirme ambos com os valores da tabela (R$ 2.800 e R$ 1.800). **✅ VERIFICAR:** ficam **Confirmados sem viagem** → aparecem na fila do Despacho e no badge "Despacho" da sidebar.

## DIA 25 — FATURAMENTO MENSAL (CL1)
**Módulos:** Cliente (detalhe)

- [ ] **25.1 — Fechar fatura mensal:** abra **CL1** (`/admin/clientes/:id`). Como é cobrança **mensal**, clique em **"Fechar fatura"**. **✅ VERIFICAR:** o modal lista os fretes do mês do CL1 (P01, P04, P08, P14), mostra o total e a data de vencimento (fechamento dia 25 + 30 dias). *Obs.: gere a fatura apenas se quiser testar — isso cria uma receita consolidada; para o batimento abaixo, considere que as receitas individuais já foram contabilizadas.*

## DIA 28 — ALERTAS DA FROTA E DOCUMENTOS
**Módulos:** Alertas (sino) · `/admin/alertas`

- [ ] **28.1 — Sincronizar e revisar alertas:** abra o **Painel de Operações** (dispara o `syncAlerts`) e o sino no topo. Acesse `/admin/alertas`. **✅ VERIFICAR:** existem alertas de **CNH do D2** (≤45d), **CRLV do T2** (≤20d) e **Seguro do T3** (≤8d, crítico). A fila de ação do painel mostra "alertas críticos".

## DIA 29 — DESPESA FUTURA (TESTE DO FILTRO DO MÊS)
**Módulos:** Financeiro → Despesas · DRE

- [ ] **29.1 — Lançar despesa futura:** em Despesas → Nova Despesa: "Parcela mesa hidráulica (oficina)", Categoria **Manutenção**, **R$ 1.200,00**, Status **Pendente**, **Data: Hoje + 27 dias** (mês seguinte).
- [ ] **29.2 — Validar exclusão:** **✅ VERIFICAR:** essa despesa **não** entra no DRE do mês atual nem no fluxo de caixa do mês (vencimento fora do período). Ela aparece só como pendente futura.

## DIA 30 — AUDITORIA E BATIMENTO FINANCEIRO
**Módulos:** Financeiro → DRE · Fluxo de Caixa · Receitas

### ✅ 30.1 — Batimento do DRE (Financeiro → DRE, mês atual)

```
┌────────────────────────────────────────────────────────────┐
│                 DRE — MÊS DA SIMULAÇÃO                       │
├───────────────────────────────────────────┬────────────────┤
│ (+) Receita Bruta (fretes)                │  R$ 28.950,00  │
│      • Recebida (11 entregues)            │  R$ 21.150,00  │
│      • A receber (1 em trânsito + 2 conf.)│  R$  7.800,00  │
│ (-) Deduções fiscais estimadas (8%)       │  R$  2.316,00  │
│ (=) Receita Líquida                       │  R$ 26.634,00  │
├───────────────────────────────────────────┼────────────────┤
│ (-) Custos Variáveis                      │  R$  9.790,00  │
│      • Combustível (viagens)              │  R$  6.900,00  │
│      • Pedágios (viagens)                 │  R$  1.040,00  │
│      • Manutenção (T3)                    │  R$  1.850,00  │
│ (-) Custos Fixos                          │  R$ 14.800,00  │
│      • Salários                           │  R$  7.600,00  │
│      • Aluguel                            │  R$  4.500,00  │
│      • Seguros                            │  R$  1.800,00  │
│      • Administrativo                     │  R$    900,00  │
│ (-) Outras despesas (adiantamento viagem) │  R$    500,00  │
│ (=) EBITDA                                │  R$  1.544,00  │
│ (-) Depreciação mensal                    │  R$  1.500,00  │
│ (=) LUCRO LÍQUIDO DO PERÍODO              │  R$     44,00  │
└───────────────────────────────────────────┴────────────────┘
```
> Operação praticamente no **ponto de equilíbrio**: o EBITDA é positivo (R$ 1.544), e o lucro líquido fica próximo de zero após a depreciação (custo não-caixa). Sinal típico de frota com ocupação a melhorar — exatamente o tipo de leitura que o gestor faz aqui.

- [ ] **✅ VERIFICAR (Resultado por Caminhão):** ainda na DRE, o card **Resultado por Caminhão** mostra receita (fretes atribuídos) vs despesas diretas por T1/T2/T3.

### ✅ 30.2 — Batimento do Fluxo de Caixa (Financeiro → Fluxo / Fechamento)

```
┌────────────────────────────────────────────────────────────┐
│                 CAIXA — MÊS DA SIMULAÇÃO                     │
├───────────────────────────────────────────┬────────────────┤
│ ENTRADAS (recebidas)                      │  R$ 21.150,00  │
│      • PIX                                │  R$  8.900,00  │
│      • Boleto                             │  R$  6.100,00  │
│      • Transferência                      │  R$  5.600,00  │
│      • Dinheiro                           │  R$    550,00  │
├───────────────────────────────────────────┼────────────────┤
│ SAÍDAS (pagas)                            │  R$ 24.590,00  │
│      • Salários                           │  R$  7.600,00  │
│      • Combustível                        │  R$  6.900,00  │
│      • Aluguel                            │  R$  4.500,00  │
│      • Seguros                            │  R$  1.800,00  │
│      • Manutenção                         │  R$  1.850,00  │
│      • Pedágios                           │  R$  1.040,00  │
│      • Administrativo                     │  R$    900,00  │
│ (=) SALDO DE CAIXA DO MÊS                 │ - R$  3.440,00 │
└───────────────────────────────────────────┴────────────────┘
```
> **Conferência do PIX:** P01 1.950 + P03 1.200 + P05 1.700 + P08 1.850 + P10 1.550 + P11 650 = **R$ 8.900**. Boleto: P02 3.400 + P07 2.700 = **R$ 6.100**. Transferência: P04 2.500 + P09 3.100 = **R$ 5.600**. Dinheiro: P06 = **R$ 550**. Total = **R$ 21.150** ✓.
> O saldo negativo (− R$ 3.440) é esperado: R$ 7.800 ainda estão **a receber** e o adiantamento (R$ 500) está pendente — dinheiro que entra/sai depois.

### ✅ 30.3 — Batimento do Aging (Financeiro → Receitas)
- [ ] **✅ VERIFICAR:** Recebido **R$ 21.150** · Vencidas **R$ 2.800** (P13) · ≤7 dias **R$ 3.200** (P12) · 8–30 dias **R$ 1.800** (P14). Total a receber em aberto = **R$ 7.800**.

### ✅ 30.4 — Batimento da Frota e Alertas
- [ ] **✅ VERIFICAR:** T1 e T2 **Disponível** (após encerrar viagens) / T2 pode estar "Em rota" se a V7 não foi encerrada; T3 **Manutenção**. Alertas ativos: CNH D2, CRLV T2, Seguro T3.

### ✅ 30.5 — Checklist de cobertura de telas
- [ ] Operações (painel) · Pedidos (pipeline + ações inline + ordenação) · Despacho (quadro + lote) · Frota (carretas/motoristas/simulador) · Cadastros (clientes/fornecedores) · Documentos (4 abas) · Mensagens (+ criar pedido) · Financeiro (resumo/receitas/despesas/DRE/fluxo) · Configurações (4 categorias) · Site público (cotação/agendar/rastrear) · App do motorista (checklist/POD/assinatura).

---

> **Observação final:** os valores acima foram definidos para fechar exatamente quando você seguir a tabela de pedidos e os custos indicados. Se algum total não bater, confira (1) se digitou o **Valor do frete** exato, (2) se marcou as receitas dos entregues como **Recebido**, e (3) se lançou as despesas com as **datas dentro do mês** corrente.

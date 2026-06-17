# Simulação de 30 dias — Transportadora FRACIONADA por faixa de CEP

> **Cenário desta simulação (a "hora da verdade")**
> Uma transportadora que opera **100% frete fracionado (LTL)** numa região definida **por faixa de CEP** (Grande SP + Baixada + Campinas + Vale do Paraíba). Muitos pedidos pequenos, **consolidados em rotas** com várias entregas (milk-run). O objetivo é exercitar **todos os campos** e ver como o sistema se comporta nesse perfil — cobertura por CEP, peso cubado, consolidação e fechamento financeiro.
>
> Este é um roteiro **manual**: você executa cada passo nas telas reais. Onde aparece `✅ VERIFICAR`, confira o resultado antes de seguir.

---

## Regras de ouro

1. Faça **na ordem**. A Semana 1 (configuração + cadastros) é pré-requisito do resto.
2. Os valores são **fixos e calculados** — digite exatamente como está, para o batimento financeiro do fim fechar.
3. Datas: onde eu escrever **D+0 … D+29**, use dias corridos a partir de hoje (D+0 = hoje). Em "Vencimento", some os dias indicados.
4. Toda tela de cadastro segue o padrão de seções (cabeçalho → seções → rodapé fixo com **Cancelar / Salvar**). Campos com decimal aceitam **vírgula**.
5. Se algum campo/rótulo não existir exatamente como descrito, **anote o dia/passo** e me avise — é candidato a bug.

---

## Perfil da operação (resumo do que vamos montar)

| Item | Definição |
|---|---|
| Serviço | **Somente fracionado** |
| Cobertura | **Faixa de CEP** (4 faixas) |
| Frota | 3 veículos urbanos: VUC, 3/4 e Toco |
| Equipe | 3 motoristas (1 com ajudante por rota) |
| Clientes | 6 embarcadores (e-commerce / distribuidoras) |
| Fornecedores | 4 (combustível, manutenção, pneus, seguro) |
| Pedidos | 16 detalhados (P01–P16), consolidados em 5 rotas |

---

# SEMANA 1 — Configuração e cadastros (D+0 a D+6)

## DIA 1 (D+0) — Configurações da empresa

### 1.1 Configurações → Empresa
Menu **Configurações** → categoria **Empresa** → aba **Empresa**. Preencha:

| Campo | Valor |
|---|---|
| Nome da empresa | Velox Fracionado Ltda |
| CNPJ | 31.444.555/0001-22 |
| Telefone | (11) 4002-8922 |
| E-mail | operacao@veloxfracionado.com.br |
| WhatsApp | (11) 99100-2200 |
| Região de atuação | Grande SP, Baixada, Campinas e Vale do Paraíba |
| Endereço completo da sede | Rua do Cross-Docking, 500 — Galpão 3, Guarulhos/SP |
| Missão | Entregar cargas fracionadas com previsibilidade e baixo custo. |
| Visão | Ser a referência em distribuição fracionada no interior paulista. |
| Valores | Pontualidade, Cuidado com a carga, Transparência |
| Instagram | https://instagram.com/veloxfracionado |
| LinkedIn | https://linkedin.com/company/veloxfracionado |
| Facebook | (deixe em branco) |
| Google Maps API Key | (deixe em branco) |

**Salvar** → ✅ VERIFICAR: o botão fica verde **"Salvo!"** e aparece o toast de confirmação.

### 1.2 Configurações → Empresa → aba Site Público

| Campo | Valor |
|---|---|
| Título do Hero | Sua encomenda entregue no prazo, sem complicação. |
| Subtítulo do Hero | Transporte fracionado na Grande SP, Baixada, Campinas e Vale. |
| Texto "Sobre Nós" | Somos especialistas em cargas fracionadas: consolidamos suas entregas em rotas otimizadas, reduzindo seu custo de frete. |

**Salvar.**

---

## DIA 2 (D+1) — Preços e área de atuação

### 2.1 Configurações → Comercial & Preços → aba Preços

**Frete base:**
| Campo | Valor |
|---|---|
| Preço por kg (R$) | 1,00 |
| Preço por km (R$) | 0,00 |
| Taxa fixa por pedido (R$) | 20,00 |
| Frete mínimo (R$) | 100,00 |

**Taxas adicionais:**
| Campo | Valor |
|---|---|
| GRIS — % sobre valor declarado | 0,30 |
| Ad valorem — % sobre valor declarado | 0,00 |
| TDE — Despacho de entrega por NF (R$) | 5,00 |
| TDA — Despacho de coleta por NF (R$) | 5,00 |
| Pedágio — R$ por kg taxável | 0,00 |

**Prazo de entrega:**
| Campo | Valor |
|---|---|
| Velocidade média (km/dia) | 300 |
| Tabela por estado | adicione **SP → 1 dia** |

**Parâmetros financeiros:**
| Campo | Valor |
|---|---|
| Alíquota fiscal (%) | 6 |
| Depreciação mensal da frota (R$) | 1.500,00 |

**Salvar.**

> 📐 **Como o frete fracionado é calculado** (guarde esta fórmula — vamos conferir nos pedidos):
> `frete = peso_taxável × 1,00 + 20,00 (fixa) + valor_declarado × 0,30% (GRIS) + (5 TDE + 5 TDA) × nº de NFs`, com piso de **R$ 100,00**.
> **Peso taxável = maior valor entre o peso real e o peso cubado.** Cubado = `(Altura × Largura × Comprimento em cm) ÷ 6.000 × volumes`.

### 2.2 Configurações → Comercial & Preços → aba Tabela de Rotas
Deixe **vazia** (sem corredores) — o fracionado usará a tabela base. *(Mais tarde você pode testar criar um corredor; por ora, vazio.)*

### 2.3 Configurações → Operação → Área de Atuação ⭐ (núcleo deste cenário)

| Campo | Valor |
|---|---|
| Tipo de serviço prestado | **Somente frete fracionado** |
| Como você define sua área? | **Por faixa de CEP** |

**Adicione as 4 faixas de CEP** (CEP Inicial / CEP Final / Rótulo):
| CEP Inicial | CEP Final | Rótulo |
|---|---|---|
| 01000-000 | 09999-999 | Grande SP |
| 11000-000 | 11999-999 | Baixada Santista |
| 12000-000 | 12999-999 | Vale do Paraíba |
| 13000-000 | 13139-999 | Campinas / RMC |

| Campo | Valor |
|---|---|
| Mensagem para clientes fora da área | No momento não atendemos este CEP. Fale com a gente para avaliar uma exceção. |

**Salvar configurações de área.**

> ⚠️ Note o "buraco" proposital: CEP **10000-000** (entre Grande SP e Baixada) **não** é coberto — vamos usar isso para testar a rejeição.

### 2.4 Configurações → Operação → Regras de Agendamento

| Campo | Valor |
|---|---|
| Antecedência mínima | 1 dia útil |
| Dias de operação | Seg, Ter, Qua, Qui, Sex (desmarque Sáb e Dom) |

**Salvar.**

---

## DIA 3 (D+2) — Alertas e início da frota

### 3.1 Configurações → Alertas

| Campo | Valor |
|---|---|
| CNH do motorista | 60 dias antes |
| CRLV do caminhão | 60 dias antes |
| Seguro do caminhão | 30 dias antes |

**Salvar.**

### 3.2 Frota → Novo Caminhão — Veículo 1 (VUC)
**Identificação:** Placa `FRC-1A11` · Tipo **VUC** · Fabricante `Volkswagen` · Modelo `Delivery 6.160` · Ano `2022` · Cor `Branco` · RENAVAM `11111111111` · Chassi `9BWZZZ377NV100111`
**Capacidade e dimensões:** Capacidade `3500` kg · Dimensões baú `4,5 · 2,2 · 2,2`
**Documentação:** CRLV vence **D+85** · Seguro vence **D+120** · Tacógrafo última `D-300`, próxima **D+40**
**Quilometragem:** Km atual `82000` · alertas óleo `10000`, revisão `20000`, pneus `40000`
**Observações:** `Rota capital — entregas leves`
**Cadastrar.** → ✅ VERIFICAR: abre o detalhe do caminhão; status inicial **Disponível**.

### 3.3 Frota → Novo Caminhão — Veículo 2 (3/4)
Placa `FRC-2B22` · Tipo **Truck** *(use Truck; o sistema não tem "3/4" — registramos como Truck)* · Fabricante `Mercedes-Benz` · Modelo `Accelo 1016` · Ano `2021` · Cor `Branco` · RENAVAM `22222222222` · Chassi `9BWZZZ377MV200222`
Capacidade `6000` kg · Dimensões `5,5 · 2,3 · 2,4`
CRLV **D+45** · Seguro **D+200** · Tacógrafo última `D-330`, próxima **D+15**
Km atual `145000` · alertas óleo `15000`, revisão `30000`, pneus `50000`
Observações: `Rota mista capital + ABC`
**Cadastrar.**

### 3.4 Frota → Novo Caminhão — Veículo 3 (Toco)
Placa `FRC-3C33` · Tipo **Toco** · Fabricante `Volkswagen` · Modelo `Constellation 13.190` · Ano `2020` · Cor `Prata` · RENAVAM `33333333333` · Chassi `9BWZZZ377LV300333`
Capacidade `9000` kg · Dimensões `7,0 · 2,5 · 2,6`
CRLV **D+200** · Seguro **D+8** *(vai disparar alerta de seguro!)* · Tacógrafo última `D-200`, próxima **D+90**
Km atual `205000` · alertas óleo `15000`, revisão `30000`, pneus `50000`
Observações: `Rota interior — Campinas/Vale, consolida volume`
**Cadastrar.** → ✅ VERIFICAR: nos próximos dias, em Operações/Frota deve aparecer **alerta de Seguro vencendo** (8 dias < 30).

---

## DIA 4 (D+3) — Motoristas

### 4.1 Motoristas → Novo Motorista — Motorista 1
**Dados pessoais:** Nome `Antônio Ferreira` · CPF `123.456.789-01` · Nascimento `1986-03-10` · Telefone `(11) 97000-1001` · E-mail `antonio@veloxfracionado.com`
**CNH:** Número `12345678901` · Categoria **C** · Vencimento **D+400**
**Contrato:** Função **Motorista** · Tipo **CLT** · Admissão `D-600` · Salário base `2.600,00` · Status **Ativo**
**Endereço:** Rua 1, 100, Centro, Guarulhos/SP, CEP 07000-000
**Dados bancários:** Banco `Bradesco` · Agência `1111` · Conta `11111-1` · PIX `123.456.789-01`
**Observações:** `Rota capital (VUC)`
**Cadastrar motorista.**

### 4.2 Motoristas → Novo Motorista — Motorista 2
Nome `Beatriz Lima` · CPF `234.567.890-12` · Nascimento `1992-07-22` · Telefone `(11) 97000-1002` · E-mail `beatriz@veloxfracionado.com`
CNH `23456789012` · Categoria **C** · Vencimento **D+50** *(vai disparar alerta de CNH em 60 dias)*
Função **Motorista** · CLT · Admissão `D-300` · Salário `2.600,00` · Ativo
Endereço: Rua 2, 200, Centro, Osasco/SP, 06000-000
Banco `Itaú` · Ag `2222` · Conta `22222-2` · PIX `beatriz@veloxfracionado.com`
Observações: `Rota mista (3/4)`
**Cadastrar.** → ✅ VERIFICAR: alerta de **CNH vencendo** aparece para a Beatriz.

### 4.3 Motoristas → Novo Motorista — Motorista 3
Nome `Cláudio Souza` · CPF `345.678.901-23` · Nascimento `1980-11-05` · Telefone `(11) 97000-1003` · E-mail `claudio@veloxfracionado.com`
CNH `34567890123` · Categoria **D** · Vencimento **D+650**
Função **Motorista** · **PJ** · Admissão `D-150` · Salário `3.200,00` · Ativo
Endereço: Rua 3, 300, Industrial, Jundiaí/SP, 13201-000
Banco `Nubank` · Ag `0001` · Conta `33333-3` · PIX `(11) 97000-1003`
Observações: `Rota interior (Toco) — leva ajudante`
**Cadastrar.**

---

## DIA 5 (D+4) — Fornecedores

Cadastros → Fornecedores → **Novo Fornecedor** (4 vezes):

| # | Nome | CNPJ | Categoria | Endereço | Cond. pagamento | PIX |
|---|---|---|---|---|---|---|
| 1 | Posto Marginal Tietê | 11.111.111/0001-11 | Combustível | Marginal Tietê, 1000, São Paulo/SP | À vista | 11.111.111/0001-11 |
| 2 | DieselFix Mecânica | 22.222.222/0001-22 | Manutenção | Av. das Oficinas, 50, Guarulhos/SP | 28 dias | 22.222.222/0001-22 |
| 3 | PneuJá Distribuidora | 33.333.333/0001-33 | Pneus | Rua dos Pneus, 80, Osasco/SP | Boleto 15/30 | 33.333.333/0001-33 |
| 4 | Protege Seguros | 44.444.444/0001-44 | Seguros | Av. Paulista, 2000, São Paulo/SP | Mensal | 44.444.444/0001-44 |

Em cada um: preencha **Contato principal** (responsável, telefone, WhatsApp, e-mail) com dados fictícios e **Cadastrar**.

---

## DIA 6 (D+5) — Clientes (embarcadores)

Cadastros → Clientes → **Novo Cliente** (6 vezes). Todos **PJ**, **Ativo**.

| Cód. | Razão Social | CNPJ | IE | Perfil | Cobrança | CEP (sede) |
|---|---|---|---|---|---|---|
| C1 | Loja Online Tech ME | 50.111.111/0001-11 | 110.111.111 | Recorrente | **Mensal** (fecha dia 25, prazo 30d) | 04500-000 |
| C2 | Distribuidora Norte SP | 50.222.222/0001-22 | 110.222.222 | Recorrente | Por viagem | 02400-000 |
| C3 | Magazine Casa & Cia | 50.333.333/0001-33 | 110.333.333 | Recorrente | Por viagem | 09000-000 |
| C4 | AutoPeças Expressa | 50.444.444/0001-44 | 110.444.444 | Eventual | Por viagem | 13010-000 |
| C5 | Moda Vale Confecções | 50.555.555/0001-55 | 110.555.555 | Eventual | Por viagem | 12200-000 |
| C6 | EletroBaixada Atacado | 50.666.666/0001-66 | 110.666.666 | Eventual | Por viagem | 11000-000 |

- Para **C1** marque **Faturamento mensal** → dia de fechamento **25**, prazo **30** dias.
- Preencha em cada um o **e-mail**, **telefone**, **um contato** (Logística) e o **endereço** (use o CEP da tabela — o sistema autofill rua/cidade/UF).
- **Cadastrar** cada cliente.

---

## DIA 7 (D+6) — Revisão da Semana 1

✅ VERIFICAR antes de operar:
- Operações (`/admin`) mostra **3 caminhões** e alertas: **Seguro do FRC-3C33** (8d) e **CNH da Beatriz** (50d).
- Frota lista 3 veículos; Motoristas lista 3; Fornecedores 4; Clientes 6.
- Em Configurações → Operação, as **4 faixas de CEP** estão salvas e o serviço é **Somente fracionado**.

---

# SEMANA 2 — Captação de pedidos e cobertura (D+7 a D+14)

## DIA 8 (D+7) — Teste de cobertura no site público ⭐

Abra o **site público** (`/`) → fluxo de **cotação/agendamento**.

1. **CEP coberto:** informe destino **05409-000** (São Paulo, dentro de "Grande SP").
   ✅ VERIFICAR: o sistema **aceita** e segue para cotação/agendamento.
2. **CEP coberto (interior):** **13010-000** (Campinas).
   ✅ VERIFICAR: aceito.
3. **CEP NÃO coberto:** **10000-000** (buraco proposital) e **14010-000** (Ribeirão Preto).
   ✅ VERIFICAR: aparece a **mensagem de fora de área** ("No momento não atendemos este CEP…") e **bloqueia** o agendamento.

> Isso valida o `coverageChecker` (comparação por faixa de CEP). Se um CEP coberto for recusado (ou um fora for aceito), anote — é bug.

## DIA 9 (D+8) — Primeiros pedidos internos (com cubagem)

Pedidos → **Novo Pedido**. Vamos cadastrar os 4 primeiros do catálogo (P01–P04). Para **cada** pedido:
- **Solicitante/Cliente:** selecione o cliente indicado.
- **Origem:** endereço do cliente (coleta).
- **Destinatário(s):** 1 destinatário por pedido (fracionado simples), com o **CEP de destino** indicado.
- **Itens:** preencha **NF, volumes, peso (kg), dimensões (cm) e valor declarado** conforme o catálogo — as dimensões fazem o sistema calcular o **peso cubado**.

> Ao preencher os itens, ✅ VERIFICAR no resumo de frete: o **peso taxável** e o **valor do frete** devem bater com a coluna "Frete" do catálogo (a fórmula do Dia 2).

### Catálogo de pedidos (P01–P16)

> Em todos: **embalagem = caixa**. "cubado?" = sim quando o cubado supera o real (governará o frete).

| Ped. | Cliente | CEP destino (cidade) | NFs | Volumes | Peso real | Dimensões (cm) | Taxável | Decl. (R$) | **Frete (R$)** |
|---|---|---|---|---|---|---|---|---|---|
| P01 | C2 | 05409-000 (São Paulo) | 1 | 6 | 80 | 40×40×40 | 80 | 5.000 | **125,00** |
| P02 | C3 | 09000-000 (Santo André) | 1 | 10 | 150 | 50×40×40 | 150 | 8.000 | **204,00** |
| P03 | C2 | 07000-000 (Guarulhos) | 1 | 3 | 45 | 50×50×60 | **75 (cubado)** | 3.000 | **114,00** |
| P04 | C3 | 06000-000 (Osasco) | 2 | 14 | 220 | 40×40×40 | 220 | 12.000 | **296,00** |
| P05 | C4 | 08000-000 (São Paulo L.) | 1 | 2 | 30 | 40×40×40 | 30 | 2.000 | **100,00 (mín.)** |
| P06 | C3 | 09500-000 (S. Bernardo) | 2 | 20 | 500 | 50×40×40 | 500 | 25.000 | **615,00** |
| P07 | C2 | 03100-000 (São Paulo) | 1 | 6 | 90 | 40×40×40 | 90 | 6.000 | **138,00** |
| P08 | C1 | 04500-000 (São Paulo) | 1 | 8 | 60 | 60×60×60 | **288 (cubado)** | 4.000 | **330,00** |
| P09 | C1 | 02400-000 (São Paulo) | 1 | 8 | 120 | 40×40×40 | 120 | 7.000 | **171,00** |
| P10 | C4 | 13010-000 (Campinas) | 1 | 12 | 200 | 40×40×40 | 200 | 10.000 | **260,00** |
| P11 | C1 | 05500-000 (São Paulo) | 1 | 5 | 75 | 40×40×45 | 75 | 5.500 | **121,50** |
| P12 | C5 | 12200-000 (S.J. Campos) | 2 | 16 | 300 | 45×40×40 | 300 | 15.000 | **385,00** |
| P13 | C4 | 13040-000 (Campinas) | 1 | 7 | 110 | 45×45×45 | 110 | 6.500 | **159,50** |
| P14 | C6 | 11000-000 (Santos) | 2 | 14 | 260 | 45×45×45 | 260 | 13.000 | **339,00** |
| P15 | C6 | 11300-000 (S. Vicente) | 1 | 3 | 40 | 40×40×40 | 40 | 2.500 | **100,00 (mín.)** |
| P16 | C5 | 12300-000 (Vale) | 1 | 10 | 180 | 45×45×45 | 180 | 9.000 | **237,00** |

> **Conferência de cubagem (P03 e P08):**
> P03 → (50×50×60)/6.000 = 25 kg/vol × 3 = **75 kg cubado** > 45 real → taxa por 75.
> P08 → (60×60×60)/6.000 = 36 kg/vol × 8 = **288 kg cubado** > 60 real → taxa por 288. *(Carga volumosa e leve — o sistema deve cobrar pelo cubado.)*

Cadastre **P01–P04** hoje (status ficará **Novo**).

## DIA 10 (D+9) — Mais pedidos
Cadastre **P05–P09**. Em **P05**, ✅ VERIFICAR que o frete calculado (66,00) é **elevado ao mínimo de R$ 100,00**.

## DIA 11 (D+10) — Cotações públicas viram pedidos
Cadastre **P10–P13**. Para **P10 e P13** (Campinas), simule que vieram do site: status **Novo** → **Confirmar** já no cadastro/lista.

## DIA 12 (D+11) — Últimos pedidos do período
Cadastre **P14–P16**.

## DIA 13 (D+12) — Confirmações e recusas
- **Confirme** (status → Confirmado) **todos os 14 pedidos ativos**: P01, P02, P03, P04, P06, P07, P08, P09, P11, P12, P13, P14, P15, P16.
  ✅ VERIFICAR: ao confirmar, o sistema **cria a receita** correspondente (Financeiro → Receitas). O valor da receita = frete do pedido.
- **Cancele** **P05** e **P10** (motivo: "cliente desistiu").
  ✅ VERIFICAR: a receita desses pedidos **não** fica ativa (some/zera). *(Se ficar "a receber", é vazamento de receita — anote.)*

## DIA 14 (D+13) — Planejamento das rotas (consolidação)
Olhe os pedidos confirmados e agrupe por região (vamos despachar na Semana 3):

| Rota | Veículo | Pedidos (consolidados) | Região |
|---|---|---|---|
| R1 | VUC (FRC-1A11) | P01, P03, P07, P11 | Capital |
| R2 | 3/4 (FRC-2B22) | P02, P04, P06 | ABC |
| R3 | 3/4 (FRC-2B22) | P08, P09 | Capital (volumoso) |
| R4 | Toco (FRC-3C33) | P12, P16 | Vale do Paraíba |
| R5 | Toco (FRC-3C33) | P13, P14 | Campinas + Baixada |

---

# SEMANA 3 — Operação, rotas e entregas (D+14 a D+22)

## DIA 15 (D+14) — Despacho e criação das viagens
Vá em **Despacho** (quadro caminhões × dias). Para **cada rota** acima:
1. Selecione o veículo e o dia.
2. Adicione os pedidos da rota (consolidação fracionada).
3. **Crie a viagem** com o motorista correspondente (R1→Antônio, R2/R3→Beatriz, R4/R5→Cláudio).

✅ VERIFICAR: cada pedido vira `Em coleta`/`Em trânsito` e fica vinculado à viagem; o veículo aparece **Em rota**.

## DIA 16 (D+15) — Saída e rastreio
Marque as viagens **R1, R2** como **Em trânsito** (partida). 
✅ VERIFICAR no site público: rastrear um protocolo (ex.: P01) mostra status **Em trânsito** (via função de rastreamento, sem expor dados sensíveis).

## DIA 17 (D+16) — Entregas R1 (POD por destinatário)
Encerre a viagem **R1**: para cada parada (P01, P03, P07, P11), registre a **entrega** com **assinatura (POD)** e nome do recebedor.
✅ VERIFICAR: os 4 pedidos ficam **Entregue**; a viagem fica **Concluída**; ao encerrar, informe **km rodado, combustível e pedágio** (custos da rota).

**Custos da R1:** km `120` · combustível **R$ 180,00** (lance como despesa de combustível vinculada ao **Posto Marginal Tietê** e ao **VUC**) · ajudante: não.

## DIA 18 (D+17) — Entregas R2 e ocorrência
Encerre **R2** (P02, P04, P06). Em **P04**, registre uma **ocorrência**: tipo **tentativa de entrega** ("destinatário ausente"), depois reentregue e conclua.
**Custos R2:** km `90` · combustível **R$ 150,00** (DieselFix? não — combustível é Posto) → **Posto Marginal Tietê**, veículo 3/4.

## DIA 19 (D+18) — Entregas R3
Encerre **R3** (P08, P09). **Custos R3:** km `70` · combustível **R$ 120,00**.
✅ VERIFICAR: P08 (volumoso) entregue; confira que o frete dele continua **R$ 330,00** (cobrado por cubagem).

## DIA 20 (D+19) — Rota interior R4 (Vale)
Despache e encerre **R4** (P12, P16) com o Toco + Cláudio + **ajudante**.
**Custos R4:** km `210` · combustível **R$ 320,00** · **ajudante diária R$ 120,00** (lance como despesa, categoria *administrativo* ou *outros*, vinculada ao motorista Cláudio).

## DIA 21 (D+20) — Rota interior R5 (Campinas + Baixada)
Encerre **R5** (P13, P14). **Custos R5:** km `190` · combustível **R$ 300,00** · **ajudante R$ 120,00**.

## DIA 22 (D+21) — Recebimentos
Em Financeiro → Receitas, dê **baixa (recebido)** nas receitas dos pedidos **à vista/pix**: P01, P03, P06, P07, P08 = **R$ 1.322,00** (escolha "recebido", data = hoje).
Deixe **a receber** as demais ativas: P02, P04, P09, P11, P12, P13, P14, P15, P16 = **R$ 2.013,00** — simulando prazo.
✅ VERIFICAR: recebido (1.322,00) + a receber (2.013,00) = **3.335,00**; o painel de **aging** se distribui corretamente.

---

# SEMANA 4 — Financeiro, fatura mensal e fechamento (D+23 a D+29)

## DIA 23 (D+22) — Despesas fixas do mês
Financeiro → Despesas → **Nova Despesa** (use as seções: Despesa / Pagamento / Vínculos / Anexos):

| Categoria | Descrição | Valor | Situação | Vencimento | Fornecedor | Veículo |
|---|---|---|---|---|---|---|
| Salários | Folha — 3 motoristas | 8.400,00 | Pago (D-2) | — | — | — |
| Aluguel | Galpão cross-docking | 3.500,00 | Pago (D-5) | — | — | — |
| Seguro | Parcela seguro frota | 1.200,00 | A pagar | D+6 | Protege Seguros | — |
| Manutenção | Revisão FRC-2B22 | 680,00 | A pagar | D+10 | DieselFix Mecânica | FRC-2B22 |
| Pneus | 2 pneus FRC-3C33 | 1.300,00 | A pagar | D+18 | PneuJá Distribuidora | FRC-3C33 |
| Impostos | Simples/ISS do período | (ver DRE) | A pagar | D+15 | — | — |

> Combustível (R$ 180+150+120+320+300 = **1.070,00**) e ajudante (2 × R$ 120 = **240,00**) já foram lançados nas viagens da Semana 3.

## DIA 24 (D+23) — Fatura mensal do cliente C1
Cadastros → Cliente **C1 (Loja Online Tech)** → **Fechar fatura**.
- Pedidos do C1 no período: **P08 (330,00), P09 (171,00), P11 (121,50)** = **R$ 622,50**.
- ⚠️ **Atenção (igual ao aviso do teste SQL):** como neste roteiro cada pedido **já gerou receita por pedido**, fechar a fatura mensal pode **duplicar** a receita do C1. Para o batimento fechar, **escolha um caminho**:
  - **(A) Recomendado p/ este teste:** **não feche** a fatura mensal (mantém receita por pedido). Apenas confira que a tela de fatura **lista** P08+P09+P11 e o total **R$ 622,50**.
  - **(B)** Se quiser testar o fechamento, **cancele antes** as 3 receitas por pedido do C1 e então gere a fatura — aí o total único deve ser **R$ 622,50**.

## DIA 25 (D+24) — DRE e fluxo de caixa
Abra **Financeiro → DRE**. Confira os números com o batimento abaixo.

## DIAS 26–30 (D+25 a D+29) — Conferência final e limpeza de pendências
- Reentregue/baixe qualquer pendência.
- Reveja o **aging** (a receber × vencido) conforme as datas avançam.
- Confira alertas de documentos (Seguro FRC-3C33, CNH Beatriz) continuam sinalizados.

---

# 🧮 Batimento financeiro final (confira na tela)

### Receita (competência)
| Item | Valor |
|---|---|
| Frete bruto dos 16 pedidos | R$ 3.695,00 |
| (−) Cancelados: P05 (100) + P10 (260) | − R$ 360,00 |
| **Receita líquida ativa (14 pedidos)** | **R$ 3.335,00** |

Distribuição da receita ativa (14 pedidos):
- **Recebida** (P01,P03,P06,P07,P08) = 125+114+615+138+330 = **R$ 1.322,00**
- **A receber** (P02,P04,P09,P11,P12,P13,P14,P15,P16) = 204+296+171+121,50+385+159,50+339+100+237 = **R$ 2.013,00**
- Soma = 1.322,00 + 2.013,00 = **R$ 3.335,00** ✅ (= receita líquida ativa)

> **Valor-âncora:** a **Receita líquida ativa = R$ 3.335,00** (soma de todos os fretes não cancelados) é a referência mestre que o Financeiro do app deve mostrar.

### Despesas (competência)
| Categoria | Valor | Situação |
|---|---|---|
| Combustível (5 rotas) | 1.070,00 | Pago |
| Ajudante (2 rotas) | 240,00 | Pago |
| Salários | 8.400,00 | Pago |
| Aluguel | 3.500,00 | Pago |
| Seguro (parcela) | 1.200,00 | A pagar |
| Manutenção | 680,00 | A pagar |
| Pneus | 1.300,00 | A pagar |
| **Subtotal despesas** | **16.390,00** | |
| Impostos (6% × receita ativa 3.335,00) | 200,10 | A pagar |
| **Total despesas** | **R$ 16.590,10** | |

### Resultado
| Indicador | Valor |
|---|---|
| Receita líquida ativa | R$ 3.335,00 |
| Total despesas | R$ 16.590,10 |
| **Resultado por competência** | **− R$ 13.255,10** |

### Margem de contribuição (a métrica certa para fracionado)
| Indicador | Valor |
|---|---|
| Receita ativa | R$ 3.335,00 |
| (−) Custos diretos das rotas (combustível + ajudante) | − R$ 1.310,00 |
| **Margem de contribuição** | **R$ 2.025,00 (≈ 61%)** |
| Custos fixos do mês (salários+aluguel+seguro+manut.+pneus+impostos) | R$ 15.280,10 |
| **Ponto de equilíbrio** (fixos ÷ margem média por pedido ≈ 144,64) | **≈ 106 pedidos/mês** |

> 📌 **Por que o resultado fica negativo — e por que isso é coerente:** uma operação fracionada real faz **centenas** de entregas/mês; este roteiro tem **16** (o máximo prático para um teste manual). A **margem de contribuição é positiva (61%)** e o cálculo mostra que o ponto de equilíbrio é **~106 pedidos/mês**. Ou seja: o sistema está calculando **certo**; o vermelho é só o volume-amostra. O que importa neste teste é que **todos os números reconciliem** e os fluxos funcionem — não a lucratividade da amostra.

---

# ✅ Checklist do que este cenário testou

- [ ] **Cobertura por faixa de CEP** aceita dentro e recusa fora (inclusive o "buraco" 10000-000).
- [ ] **Serviço somente fracionado** no site e nos cadastros.
- [ ] **Peso cubado** governando o frete (P03 e P08) e **frete mínimo** (P05, P15).
- [ ] **Cálculo de frete** = peso×kg + fixa + GRIS + TDE/TDA por NF, batendo com o catálogo.
- [ ] **Consolidação** de vários pedidos numa rota (R1–R5) e **POD por destinatário**.
- [ ] **Receita criada na confirmação** e **cancelada no cancelamento** (sem vazamento).
- [ ] **Despesas** vinculadas a fornecedor/veículo, com vencimento (aging).
- [ ] **Alertas** de Seguro e CNH disparando.
- [ ] **Fatura mensal** do cliente recorrente (com o cuidado de não duplicar).
- [ ] **DRE / aging / margem** coerentes com o batimento.

> Achou divergência? Me diga o **dia/passo**, o **valor esperado (deste doc) × o valor na tela**, e eu localizo o ponto exato no sistema.

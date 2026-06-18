# Simulação de 30 dias — Transportadora FRACIONADA por faixa de CEP

> **Cenário desta simulação (a "hora da verdade")**
> Uma transportadora que opera **100% frete fracionado (LTL)** numa região definida **por faixa de CEP** (Grande SP + Baixada + Campinas + Vale do Paraíba). Muitos pedidos pequenos, **consolidados em rotas** com várias entregas (milk-run). O objetivo é exercitar **todos os campos** e ver como o sistema se comporta nesse perfil — cobertura por CEP, peso cubado, consolidação e fechamento financeiro.
>
> Este é um roteiro **manual**: você executa cada passo nas telas reais. Onde aparece `✅ VERIFICAR`, confira o resultado antes de seguir.

---

## Regras de ouro

1. Faça **na ordem**. A Semana 1 (configuração + cadastros) é pré-requisito do resto.
2. Os valores são **fixos e calculados** — digite exatamente como está, para o batimento financeiro do fim fechar.
3. **Datas concretas:** este roteiro assume que **hoje é 17/06/2026** (DIA 1). Cada "DIA N" tem uma data fixa — use o **Cronograma** abaixo. Onde aparecer uma data (ex.: *coleta em 01/07/2026*), digite exatamente essa data no sistema.
4. Toda tela de cadastro segue o padrão de seções (cabeçalho → seções → rodapé fixo com **Cancelar / Salvar**). Campos com decimal aceitam **vírgula**.
5. Se algum campo/rótulo não existir exatamente como descrito, **anote o dia/passo** e me avise — é candidato a bug.

## Cronograma (datas concretas, em ordem)

| Dia | Data | O que fazer |
|---|---|---|
| DIA 1 | **17/06/2026** (qua) | Configurações da empresa + site |
| DIA 2 | **18/06/2026** (qui) | Preços + Área de atuação (CEP) + agendamento |
| DIA 3 | **19/06/2026** (sex) | Alertas + Frota (3 veículos) |
| DIA 4 | **20/06/2026** (sáb) | Motoristas (3) |
| DIA 5 | **21/06/2026** (dom) | Fornecedores (4) |
| DIA 6 | **22/06/2026** (seg) | Clientes (6) |
| DIA 7 | **23/06/2026** (ter) | Revisão da Semana 1 |
| DIA 8 | **24/06/2026** (qua) | Teste de cobertura no site público |
| DIA 9 | **25/06/2026** (qui) | Cadastrar pedidos P01–P04 |
| DIA 10 | **26/06/2026** (sex) | Cadastrar P05–P09 + conferência de cálculo |
| DIA 11 | **27/06/2026** (sáb) | Cadastrar P10–P13 + conferência de NFs |
| DIA 12 | **28/06/2026** (dom) | Cadastrar P14–P16 + fechar cadastro |
| DIA 13 | **29/06/2026** (seg) | Confirmar 14 ativos + cancelar P05 e P10 |
| DIA 14 | **30/06/2026** (ter) | Planejar as 5 rotas |
| DIA 15 | **01/07/2026** (qua) | Liberar Toco + criar viagens + **coletas capital/ABC** |
| DIA 16 | **02/07/2026** (qui) | Saída/rastreio + **coletas interior/Baixada** |
| DIA 17 | **03/07/2026** (sex) | Entregas R1 (POD) |
| DIA 18 | **04/07/2026** (sáb) | Entregas R2 + ocorrência |
| DIA 19 | **05/07/2026** (dom) | Entregas R3 |
| DIA 20 | **06/07/2026** (seg) | Rota R4 (Vale) |
| DIA 21 | **07/07/2026** (ter) | Rota R5 (Campinas + Baixada) |
| DIA 22 | **08/07/2026** (qua) | Recebimentos |
| DIA 23 | **09/07/2026** (qui) | Despesas fixas do mês |
| DIA 24 | **10/07/2026** (sex) | Fatura mensal do C1 |
| DIA 25 | **11/07/2026** (sáb) | DRE e fluxo de caixa |
| DIAS 26–30 | **12–16/07/2026** | Conferência final e pendências |

> As **coletas** acontecem nos dias úteis **01/07/2026** (Grande SP/ABC) e **02/07/2026** (interior/Baixada) — por isso os pedidos são cadastrados antes (25–28/06).

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

# SEMANA 1 — Configuração e cadastros (17 a 23/06/2026)

## DIA 1 · 17/06/2026 (qua) — Configurações da empresa

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

## DIA 2 · 18/06/2026 (qui) — Preços e área de atuação

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

## DIA 3 · 19/06/2026 (sex) — Alertas e início da frota

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
**Documentação:** CRLV vence **10/09/2026** · Seguro vence **15/10/2026** · Tacógrafo última `21/08/2025`, próxima **27/07/2026**
**Quilometragem:** Km atual `82000` · alertas óleo `10000`, revisão `20000`, pneus `40000`
**Observações:** `Rota capital — entregas leves`
**Cadastrar.** → ✅ VERIFICAR: abre o detalhe do caminhão; status inicial **Disponível**.

### 3.3 Frota → Novo Caminhão — Veículo 2 (3/4)
Placa `FRC-2B22` · Tipo **Truck** *(use Truck; o sistema não tem "3/4" — registramos como Truck)* · Fabricante `Mercedes-Benz` · Modelo `Accelo 1016` · Ano `2021` · Cor `Branco` · RENAVAM `22222222222` · Chassi `9BWZZZ377MV200222`
Capacidade `6000` kg · Dimensões `5,5 · 2,3 · 2,4`
CRLV **01/08/2026** · Seguro **03/01/2027** · Tacógrafo última `23/07/2025`, próxima **02/07/2026**
Km atual `145000` · alertas óleo `15000`, revisão `30000`, pneus `50000`
Observações: `Rota mista capital + ABC`
**Cadastrar.**

### 3.4 Frota → Novo Caminhão — Veículo 3 (Toco)
Placa `FRC-3C33` · Tipo **Toco** · Fabricante `Volkswagen` · Modelo `Constellation 13.190` · Ano `2020` · Cor `Prata` · RENAVAM `33333333333` · Chassi `9BWZZZ377LV300333`
Capacidade `9000` kg · Dimensões `7,0 · 2,5 · 2,6`
CRLV **03/01/2027** · Seguro **25/06/2026** *(vai disparar alerta de seguro!)* · Tacógrafo última `29/11/2025`, próxima **15/09/2026**
Km atual `205000` · alertas óleo `15000`, revisão `30000`, pneus `50000`
Observações: `Rota interior — Campinas/Vale, consolida volume`
**Cadastrar.** → ✅ VERIFICAR: nos próximos dias, em Operações/Frota deve aparecer **alerta de Seguro vencendo** (8 dias < 30).

---

## DIA 4 · 20/06/2026 (sáb) — Motoristas

### 4.1 Motoristas → Novo Motorista — Motorista 1
**Dados pessoais:** Nome `Antônio Ferreira` · CPF `123.456.789-01` · Nascimento `1986-03-10` · Telefone `(11) 97000-1001` · E-mail `antonio@veloxfracionado.com`
**CNH:** Número `12345678901` · Categoria **C** · Vencimento **22/07/2027**
**Contrato:** Função **Motorista** · Tipo **CLT** · Admissão `26/10/2024` · Salário base `2.600,00` · Status **Ativo**
**Endereço:** CEP `07020-000` (autofill: Guarulhos/SP) · Número `100` *(o endereço preenche automático pelo CEP)*
**Dados bancários:** Banco `Bradesco` · Agência `1111` · Conta `11111-1` · PIX `123.456.789-01`
**Observações:** `Rota capital (VUC)`
**Cadastrar motorista.**

### 4.2 Motoristas → Novo Motorista — Motorista 2
Nome `Beatriz Lima` · CPF `234.567.890-12` · Nascimento `1992-07-22` · Telefone `(11) 97000-1002` · E-mail `beatriz@veloxfracionado.com`
CNH `23456789012` · Categoria **C** · Vencimento **06/08/2026** *(vai disparar alerta de CNH — dentro de 60 dias)*
Função **Motorista** · CLT · Admissão `21/08/2025` · Salário `2.600,00` · Ativo
Endereço: CEP `06010-000` (autofill: Osasco/SP) · Número `200`
Banco `Itaú` · Ag `2222` · Conta `22222-2` · PIX `beatriz@veloxfracionado.com`
Observações: `Rota mista (3/4)`
**Cadastrar.** → ✅ VERIFICAR: alerta de **CNH vencendo** aparece para a Beatriz.

### 4.3 Motoristas → Novo Motorista — Motorista 3
Nome `Cláudio Souza` · CPF `345.678.901-23` · Nascimento `1980-11-05` · Telefone `(11) 97000-1003` · E-mail `claudio@veloxfracionado.com`
CNH `34567890123` · Categoria **D** · Vencimento **28/03/2028**
Função **Motorista** · **PJ** · Admissão `18/01/2026` · Salário `3.200,00` · Ativo
Endereço: CEP `02011-000` (autofill: Santana, São Paulo/SP) · Número `300`
Banco `Nubank` · Ag `0001` · Conta `33333-3` · PIX `(11) 97000-1003`
Observações: `Rota interior (Toco) — leva ajudante`
**Cadastrar.**

---

## DIA 5 · 21/06/2026 (dom) — Fornecedores (campo a campo)

Cadastros → Fornecedores → **Novo Fornecedor**. O formulário tem as seções **Identificação**, **Endereço** (com **autofill por CEP**), **Contato principal**, **Financeiro** + a seção **Contatos** (botão "Adicionar"). No Endereço, digite o **CEP** e o sistema preenche rua/bairro/cidade/UF — você completa o **Número**. Preencha assim:

### Fornecedor 1 — Combustível
**Identificação**
- Razão social / Nome: `Auto Posto Marginal Tietê Ltda`
- CNPJ / CPF: `11.111.111/0001-11`
- Categoria: **Combustível**
- Endereço (CEP autofill): CEP `02011-000` (Santana, São Paulo/SP) · Número `1000`

**Contato principal**
- Responsável: `Roberto Alves`
- Telefone: `(11) 3550-1000`
- WhatsApp: `(11) 95500-1000`
- E-mail: `gerente@postomarginal.com.br`

**Financeiro**
- Condições de pagamento: `À vista (PIX na bomba)`
- Chave PIX: `11.111.111/0001-11`
- Observações: `Abastecimento da frota; 3% de desconto na ata mensal.`

**Contatos → Adicionar** (1 contato)
- Nome: `Fernanda Dias` · Função: **Financeiro** · Telefone: `(11) 3550-1001` · WhatsApp: `(11) 95500-1001` · E-mail: `financeiro@postomarginal.com.br` · **Contato principal: marcado**

→ **Cadastrar**.

### Fornecedor 2 — Manutenção
**Identificação**
- Razão social / Nome: `DieselFix Centro Automotivo Ltda`
- CNPJ / CPF: `22.222.222/0001-22`
- Categoria: **Manutenção**
- Endereço (CEP autofill): CEP `07020-000` (Guarulhos/SP) · Número `50`

**Contato principal**
- Responsável: `Sandro Oliveira`
- Telefone: `(11) 2400-2000`
- WhatsApp: `(11) 96400-2000`
- E-mail: `os@dieselfix.com.br`

**Financeiro**
- Condições de pagamento: `28 dias (boleto)`
- Chave PIX: `22.222.222/0001-22`
- Observações: `Revisões e corretivas; orça antes de executar.`

**Contatos → Adicionar** (1 contato)
- Nome: `Patrícia Gomes` · Função: **Comercial** · Telefone: `(11) 2400-2001` · WhatsApp: `(11) 96400-2001` · E-mail: `comercial@dieselfix.com.br` · **Contato principal: marcado**

→ **Cadastrar**.

### Fornecedor 3 — Pneus
**Identificação**
- Razão social / Nome: `PneuJá Comércio de Pneus Ltda`
- CNPJ / CPF: `33.333.333/0001-33`
- Categoria: **Pneus**
- Endereço (CEP autofill): CEP `06010-000` (Osasco/SP) · Número `80`

**Contato principal**
- Responsável: `Paulo Ramos`
- Telefone: `(11) 3700-3000`
- WhatsApp: `(11) 97700-3000`
- E-mail: `vendas@pneuja.com.br`

**Financeiro**
- Condições de pagamento: `Boleto 15/30`
- Chave PIX: `33.333.333/0001-33`
- Observações: `Pneus novos e recapagem; entrega em 24h.`

**Contatos → Adicionar** (1 contato)
- Nome: `Marcos Lima` · Função: **Gerente** · Telefone: `(11) 3700-3001` · WhatsApp: `(11) 97700-3001` · E-mail: `gerencia@pneuja.com.br` · **Contato principal: marcado**

→ **Cadastrar**.

### Fornecedor 4 — Seguros
**Identificação**
- Razão social / Nome: `Protege Corretora de Seguros Ltda`
- CNPJ / CPF: `44.444.444/0001-44`
- Categoria: **Seguros**
- Endereço (CEP autofill): CEP `04571-010` (Berrini, São Paulo/SP) · Número `2000`

**Contato principal**
- Responsável: `Marta Andrade`
- Telefone: `(11) 3000-4000`
- WhatsApp: `(11) 98000-4000`
- E-mail: `apolices@protege.com.br`

**Financeiro**
- Condições de pagamento: `Mensal (débito automático)`
- Chave PIX: `44.444.444/0001-44`
- Observações: `Apólice da frota + RCTR-C; renovação em 03/01/2027.`

**Contatos → Adicionar** (1 contato)
- Nome: `Júlio Castro` · Função: **Financeiro** · Telefone: `(11) 3000-4001` · WhatsApp: `(11) 98000-4001` · E-mail: `cobranca@protege.com.br` · **Contato principal: marcado**

→ **Cadastrar**.

> ℹ️ Na seção **Contatos**, as funções disponíveis para fornecedor são: Financeiro, Comercial, Técnico, Gerente, Diretor, Outro.

---

## DIA 6 · 22/06/2026 (seg) — Clientes / embarcadores (campo a campo)

Cadastros → Clientes → **Novo Cliente**. Campos do formulário: Razão Social, CPF/CNPJ, Tipo de pessoa, Inscrição Estadual (só PJ), E-mail, Telefone, Perfil, Status, Tipo de cobrança, Observações, **Contatos** e **Endereço principal** (digite o CEP e o sistema preenche rua/bairro/cidade/UF; você completa Número e Complemento).

> ℹ️ Funções disponíveis no contato de **cliente**: Financeiro, Logística, Compras, Diretor, Gerente, Outro.

### Cliente C1 — Loja Online Tech (recorrente · faturamento MENSAL)
- Razão Social / Nome: `Loja Online Tech Comércio Eletrônico ME`
- CPF / CNPJ: `50.111.111/0001-11`
- Tipo de pessoa: **Pessoa Jurídica**
- Inscrição Estadual: `110.111.111`
- E-mail: `logistica@lojatech.com.br` · Telefone: `(11) 4100-1100`
- Perfil de cliente: **Recorrente** · Status: **Ativo**
- Tipo de cobrança: **Faturamento mensal** → Dia de fechamento: `25` · Prazo de pagamento: `30` dias
- Observações: `E-commerce; coletas diárias no CD; NF-e enviada por e-mail.`
- **Contato:** Nome `Ana Souza` · Função **Logística** · Telefone `(11) 4100-1101` · E-mail `ana.logistica@lojatech.com.br` · **Principal: marcado**
- **Endereço principal:** CEP `04571-010` → (autofill: Av. Eng. Luís Carlos Berrini — Cidade Monções — São Paulo/SP) · Número `1200` · Complemento `CD — Bloco B`

→ **Cadastrar**.

### Cliente C2 — Distribuidora Norte SP (recorrente · por viagem)
- Razão Social / Nome: `Distribuidora Norte SP Ltda`
- CPF / CNPJ: `50.222.222/0001-22`
- Tipo de pessoa: **Pessoa Jurídica**
- Inscrição Estadual: `110.222.222`
- E-mail: `compras@distnorte.com.br` · Telefone: `(11) 4200-2200`
- Perfil: **Recorrente** · Status: **Ativo**
- Tipo de cobrança: **Por viagem (padrão)**
- Observações: `Atacado de bebidas; coletas seg/qua/sex.`
- **Contato:** Nome `Carlos Nunes` · Função **Compras** · Telefone `(11) 4200-2201` · E-mail `carlos@distnorte.com.br` · **Principal: marcado**
- **Endereço principal:** CEP `02011-000` → (autofill: Santana — São Paulo/SP) · Número `750` · Complemento `Depósito 2`

→ **Cadastrar**.

### Cliente C3 — Magazine Casa & Cia (recorrente · por viagem)
- Razão Social / Nome: `Magazine Casa & Cia Comércio Varejista Ltda`
- CPF / CNPJ: `50.333.333/0001-33`
- Tipo de pessoa: **Pessoa Jurídica**
- Inscrição Estadual: `110.333.333`
- E-mail: `expedicao@casaecia.com.br` · Telefone: `(11) 4300-3300`
- Perfil: **Recorrente** · Status: **Ativo**
- Tipo de cobrança: **Por viagem (padrão)**
- Observações: `Móveis e eletro; atenção a volumes frágeis.`
- **Contato:** Nome `Júlia Prado` · Função **Logística** · Telefone `(11) 4300-3301` · E-mail `julia@casaecia.com.br` · **Principal: marcado**
- **Endereço principal:** CEP `09010-000` → (autofill: Centro — Santo André/SP) · Número `300` · Complemento `Loja central`

→ **Cadastrar**.

### Cliente C4 — AutoPeças Expressa (eventual · por viagem)
- Razão Social / Nome: `AutoPeças Expressa Comércio de Peças Ltda`
- CPF / CNPJ: `50.444.444/0001-44`
- Tipo de pessoa: **Pessoa Jurídica**
- Inscrição Estadual: `110.444.444`
- E-mail: `vendas@autopecasexpressa.com.br` · Telefone: `(19) 4400-4400`
- Perfil: **Eventual** · Status: **Ativo**
- Tipo de cobrança: **Por viagem (padrão)**
- Observações: `Peças automotivas; entregas em Campinas/RMC.`
- **Contato:** Nome `Rafael Tonin` · Função **Compras** · Telefone `(19) 4400-4401` · E-mail `rafael@autopecasexpressa.com.br` · **Principal: marcado**
- **Endereço principal:** CEP `13010-111` → (autofill: Centro — Campinas/SP) · Número `95` · Complemento `Galpão A`

→ **Cadastrar**.

### Cliente C5 — Moda Vale Confecções (eventual · por viagem)
- Razão Social / Nome: `Moda Vale Confecções Ltda`
- CPF / CNPJ: `50.555.555/0001-55`
- Tipo de pessoa: **Pessoa Jurídica**
- Inscrição Estadual: `110.555.555`
- E-mail: `expedicao@modavale.com.br` · Telefone: `(12) 4500-5500`
- Perfil: **Eventual** · Status: **Ativo**
- Tipo de cobrança: **Por viagem (padrão)**
- Observações: `Vestuário; entregas no Vale do Paraíba.`
- **Contato:** Nome `Sônia Reis` · Função **Logística** · Telefone `(12) 4500-5501` · E-mail `sonia@modavale.com.br` · **Principal: marcado**
- **Endereço principal:** CEP `12210-130` → (autofill: Av. Dr. João Guilhermino — Centro — São José dos Campos/SP) · Número `410` · Complemento `Galpão 1`

→ **Cadastrar**.

### Cliente C6 — EletroBaixada Atacado (eventual · por viagem)
- Razão Social / Nome: `EletroBaixada Atacado de Eletrônicos Ltda`
- CPF / CNPJ: `50.666.666/0001-66`
- Tipo de pessoa: **Pessoa Jurídica**
- Inscrição Estadual: `110.666.666`
- E-mail: `compras@eletrobaixada.com.br` · Telefone: `(13) 4600-6600`
- Perfil: **Eventual** · Status: **Ativo**
- Tipo de cobrança: **Por viagem (padrão)**
- Observações: `Eletrônicos; entregas na Baixada Santista.`
- **Contato:** Nome `Diego Matos` · Função **Compras** · Telefone `(13) 4600-6601` · E-mail `diego@eletrobaixada.com.br` · **Principal: marcado**
- **Endereço principal:** CEP `11013-000` → (autofill: Av. João Pessoa — Centro — Santos/SP) · Número `88` · Complemento `Loja Centro`

→ **Cadastrar**.

> 💡 O CEP faz **autofill** de rua/bairro/cidade/UF. Se o ViaCEP devolver um logradouro diferente do indicado, **mantenha o que ele trouxer** (o que importa é a cidade/UF bater) e só preencha **Número** e **Complemento**.

---

## DIA 7 · 23/06/2026 (ter) — Revisão da Semana 1

✅ VERIFICAR antes de operar:
- Operações (`/admin`) mostra **3 caminhões** e alertas: **Seguro do FRC-3C33** (8d) e **CNH da Beatriz** (50d).
- Frota lista 3 veículos; Motoristas lista 3; Fornecedores 4; Clientes 6.
- Em Configurações → Operação, as **4 faixas de CEP** estão salvas e o serviço é **Somente fracionado**.

---

# SEMANA 2 — Captação de pedidos e cobertura (24/06 a 01/07/2026)

## DIA 8 · 24/06/2026 (qua) — Teste de cobertura no site público ⭐

Abra o **site público** (`/`) → fluxo de **cotação/agendamento**.

1. **CEP coberto (capital):** informe destino **05422-000** (Rua dos Pinheiros, São Paulo — dentro de "Grande SP").
   ✅ VERIFICAR: o sistema **aceita** e segue para a cotação/agendamento.
2. **CEP coberto (interior):** **13010-111** (Campinas — dentro de "Campinas/RMC").
   ✅ VERIFICAR: aceito.
3. **CEP NÃO coberto:** **14010-000** (Ribeirão Preto — CEP real, fora de todas as faixas).
   ✅ VERIFICAR: aparece a **mensagem de fora de área** ("No momento não atendemos este CEP…") e **bloqueia** o agendamento.
4. *(Opcional — buraco entre faixas)* tente **10000-000** (banda entre Grande SP e Baixada). Como provavelmente **não é um CEP atribuído**, o ViaCEP pode não achar o endereço; o importante é que, fora das faixas, o sistema **não** deve liberar o agendamento.

> Isso valida o `coverageChecker` (comparação por faixa de CEP). Se um CEP coberto for recusado (ou um fora for aceito), anote — é bug.

## DIAS 9 a 12 · 25 a 28/06/2026 — Cadastro dos 16 pedidos (Nova Coleta)

> 📍 **Onde cadastrar:** estes 16 pedidos são lançados **no PORTAL ADMIN** → menu **Pedidos → botão "Nova Coleta"**. O **site público** (Dia 8) é só para o **cliente** cotar/agendar; o agendamento que chega pelo site vira um pedido "Novo" que você confirma aqui. Nesta simulação cadastramos todos manualmente pelo admin.

A Nova Coleta é um **assistente em 4 passos** (Remetente e coleta → Cargas e notas → Cotação e pagamento → Atribuição e revisão), com **painel de cotação ao vivo** à direita. Cada pedido abaixo é um **bloco completo** — distribua os campos pelos passos:
- **Passo 1:** selecione o **cliente** (traz endereço de coleta, condição de pagamento e tabela negociada automaticamente) + data/período de coleta. Os campos de **CEP preenchem o endereço sozinhos**; complete só o Número.
- **Passo 2:** **destinatário + itens**. Dica TMS: dá para **importar o XML da NF-e** (preenche tudo e agrupa por CNPJ) ou **colar a chave de 44 dígitos**; nesta simulação preenchemos manualmente. Acompanhe **peso taxável** e a cotação no painel.
- **Passo 3:** confira o **frete estimado** no painel e clique **"Usar estimativa"** (ou informe o valor do bloco); defina CIF/FOB e forma de pagamento.
- **Passo 4:** atribuição (opcional) + revisão → **Criar Coleta**.

> 🔁 Para pedidos repetidos do mesmo cliente (ex.: vários do C1/C2), use **"Repetir último pedido"** no Passo 1 e só ajuste as NFs.

**Defaults que valem para TODOS os pedidos** (não repito em cada bloco):
- **Passo 1:** Cargo do solicitante = `Logística` · Contato preferido = **WhatsApp** · ao selecionar o cliente, a **origem da coleta vem preenchida** (confira o nº).
- **Passo 2:** itens com **Embalagem = caixa**, **Frágil/Perigoso desmarcados**, NCM opcional; **Número do destino = `100`** (o CEP preenche o resto).
- **Passo 3:** Tipo de frete **Fracionado** · Pagador **CIF** · acompanhe o **painel de cotação** e clique **"Usar estimativa"** para lançar o frete.
- **Passo 4:** deixe **Motorista e Caminhão "Não atribuído"** (definidos no Despacho, Semana 3) → **Criar Coleta**.

Abaixo, cada pedido traz só o que **varia** — organizado pelos passos do assistente, com a **data de coleta concreta**.

### Quadro-resumo dos 16 pedidos (referência rápida)

| Ped. | Cliente | Destino | NFs | Vol | Peso | Taxável | Decl. | **Frete** |
|---|---|---|---|---|---|---|---|---|
| P01 | C2 | 05422-000 SP | 1 | 6 | 80 | 80 | 5.000 | **125,00** |
| P02 | C3 | 09010-000 Sto.André | 1 | 10 | 150 | 150 | 8.000 | **204,00** |
| P03 | C2 | 07020-000 Guarulhos | 1 | 3 | 45 | **75 cub** | 3.000 | **114,00** |
| P04 | C3 | 06010-000 Osasco | 2 | 14 | 220 | 220 | 12.000 | **296,00** |
| P05 | C4 | 08210-000 SP | 1 | 2 | 30 | 30 | 2.000 | **100,00 mín** |
| P06 | C3 | 09710-000 S.Bernardo | 2 | 20 | 500 | 500 | 25.000 | **615,00** |
| P07 | C2 | 03007-000 SP | 1 | 6 | 90 | 90 | 6.000 | **138,00** |
| P08 | C1 | 04571-010 SP | 1 | 8 | 60 | **288 cub** | 4.000 | **330,00** |
| P09 | C1 | 02011-000 SP | 1 | 8 | 120 | 120 | 7.000 | **171,00** |
| P10 | C4 | 13010-111 Campinas | 1 | 12 | 200 | 200 | 10.000 | **260,00** |
| P11 | C1 | 05422-000 SP | 1 | 5 | 75 | 75 | 5.500 | **121,50** |
| P12 | C5 | 12210-130 SJC | 2 | 16 | 300 | 300 | 15.000 | **385,00** |
| P13 | C4 | 13010-111 Campinas | 1 | 7 | 110 | 110 | 6.500 | **159,50** |
| P14 | C6 | 11013-000 Santos | 2 | 14 | 260 | 260 | 13.000 | **339,00** |
| P15 | C6 | 11310-000 S.Vicente | 1 | 3 | 40 | 40 | 2.500 | **100,00 mín** |
| P16 | C5 | 12308-010 Vale | 1 | 10 | 180 | 180 | 9.000 | **237,00** |

> Cada bloco mostra só o que **varia** (os defaults acima já valem). **P1/P2/P3** = passos do assistente. **Coleta** = data concreta a digitar.

---

#### ▸ P01 — C2 → Varejo Pinheiros (São Paulo) · **R$ 125,00**
- **P1 · Remetente e coleta:** Cliente **C2 — Distribuidora Norte SP** · Solicitante `Carlos Nunes` · **Coleta 01/07/2026 · Manhã** *(origem 02011-000 Santana/SP, nº 750)*
- **P2 · Cargas:** Destinatário `Varejo Pinheiros Ltda` · CNPJ `60.001.001/0001-01` · CEP `05422-000` (SP) · Nº `100` — Item **NF 1001**: `6` vol · `80` kg · `40×40×40` cm · declarado `5.000,00`
- **P3 · Cotação:** taxável **80 kg** → **R$ 125,00** · **PIX** · Após entrega

#### ▸ P02 — C3 → Casa & Cia (Santo André) · **R$ 204,00**
- **P1:** Cliente **C3 — Magazine Casa & Cia** · `Júlia Prado` · **Coleta 01/07/2026 · Manhã** *(origem 09010-000 Santo André/SP, nº 300)*
- **P2:** Destinatário `Casa & Cia Santo André` · CNPJ `60.002.002/0001-02` · CEP `09010-000` · Nº `100` — Item **NF 1002**: `10` vol · `150` kg · `50×40×40` cm · declarado `8.000,00`
- **P3:** taxável **150 kg** → **R$ 204,00** · **Boleto** · 15 dias

#### ▸ P03 — C2 → Depósito Guarulhos (Guarulhos) · **R$ 114,00** · *cubagem governa*
- **P1:** Cliente **C2 — Distribuidora Norte SP** · `Carlos Nunes` · **Coleta 01/07/2026 · Manhã** *(origem 02011-000 Santana/SP, nº 750)*
- **P2:** Destinatário `Depósito Guarulhos ME` · CNPJ `60.003.003/0001-03` · CEP `07020-000` · Nº `100` — Item **NF 1003**: `3` vol · `45` kg · `50×50×60` cm · declarado `3.000,00`
- **P3:** taxável **75 kg cubado** [(50×50×60)/6.000 = 25 × 3 = 75 > 45 real] → **R$ 114,00** · **PIX** · Após entrega

#### ▸ P04 — C3 → Loja Osasco (Osasco) · **R$ 296,00** · *2 NFs*
- **P1:** Cliente **C3 — Magazine Casa & Cia** · `Júlia Prado` · **Coleta 01/07/2026 · Manhã** *(origem 09010-000 Santo André/SP, nº 300)*
- **P2:** Destinatário `Loja Osasco Center` · CNPJ `60.004.004/0001-04` · CEP `06010-000` · Nº `100` — **NF 1004**: `8` vol · `120` kg · `40×40×40` · `7.000,00`; **NF 1005**: `6` vol · `100` kg · `40×40×40` · `5.000,00`
- **P3:** taxável **220 kg** (2 NFs → 2× TDE+TDA) → **R$ 296,00** · **Boleto** · 15 dias

#### ▸ P05 — C4 → AutoPeças Itaquera (São Paulo) · **R$ 100,00 (mínimo)** · *cancelar no Dia 13*
- **P1:** Cliente **C4 — AutoPeças Expressa** · `Rafael Tonin` · **Coleta 02/07/2026 · Tarde** *(origem 13010-111 Campinas/SP, nº 95)*
- **P2:** Destinatário `AutoPeças Itaquera` · CNPJ `60.005.005/0001-05` · CEP `08210-000` · Nº `100` — Item **NF 1006**: `2` vol · `30` kg · `40×40×40` · `2.000,00`
- **P3:** cálculo dá 66,00 → **elevado ao mínimo R$ 100,00** · **PIX** · Após entrega

#### ▸ P06 — C3 → Eletro SBC (São Bernardo) · **R$ 615,00** · *2 NFs, pesado*
- **P1:** Cliente **C3 — Magazine Casa & Cia** · `Júlia Prado` · **Coleta 01/07/2026 · Manhã** *(origem 09010-000 Santo André/SP, nº 300)*
- **P2:** Destinatário `Eletro SBC Atacado` · CNPJ `60.006.006/0001-06` · CEP `09710-000` · Nº `100` — **NF 1007**: `12` vol · `300` kg · `50×40×40` · `15.000,00`; **NF 1008**: `8` vol · `200` kg · `50×40×40` · `10.000,00`
- **P3:** taxável **500 kg** (2 NFs) → **R$ 615,00** · **Boleto** · 15 dias

#### ▸ P07 — C2 → Mercado Brás (São Paulo) · **R$ 138,00**
- **P1:** Cliente **C2 — Distribuidora Norte SP** · `Carlos Nunes` · **Coleta 01/07/2026 · Manhã** *(origem 02011-000 Santana/SP, nº 750)*
- **P2:** Destinatário `Mercado Brás Ltda` · CNPJ `60.007.007/0001-07` · CEP `03007-000` · Nº `100` — Item **NF 1009**: `6` vol · `90` kg · `40×40×40` · `6.000,00`
- **P3:** taxável **90 kg** → **R$ 138,00** · **PIX** · Após entrega

#### ▸ P08 — C1 → Tech Berrini (São Paulo) · **R$ 330,00** · *cubagem governa · mensal*
- **P1:** Cliente **C1 — Loja Online Tech** · `Ana Souza` · **Coleta 01/07/2026 · Manhã** *(origem 04571-010 Berrini/SP, nº 1200)*
- **P2:** Destinatário `Tech Berrini Store` · CNPJ `60.008.008/0001-08` · CEP `04571-010` · Nº `100` — Item **NF 1010**: `8` vol · `60` kg · `60×60×60` cm · declarado `4.000,00`
- **P3:** taxável **288 kg cubado** [(60×60×60)/6.000 = 36 × 8 = 288 > 60 real] → **R$ 330,00** · **Boleto** · **Faturamento mensal**

#### ▸ P09 — C1 → Distribuidora Santana (São Paulo) · **R$ 171,00** · *mensal*
- **P1:** Cliente **C1 — Loja Online Tech** · `Ana Souza` · **Coleta 01/07/2026 · Manhã** *(origem 04571-010 Berrini/SP, nº 1200)*
- **P2:** Destinatário `Distribuidora Santana` · CNPJ `60.009.009/0001-09` · CEP `02011-000` · Nº `100` — Item **NF 1011**: `8` vol · `120` kg · `40×40×40` · `7.000,00`
- **P3:** taxável **120 kg** → **R$ 171,00** · **Boleto** · **Faturamento mensal**

#### ▸ P10 — C4 → AutoPeças Campinas (Campinas) · **R$ 260,00** · *cancelar no Dia 13*
- **P1:** Cliente **C4 — AutoPeças Expressa** · `Rafael Tonin` · **Coleta 02/07/2026 · Tarde** *(origem 13010-111 Campinas/SP, nº 95)*
- **P2:** Destinatário `AutoPeças Campinas` · CNPJ `60.010.010/0001-10` · CEP `13010-111` · Nº `100` — Item **NF 1012**: `12` vol · `200` kg · `40×40×40` · `10.000,00`
- **P3:** taxável **200 kg** → **R$ 260,00** · **PIX** · Após entrega

#### ▸ P11 — C1 → Boutique Pinheiros (São Paulo) · **R$ 121,50** · *mensal*
- **P1:** Cliente **C1 — Loja Online Tech** · `Ana Souza` · **Coleta 01/07/2026 · Manhã** *(origem 04571-010 Berrini/SP, nº 1200)*
- **P2:** Destinatário `Boutique Pinheiros` · CNPJ `60.011.011/0001-11` · CEP `05422-000` · Nº `100` — Item **NF 1013**: `5` vol · `75` kg · `40×40×45` · `5.500,00`
- **P3:** taxável **75 kg** → **R$ 121,50** · **Boleto** · **Faturamento mensal**

#### ▸ P12 — C5 → Moda Vale (São José dos Campos) · **R$ 385,00** · *2 NFs, interior*
- **P1:** Cliente **C5 — Moda Vale Confecções** · `Sônia Reis` · **Coleta 02/07/2026 · Tarde** *(origem 12210-130 SJC/SP, nº 410)*
- **P2:** Destinatário `Moda Vale SJC` · CNPJ `60.012.012/0001-12` · CEP `12210-130` · Nº `100` — **NF 1014**: `10` vol · `180` kg · `45×40×40` · `9.000,00`; **NF 1015**: `6` vol · `120` kg · `45×40×40` · `6.000,00`
- **P3:** taxável **300 kg** (2 NFs) → **R$ 385,00** · **Transferência** · 15 dias

#### ▸ P13 — C4 → Oficina Campinas Sul (Campinas) · **R$ 159,50**
- **P1:** Cliente **C4 — AutoPeças Expressa** · `Rafael Tonin` · **Coleta 02/07/2026 · Tarde** *(origem 13010-111 Campinas/SP, nº 95)*
- **P2:** Destinatário `Oficina Campinas Sul` · CNPJ `60.013.013/0001-13` · CEP `13010-111` · Nº `100` — Item **NF 1016**: `7` vol · `110` kg · `45×45×45` · `6.500,00`
- **P3:** taxável **110 kg** → **R$ 159,50** · **PIX** · Após entrega

#### ▸ P14 — C6 → EletroBaixada (Santos) · **R$ 339,00** · *2 NFs, Baixada*
- **P1:** Cliente **C6 — EletroBaixada Atacado** · `Diego Matos` · **Coleta 02/07/2026 · Tarde** *(origem 11013-000 Santos/SP, nº 88)*
- **P2:** Destinatário `EletroBaixada Santos` · CNPJ `60.014.014/0001-14` · CEP `11013-000` · Nº `100` — **NF 1017**: `8` vol · `160` kg · `45×45×45` · `8.000,00`; **NF 1018**: `6` vol · `100` kg · `45×45×45` · `5.000,00`
- **P3:** taxável **260 kg** (2 NFs) → **R$ 339,00** · **PIX** · Após entrega

#### ▸ P15 — C6 → Loja São Vicente (São Vicente) · **R$ 100,00 (mínimo)**
- **P1:** Cliente **C6 — EletroBaixada Atacado** · `Diego Matos` · **Coleta 02/07/2026 · Tarde** *(origem 11013-000 Santos/SP, nº 88)*
- **P2:** Destinatário `Loja São Vicente` · CNPJ `60.015.015/0001-15` · CEP `11310-000` · Nº `100` — Item **NF 1019**: `3` vol · `40` kg · `40×40×40` · `2.500,00`
- **P3:** cálculo dá 77,50 → **elevado ao mínimo R$ 100,00** · **PIX** · Após entrega

#### ▸ P16 — C5 → Confecções Vale Norte (Jacareí) · **R$ 237,00**
- **P1:** Cliente **C5 — Moda Vale Confecções** · `Sônia Reis` · **Coleta 02/07/2026 · Tarde** *(origem 12210-130 SJC/SP, nº 410)*
- **P2:** Destinatário `Confecções Vale Norte` · CNPJ `60.016.016/0001-16` · CEP `12308-010` (Jacareí/SP) · Nº `100` — Item **NF 1020**: `10` vol · `180` kg · `45×45×45` · `9.000,00`
- **P3:** taxável **180 kg** → **R$ 237,00** · **Transferência** · 15 dias

> **Ordem e datas de cadastro:** **25/06** (DIA 9) → P01–P04 · **26/06** (DIA 10) → P05–P09 · **27/06** (DIA 11) → P10–P13 · **28/06** (DIA 12) → P14–P16.

## DIA 10 · 26/06/2026 (sex) — Conferência de cálculo
Depois de cadastrar P05–P09, ✅ VERIFICAR especialmente:
- **P05:** o frete final é **R$ 100,00** (mínimo aplicado sobre os 66,00 calculados).
- **P08:** o frete é **R$ 330,00** porque o sistema usou o **peso cubado (288 kg)**, não o real (60 kg). Se ele cobrar por 60 kg (= R$ 102,00), é **bug de cubagem** — anote.

## DIA 11 · 27/06/2026 (sáb) — Conferência de NFs múltiplas
Depois de P10–P13, ✅ VERIFICAR no **P04** e **P06** (2 NFs): o resumo de frete deve cobrar **TDE+TDA dobrados** (R$ 20,00 em taxas de NF, não R$ 10,00). Se cobrar só 1× as taxas, o `nfCount` não está contando as 2 notas — anote.

## DIA 12 · 28/06/2026 (dom) — Conclusão do cadastro
Após P14–P16, ✅ VERIFICAR: a lista **Pedidos → Novos** tem **16 pedidos**, e a soma dos fretes do quadro-resumo é **R$ 3.695,00**.

## DIA 13 · 29/06/2026 (seg) — Confirmações e recusas
- **Confirme** (status → Confirmado) **todos os 14 pedidos ativos**: P01, P02, P03, P04, P06, P07, P08, P09, P11, P12, P13, P14, P15, P16.
  ✅ VERIFICAR: ao confirmar, o sistema **cria a receita** correspondente (Financeiro → Receitas). O valor da receita = frete do pedido.
- **Cancele** **P05** e **P10** (motivo: "cliente desistiu").
  ✅ VERIFICAR: a receita desses pedidos **não** fica ativa (some/zera). *(Se ficar "a receber", é vazamento de receita — anote.)*

## DIA 14 · 30/06/2026 (ter) — Planejamento das rotas (consolidação)
Olhe os pedidos confirmados e agrupe por região (vamos despachar na Semana 3):

| Rota | Veículo | Pedidos (consolidados) | Região |
|---|---|---|---|
| R1 | VUC (FRC-1A11) | P01, P03, P07, P11 | Capital |
| R2 | 3/4 (FRC-2B22) | P02, P04, P06 | ABC |
| R3 | 3/4 (FRC-2B22) | P08, P09 | Capital (volumoso) |
| R4 | Toco (FRC-3C33) | P12, P16 | Vale do Paraíba |
| R5 | Toco (FRC-3C33) | P13, P14 | Campinas + Baixada |

---

# SEMANA 3 — Operação, rotas e entregas (01 a 09/07/2026)

## DIA 15 · 01/07/2026 (qua) — Liberar o Toco e criar as viagens

**Passo 1 — Tirar o FRC-3C33 da manutenção** (ele vai rodar R4 e R5):
- Frota → **FRC-3C33** → **Editar** → Status: **Disponível** → **Salvar**.
- ✅ VERIFICAR: ao voltar à lista da Frota, o status aparece **Disponível** na hora.

**Passo 2 — Criar as 5 viagens.** Vá em **Despacho** (quadro caminhões × dias). Para cada rota: clique na célula **[veículo × 01/07/2026]**, adicione os pedidos listados (consolidação fracionada), escolha o **motorista** e clique em **Criar viagem**.

| Rota | Veículo | Motorista | Pedidos (paradas) | Ajudante |
|---|---|---|---|---|
| **R1** | VUC FRC-1A11 | Antônio Ferreira | P01, P03, P07, P11 | não |
| **R2** | 3/4 FRC-2B22 | Beatriz Lima | P02, P04, P06 | não |
| **R3** | 3/4 FRC-2B22 | Beatriz Lima | P08, P09 | não |
| **R4** | Toco FRC-3C33 | Cláudio Souza | P12, P16 | sim |
| **R5** | Toco FRC-3C33 | Cláudio Souza | P13, P14 | sim |

✅ VERIFICAR: cada pedido sai de "Confirmado" para **Em coleta** e fica vinculado à sua viagem; os 3 veículos aparecem **Em rota**.

## DIA 16 · 02/07/2026 (qui) — Saída e rastreio
- Em **Viagens**, abra **R1** e **R2** e marque **Em trânsito** (partida).
- ✅ VERIFICAR no **site público** → rastreamento: digite o protocolo do **P01** → mostra **Em trânsito** (sem expor dados sensíveis do cliente).

## DIA 17 · 03/07/2026 (sex) — Entregas da R1 (POD por parada)
Em **Viagens → R1**, para cada parada registre a **entrega** (botão Entregar) com **assinatura no POD** + nome do recebedor:
- **P01** → Varejo Pinheiros — recebido por `Marcos Aurélio`
- **P03** → Depósito Guarulhos — recebido por `Pedro Henrique`
- **P07** → Mercado Brás — recebido por `Luiza Campos`
- **P11** → Boutique Pinheiros — recebido por `Camila Reis`

Depois **Encerrar viagem R1** informando: **km rodado `120`**, **combustível `R$ 180,00`**, **pedágio `R$ 0,00`**.
Em seguida, **Financeiro → Despesas → Nova Despesa**:
- Categoria **Combustível** · Valor `180,00` · Descrição `Combustível rota R1 — FRC-1A11` · Situação **Pago** · Competência **03/07/2026** · Forma **PIX** · Fornecedor **Auto Posto Marginal Tietê** · Veículo **FRC-1A11** · Motorista **Antônio Ferreira**

✅ VERIFICAR: P01/P03/P07/P11 ficam **Entregue**; R1 fica **Concluída**.

## DIA 18 · 04/07/2026 (sáb) — Entregas da R2 + ocorrência
Em **Viagens → R2**:
- **P02** → Casa & Cia Santo André — recebido por `Rogério Pinto`
- **P04** → Loja Osasco Center → **primeiro registre uma OCORRÊNCIA**: tipo **Tentativa de entrega**, descrição "destinatário ausente"; depois **reentregue** — recebido por `Tânia Melo`
- **P06** → Eletro SBC Atacado — recebido por `Evandro Dias`

**Encerrar R2:** km `90` · combustível `R$ 150,00` · pedágio `R$ 0,00`.
**Nova Despesa:** Combustível · `150,00` · `Combustível rota R2 — FRC-2B22` · **Pago** · Competência **04/07/2026** · PIX · Posto Marginal Tietê · Veículo **FRC-2B22** · Motorista **Beatriz Lima**.
✅ VERIFICAR: a ocorrência de P04 fica registrada no histórico do pedido e a entrega é concluída depois.

## DIA 19 · 05/07/2026 (dom) — Entregas da R3 (carga volumosa)
Em **Viagens → R3**:
- **P08** → Tech Berrini Store — recebido por `Ana Souza`
- **P09** → Distribuidora Santana — recebido por `Caio Tavares`

**Encerrar R3:** km `70` · combustível `R$ 120,00` · pedágio `R$ 0,00`.
**Nova Despesa:** Combustível · `120,00` · `Combustível rota R3 — FRC-2B22` · **Pago** · Competência **05/07/2026** · PIX · Posto Marginal Tietê · Veículo **FRC-2B22** · Motorista **Beatriz Lima**.
✅ VERIFICAR: P08 entregue com frete **R$ 330,00** (cobrado pelo **peso cubado 288 kg**). Se aparecer ~R$ 102,00, é bug de cubagem.

## DIA 20 · 06/07/2026 (seg) — Rota interior R4 (Vale do Paraíba)
Em **Viagens → R4** (Toco + Cláudio + ajudante):
- **P12** → Moda Vale SJC — recebido por `Sueli Ramos`
- **P16** → Confecções Vale Norte (Jacareí) — recebido por `Otávio Lopes`

**Encerrar R4:** km `210` · combustível `R$ 320,00` · pedágio `R$ 0,00`.
**Nova Despesa 1 (combustível):** Combustível · `320,00` · `Combustível rota R4 — FRC-3C33` · **Pago** · Competência **06/07/2026** · PIX · Posto Marginal Tietê · Veículo **FRC-3C33** · Motorista **Cláudio Souza**.
**Nova Despesa 2 (ajudante):** Categoria **Outros** · `120,00` · `Ajudante de rota R4` · **Pago** · Competência **06/07/2026** · PIX · Motorista **Cláudio Souza**.

## DIA 21 · 07/07/2026 (ter) — Rota interior R5 (Campinas + Baixada)
Em **Viagens → R5**:
- **P13** → Oficina Campinas Sul — recebido por `Renato Aguiar`
- **P14** → EletroBaixada Santos — recebido por `Paula Furtado`

**Encerrar R5:** km `190` · combustível `R$ 300,00` · pedágio `R$ 0,00`.
**Nova Despesa 1 (combustível):** Combustível · `300,00` · `Combustível rota R5 — FRC-3C33` · **Pago** · Competência **07/07/2026** · PIX · Posto Marginal Tietê · Veículo **FRC-3C33** · Motorista **Cláudio Souza**.
**Nova Despesa 2 (ajudante):** Outros · `120,00` · `Ajudante de rota R5` · **Pago** · Competência **07/07/2026** · PIX · Motorista **Cláudio Souza**.

> Total de combustível das 5 rotas = **R$ 1.070,00**; ajudante = **R$ 240,00**. Guarde para o batimento.

## DIA 22 · 08/07/2026 (qua) — Recebimentos
Em Financeiro → Receitas, dê **baixa (recebido)** nas receitas dos pedidos **à vista/pix**: P01, P03, P06, P07, P08 = **R$ 1.322,00** (escolha "recebido", data = hoje).
Deixe **a receber** as demais ativas: P02, P04, P09, P11, P12, P13, P14, P15, P16 = **R$ 2.013,00** — simulando prazo.
✅ VERIFICAR: recebido (1.322,00) + a receber (2.013,00) = **3.335,00**; o painel de **aging** se distribui corretamente.

---

# SEMANA 4 — Financeiro, fatura mensal e fechamento (09 a 16/07/2026)

## DIA 23 · 09/07/2026 (qui) — Despesas fixas do mês
Financeiro → Despesas → **Nova Despesa**. Cadastre **uma despesa por linha** abaixo (preencha Categoria, Valor, Descrição, Situação, datas e os vínculos indicados):

| Categoria | Descrição | Valor | Situação | Datas | Fornecedor | Veículo |
|---|---|---|---|---|---|---|
| Salários | Folha — 3 motoristas | 8.400,00 | **Pago** | Competência 05/07 · Pagamento 05/07/2026 | — | — |
| Aluguel | Galpão cross-docking | 3.500,00 | **Pago** | Competência 05/07 · Pagamento 05/07/2026 | — | — |
| Seguro | Parcela seguro da frota | 1.200,00 | **A pagar** | Competência 09/07 · Vencimento 20/07/2026 | Protege Seguros | — |
| Manutenção | Revisão FRC-2B22 | 680,00 | **A pagar** | Competência 07/07 · Vencimento 24/07/2026 | DieselFix Mecânica | FRC-2B22 |
| Pneus | 2 pneus FRC-3C33 | 1.300,00 | **A pagar** | Competência 08/07 · Vencimento 31/07/2026 | PneuJá Distribuidora | FRC-3C33 |
| Impostos | Simples/ISS do período | **200,10** | **A pagar** | Competência 09/07 · Vencimento 20/07/2026 | — | — |

> **Imposto:** `6% × R$ 3.335,00 (receita ativa) = R$ 200,10`.
> Combustível (180+150+120+320+300 = **R$ 1.070,00**) e ajudante (2 × 120 = **R$ 240,00**) já foram lançados nas rotas da Semana 3 — **não lance de novo**.
> ✅ VERIFICAR: o painel **A pagar** soma `1.200 + 680 + 1.300 + 200,10 = R$ 3.380,10` e o **aging** distribui pelas datas de vencimento.

## DIA 24 · 10/07/2026 (sex) — Fatura mensal do cliente C1
Cadastros → Cliente **C1 (Loja Online Tech)** → **Fechar fatura**.
- Pedidos do C1 no período: **P08 (330,00), P09 (171,00), P11 (121,50)** = **R$ 622,50**.
- ⚠️ **Atenção (igual ao aviso do teste SQL):** como neste roteiro cada pedido **já gerou receita por pedido**, fechar a fatura mensal pode **duplicar** a receita do C1. Para o batimento fechar, **escolha um caminho**:
  - **(A) Recomendado p/ este teste:** **não feche** a fatura mensal (mantém receita por pedido). Apenas confira que a tela de fatura **lista** P08+P09+P11 e o total **R$ 622,50**.
  - **(B)** Se quiser testar o fechamento, **cancele antes** as 3 receitas por pedido do C1 e então gere a fatura — aí o total único deve ser **R$ 622,50**.

## DIA 25 · 11/07/2026 (sáb) — DRE e fluxo de caixa
Abra **Financeiro → DRE**. Confira os números com o batimento abaixo.

## DIAS 26–30 · 12 a 16/07/2026 — Conferência final e limpeza de pendências
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

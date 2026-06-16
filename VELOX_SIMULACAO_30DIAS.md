# SIMULAÇÃO DE 30 DIAS — VELOX TRANSPORTADORA (v2 — COMPLETA, CAMPO A CAMPO)

**Cenário:** Transportadora rodoviária de cargas (3 carretas).
**Base de telas/campos:** `VELOX_MAPEAMENTO.md` + código real do sistema.
**Objetivo:** Testar **manualmente e por inteiro** o Velox TMS — preenchendo **todos os campos** (obrigatórios e opcionais) de cada formulário, percorrendo todas as telas, regras e fluxos, com checkpoints `✅ VERIFICAR` e **batimento financeiro** ao final.

---

> ## ⚠️ REGRAS DE OURO
> 1. **Sequência estrita** — siga a ordem dos dias; o batimento financeiro depende disso.
> 2. **Valores exatos** — onde houver um **Valor do frete (R$)** definido, digite exatamente esse valor (a calculadora dá só uma estimativa).
> 3. **Datas relativas** — "Hoje − N dias" / "Hoje + N dias": conte a partir da data em que você testa.
> 4. **Migrations aplicadas** — confira `supabase/SIMULACAO.md` (status `cancelled` de receitas, `advance` de viagens, `documents` da empresa, funções de segurança).
> 5. **Campos com `*`** são obrigatórios. Preencha **também** os opcionais para cobertura total.
> 6. Execute como **admin**. Há um teste de papel **operador** no Dia 7.

---

## 🚚 PERFIL E DADOS-MESTRE

```
┌──────────────────────────────────────────────────────────────┐
│                     VELOX TRANSPORTADORA                       │
├──────────────────┬─────────────────────────────────────────────┤
│ Segmento         │ Transporte rodoviário de cargas (carga seca)│
│ Frota            │ 3 veículos (2 carretas + 1 truck)           │
│ Cidade / Estado  │ São Paulo / SP                              │
│ CNPJ             │ 55.444.333/0001-22                          │
└──────────────────┴─────────────────────────────────────────────┘
```

---

# ══════════════════════════════════════════════════
# SEMANA 1 — CONFIGURAÇÃO E CADASTROS (Dias 1–7)
# ══════════════════════════════════════════════════

## DIA 1 — CONTA + DADOS DA EMPRESA + SITE PÚBLICO
**Telas:** `/login` · Configurações → Empresa · Configurações → Site Público

### 1.1 — Acesso
- [ ] Acesse `/login` e entre como **admin**. **✅ VERIFICAR:** abre o **Painel de Operações** (`/admin`); sidebar com grupos *Fluxo* (Pedidos, Despacho, Frota) e *Cadastros & Gestão* (Cadastros, Documentos, Mensagens, Financeiro, Configurações).

### 1.2 — Configurações → Empresa (preencher TODOS os campos)
Vá em **Configurações** (`/admin/config`) → categoria **Empresa**:
- [ ] **Nome da empresa:** `Velox Transportadora`
- [ ] **CNPJ:** `55.444.333/0001-22`
- [ ] **Telefone:** `(11) 3322-1100`
- [ ] **E-mail:** `contato@veloxtransportes.com.br`
- [ ] **WhatsApp:** `(11) 97777-6655`
- [ ] **Região de atuação:** `Grande SP, interior e Sul/Sudeste`
- [ ] **Endereço completo da sede:** `Rod. Anhanguera, km 18 — Galpão 4, Perus, São Paulo/SP, CEP 05275-000`
- [ ] **Missão:** `Conectar origens a destinos com pontualidade, segurança e transparência.`
- [ ] **Visão:** `Ser a transportadora regional de referência em confiabilidade até 2030.`
- [ ] **Valores:** `Pontualidade, Responsabilidade, Transparência, Segurança`
- [ ] **Instagram (link):** `https://instagram.com/veloxtransportes`
- [ ] **LinkedIn (link):** `https://linkedin.com/company/veloxtransportes`
- [ ] **Facebook (link):** `https://facebook.com/veloxtransportes`
- [ ] **Google Maps API Key:** (deixe em branco ou cole uma chave de teste) — opcional
- [ ] Clique em **Salvar**. **✅ VERIFICAR:** toast de sucesso.

### 1.3 — Configurações → Site Público
Categoria **Empresa** já abre as duas abas (Empresa + Site Público) — clique na aba **Site Público**:
- [ ] **Título do Hero:** `Sua carga, no prazo certo.`
- [ ] **Subtítulo do Hero:** `Transporte rodoviário de cargas com rastreamento e comprovação digital de entrega.`
- [ ] **Texto "Sobre Nós":** `A Velox nasceu para levar previsibilidade ao transporte de cargas. Combinamos frota própria, tecnologia e atendimento próximo.`
- [ ] **Salvar.** **✅ VERIFICAR:** abrindo a home pública (`/`) o título/subtítulo refletem o texto salvo.

---

## DIA 2 — TABELA DE FRETE, PRAZOS E ROTAS
**Tela:** Configurações → Comercial & Preços

### 2.1 — Frete base (todos os campos)
- [ ] **Preço por kg (R$):** `0,90`
- [ ] **Preço por km (R$):** `2,50`
- [ ] **Taxa fixa por pedido (R$):** `80,00`
- [ ] **Frete mínimo (R$):** `250,00`

### 2.2 — Taxas adicionais
- [ ] **GRIS (% sobre valor declarado):** `0,30`
- [ ] **Ad valorem (% sobre valor declarado):** `0,15`
- [ ] **TDE — Despacho de entrega por NF (R$):** `15,00`
- [ ] **TDA — Despacho de coleta por NF (R$):** `12,00`
- [ ] **Pedágio — R$ por kg taxável:** `0,02`

### 2.3 — Prazo de entrega
- [ ] **Velocidade média (km/dia):** `600`
- [ ] **Tabela de prazo por estado** (botão "Adicionar estado") — adicione cada linha:
  - SP → `1` dia útil
  - PR → `3` dias úteis
  - RJ → `2` dias úteis
  - MG → `2` dias úteis
  - SC → `4` dias úteis

### 2.4 — Parâmetros financeiros
- [ ] **Alíquota fiscal (%):** `8`
- [ ] **Depreciação mensal da frota (R$):** `1.500,00`
- [ ] **Salvar.**

### 2.5 — Tabela de Rotas (aba "Tabela de Rotas")
- [ ] Adicione 1 corredor: **Origem** `SP` → **Destino** `PR` com **R$/kg** `1,10` (deixe os demais campos em branco para herdar do padrão). **✅ VERIFICAR:** a linha aparece na grade e fica `ativa`.

---

## DIA 3 — ÁREA DE ATUAÇÃO, AGENDAMENTO E ALERTAS
**Tela:** Configurações → Operação · Alertas

### 3.1 — Operação → Área de Atuação
- [ ] **Tipo de serviço prestado:** selecione **Ambos**.
- [ ] **Como você define sua área?** selecione **Por estados (UF)**.
- [ ] **Estados atendidos:** marque `SP`, `PR`, `RJ`, `MG`, `SC`.
- [ ] **Mensagem para clientes fora da área:** `No momento atendemos apenas SP, PR, RJ, MG e SC. Fale conosco para avaliar sua rota.`
- [ ] **Salvar configurações de área.** **✅ VERIFICAR:** os 5 estados aparecem como tags.

### 3.2 — Operação → Regras de Agendamento
- [ ] **Antecedência mínima:** `2` dias úteis.
- [ ] **Dias de operação:** marque **Seg, Ter, Qua, Qui, Sex** (desmarque Sáb e Dom). **Salvar.**

### 3.3 — Alertas
- [ ] **CNH do motorista:** `60` dias antes
- [ ] **CRLV do caminhão:** `60` dias antes
- [ ] **Seguro do caminhão:** `30` dias antes
- [ ] **Salvar.**

---

## DIA 4 — FROTA: CADASTRAR 3 CAMINHÕES (TODOS OS CAMPOS)
**Tela:** Frota (`/admin/frota`) → aba **Carretas** → botão **"Novo Caminhão"**

> O formulário de cadastro tem os campos abaixo. Preencha **todos** em cada veículo. O **Status** não fica no cadastro — todo caminhão nasce **Disponível**; o status do T3 será mudado para *Manutenção* no detalhe (passo 4.4).

### 4.1 — Caminhão **T1**
- [ ] **Placa \*:** `RKT1A23`
- [ ] **Fabricante:** `Mercedes-Benz`
- [ ] **Modelo:** `Actros 2651`
- [ ] **Ano:** `2021`
- [ ] **Tipo:** `Carreta`
- [ ] **Cor:** `Branco`
- [ ] **Capacidade (kg):** `27000`
- [ ] **RENAVAM:** `01234567801`
- [ ] **Dimensões (m):** Comprimento `14,8` · Largura `2,6` · Altura `2,9`
- [ ] **Vencimento CRLV:** Hoje + 80 dias
- [ ] **Vencimento Seguro:** Hoje + 120 dias
- [ ] **Próx. aferição Tacógrafo:** Hoje + 60 dias
- [ ] **Km atual (odômetro):** `312000`
- [ ] **Alertas por km — Troca de óleo:** `20000` · **Revisão geral:** `40000` · **Troca de pneus:** `60000`
- [ ] **Cadastrar.** **✅ VERIFICAR:** abre o detalhe do caminhão T1.

### 4.2 — Caminhão **T2**
- [ ] **Placa \*:** `RKT2B45` | **Fabricante:** `Volvo` | **Modelo:** `FH 540` | **Ano:** `2020` | **Tipo:** `Carreta` | **Cor:** `Azul`
- [ ] **Capacidade (kg):** `30000` | **RENAVAM:** `01234567802`
- [ ] **Dimensões (m):** `15,0` · `2,6` · `3,0`
- [ ] **Vencimento CRLV:** **Hoje + 20 dias** (vai disparar alerta) | **Seguro:** Hoje + 200 dias | **Tacógrafo:** Hoje + 90 dias
- [ ] **Km atual:** `458000` | **Alertas km:** óleo `20000` · revisão `40000` · pneus `60000`
- [ ] **Cadastrar.**

### 4.3 — Caminhão **T3**
- [ ] **Placa \*:** `RKT3C67` | **Fabricante:** `Volkswagen` | **Modelo:** `Constellation 24.280` | **Ano:** `2019` | **Tipo:** `Truck` | **Cor:** `Prata`
- [ ] **Capacidade (kg):** `12000` | **RENAVAM:** `01234567803`
- [ ] **Dimensões (m):** `9,5` · `2,5` · `2,7`
- [ ] **Vencimento CRLV:** Hoje + 200 dias | **Seguro:** **Hoje + 8 dias** (alerta crítico) | **Tacógrafo:** Hoje + 120 dias
- [ ] **Km atual:** `521000` | **Alertas km:** óleo `15000` · revisão `30000` · pneus `50000`
- [ ] **Cadastrar.**

### 4.4 — Ajustes no detalhe + verificações
- [ ] Abra **T3** (`/admin/frota/:id`) → **Editar** → mude **Status** para **Manutenção** → Salvar.
- [ ] **✅ VERIFICAR:** a aba **Carretas** lista os 3 numa **tabela densa**; clique no cabeçalho **Capacidade** → ordena. T2 e T3 mostram badge **"Vencendo"** na coluna Documentos. T3 com status **Manutenção**.

---

## DIA 5 — FROTA: CADASTRAR 3 MOTORISTAS (TODOS OS CAMPOS)
**Tela:** Frota → aba **Motoristas** → **"Novo Motorista"**

### 5.1 — Motorista **D1**
- [ ] **Nome completo \*:** `João da Silva`
- [ ] **CPF \*:** `111.222.333-44`
- [ ] **Telefone:** `(11) 98888-0001`
- [ ] **E-mail:** `joao.silva@veloxtransportes.com.br`
- [ ] **Data de nascimento:** `1985-04-12`
- [ ] **Data de admissão:** Hoje − 800 dias
- [ ] **Número da CNH:** `01234567890`
- [ ] **Categoria CNH:** `E`
- [ ] **Vencimento da CNH:** Hoje + 300 dias
- [ ] **Função:** `Motorista`
- [ ] **Tipo de contrato:** `CLT`
- [ ] **Salário base (R$):** `3.800,00`
- [ ] **Status:** `Ativo`
- [ ] **Cadastrar.**

### 5.2 — Motorista **D2**
- [ ] **Nome \*:** `Carlos Pereira` | **CPF \*:** `222.333.444-55` | **Telefone:** `(11) 98888-0002` | **E-mail:** `carlos.pereira@veloxtransportes.com.br`
- [ ] **Nascimento:** `1990-09-03` | **Admissão:** Hoje − 500 dias
- [ ] **CNH:** `02345678901` | **Categoria:** `E` | **Vencimento:** **Hoje + 45 dias** (vai disparar alerta ≤60)
- [ ] **Função:** `Motorista` | **Contrato:** `CLT` | **Salário:** `3.800,00` | **Status:** `Ativo`
- [ ] **Cadastrar.** **✅ VERIFICAR:** na lista, D2 aparece com aviso **"CNH vencendo"**.

### 5.3 — Motorista **D3**
- [ ] **Nome \*:** `Marcos Antônio` | **CPF \*:** `333.444.555-66` | **Telefone:** `(11) 98888-0003` | **E-mail:** `marcos.antonio@veloxtransportes.com.br`
- [ ] **Nascimento:** `1978-12-20` | **Admissão:** Hoje − 200 dias
- [ ] **CNH:** `03456789012` | **Categoria:** `D` | **Vencimento:** Hoje + 600 dias
- [ ] **Função:** `Motorista` | **Contrato:** `PJ` | **Salário:** (deixe em branco — PJ por viagem) | **Status:** `Ativo`
- [ ] **Cadastrar.**

---

## DIA 6 — CADASTROS: 6 CLIENTES (TODOS OS CAMPOS)
**Tela:** Cadastros (`/admin/cadastros`) → aba **Clientes** → **"Novo Cliente"**

> Para cada cliente preencha dados, **endereço** (use o CEP p/ auto-preencher) e pelo menos **1 contato**.

### 6.1 — **CL1: Distribuidora Brasil Ltda** (mensal)
- [ ] **Razão Social / Nome \*:** `Distribuidora Brasil Ltda`
- [ ] **CPF / CNPJ \*:** `12.345.678/0001-90`
- [ ] **Tipo de pessoa:** `Pessoa Jurídica`
- [ ] **E-mail:** `compras@distbrasil.com.br` | **Telefone:** `(11) 3000-0001`
- [ ] **Perfil de cliente:** `Recorrente`
- [ ] **Status:** `Ativo`
- [ ] **Tipo de cobrança:** `Faturamento mensal` → **Dia de fechamento:** `25` · **Prazo de pagamento (dias):** `30`
- [ ] **Observações:** `Cliente recorrente de grande volume. Fechamento mensal consolidado.`
- [ ] **Contato 1:** Nome `Fernanda Souza` · Função `Logística` · Telefone `(11) 3000-0001` · WhatsApp `(11) 99000-0001` · E-mail `fernanda@distbrasil.com.br` · **Principal ✓**
- [ ] **Endereço:** CEP `01310-100` (auto-preenche Av. Paulista, Bela Vista, São Paulo/SP) · Número `1000` · Complemento `Conj. 142`
- [ ] **Cadastrar.**

### 6.2 — **CL2: Indústria Aurora S.A.** (tabela negociada)
- [ ] **Razão Social \*:** `Indústria Aurora S.A.` | **CNPJ \*:** `23.456.789/0001-01` | **Tipo:** `PJ`
- [ ] **E-mail:** `logistica@aurora.ind.br` | **Telefone:** `(11) 3000-0002`
- [ ] **Perfil:** `Recorrente` | **Status:** `Ativo` | **Cobrança:** `Por viagem`
- [ ] **Observações:** `Possui tabela de frete negociada (ver Dia 7).`
- [ ] **Contato 1:** `Ricardo Alves` · `Compras` · `(11) 3000-0002` · WhatsApp `(11) 99000-0002` · `ricardo@aurora.ind.br` · **Principal ✓**
- [ ] **Endereço:** CEP `13000-000` · Número `500` · Complemento `Galpão Industrial 7`
- [ ] **Cadastrar.**

### 6.3 — **CL3: Comércio Pinheiro ME**
- [ ] **Razão Social \*:** `Comércio Pinheiro ME` | **CNPJ \*:** `34.567.890/0001-12` | **Tipo:** `PJ`
- [ ] **E-mail:** `contato@pinheiroatacado.com.br` | **Telefone:** `(11) 3000-0003`
- [ ] **Perfil:** `Eventual` | **Status:** `Ativo` | **Cobrança:** `Por viagem`
- [ ] **Observações:** `Atacadista. Costuma despachar para RJ e Santos.`
- [ ] **Contato 1:** `Paulo Pinheiro` · `Diretor` · `(11) 3000-0003` · WhatsApp `(11) 99000-0003` · `paulo@pinheiroatacado.com.br` · **Principal ✓**
- [ ] **Endereço:** CEP `09000-000` · Número `220` · Complemento `—`
- [ ] **Cadastrar.**

### 6.4 — **CL4: AgroPeças MG Ltda**
- [ ] **Razão Social \*:** `AgroPeças MG Ltda` | **CNPJ \*:** `45.678.901/0001-23` | **Tipo:** `PJ`
- [ ] **E-mail:** `pedidos@agropecasmg.com.br` | **Telefone:** `(31) 3000-0004`
- [ ] **Perfil:** `Eventual` | **Status:** `Ativo` | **Cobrança:** `Por viagem`
- [ ] **Observações:** `Recebe em BH. Janela de recebimento até 16h.`
- [ ] **Contato 1:** `Júlia Castro` · `Compras` · `(31) 3000-0004` · WhatsApp `(31) 99000-0004` · `julia@agropecasmg.com.br` · **Principal ✓**
- [ ] **Endereço:** CEP `30110-000` · Número `850` · Complemento `—`
- [ ] **Cadastrar.**

### 6.5 — **CL5: Mariana Lima** (PF)
- [ ] **Razão Social / Nome \*:** `Mariana Lima` | **CPF \*:** `123.456.789-01` | **Tipo:** `Pessoa Física`
- [ ] **E-mail:** `mariana.lima@gmail.com` | **Telefone:** `(11) 97777-5555`
- [ ] **Perfil:** `Eventual` | **Status:** `Ativo` | **Cobrança:** `Por viagem`
- [ ] **Observações:** `Cliente pessoa física. Mudança/itens pessoais.`
- [ ] **Contato 1:** `Mariana Lima` · `—` · `(11) 97777-5555` · WhatsApp `(11) 97777-5555` · `mariana.lima@gmail.com` · **Principal ✓**
- [ ] **Endereço:** CEP `04101-300` · Número `1200` · Complemento `Apto 152`
- [ ] **Cadastrar.**

### 6.6 — **CL6: Atacado Sul Ltda** (cadastro extra)
- [ ] **Razão Social \*:** `Atacado Sul Ltda` | **CNPJ \*:** `56.789.012/0001-34` | **Tipo:** `PJ`
- [ ] **E-mail:** `sac@atacadosul.com.br` | **Telefone:** `(41) 3000-0006`
- [ ] **Perfil:** `Eventual` | **Status:** `Ativo` | **Cobrança:** `Por viagem`
- [ ] **Endereço:** CEP `80010-000` (Curitiba/PR) · Número `77`
- [ ] **Cadastrar.**
- [ ] **✅ VERIFICAR:** a tabela de Clientes lista os 6; ordene por **Razão Social** e por **Status**; busque por "Aurora".

---

## DIA 7 — FORNECEDORES, TABELA NEGOCIADA E PAPEL OPERADOR
**Telas:** Cadastros → Fornecedores · Cliente (detalhe) · (opcional) papel operador

### 7.1 — Cadastrar 4 fornecedores (todos os campos)
Aba **Fornecedores** → **"Novo Fornecedor"**:

- [ ] **F1 — Posto Rodoviário BR-116**
  - Razão Social/Nome \*: `Posto Rodoviário BR-116` · CNPJ/CPF: `67.890.123/0001-45` · **Categoria:** `Combustível`
  - Contato principal: `Gerente Edson` · Telefone: `(11) 4004-1100` · WhatsApp: `(11) 99004-1100` · E-mail: `financeiro@postobr116.com.br`
  - Observações: `Convênio diesel S10. Fechamento quinzenal.`
  - **Contato adicional:** `Edson Matos` · `Gerente` · `(11) 99004-1100` · e-mail `edson@postobr116.com.br` · **Principal ✓**
- [ ] **F2 — Oficina TruckCenter** · CNPJ `78.901.234/0001-56` · **Categoria:** `Manutenção` · Contato `Sr. Aldo` · Tel `(11) 4004-2200` · WhatsApp `(11) 99004-2200` · E-mail `os@truckcenter.com.br` · Obs `Mecânica pesada e elétrica.`
- [ ] **F3 — Carga Segura Seguros** · CNPJ `89.012.345/0001-67` · **Categoria:** `Seguros` · Contato `Corretora Lúcia` · Tel `(11) 4004-3300` · E-mail `apolices@cargasegura.com.br` · Obs `Apólice RCTR-C + RCF-DC.`
- [ ] **F4 — Pneus & Cia** · CNPJ `90.123.456/0001-78` · **Categoria:** `Pneus` · Contato `Vendas` · Tel `(11) 4004-4400` · E-mail `vendas@pneusecia.com.br`
- [ ] **✅ VERIFICAR:** a tabela de Fornecedores lista os 4; ordene por **Categoria**.

### 7.2 — Tabela de frete negociada (CL2)
- [ ] Abra **CL2 (Indústria Aurora)** em `/admin/clientes/:id`. No card **Tabela de Frete** → **Editar**:
  - **R$/kg:** `0,75` · **Frete mínimo:** `300,00` (deixe os demais em branco)
- [ ] **Salvar.** **✅ VERIFICAR:** aparece "★ Tabela negociada — prioridade sobre rotas e padrão".

### 7.3 — (Opcional) Restrição de papel operador
- [ ] Crie um usuário com papel **operador** (Supabase Auth + `user_profiles.role = 'operator'`). Logado como operador, **✅ VERIFICAR:** **Financeiro** e **Configurações** não aparecem na sidebar e suas URLs bloqueiam; **Pedidos/Despacho/Frota** funcionam.

---

# ══════════════════════════════════════════════════
# SEMANA 2 — PEDIDOS, DESPACHO E VIAGENS (Dias 8–15)
# ══════════════════════════════════════════════════

## 📦 CATÁLOGO DE PEDIDOS DA SIMULAÇÃO

| Pedido | Cliente | Rota | Peso | Valor declarado | **Frete (R$)** | Status final | Forma pgto |
|---|---|---|---|---|---|---|---|
| P01 `VLX-2026-90001` | CL1 | SP → Campinas/SP | 8.000 kg | 120.000 | **1.950,00** | Entregue | PIX |
| P02 `90002` | CL2 | SP → Curitiba/PR | 12.000 kg | 200.000 | **3.400,00** | Entregue | Boleto |
| P03 `90003` | CL3 | SP → Santos/SP | 3.000 kg | 45.000 | **1.200,00** | Entregue | PIX |
| P04 `90004` | CL1 | SP → Belo Horizonte/MG | 6.000 kg | 90.000 | **2.500,00** | Entregue | Transferência |
| P05 `90005` | CL4 | SP → Ribeirão Preto/SP | 4.500 kg | 60.000 | **1.700,00** | Entregue | PIX |
| P06 `90006` | CL5 | SP → Sorocaba/SP | 800 kg | 8.000 | **550,00** | Entregue | Dinheiro |
| P07 `90007` | CL3 | SP → Rio de Janeiro/RJ | 5.000 kg | 80.000 | **2.700,00** | Entregue | Boleto |
| P08 `90008` | CL1 | SP → Campinas/SP | 7.000 kg | 100.000 | **1.850,00** | Entregue | PIX |
| P09 `90009` | CL2 | SP → Joinville/SC | 9.000 kg | 150.000 | **3.100,00** | Entregue | Transferência |
| P10 `90010` | CL4 | SP → Belo Horizonte/MG | 3.500 kg | 50.000 | **1.550,00** | Entregue | PIX |
| P11 `90011` | CL5 | SP → Santos/SP | 1.200 kg | 12.000 | **650,00** | Entregue | PIX |
| P12 `90012` | CL2 | SP → Curitiba/PR | 11.000 kg | 180.000 | **3.200,00** | Em trânsito | — |
| P13 `90013` | CL3 | SP → Rio de Janeiro/RJ | 5.500 kg | 85.000 | **2.800,00** | Confirmado | — |
| P14 `90014` | CL1 | SP → Campinas/SP | 6.500 kg | 95.000 | **1.800,00** | Confirmado | — |
| P15 `90015` | CL4 | SP → BH/MG | 3.500 kg | 50.000 | _(sem frete)_ | Novo | — |
| P16 `90016` | CL3 | SP → Curitiba/PR | — | — | _(cancelado)_ | Cancelado | — |

## DIA 8 — SITE PÚBLICO: COTAÇÃO E AGENDAMENTO
**Telas:** `/cotacao` · `/calculadora` · `/agendar` · `/rastrear`

### 8.1 — Cotação (`/cotacao`)
- [ ] Passo 1 — Rota: UF origem `SP` → UF destino `PR`.
- [ ] Passo 2 — Carga: 1 item, volumes `20`, peso `12000`, dimensões `120×100×120`, valor declarado `200000`, NFs `1`.
- [ ] Passo 3 — Resultado: **✅ VERIFICAR:** `FreightBreakdown` mostra peso real vs cubado, GRIS, Ad Valorem, TDE/TDA, pedágio e total; prazo PR = 3 dias úteis. Botão "Agendar este frete" leva para `/agendar` pré-preenchido.

### 8.2 — Agendamento público (gera **P01**) — preencher todos os passos
Abra `/agendar`:
- [ ] **Passo 1 (Solicitante):** Nome `Distribuidora Brasil Ltda` · CPF/CNPJ `12.345.678/0001-90` · **Responsável pelo agendamento** `Fernanda Souza` · Cargo `Logística` · Telefone `(11) 3000-0001` · E-mail `compras@distbrasil.com.br` · Preferência de contato `WhatsApp` · **Data de coleta** = próximo dia útil válido.
- [ ] **Passo 2 (Origem):** CEP `05275-000` (auto-fill) · Número `18` · Complemento `Galpão 4` · Horário `Manhã` · Obs `Carga paletizada na doca 3.`
- [ ] **Passo 3 (Destinatário + item):** Nome `CD Campinas` · CNPJ `12.345.678/0002-71` · CEP `13000-000` · Número `500` · Item: NF `90001`, NCM `48191000`, embalagem `Palete`, volumes `8`, descrição `Produtos de limpeza`, peso `8000`, dimensões `120×100×140`, valor declarado `120000`.
- [ ] **Passo 4 (Serviço):** Tipo de frete `Dedicado` · CIF · Modal `Rodoviário`.
- [ ] **Passo 5 (Resumo):** confira o `FreightBreakdown` e **Confirmar Agendamento**. **✅ VERIFICAR:** gera **protocolo `VLX-2026-…`** e tela de sucesso.

### 8.3 — Cobertura fora da área
- [ ] Em `/agendar`, teste um CEP da Bahia (ex.: `40000-000`). **✅ VERIFICAR:** aparece "Região não atendida" e o botão **Próximo** bloqueia.

### 8.4 — Painel
- [ ] Abra **Operações** (`/admin`). **✅ VERIFICAR:** fila de ação "1 pedido aguardando confirmação"; badge em **Pedidos** na sidebar; faixa de métricas (frota disponível, em rota, coletas/entregas hoje).

## DIA 9 — CONFIRMAR P01 E CRIAR PEDIDOS INTERNOS (TODOS OS CAMPOS)
**Telas:** Pedidos (`/admin/coletas`) · Novo Pedido (`/admin/coletas/nova`)

### 9.1 — Confirmar P01 (ação inline)
- [ ] Em **Pedidos** → aba **Novos** → linha do P01 → **Confirmar**. No painel: **Data de coleta** Hoje − 22 dias · **Caminhão** T1 · **Valor do frete** `1.950,00` · **Forma** PIX → **Confirmar Pedido**.
- [ ] **✅ VERIFICAR:** P01 vira **Confirmado**; em Financeiro → Receitas há **1 receita** de R$ 1.950,00 (sem duplicar).

### 9.2 — Novo Pedido **P02** (cliente com tabela negociada) — preencher TODOS os campos
Clique em **Novo Pedido**:
- [ ] **Solicitante:** Buscar cliente `Indústria Aurora` (selecionar) → confirma auto-preenchimento. **✅ VERIFICAR:** resumo indica cliente com tabela negociada. Responsável `Ricardo Alves` · Cargo `Compras` · Tipo de frete `Dedicado`.
- [ ] **Origem da Coleta:** CEP `05275-000` · Número `18` · Complemento `Galpão 4` · (cidade/UF auto) · **Data de coleta** Hoje − 21 dias · Horário `Manhã` · Obs `Coleta na fábrica, doca 2.`
- [ ] **Destinatário 1:** Nome `Aurora Filial Curitiba` · CNPJ `23.456.789/0002-92` · Telefone `(41) 3000-0002` · CEP `80010-000` · Número `1500` · Complemento `—` · Obs de entrega `Recebe até 17h.`
  - **Item 1:** Nº NF `90002` · (Chave NF-e opcional) · NCM `39269090` · Embalagem `Palete` · Volumes `12` · Descrição `Peças plásticas industriais` · Peso `12000` · Dimensões `120×100×150` · Valor declarado `200000` · Frágil ✗ · Perigoso ✗.
- [ ] **Valor e Atribuição:** **Valor do Frete** `3.400,00` · **CIF** · Forma `Boleto` · Condições `30 dias` · Motorista `Carlos Pereira` · Caminhão `RKT2B45` · Obs internas `Cliente tabela negociada.`
- [ ] **Criar Coleta.**

### 9.3 — Importar XML da NF-e (teste do recurso)
- [ ] Em um Novo Pedido, no bloco do destinatário clique **"Importar XML da NF-e"** e selecione um XML real de NF-e. **✅ VERIFICAR:** nome/CNPJ/endereço, nº da NF, peso, volumes e valor preenchem sozinhos.

### 9.4 — Criar P03, P04, P05 (resumido — mesmos campos)
- [ ] Crie **P03** (CL3 → Santos, item 3.000 kg, frete `1.200`), **P04** (CL1 → BH, 6.000 kg, frete `2.500`), **P05** (CL4 → Ribeirão, 4.500 kg, frete `1.700`). Preencha origem, destinatário e item de cada (valores da tabela). Pode deixá-los **Novos** para despachar nos próximos dias.

## DIA 10 — DESPACHO (QUADRO CAMINHÕES × DIAS)
**Tela:** Despacho (`/admin/despacho`)

- [ ] Confirme P03, P04, P05 (aba Novos → Confirmar, com os fretes da tabela), para entrarem na fila do Despacho.
- [ ] **10.1 — Programar pela fila:** marque **P01 + P03** na fila → **✅ VERIFICAR:** barra "2 selecionados · 11.000 kg".
- [ ] **10.2 — Alocar:** clique na célula **T1 × (dia de coleta)**. **✅ VERIFICAR:** os pedidos entram na célula com barra de capacidade; excesso de peso é bloqueado.
- [ ] **10.3 — Lote:** selecione novamente e use **"Criar viagem"** na barra (atalho). Volte sem salvar para usar o botão "Viagem" da célula no Dia 11.

## DIA 11 — VIAGEM V1 (COMPLETA) + POD
**Telas:** Nova Viagem · Detalhe da Viagem · App do Motorista

- [ ] **11.1 — Criar V1:** na célula T1, botão **"Viagem"** (ou `/admin/viagens/nova`): Pedidos **P01 + P03** · Motorista **João da Silva** · Caminhão **RKT1A23** · **Data/hora de saída** Hoje − 21 dias · **Adiantamento ao motorista** `500,00` · Obs `Rota Campinas/Santos.` → **Criar Viagem**. **✅ VERIFICAR:** criou **despesa pendente** de adiantamento (R$ 500).
- [ ] **11.2 — Romaneio:** detalhe da viagem → **Romaneio PDF**. **✅ VERIFICAR:** PDF com motorista, placa, paradas, NFs e assinatura.
- [ ] **11.3 — Iniciar:** **Iniciar** → status "Em andamento"; pedidos → **Em coleta**.
- [ ] **11.4 — App motorista (POD):** em `/motorista`: **checklist de saída** (marque os 5 itens e confirme). Numa parada de **entrega**: anexe a NF, **Nome do recebedor** `Almoxarifado Campinas`, capture a **assinatura** no canvas. **✅ VERIFICAR:** "Confirmar Entrega" só habilita com NF **e** assinatura.
- [ ] **11.5 — Encerrar V1 (admin):** **Encerrar Viagem** → Km final `312520` · Litros `380` · **Custo combustível** `1.100,00` · **Pedágios** `180,00` → Confirmar. **✅ VERIFICAR:** status "Concluída"; P01/P03 → **Entregue**; despesas de combustível/pedágio criadas; odômetro do T1 atualizado.
- [ ] **11.6 — Comprovante:** abra P01 → menu **⋯ → Comprovante PDF**. **✅ VERIFICAR:** o PDF embute a **assinatura** e o nome do recebedor.

## DIA 12 — VIAGENS V2 e V3
- [ ] **V2 (T2/D2):** despache **P02**; crie a viagem; encerre com combustível `1.600,00` · pedágios `240,00`. P02 → Entregue.
- [ ] **V3 (T1/D1):** despache **P04 + P05**; encerre com combustível `1.050,00` · pedágios `160,00`. P04, P05 → Entregue.

## DIA 13 — RASTREAMENTO E HISTÓRICO DO MOTORISTA
- [ ] **13.1 —** `/rastrear` → busque o protocolo do P02. **✅ VERIFICAR:** timeline de status + status por destinatário, sem login (função segura `track_order`).
- [ ] **13.2 —** `/motorista/historico` → viagens concluídas de D1 com km e paradas.

## DIA 14 — CANCELAMENTO E DUPLICAÇÃO
- [ ] **14.1 — P16 cancelado:** crie um pedido rápido para CL3 (P16) e no workspace → menu **⋯ → Cancelar pedido** → motivo `Cliente desistiu da carga`. **✅ VERIFICAR:** status **Cancelado**; receita pendente estornada; motivo no histórico.
- [ ] **14.2 — Duplicar:** em P04 (entregue) → menu **⋯ → Duplicar**. **✅ VERIFICAR:** abre Novo Pedido pré-preenchido (datas/status zerados).

## DIA 15 — MENSAGENS DO SITE → PEDIDO
- [ ] **15.1 —** No site público (Contato), envie uma mensagem como lead. **✅ VERIFICAR:** aparece em **Mensagens** com badge de não lida.
- [ ] **15.2 —** Abra a mensagem → **"Criar pedido"**. **✅ VERIFICAR:** abre Novo Pedido com nome/telefone/e-mail e o texto nas observações.

---

# ══════════════════════════════════════════════════
# SEMANA 3 — OPERAÇÃO + FINANCEIRO (Dias 16–23)
# ══════════════════════════════════════════════════

## DIA 16–18 — VIAGENS V4, V5, V6
- [ ] **V4 (T2/D3):** P06 + P07 → encerrar combustível `900,00` · pedágios `130,00`. (P06, P07 → Entregue)
- [ ] **V5 (T1/D1):** P08 + P09 → encerrar combustível `1.500,00` · pedágios `220,00`. (P08, P09 → Entregue)
- [ ] **V6 (T2/D2):** P10 + P11 → encerrar combustível `750,00` · pedágios `110,00`. (P10, P11 → Entregue)
- [ ] **✅ VERIFICAR (parcial):** 11 pedidos entregues (P01–P11), 6 viagens concluídas. Combustível total = **R$ 6.900,00**; pedágios = **R$ 1.040,00**.

## DIA 19 — MANUTENÇÃO DO T3 (com todos os campos)
**Tela:** Frota → Detalhe T3 → Manutenções

- [ ] **Registrar manutenção:** Tipo `Revisão` · Data Hoje − 6 dias · Km `521000` · Descrição `Revisão preventiva + troca de pastilhas de freio` · **Valor** `1.850,00` · Fornecedor `Oficina TruckCenter` · Próxima manutenção (data) Hoje + 180 dias. Salvar. **✅ VERIFICAR:** criou despesa pendente de manutenção R$ 1.850.
- [ ] **Dar baixa:** Financeiro → Despesas → dar baixa nessa despesa (PIX, Hoje − 6 dias). **✅ VERIFICAR:** status **Pago**.

## DIA 20 — DOCUMENTOS (4 abas, incl. upload manual)
**Tela:** Documentos (`/admin/documentos`)
- [ ] **Pedidos e Viagens:** NFs assinadas das entregas com link "Ver".
- [ ] **Frota / Motoristas:** CRLV/Seguro/Tacógrafo (com badge) e CNHs.
- [ ] **Empresa (upload):** Categoria `Licença ANTT/RNTRC` · Vencimento Hoje + 300 dias · **Anexar arquivo** (PDF). **✅ VERIFICAR:** entra na lista com categoria e data; "Ver" abre o arquivo.

## DIA 21 — DESPESAS FIXAS (todos os campos, todas Pagas)
**Tela:** Financeiro → Despesas → "Nova Despesa"
- [ ] **Salários:** Categoria `Salários` · Descrição `Folha motoristas CLT (mês)` · Valor `7.600,00` · Data Hoje − 5 dias · Status `Pago` · Forma `Transferência`.
- [ ] **Aluguel:** Categoria `Aluguel` · Descrição `Aluguel galpão Perus` · Valor `4.500,00` · Data Hoje − 10 dias · Status `Pago` · Forma `Boleto`.
- [ ] **Seguros:** Categoria `Seguros` · Descrição `Apólice frota (parcela)` · Valor `1.800,00` · Data Hoje − 12 dias · Status `Pago` · Forma `Boleto`.
- [ ] **Administrativo:** Categoria `Administrativo` · Descrição `Contador + telefonia` · Valor `900,00` · Data Hoje − 8 dias · Status `Pago` · Forma `PIX`.

## DIA 22 — RECEITAS E AGING
**Tela:** Financeiro → Receitas
- [ ] **Marcar recebidas:** as receitas de P01–P11 (entregues) → botão **Recebido**. Total recebido = **R$ 21.150,00**.
- [ ] **Aging dos abertos:** ajuste vencimentos: P13 (`2.800`) → **vencida**; P12 (`3.200`) → **vence em ≤7 dias**; P14 (`1.800`) → **8–30 dias**. **✅ VERIFICAR:** faixas Vencidas 2.800 · ≤7d 3.200 · 8–30d 1.800; clicar filtra.

## DIA 23 — VIAGEM EM ANDAMENTO (V7)
- [ ] Confirme **P12** (`3.200`), despache para **T2/D2** e **Inicie** (não encerre). **✅ VERIFICAR:** no Painel, **Frota agora** mostra T2 "Em rota" com progresso; P12 fica **Em trânsito**.

---

# ══════════════════════════════════════════════════
# SEMANA 4 — FECHAMENTO E AUDITORIA (Dias 24–30)
# ══════════════════════════════════════════════════

## DIA 24 — CONFIRMADOS A DESPACHAR
- [ ] Confirme **P13** (`2.800`) e **P14** (`1.800`) sem criar viagem. **✅ VERIFICAR:** ficam **Confirmados sem viagem** → fila do Despacho + badge "Despacho".

## DIA 25 — FATURAMENTO MENSAL (CL1)
- [ ] Abra **CL1** → **"Fechar fatura"**. **✅ VERIFICAR:** o modal lista os fretes do mês do CL1 (P01, P04, P08, P14), total e vencimento (dia 25 + 30 dias). *Gere apenas se quiser testar; para o batimento, considere as receitas individuais já contabilizadas.*

## DIA 28 — ALERTAS DA FROTA
- [ ] Abra o Painel (dispara `syncAlerts`) e o sino → `/admin/alertas`. **✅ VERIFICAR:** alertas de **CNH do D2** (≤45d), **CRLV do T2** (≤20d) e **Seguro do T3** (≤8d, crítico).

## DIA 29 — DESPESA FUTURA (filtro do mês)
- [ ] Nova Despesa: `Parcela mesa hidráulica` · Categoria `Manutenção` · Valor `1.200,00` · Status `Pendente` · **Data Hoje + 27 dias**. **✅ VERIFICAR:** **não** entra no DRE nem no fluxo do mês atual.

## DIA 30 — AUDITORIA E BATIMENTO FINANCEIRO

### ✅ 30.1 — DRE (Financeiro → DRE, mês atual)
```
┌────────────────────────────────────────────┬────────────────┐
│ (+) Receita Bruta (fretes)                 │  R$ 28.950,00  │
│      • Recebida (11 entregues)             │  R$ 21.150,00  │
│      • A receber (1 trânsito + 2 confirm.) │  R$  7.800,00  │
│ (-) Deduções fiscais (8%)                  │  R$  2.316,00  │
│ (=) Receita Líquida                        │  R$ 26.634,00  │
│ (-) Custos Variáveis                       │  R$  9.790,00  │
│      • Combustível                         │  R$  6.900,00  │
│      • Pedágios                            │  R$  1.040,00  │
│      • Manutenção                          │  R$  1.850,00  │
│ (-) Custos Fixos                           │  R$ 14.800,00  │
│      • Salários 7.600 · Aluguel 4.500      │                │
│      • Seguros 1.800 · Administrativo 900  │                │
│ (-) Outras despesas (adiantamento)         │  R$    500,00  │
│ (=) EBITDA                                 │  R$  1.544,00  │
│ (-) Depreciação mensal                     │  R$  1.500,00  │
│ (=) LUCRO LÍQUIDO                          │  R$     44,00  │
└────────────────────────────────────────────┴────────────────┘
```
> Operação no **ponto de equilíbrio** (EBITDA +R$ 1.544; lucro ~zero após depreciação não-caixa). **✅ VERIFICAR** também o card **Resultado por Caminhão**.

### ✅ 30.2 — Fluxo de Caixa
```
ENTRADAS (recebidas)                R$ 21.150,00
   PIX 8.900 · Boleto 6.100 · Transferência 5.600 · Dinheiro 550
SAÍDAS (pagas)                      R$ 24.590,00
   Salários 7.600 · Combustível 6.900 · Aluguel 4.500
   Seguros 1.800 · Manutenção 1.850 · Pedágios 1.040 · Administrativo 900
(=) SALDO DE CAIXA DO MÊS         − R$  3.440,00
```
> Negativo esperado: R$ 7.800 ainda **a receber** e R$ 500 de adiantamento **pendente**.
> **Conferência do PIX:** P01 1.950 + P03 1.200 + P05 1.700 + P08 1.850 + P10 1.550 + P11 650 = **8.900** ✓

### ✅ 30.3 — Aging de Recebíveis
- [ ] Recebido **21.150** · Vencidas **2.800** (P13) · ≤7d **3.200** (P12) · 8–30d **1.800** (P14). Total em aberto = **7.800**.

### ✅ 30.4 — Frota e Alertas
- [ ] T1 **Disponível**; T2 **Em rota** (V7 não encerrada) ou Disponível; T3 **Manutenção**. Alertas: CNH D2, CRLV T2, Seguro T3.

### ✅ 30.5 — Checklist de cobertura de telas
- [ ] Operações · Pedidos (pipeline + inline + ordenação) · Despacho (quadro + lote) · Frota (carretas/motoristas/simulador) · Cadastros (clientes/fornecedores) · Documentos (4 abas) · Mensagens (+ criar pedido) · Financeiro (resumo/receitas/despesas/DRE/fluxo) · Configurações (Empresa/Comercial & Preços/Operação/Alertas) · Site público (cotação/calculadora/agendar/rastrear) · App do motorista (checklist/POD/assinatura).

---

> **Se algum total não bater:** confira (1) o **Valor do frete** exato de cada pedido, (2) se marcou as receitas dos entregues como **Recebido**, (3) se as despesas têm **data dentro do mês**, e (4) se os custos de combustível/pedágio digitados no encerramento das viagens batem com a tabela.

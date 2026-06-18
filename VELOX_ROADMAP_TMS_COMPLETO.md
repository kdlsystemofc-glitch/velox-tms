# Roadmap — Velox de "sistema simples" para **TMS completo**

> Documento de arquitetura/produto. Como o mercado (McLeod, TMW, SAP TM, Intelipost, Senior, Brudam, SSW) estrutura o miolo operacional e o plano para chegar lá. Escrito a partir das dúvidas reais do dono da operação.

---

## 1. Como os grandes TMS estruturam o fluxo (referência)

O coração de um TMS fracionado é a cadeia:

```
Pedido/OS de Coleta → Consolidação (carga) → Roteirização → Viagem/Manifesto → Coleta física → Hub/CD → CT-e → Romaneio → Entrega → Acerto/Financeiro
```

### 1.1 Consolidação de carga ("o que cada caminhão leva") — ponto #1
Não é manual e solto: o TMS **sugere a separação** com um motor de *load planning* que pondera:
- **Data/janela de coleta** (só agrupa o que coleta no mesmo dia/turno).
- **Região** (UF + prefixo de CEP do destino) — junta o que é próximo.
- **Peso e cubagem × capacidade** do veículo (bin-packing).
- **Mesmo local de coleta** — pedidos do mesmo remetente/CEP **não se separam** entre caminhões (evita mandar 2 veículos ao mesmo ponto).
- **Disponibilidade** do veículo (não usa o que está em manutenção/rota).
- **Horário/turno** de coleta.

O operador recebe a proposta, **ajusta no quadro** (drag) e confirma. Manual continua possível; o automático é o ponto de partida.

### 1.2 Roteirização (ordem das paradas) — ponto #2
A viagem **não** é "coleta→entrega" fixa. O roteiro é **dinâmico**, otimizado por distância/sequência:
- Pode ser 3 coletas → 3 entregas, ou coleta → entrega → coleta…, conforme a malha.
- Algoritmo: VRP/nearest-neighbor sobre coordenadas (geocodificação dos CEPs) com janelas de tempo; sem geocódigo, heurística por **UF + prefixo de CEP**.
- Saída: sequência de paradas ordenada + distância/tempo estimado; o operador pode reordenar (drag).

### 1.3 Modelos de captação (quando os destinatários entram) — ponto #3
TMS modernos são **configuráveis** quanto a *quando* cada dado é exigido. Três modelos:
- **Modelo A — destinatários no agendamento** (o que a Velox tem): o remetente já sabe pra quem vai. Simples, comum em regional/e-commerce.
- **Modelo B — destinatários na coleta/CD**: agendamento é só "reserva de coleta" (remetente + volume/peso estimado). No CD, lê-se a **NF-e (chave/DANFE)** e cada volume vira um **CT-e** por destinatário.
- **Modelo C — híbrido**: rascunho no agendamento, confirmado ao ler as NF-es.
O elo coleta↔destinatário é sempre a **NF-e**.

### 1.4 Documento fiscal (CT-e) e romaneio
- **CT-e**: 1 por destinatário, gerado no CD; cada um com rastreio próprio.
- **Romaneio/Manifesto (MDF-e)**: agrupa CT-es por veículo/rota na saída para entrega.
- (Dependem de certificado digital/integração SEFAZ — fase posterior.)

### 1.5 Tabelas/parâmetros que faltam
- **Cubagem** (fator kg/m³) — já temos peso cubado por item; falta fator configurável.
- **Vigência de tabela** (início/fim) — aplica a tabela vigente na data do pedido.
- **Tabela por modal/urgência**, **coleta separada da entrega**, **pedágio por rota** (ANTT/API).

---

## 2. Onde a Velox está e o gap

| Área | Hoje | Gap para "TMS completo" |
|---|---|---|
| Pedido/coleta | ✅ multi-destinatário, cubagem por item, NF-e XML | modelos B/C (coleta sem destinatário), CT-e |
| Consolidação | ⚠️ manual (arrasta no quadro) | **motor de separação automática** (#1) |
| Roteirização | ⚠️ paradas fixas coleta→entrega | **otimização dinâmica de rota** (#2) |
| Fiscal | ❌ | CT-e / MDF-e (SEFAZ) |
| Tabelas | ✅ preço/rotas/cobertura/cliente | cubagem-fator, **vigência**, modal/urgência, pedágio real |
| Financeiro | ✅ receitas/despesas/DRE/aging | acerto de viagem (vale-frete × custos), comissão |

---

## 3. Plano em fases (ordem sugerida por impacto × esforço)

- **FASE 1 — Separação automática de carga (Despacho)** ⭐ *(em implementação)*
  Botão "Separação automática": agrupa os pedidos confirmados por data + região + capacidade, mantendo coletas do mesmo local juntas, e propõe a carga de cada caminhão. Operador aplica/ajusta.
- **FASE 2 — Roteirização da viagem** ✅ *(implementada — sem API)*
  `routeOptimizer.optimizeStops`: ordena as paradas por **proximidade de CEP** (nearest-neighbor 1D), respeitando **coleta antes da entrega** do mesmo pedido. Aplicada na criação da viagem (NewTrip) e com botão **"Otimizar rota"** + setas de reordenar manual no detalhe da viagem. *Upgrade futuro:* trocar a função de distância por geocódigo + matriz real (Google Distance Matrix — chave já existe em Configurações — ou OpenRouteService/OSRM).
- **FASE 3 — Modelos de captação configuráveis**
  Config "quando exigir destinatários" (A/B/C). Coleta só com volume/peso; vínculo posterior por NF-e.
- **FASE 4 — Tabelas profissionais**
  Fator de cubagem, **vigência** de tabela, tabela por modal/urgência, taxa de coleta separada.
- **FASE 5 — Fiscal (CT-e/MDF-e)**
  Integração SEFAZ (certificado). Maior esforço; depende de decisão de negócio.
- **FASE 6 — Acerto de viagem & comissões**
  Fechar a viagem confrontando adiantamento × custos reais; comissão por motorista.

> Cada fase é entregável e testável isoladamente.

---

## 4. Dependências de API (o que é grátis × o que exige serviço externo)

| Recurso | Sem API (grátis, já dá) | Com API (externo) |
|---|---|---|
| Separação de carga (F1) | ✅ peso/capacidade/CEP | — |
| Rota inteligente (F2) | ✅ heurística por CEP | distância real por estrada: Google Distance Matrix (`google_maps_api_key` já existe) / OpenRouteService / OSRM |
| Distância origem→destino p/ frete | estimável por CEP | Google/ORS para km reais |
| Pedágio real (F4) | estimado por kg | ANTT / Sem Parar / ConectCar |
| CT-e / MDF-e (F5) | ❌ | SEFAZ via provider (PlugNotas, Focus NFe, NFe.io) + certificado A1 |

As fases 1–4 rodam **sem custo de API**. Só **pedágio real** e **fiscal** exigem contratação — ficam para o fim, quando for decisão de negócio.

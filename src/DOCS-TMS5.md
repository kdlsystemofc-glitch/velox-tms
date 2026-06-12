# VELOX — DOCUMENTAÇÃO COMPLEMENTAR (TMS-5)
> Implementado em 10/06/2026
> Complementa DOCS.md com as funcionalidades do ciclo TMS-5

---

## A. ENTIDADES ATUALIZADAS

### Client — novos campos (TMS-5B)
```
billing_type        string    NÃO    enum: per_trip|monthly. Default: per_trip
                                     "per_trip" = cobrança por viagem (padrão)
                                     "monthly"  = faturamento mensal consolidado
billing_day         number    NÃO    Dia do mês para fechamento da fatura (1–28)
payment_term_days   number    NÃO    Prazo em dias após o fechamento (ex: 30)
contacts            array     NÃO    Contatos da empresa:
  [].name        string
  [].role        string   (Financeiro | Logística | Compras | Diretor | Gerente | Outro)
  [].phone       string
  [].whatsapp    string
  [].email       string
  [].is_primary  boolean  Default: false
```

### Alert — novos tipos (TMS-5A)
Adicionados ao enum de `type`:
```
tachograph_expiring   Tacógrafo do caminhão próximo do vencimento
oil_maintenance_km    Troca de óleo devida por km
review_km             Revisão geral devida por km
```

### CompanySettings — novos campos (TMS-5A)
```
google_maps_api_key   string    NÃO    Chave API Google Maps Distance Matrix
maintenance_km_alerts object    NÃO    Limiares de km para alertas preventivos:
  .oil_change_km      number  Default: 20000
  .general_review_km  number  Default: 40000
  .tire_change_km     number  Default: 60000
```

---

## B. ALERTAS POR QUILOMETRAGEM (TMS-5A)

### Como funcionam
A backend function `syncAlerts` verifica, para cada caminhão:
1. Lê `truck.total_km` (odômetro atual)
2. Para cada tipo de manutenção (`óleo`, `revisão`), busca o último registro em `truck.maintenance_history` com aquele tipo e extrai o `km` registrado
3. Calcula `kmSinceLast = total_km - lastMaintenanceKm`
4. Compara com o limiar configurado em `CompanySettings.maintenance_km_alerts`
5. Se `kmSinceLast / threshold >= 0.9` → gera alerta

**Níveis:**
- `warning` quando falta km para o limite (< 10% restante)
- `critical` quando já ultrapassou o limite

**Mensagens:**
- `"Troca de óleo da ABC-1234 prevista em 1.500 km"` (warning)
- `"Troca de óleo da ABC-1234 está ATRASADA (800 km acima do limite)"` (critical)

### Configuração
Admin → Configurações → Aba "Alertas" → Seção "Alertas por quilometragem"

Campos:
- Troca de óleo (km) — default 20.000
- Revisão geral (km) — default 40.000
- Troca de pneus (km) — default 60.000 *(configurável, alerta ainda não implementado para pneus)*

---

## C. FATURAMENTO MENSAL DE CLIENTES (TMS-5B)

### Configuração no cadastro do cliente
Em `ClientDetailPage`, modo edição, campo "Tipo de cobrança":
- **Por viagem (padrão):** sem campos adicionais
- **Faturamento mensal:** exibe:
  - Dia de fechamento (1–28)
  - Prazo de pagamento (dias)

### Card informativo
Quando `billing_type === "monthly"`, exibe card amber na sidebar da `ClientDetailPage`:
> Fechamento dia {N} · Prazo {N} dias

### Fechar fatura
Botão "Fechar fatura" (ícone Receipt) aparece no header da `ClientDetailPage` quando `billing_type === "monthly"` e não está em modo edição.

**Modal "Fechar Fatura do Mês":**
- Lista todos os pedidos do mês corrente do cliente com `status !== "cancelled"` e `freight_value > 0`
- Exibe total, data de fechamento e data de vencimento
- Botão "Gerar fatura" → cria registro na entidade `Revenue`:
  ```
  description: "Fatura mensal — {company_name} ({mês} {ano})"
  amount: total dos fretes do mês
  due_date: closing_date + payment_term_days
  client_id: client.id
  status: "receivable"
  ```

---

## D. DISTÂNCIA REAL VIA GOOGLE MAPS (TMS-5A)

### Backend function: calculateDistance
**Arquivo:** `functions/calculateDistance.js`
**Chamada:** `await base44.functions.invoke("calculateDistance", { origin, destinations })`

**Parâmetros:**
```js
origin: string        // Ex: "Av. Paulista, 1000, São Paulo, SP"
destinations: string[] // Array de endereços de destino
```

**Resposta:**
```js
{
  distances: [
    { destination: "...", distanceKm: 312.5, durationMinutes: 240 },
    ...
  ],
  totalKm: 312.5
}
```

**Autenticação:** lê `CompanySettings.google_maps_api_key` via service role. Se chave não configurada, retorna erro 400.

**Usado por:** `OrderDetailPage` — ao confirmar pedido, oferece recalcular frete com distância real.

---

## E. PERFORMANCE FRONTEND (TMS-5C)

### QueryClient centralizado
**Arquivo:** `lib/query-client.js`
Exporta `queryClientInstance` com:
```js
defaultOptions: {
  queries: {
    staleTime: 60_000,   // 1 minuto
    gcTime: 300_000,     // 5 minutos
  }
}
```
Importado em `App.jsx` em vez de `new QueryClient()` inline.

### useMemo no cálculo de frete (NewOrder)
`freightBreakdown` em `NewOrder.jsx` é memoizado com `useMemo`:
- Dependências: `form.recipients`, `form.origin?.state`, `settings?.pricing`
- Evita recalcular a cada keystroke não relacionado ao frete

### refetchInterval no TripDetailPage
```js
refetchInterval: (data) => data?.status === "in_progress" ? 30_000 : false
staleTime: 15_000
```
Polling automático a cada 30s apenas quando a viagem está em andamento.

---

## F. AUTOMAÇÃO AGENDADA — syncAlerts

**ID:** `6a29a0c8a726de29d4378796`
**Nome:** "Sync de Alertas"
**Tipo:** scheduled
**Intervalo:** a cada 30 minutos
**Função:** `syncAlerts`

Roda automaticamente sem intervenção manual. Complementa a chamada manual do Dashboard ao montar.

---

## G. TABELA DE ALERTAS ATUALIZADA (TMS-5A)

| Condição | Threshold | Nível | Tipo |
|---|---|---|---|
| CNH vencida | — | critical | cnh_expiring |
| CNH a vencer ≤ 30d | 30d | critical | cnh_expiring |
| CNH a vencer 31–60d | 60d | warning | cnh_expiring |
| CRLV vencido | — | critical | crlv_expiring |
| CRLV a vencer ≤ 30d | 30d | critical | crlv_expiring |
| CRLV a vencer 31–60d | 60d | warning | crlv_expiring |
| Seguro vencido | — | critical | insurance_expiring |
| Seguro a vencer ≤ 30d | 30d | critical | insurance_expiring |
| Seguro a vencer 31–60d | 60d | warning | insurance_expiring |
| Tacógrafo a vencer ≤ 15d | 15d | critical | tachograph_expiring |
| Tacógrafo a vencer 16–30d | 30d | warning | tachograph_expiring |
| Pedido confirmado s/ motorista > 24h | 24h | warning | order_no_driver |
| Troca de óleo ≥ 90% do limiar de km | configurável | warning/critical | oil_maintenance_km |
| Revisão geral ≥ 90% do limiar de km | configurável | warning/critical | review_km |

---

## H. ALERTAS KM POR CAMINHÃO (atualização)

Os campos `km_alert_oil`, `km_alert_review`, `km_alert_tires` ficam agora **na entidade Truck** (não mais em CompanySettings).

`syncAlerts` usa: `truck[check.truckKey] || kmAlerts[check.thresholdKey] || check.defaultKm`
→ Prioridade: caminhão > configuração global > padrão hardcoded.

Os campos globais em `CompanySettings.maintenance_km_alerts` continuam como **fallback** para caminhões sem limiar específico.

---

## I. CÓDIGOS SEQUENCIAIS

- **Clientes:** `CLI00001`, `CLI00002`... gerado em `Clients.jsx` antes do create.
- **Fornecedores:** `FOR00001`, `FOR00002`... gerado em `Suppliers.jsx` antes do create.
- Exibido como badge monospace no card e no header do detalhe.
- Geração: busca todos os registros, acha o maior número, incrementa +1.

---

## J. CONTATO NA CRIAÇÃO DO CLIENTE

Modal "Novo Cliente" tem seção "Contato principal" (opcional) com campos:
- Nome do contato, Função (Select), Telefone, E-mail

Se nome preenchido → criado automaticamente em `contacts[0]` com `is_primary: true`.

---

## K. EDIÇÃO DE CONTATOS (Cliente e Fornecedor)

- Botão Editar (ícone Pencil azul) em cada card de contato
- Modal unificado detecta criação vs edição via `editingContactIndex !== null`
- Ao fechar/cancelar: estados de edição são limpos
- Fornecedores: componente `SupplierContactsSection` inline nos modais criar/editar

---

## RESUMO DAS MUDANÇAS DE SCHEMA

| Entidade | Campo | Tipo | Descrição |
|---|---|---|---|
| Client | code | string | Código CLI00001 |
| Client | billing_type | string enum | per_trip \| monthly |
| Client | billing_day | number | Dia de fechamento (1–28) |
| Client | payment_term_days | number | Prazo após fechamento |
| Client | contacts | array | Contatos múltiplos (editáveis) |
| Supplier | code | string | Código FOR00001 |
| Supplier | contacts | array | Contatos múltiplos |
| Truck | km_alert_oil | number | Limiar troca de óleo (km) |
| Truck | km_alert_review | number | Limiar revisão geral (km) |
| Truck | km_alert_tires | number | Limiar troca de pneus (km) |
| CompanySettings | google_maps_api_key | string | Chave Google Maps API |
| CompanySettings | maintenance_km_alerts | object | Limiares globais (fallback) |
| Alert | type (enum) | — | +tachograph_expiring, +oil_maintenance_km, +review_km |
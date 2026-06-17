# Simulação de 30 dias — Velox TMS (SQL)

Popula o sistema com uma operação fictícia dos últimos 30 dias para demonstração/testes **e** verifica a consistência dos dados.

## O que o SQL testa (e o que não testa)

- ✅ **Modelo de dados:** FKs, `CHECK` de status, colunas faltando, integridade.
- ✅ **Matemática financeira esperada × exibida:** popula números fechados → você compara com o que o app calcula no Financeiro/DRE/aging. Divergência = bug de lógica no app.
- ✅ **Coerência de fluxo:** o arquivo **`verificacoes.sql`** aponta incoerências (pedido entregue sem receita, cancelado com receita ativa, viagem sem lucro, etc.).
- ❌ **NÃO testa a camada do app:** formulários/UI, cálculo de frete em JS, geração de protocolo, `ensureRevenueForOrder`, RLS do cliente autenticado — porque o `INSERT` escreve direto no banco, pulando o app. Para isso, use o app manualmente (ver `VELOX_SIMULACAO_30DIAS.md`).

> **Fluxo recomendado (híbrido):** rode o seed → confira os números nas telas → **opere pelo app** (dar baixa, confirmar, cancelar, fechar fatura) → rode `verificacoes.sql` para flagrar quebras que o app tenha causado. Passo a passo em `SIMULACAO_TESTE_HIBRIDO.md`.

## Dois arquivos, dois usos
| Arquivo | O que faz | Quando rodar |
|---|---|---|
| **`seed_simulation.sql`** | cria os dados (apaga e recria) | **uma vez**, no início |
| **`verificacoes.sql`** | só lê e confere (não altera nada) | **quantas vezes quiser** — após o seed e depois de cada ação no app |

⚠️ **Não** rode o `seed_simulation.sql` de novo só para verificar — ele apaga tudo e recria, desfazendo o que você fez no app. Para re-verificar, use **sempre** o `verificacoes.sql`.

## Como rodar
1. Abra o **SQL Editor** do Supabase (projeto da Velox).
2. **Pré-requisito:** rode `migrations/20260616_reconcile_schema.sql` (idempotente — garante todas as colunas que o seed usa, incluindo as novas de fornecedor).
3. Cole o conteúdo de **`seed_simulation.sql`** e clique em **Run**. *(roda uma vez)*
4. Abra o painel (`/admin`) — os dados aparecem em Operações, Pedidos, Despacho, Frota, Cadastros e Financeiro.
5. Cole o conteúdo de **`verificacoes.sql`** e rode: leia a coluna `problemas` (deve ser 0) e compare o RESUMO FINANCEIRO com o que o app mostra.

> O seed é **idempotente**: rodar de novo apaga a simulação anterior e recria. Tudo é marcado com `[SIM]` (campo notes) e código de cliente `SIM###` / fornecedor `SIM-FOR###`.

## O que é gerado
- **3 caminhões** (1 em manutenção; documentos vencendo p/ disparar alertas; com chassi, dimensões e alertas de km).
- **3 motoristas** (1 com CNH vencendo; com endereço e dados bancários/PIX).
- **4 fornecedores** (combustível, manutenção, pneus, seguro — com endereço, condições de pagamento e PIX).
- **6 clientes** (1 com faturamento mensal; com IE e contato).
- **~45 pedidos** distribuídos nos 30 dias, em todos os status: novos, confirmados, em coleta, em trânsito, entregues e alguns cancelados.
- **Viagens** vinculadas aos pedidos em trânsito (1 em rota) e entregues (concluídas, com km/combustível/pedágio e lucro calculado).
- **Financeiro:** receitas (recebidas, a receber e vencidas → alimenta o *aging*) e despesas (combustível por viagem vinculado ao posto, salários, aluguel, seguro, impostos, manutenção, pneus — com fornecedor/veículo e vencimentos).

## `verificacoes.sql` (3 blocos)
1. **Integridade e fluxo** (13 checagens): FKs órfãs, entregue sem viagem, viagem sem lucro, entregue sem receita, cancelado com receita ativa, datas obrigatórias, lucro da viagem = receita − custo, etc.
2. **Resumo financeiro:** receita recebida / a receber / vencida, despesa paga / a pagar, resultado por competência.
3. **Conferência:** soma dos fretes ativos × soma das receitas ativas (devem ser iguais).

## Como remover
No fim do `seed_simulation.sql` há o bloco **LIMPEZA** (comentado). Descomente as linhas `DELETE` e rode — remove tudo que foi marcado com `[SIM]`/IDs da simulação, sem tocar nos seus dados reais.

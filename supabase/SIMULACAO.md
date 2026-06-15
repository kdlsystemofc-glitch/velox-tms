# Simulação de 30 dias — Velox TMS

Popula o sistema com uma operação fictícia dos últimos 30 dias para demonstração/testes.

## Como rodar
1. Abra o **SQL Editor** do Supabase (projeto da Velox).
2. **Pré-requisito:** aplique antes as migrations pendentes (a coluna `documents` e o status `cancelled` de receitas), senão alguns campos podem não existir:
   - `migrations/20260612_revenue_status_cancelled.sql`
   - `migrations/20260615_company_documents.sql`
   - `migrations/20260615_rls_public_functions.sql` (opcional, mas recomendado)
3. Cole o conteúdo de **`seed_simulation.sql`** e clique em **Run**.
4. Abra o painel (`/admin`) — os dados aparecem em Operações, Pedidos, Despacho, Frota, Cadastros e Financeiro.

> O script é **idempotente**: rodar de novo apaga a simulação anterior e recria. Tudo é marcado com `[SIM]` (campo notes) e código de cliente `SIM###`.

## O que é gerado
- **3 caminhões** (1 em manutenção, com documentos vencendo p/ disparar alertas), **3 motoristas** (1 com CNH vencendo).
- **6 clientes** (1 com faturamento mensal).
- **~36 pedidos** distribuídos nos 30 dias, em todos os status: novos, confirmados, em coleta, em trânsito, entregues e alguns cancelados.
- **Viagens** vinculadas aos pedidos em trânsito (1 em rota) e entregues (concluídas, com km/combustível/pedágio e lucro calculado).
- **Financeiro**: receitas (recebidas, a receber e vencidas → alimenta o *aging*) e despesas (combustível por viagem, salários, aluguel, seguro, impostos, manutenção, pneus).

## Como remover
No fim do `seed_simulation.sql` há o bloco **LIMPEZA** (comentado). Descomente as linhas `DELETE` e rode — remove tudo que foi marcado com `[SIM]`/`SIM`, sem tocar nos seus dados reais.

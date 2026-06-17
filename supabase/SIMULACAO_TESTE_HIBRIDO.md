# Teste híbrido — operar pelo app e validar com SQL

Roteiro para caçar bugs de **fluxo e lógica** do app. A ideia: o seed cria um estado consistente; você executa ações reais nas telas; e o arquivo **`verificacoes.sql`** confirma se o app manteve a consistência.

> São **dois arquivos**: `seed_simulation.sql` (cria os dados — roda **uma vez**) e `verificacoes.sql` (só confere — roda **toda vez** que quiser). Nunca rode o seed de novo no meio do teste: ele apaga e recria tudo.

## Preparação
1. Rode `migrations/20260616_reconcile_schema.sql`.
2. Rode `seed_simulation.sql` (cria os dados — **só uma vez**).
3. **Baseline:** rode `verificacoes.sql` (uma consulta, uma tabela) e **anote**:
   - Seção `FLUXO` — nenhuma linha pode estar `⚠ PROBLEMA` (todas `OK`).
   - Seção `FINANCEIRO` — anote os valores (receita recebida / a receber / vencida, despesa paga / a pagar, resultado por competência).
   - Seção `CONFERENCIA` — a linha "Diferença (deve ser 0)" tem que estar `OK`.

> Regra de ouro: depois de **cada** ação abaixo, rode o **`verificacoes.sql`** de novo. Qualquer linha `⚠ PROBLEMA` aponta o bug exato; as linhas `FINANCEIRO` validam os números.

---

## Ações e resultado esperado

### A) Dar baixa numa despesa pendente
- **Onde:** Financeiro → Despesas → linha "Seguro da frota (parcela)" (R$ 2.800, *A Pagar*) → **Dar Baixa** → confirme data e forma.
- **Esperado no resumo (Bloco 2):** `despesa_paga` **+2.800** · `despesa_a_pagar` **−2.800** · `resultado_competencia` **inalterado** (competência não muda, só o caixa).
- **Verificações:** #11 (paid sem data de pagamento) e #12 continuam **0**.

### B) Marcar uma receita como recebida
- **Onde:** Financeiro → Receitas → uma linha *A Receber* ou *Vencida* → dar baixa / marcar recebida.
- **Esperado:** `receita_recebida` **+valor** · `receita_a_receber` (ou `receita_vencida`) **−valor** · `resultado_competencia` **inalterado**.
- **Verificações:** #10 (received sem `received_date`) continua **0**.

### C) Confirmar um pedido novo  *(cria receita automática)*
- **Onde:** Pedidos → aba **Novos** → abrir um pedido `new` → **Confirmar**.
- **Esperado:** o app cria a receita do frete (`ensureRevenueForOrder`).
  - Bloco 3: `soma_fretes_ativos` e `soma_receitas_ativas` **sobem juntos e continuam IGUAIS**.
  - Se os dois divergirem → a confirmação não criou a receita (ou criou valor diferente do frete) = **bug**.
- **Verificações:** todas continuam **0**.

### D) Cancelar um pedido confirmado  *(deve cancelar a receita)* ⭐ teste-chave
- **Onde:** Pedidos → abrir um pedido `confirmed`/`collecting` → **Cancelar**.
- **Esperado:** o app cancela a receita vinculada (`cancelRevenuesForOrder`).
  - **#08 (cancelado com receita ativa) deve continuar 0.** Se virar > 0, o cancelamento **não** baixou a receita = **vazamento de receita fantasma**.
  - Bloco 3: os dois somatórios caem juntos e continuam iguais.
  - `resultado_competencia` sobe (saiu uma receita; nenhuma despesa correspondente).

### E) Entregar um pedido em trânsito
- **Onde:** Pedido (workspace) `in_transit` → **Entregar** (ou pelo app do motorista, com POD/assinatura).
- **Esperado:** status → `delivered`; a viagem correspondente → `completed`.
  - #04 (entregue sem viagem), #07 (entregue sem receita) e #09 (viagem concluída sem chegada/lucro) continuam **0**.
  - Se #09 subir → o encerramento não gravou `arrival_date`/`net_profit`.

### F) Mudar o status de um caminhão  *(regressão do bug corrigido)*
- **Onde:** Frota → abrir **RKT-1A23** → Editar → Status = **Manutenção** → Salvar.
- **Esperado:** ao voltar para a lista da Frota, o status aparece **Manutenção** imediatamente (sem F5).
  - SQL de conferência: `SELECT plate, status FROM trucks WHERE plate='RKT-1A23';` → deve retornar `maintenance`.
  - Se a lista continuar "Disponível" → regressão do bug de cache/persistência.

### G) Fechar a fatura mensal do cliente recorrente  *(cuidado com double-count)*
- **Onde:** Cadastros → Cliente **SIM001** (Distribuidora Brasil, cobrança *mensal*) → **Fechar fatura**.
- **Atenção:** no seed, os pedidos **já têm receita por pedido**. Fechar a fatura mensal pode gerar **uma receita consolidada adicional** → o Bloco 3 vai **divergir de propósito** (receita consolidada não corresponde 1‑para‑1 a fretes). Isso é esperado *neste cenário de seed*; em produção o mensal não teria receita por pedido. **Sugestão:** teste esta ação por último, ou pule, para não poluir os somatórios.

---

## Como interpretar
- **`FLUXO` tudo `OK`** após cada ação = fluxo íntegro.
- **`CONFERENCIA` → "Diferença (deve ser 0)" = `OK`** (exceto após a ação G) = receita e frete batem.
- **`FINANCEIRO`** = confira se os deltas seguem a tabela acima **e** se os mesmos números aparecem no Financeiro/DRE do app. Número diferente entre SQL e tela = bug de cálculo/exibição no app.

Achou divergência? Me diga **a ação (A–G)**, **qual verificação saiu de 0** (ou qual número não bateu) e o **valor no SQL vs. na tela** — com isso eu localizo e corrijo o ponto exato.

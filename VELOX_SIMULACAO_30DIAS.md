# VELOX TMS — SIMULAÇÃO DE 30 DIAS (roteiro para o agente Claude no navegador)

> **Objetivo:** operar o sistema como uma transportadora real por "30 dias", **clicando, preenchendo e
> executando tudo** nos 3 domínios (Site Público, Portal Admin, Portal do Motorista), **registrando todo
> erro, falha de lógica, inconsistência, atrito de UX e oportunidade de melhoria de UI/UX**.
>
> **Fonte da verdade da interface:** o arquivo `VELOX_MAPA_SIMULACAO.md` (nomes exatos de telas, abas,
> campos, placeholders, botões, KPIs e ações). Use-o para localizar cada elemento. Este documento diz **o
> que fazer**, **em que ordem** e **o que observar**.

---

## 0. MISSÃO, REGRAS E COMO REPORTAR

### 0.1 Sua missão
1. **Executar** cada fluxo ponta a ponta (não só abrir telas — preencher, salvar, confirmar, encerrar).
2. **Validar a lógica:** os números batem? (KPIs, totais, saldos, comissões, DRE, ocupação, SLA, conversões). O status muda corretamente? O que sai de uma tela aparece na outra?
3. **Caçar problemas:** erros de console/tela, ações que não respondem, campos que não salvam, números errados, fluxos que travam, textos confusos, dados que sobrescrevem outros.
4. **Avaliar UX/UI:** clareza, consistência, hierarquia visual, responsividade, estados (vazio/carregando/erro), acessibilidade básica (foco, contraste), microcopy.
5. **Sugerir melhorias** concretas (funcionais e visuais).

### 0.2 Regras de operação
- **Navegador:** abra o **Console (F12 → Console)** e a aba **Network** e mantenha-os abertos; registre qualquer **erro vermelho**, request **4xx/5xx** ou "Failed".
- **Não destrua dados de produção sem necessidade.** Crie registros de teste com prefixo claro (ex.: cliente "TESTE — ..."). Ao excluir, confirme que é um registro de teste.
- **Evidência:** para cada achado, capture **print da tela**, a **URL**, e o **passo exato** que reproduz.
- **Compare 2 fontes** sempre que possível: ex. "Receita do mês" no Resumo × DRE × Indicadores; "Frota disponível" em Operações × Frota × Indicadores. Aponte divergências.
- **Teste limites:** obrigatórios vazios, valores negativos, datas no passado, CPF/CNPJ inválido, placa inválida, peso acima da capacidade, agendar fora da cobertura/dias de operação, excluir item em uso, senha < 6 dígitos.
- **Teste os 3 papéis:** admin (tudo), operator (sem Financeiro/Indicadores/Usuários/Configurações), motorista (app).

### 0.3 Formato do relatório (use para CADA achado)
```
[ID] Título curto
- Domínio/Tela/Rota: (ex.: Admin / Viagens / /admin/viagens/:id)
- Tipo: BUG | LÓGICA | UX | UI | COPY | MELHORIA | SEGURANÇA | PERFORMANCE
- Severidade: CRÍTICA | ALTA | MÉDIA | BAIXA
- Passos para reproduzir: 1) ... 2) ... 3) ...
- Esperado: ...
- Obtido: ...
- Evidência: (print / erro de console / request)
- Sugestão: ...
```
Ao final de cada "dia": **resumo do dia** (o que foi testado, achados por severidade). Ao final dos 30 dias: **relatório consolidado** com (a) bugs por severidade, (b) inconsistências de lógica/números, (c) melhorias de UX priorizadas, (d) melhorias de UI, (e) avaliação por módulo (nota + 3 fortes/3 fracos), (f) top 10 ações recomendadas.

### 0.4 Heurísticas de UX/UI para aplicar em TODA tela
- **Feedback:** toda ação dá retorno (toast/erro)? Botões mostram "salvando..."?
- **Estados:** vazio (mensagem útil + CTA), carregando (skeleton/spinner), erro (mensagem clara).
- **Consistência:** botões primários iguais? cores de status iguais entre telas? rótulos padronizados?
- **Hierarquia:** título → KPIs → conteúdo; o mais importante salta aos olhos?
- **Formulários:** placeholders ajudam? validação clara? foco/tab funciona? campos não cortam o texto?
- **Mobile:** redimensione a janela (≤414px). O app do motorista é mobile-first — teste nesse tamanho.
- **Microcopy:** algum texto parece "de desenvolvedor" (jargão, código, frase cortada)?
- **Acessibilidade:** navega por teclado? contraste suficiente? foco visível?

---

## 1. PRÉ-VOO (antes do "Dia 1")

### 1.1 Acesso
- URL base: **`https://velox-tms.vercel.app`**.
- Login admin (e-mail/senha) fornecidos pelo gestor → deve cair em **`/admin`** (Painel de Operações). Se cair em "Acesso não liberado", avise o gestor (o perfil precisa do papel `admin`).

### 1.2 Smoke test (15 min)
1. Abra **todas** as rotas da Parte 0.2 do mapa, uma a uma: carregou sem erro? título certo? console limpo?
2. Teste a **busca global** (Ctrl+K); o **sino** de notificações; recolha/expanda a **sidebar**.
3. Redimensione para mobile e confira sidebar/topbar.

### 1.3 Dados-base (criar nesta ordem — sem isso vários módulos saem zerados)
1. **Configurações → Empresa:** Nome, CNPJ, Telefone, E-mail, WhatsApp, Endereço, Missão/Visão/Valores, Redes. **Salvar.** (Teste CNPJ inválido → deve acusar.)
2. **Configurações → Comercial & Preços → Preços:** Frete base (kg, km, taxa fixa, mínimo), algumas taxas (GRIS, Ad valorem, Pedágio), **Fator de cubagem** (6000), **Velocidade média (km/dia)**, **Tabela de prazo por estado** (3 UFs), **Alíquota fiscal** e **Depreciação**. Use o **Simulador de frete** e confira o total. **Salvar.** Teste **Exportar/Importar config (JSON)**.
3. **Configurações → Comercial & Preços → Tabela de Rotas:** 1 corredor (UF→UF) com vigência. **Salvar.**
4. **Configurações → Operação:** **Área de Atuação** (estados) + **Agendamento** (antecedência + dias). **Salvar.**
5. **Configurações → Alertas:** ajuste os dias de antecedência. **Salvar.**
6. **Cadastros → Filiais & CDs:** **2 filiais** (ex.: "Matriz", "CD Guarulhos") — necessário p/ Transferências.
7. **Cadastros → Fornecedores:** 2 (1 Combustível, 1 Manutenção).
8. **Cadastros → Clientes:** 3 (1 "Faturamento mensal", 2 "Por viagem"; ≥1 com **Tabela de Frete** personalizada no detalhe). Teste CPF/CNPJ inválido e duplicado.
9. **Cadastros → Destinatários:** 4 (estados variados).
10. **Frota → Carretas:** **3 caminhões** com **capacidade** e **dimensões do baú** (essenciais p/ Simulador 3D e ocupação) + CRLV/seguro (1 vencendo). Teste placa inválida e duplicada.
11. **Frota → Motoristas:** **3 motoristas** com **comissão %**, CNH (1 vencendo), ASO/toxicológico.
12. **Usuários:** **1 operador** (testar login depois); confira papéis/filtros/auditoria; teste **Redefinir senha**.
13. **Detalhe do Motorista → Acesso ao app:** crie **login do app** (e-mail+senha) de 1 motorista — guarde.
14. **Financeiro → Fluxo de Caixa:** defina **Saldo em caixa hoje** (lápis).

---

## 2. PLANO DIA A DIA (30 dias)

> Cada "dia" é uma sessão temática. Faça tudo, reporte no formato 0.3 e dê o resumo do dia.

### SEMANA 1 — Demanda e cadastro
**Dia 1 — Site público.** `/`: percorra todas as seções, teste links/CTAs, envie **Contato** (válido e inválido). `/rastrear`: protocolo inexistente e existente. Responsividade. ➜ O lead aparece em **Admin → Mensagens**?

**Dia 2 — Cotação pública.** `/cotacao` (3 passos) e `/cotacao-avancada`: pesos/dimensões variados; confira **cubado × real**, taxas e total vs Configurações. Teste **Agendar agora** → `/agendar`.

**Dia 3 — Agendamento público (`/agendar`).** 2 pedidos completos (multi-destinatário, itens com NF, chave 44 díg.). Teste CEP fora de cobertura (bloqueia), data fora dos dias de operação, obrigatórios vazios. Anote **protocolos**. ➜ Entram em **Pedidos (Novos)**?

**Dia 4 — Conversão de lead.** **Mensagens:** **Criar pedido** (vira "convertido"), **Responder e-mail/WhatsApp** (→ em contato), **Perdido**, **Arquivar/Reabrir**, **Nota interna**, **Exportar**. Confira **Taxa de conversão** e "1ª resposta".

**Dia 5 — Novo Pedido interno.** **Pedidos → Novo Pedido:** 3 pedidos cobrindo coleta consolidada (**Adicionar ponto de coleta**), multi-destinatário, **Adicionar chaves**, **Usar estimativa**, cliente novo (**Criar cadastro**). Confira frete e totais.

**Dia 6 — Confirmação e fila.** **Pedidos:** confirme (frete/forma/data), recuse 1. Teste abas/contadores, ordenação, busca, **Exportar**, seleção múltipla. ➜ Confirmar gerou **receita** em Financeiro?

**Dia 7 — Detalhe do Pedido.** Edite, registre **Ocorrência**, anexe arquivo, gere **CT-e**, **Cancele** 1 (motivo obrigatório). Confira histórico e reflexo em Operações/Rastreamento.

### SEMANA 2 — Programação, viagens, motorista
**Dia 8 — Despacho.** Programe **arrastando** p/ dia/caminhão; **Planejar automaticamente**; confira **peso·volume**; **Devolver à fila**. Limites de capacidade.

**Dia 9 — Viagens (criação).** Via **Pedidos → Criar viagem** e via **Nova Viagem**. Teste **comboio** (Adicionar veículo). Confira KPIs/cards.

**Dia 10 — Viagem (preparação).** **Otimizar rota**, reordene paradas, **Google Maps**, **Romaneio PDF** (e por veículo), **Iniciar**. ➜ Caminhão "on_route", pedidos "collecting"?

**Dia 11 — Motorista (execução).** Logue como **motorista** (mobile ≤414px). **Checklist** → **Confirmar checklist**; por parada **Confirmar Chegada** → **Confirmar Coleta**; na entrega **NF**+**assinatura**+recebedor → **Confirmar Entrega**. Teste **Histórico**.

**Dia 12 — Motorista (exceções).** **Registrar Ocorrência** (cada tipo), **Destinatário ausente** (3 opções), **Carga não estava pronta**, **Entrega parcial** (volumes+motivo), **Adicionar informação**. ➜ Aparecem em **Ocorrências** e no Rastreamento?

**Dia 13 — Encerramento da viagem.** **Encerrar Viagem:** Km final, Combustível (L+R$), Pedágios, **Outros gastos** (categorias). Confira **Lucro/Margem**, **Custo/km**, **km/L**, **Estimado × Real**, **Acerto/comissão** (rateio no comboio). ➜ Gastos viraram **Despesas**? Comissão "a pagar"? Caminhão "available"? Km gravado?

**Dia 14 — Replanejamento.** Coloque caminhão em **Manutenção** (ou motorista Afastado) com carga. **Replanejamento:** redistribua/reatribua. Confira badge e estado vazio ao resolver.

### SEMANA 3 — Malha, frota, documentos, ocorrências
**Dia 15 — Transferências.** Crie entre 2 filiais (peso×capacidade), **Despachar**, **Manifesto**, **Receber no destino** com **divergência** (→ ocorrência) + **custo** (→ despesa). Teste **Estornar**. Confira "Em transferência" no pipeline.

**Dia 16 — Simulador 3D.** **Frota → Simulador:** carreta, **Adicionar pedidos**, gire o 3D, observe Peso/Volume/Volumes, **Centro de gravidade**, badges, **Plano de carga (CSV)**. Teste excesso e itens sem dimensão.

**Dia 17 — Frota (detalhe/manutenção).** **Caminhão:** edite, **Manutenção** (com fornecedor), **alertas por km** (force 1). **Motorista:** edite, **Painel do Mês**, **Acesso ao app** (redefinir/congelar).

**Dia 18 — Documentos.** Anexe CRLV/Seguro/Tacógrafo (Frota) e CNH/ASO/Toxicológico (Motoristas); confira **x/3**. **Empresa:** doc com vencimento. **Vencimentos:** filtros, KPIs, **Exportar**. **NFs assinadas** + **Exportar NFs**.

**Dia 19 — Ocorrências.** Para cada: tratativa, **impacto financeiro**, **causa-raiz**, anexos, notificar cliente, seguro, **reabrir**, resolver. Confira KPIs/indicadores/filtros/**Exportar**.

**Dia 20 — Alertas.** Lista (docs/manutenção), links até a entidade, marcar lido/resolvido. Cruze com o **sino** e a **Fila de ação**.

**Dia 21 — Torre de Operações.** Releia o **Painel** com todos os dados: cada **métrica** (compare com Frota/Indicadores/Financeiro), Fila de ação, Pipeline, Exceções, Capacidade, Operação (Hoje/Amanhã/Semana), Frota agora. Aponte números que não batem.

### SEMANA 4 — Financeiro, indicadores, governança, fechamento
**Dia 22 — Receitas.** Crie receitas, dê **baixa**, teste **Aging** clicável, filtros, busca, **Exportar**.

**Dia 23 — Despesas.** Crie em várias categorias (fornecedor/veículo/motorista, anexo, parcelado), **Dar Baixa** (comprovante), **Aging**, filtros, **Exportar**.

**Dia 24 — Faturamento mensal.** No cliente "mensal": **Fechar fatura** → confira a receita c/ vencimento. Veja **Histórico de preços** e **Tabela de Frete** personalizada.

**Dia 25 — DRE.** Confira Receita Bruta→Deduções→Líquida→Variáveis/Fixos→EBITDA→Depreciação→**Lucro**; **Resultado por Caminhão**; **Comparativo**, **YTD**, **Conciliação competência×caixa**. **Gerar PDF** e **Exportar Excel**. Cheque contra Receitas/Despesas.

**Dia 26 — Fluxo de Caixa.** Ajuste **Saldo em caixa hoje**, varie 30/60/90, confira **projetado**, **menor saldo**, **atrasados**, **alerta de negativo**, tabela dia a dia.

**Dia 27 — Indicadores.** Troque todos os **períodos**; confira **KPIs com variação/meta**, **Eficiência**, **Tendências** (12m), **Rankings**, **Exportar**. Cruze OTD/faturamento/margem com Operações/Financeiro.

**Dia 28 — Usuários & segurança.** Crie/edite papéis, **desative/ative**, **redefina senha**, tente **remover o último admin** (deve bloquear) e **agir sobre si** (deve bloquear). Confira **Atividade recente**. Logue como **operator** e confirme que **não** vê Financeiro/Indicadores/Usuários/Configurações (tente abrir as URLs direto).

**Dia 29 — Configurações + regressão de preços.** Altere um **preço** e confirme impacto no **Simulador** e numa **nova cotação/pedido**. Teste **Exportar/Importar config** e o **Histórico**. Confirme que salvar Config **não apaga** saldo de caixa nem documentos.

**Dia 30 — Regressão geral + relatório.** Refaça um **fluxo fim-a-fim** (lead→pedido→despacho→viagem→motorista→encerramento→financeiro→indicadores). Varredura de **UI/UX** em todas as telas (consistência, mobile, foco/teclado). Entregue o **relatório consolidado**.

---

## 3. CHECKLIST TRANSVERSAL (aplique o tempo todo)

**Lógica/consistência**
- Confirmar pedido cria **receita**? Encerrar viagem cria **despesas** + **comissão**? Recusar pedido **estorna** receita?
- "Frota disponível/Em rota/Ocupação" batem entre **Operações × Frota × Indicadores**?
- Faturamento/Margem/OTD batem entre **Resumo × DRE × Indicadores**? (caixa vs competência está rotulado?)
- Saldo do Fluxo reflete o definido? Atrasados entram na projeção?
- Comissão no **comboio** rateia por veículo? Acerto = comissão − adiantamento?
- Transferência: estornar **devolve** o pedido e **libera** o caminhão? Receber **gera** despesa e (com divergência) **ocorrência**?
- Documentos: selo **x/3** atualiza? Vencimentos consolidam Frota+Motoristas+Empresa?

**Erros técnicos**
- Console sem erros? Requests sem 4xx/5xx? Sem loading infinito? F5 mantém estado? Voltar funciona?

**UX/UI**
- Feedback em toda ação? Estados vazio/carregando/erro úteis? Validação/máscaras OK? Campos não cortam texto?
- Botão primário consistente em todo o app? Cores de status iguais? Hierarquia clara? Espaçamento consistente?
- Mobile (≤414px) sem quebra? App do motorista confortável? Microcopy em PT-BR claro (nada "de dev")?

**Segurança/permissão**
- `operator` realmente não acessa telas admin-only (URL direto)? Logout limpa a sessão? "Acesso não liberado" para perfil pendente?

---

## 4. O QUE ENVIAR AO CLAUDE DO NAVEGADOR

Cole/anexe para o agente, nesta ordem:

1. **URL base:** `https://velox-tms.vercel.app`
2. **Credenciais de teste** (você fornece):
   - **Admin:** e-mail + senha.
   - **Operador:** e-mail + senha (para testar restrição de papel).
   - **Motorista (app):** e-mail + senha (criado em Detalhe do Motorista → Acesso ao app).
3. **Os dois documentos** (anexe o conteúdo dos arquivos):
   - `VELOX_MAPA_SIMULACAO.md` — **mapa exato** de telas/campos/botões (fonte da verdade da UI).
   - `VELOX_SIMULACAO_30DIAS.md` — **este roteiro** (missão, regras, plano de 30 dias, checklists).
4. **Instrução inicial** (cole como primeira mensagem ao agente):
   > "Você é um QA sênior testando o **Velox TMS** (TMS de transportadora) em produção. Execute a **Simulação de 30 dias** do `VELOX_SIMULACAO_30DIAS.md`, usando o `VELOX_MAPA_SIMULACAO.md` para localizar cada tela/campo/botão pelo nome exato. Comece pelo **Pré-voo** (seção 1): faça login no admin, rode o smoke test e crie os dados-base. Depois execute **um dia por vez** (Dia 1, 2, …), **clicando e preenchendo de verdade**. Mantenha o **Console (F12)** e a aba **Network** abertos e registre todo erro/4xx/5xx. Para cada achado, use o **formato da seção 0.3**. Ao fim de cada dia, entregue o **resumo do dia**; ao fim, o **relatório consolidado** (bugs por severidade, inconsistências de lógica/números, melhorias de UX, melhorias de UI, avaliação por módulo e top 10 ações). **Não exclua** dados que não sejam claramente de teste. Pergunte se faltar alguma credencial."
5. **(Opcional) Limites:** não enviar e-mails reais, não alterar a senha do admin principal, não excluir registros que não sejam de teste.

### 4.1 Cadência
- O agente pode rodar os 30 "dias" em sequência ou em blocos semanais. Peça **um resumo ao fim de cada semana**.
- Se houver limite de tempo/contexto, priorize: **Pré-voo → Semana 2 (viagem+motorista, o coração) → Semana 4 (financeiro/indicadores) → Semana 1 → Semana 3**.

---

## 5. CRITÉRIOS DE "PASSOU / NÃO PASSOU" (resumo executivo esperado)

Ao final, o agente deve responder objetivamente:
- **O fluxo crítico (lead→pedido→viagem→motorista→encerramento→financeiro) funciona inteiro?** (Sim/Não + onde quebra)
- **Os números são consistentes entre as telas?** (Sim/Não + divergências)
- **Há bugs CRÍTICOS/ALTOS?** (lista)
- **Top 10 melhorias** (UX/UI/funcional) priorizadas por impacto × esforço.
- **Nota por módulo** (0–10) e **nota geral do sistema**.

> Fim do roteiro de simulação. (Fonte da UI: `VELOX_MAPA_SIMULACAO.md`. Substitui a simulação antiga.)

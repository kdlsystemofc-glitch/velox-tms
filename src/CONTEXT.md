# VELOX TRANSPORTADORA — CONTEXTO DO PROJETO

> Este arquivo é a fonte da verdade do sistema. Toda decisão de código,
> banco de dados, UX e regra de negócio deve ser baseada aqui.
> NUNCA implemente algo que contradiga este documento.

## Negócio

- **Empresa:** Velox Transportadora
- **História:** Sucede a Ronini Transportes (falida após 20 anos por falta de
  tecnologia e controle, NÃO por falta de mercado). O dono é cético com
  tecnologia — o sistema precisa ser simples e impactante.
- **Frota atual:** 3 caminhões
- **Problema:** sem sistema, sem presença digital, controle em Excel
- **Objetivo:** sistema que salve a empresa e motive o dono a continuar

## Referências

- **Rodonaves:** múltiplos destinatários, múltiplas NFs, volumes e peso por item
- **Dell'a Volpe:** visual impactante, credibilidade, modernidade

## Missão / Visão / Valores (editáveis no admin)

- **Missão:** "Conectar origens a destinos com pontualidade, segurança e compromisso"
- **Visão:** "Ser referência regional em transporte de cargas"
- **Valores:** Pontualidade, Responsabilidade, Transparência, Segurança

## Modelo de Frete

Um pedido pode ter:
- 1 remetente (origem única de coleta)
- N destinatários (cada um com endereço próprio)
- N notas fiscais por destinatário (número NF, descrição, volumes, peso, dimensões,
  valor declarado, frágil, perigoso)
- Tipos: Dedicado | Fracionado | Urgente

## Protocolo

Formato: `VLX-ANO-SEQUENCIAL` (ex: VLX-2025-00143)
Gerado automaticamente ao criar pedido.

## Status do Pedido

Novo → Confirmado → Em Coleta → Em Trânsito → Entregue
Qualquer status → Cancelado

## Perfis de Usuário

| Perfil    | Acesso                                                        |
|-----------|---------------------------------------------------------------|
| admin     | Tudo — financeiro, config, usuários, todos os pedidos        |
| operador  | Pedidos, agendamentos, clientes — SEM financeiro, SEM exclusão|
| motorista | Apenas SUAS viagens — upload NF, eventos, sem financeiro      |

## Alertas Automáticos

- CNH motorista: 60 dias antes do vencimento
- CRLV caminhão: 60 dias antes
- Seguro caminhão: 30 dias antes
- Tacógrafo: 30 dias antes (crítico ≤ 15d)
- Manutenção por km: troca de óleo (padrão 20.000 km), revisão geral (40.000 km), pneus (60.000 km) — limiares configuráveis em Admin → Configurações → Alertas
- Pedido confirmado sem motorista: alerta após 24h

**Backend function syncAlerts** roda automaticamente a cada 30 minutos (automação agendada ID: 6a29a0c8a726de29d4378796) e ao montar o Dashboard. Persiste e resolve alertas na entidade Alert.

## Cálculo de Frete

`Frete = (Peso kg × R$/kg) + (Distância km × R$/km) + Taxa fixa`
Admin pode sobrescrever manualmente qualquer valor.
Cliente pode ter tabela de preço personalizada.

## NF Assinada

Obrigatória para confirmar entrega. Upload via celular (câmera ou galeria).
Vinculada ao pedido + destinatário + item.

## Design System — Site Público

```css
--velox-dark: #0A1628
--velox-blue: #1E3A5F
--velox-accent: #F59E0B
--velox-light: #F8FAFC
Font display: 'Barlow Condensed' 800
Font heading/body: 'Inter'
Font data: 'JetBrains Mono'
```

## Stack Técnica (Base44)

- Frontend: React 18 + Tailwind CSS + shadcn/ui
- Backend: Base44 entities + backend functions
- Auth: Base44 Auth
- Storage: Base44 UploadFile integration
- PDF: jsPDF
- Deploy: Base44 hosting

---

## Correções e Decisões de Implementação

### Formulários (regras gerais)
- Todo formulário de criação usa uma constante `EMPTY_*` e reseta para ela no `onSuccess` e ao fechar o modal.
- Todos os campos devem ter `<label>` explícito acima (não depender apenas de `placeholder`).
- Campos `Select` (tipo, status, categoria) devem sempre ser visíveis no formulário de criação **e** edição.

### Entidade Truck (Veículo)
- Formulário de criação e edição inclui: Placa, Fabricante, Modelo, Ano, Cor, RENAVAM, Capacidade (kg), Status, Dimensões (comp. × larg. × alt. em metros), Motorista titular.
- Histórico de manutenção é registrado na página de detalhe do veículo (`/admin/frota/:id`), seção "Manutenções".

### Entidade Driver (Motorista)
- Formulário de edição inclui labels para: Nome, CPF, Telefone, E-mail, Número CNH, Categoria CNH, Validade CNH, Data de admissão, Salário base, Status.

### Entidade Client (Cliente)
- Formulário de criação e edição inclui: Razão Social/Nome, CPF/CNPJ, Tipo de pessoa (pj/pf), Telefone, E-mail, Perfil de cliente (recorrente/eventual), Status (active/inactive).
- Formulário reseta para `EMPTY_CLIENT` no `onSuccess` e ao fechar o modal.

### Toasts
- `TOAST_REMOVE_DELAY` deve ser **5.000ms** (5 segundos). Não alterar para valores maiores.

### Agendamento Público — Cálculo de Disponibilidade
- `minDate` é uma string `YYYY-MM-DD`. Para evitar bugs de fuso horário, sempre construir `new Date(minDate + "T12:00:00")` antes de qualquer aritmética de datas.
- O componente `DatePickerWithAvailability` gera **42 dias** (6 semanas completas) a partir da `minDate`.
- A função `getAvailabilityForDate` em `utils/availabilityChecker.js` bloqueia datas que não estão nos `working_days` configurados na empresa.
- Se nenhuma cobertura estiver configurada (`settings.coverage_type` ausente), **todas as regiões são aceitas** — este é o comportamento correto. Para restringir regiões, configurar em Admin → Configurações → Cobertura.
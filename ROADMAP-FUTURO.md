# Velox TMS — Roadmap futuro

Itens identificados na auditoria que **não foram implementados ainda** — por
exigirem infraestrutura nova (e-mail, jobs) ou serem refactors grandes. Ficam
registrados aqui como trabalho futuro.

## Notificações (precisam de provedor de e-mail / edge function)
- **AU3 — Notificar o cliente automaticamente** a cada mudança de status do
  pedido (e-mail/WhatsApp). _Decisão pendente: provedor (Resend, SendGrid, etc.)._
- **AU1 — Fatura mensal automática:** job que, no dia de fechamento do cliente
  mensal, gera a Fatura dos pedidos entregues (hoje é manual em "Fechar fatura").
- **AU2 — Alerta de SLA de ocorrência estourado** (e-mail ao responsável).
- **AU4 — Escalonamento ativo de "pedido parado"** (já detecta na Central; falta
  avisar por e-mail/push).
- **F4 — Enviar fatura por e-mail/WhatsApp ao cliente** (hoje o PDF é só download).

## Funcionalidades grandes (novas áreas)
- **Rastreamento em mapa ao vivo** (posição do veículo) — hoje só timeline textual.
- **Multi-tenant real** — `company_settings` é uma linha única (uma empresa).
  Para o Velox como produto SaaS, isolar dados por empresa/tenant.
- **Portal da transportadora / agregados + leilão de frete** (subcontratação).
- **Cutoffs (horário de corte) e lanes** como entidade.
- **Conciliação bancária / baixa por boleto.**

## Qualidade / arquitetura (refactor contínuo)
- **A2 — Quebrar os "god-components"** (`NewOrder`, `OrderWorkspace`,
  `BookingForm`, `TripDetailPage` ~1000–1235 linhas) em componentes/hooks. Fazer
  aos poucos com o CI verde de rede de segurança.
- **A1 (parte E2E) — Testes de fluxo com Playwright** no CI. Já há o gate de
  lint+testes+build; falta E2E navegando as telas.
- **A5 — Versionamento/rollback de migrations** (hoje numeração sequencial manual).
- **C1 — Centralizar os "chips" de status** inline num componente único.
- **U6 — Padronizar estados (loading/empty/error/success)** em todas as telas.

## Já entregues na auditoria (referência)
ALTA: B1/B2/F1 (fatura única), A4 (RLS), A1/AU5 (CI). MÉDIA: U1 (nav 2ª linha),
U3/U4/F2 (portal CEP+estimativa), U5 (multi-destinatário), B3 (SLA config),
F3 (ação rápida). BAIXA: C2 (parser único), C3 (RPC pedido único), A3 (base44
falha clara). Decisão: U2 (login claro, consistente com público/portal).

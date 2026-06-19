# Velox TMS — Melhorias Operacionais (Ondas 0–4)

> Registro de cada problema identificado pelo dono da operação, com o mapa **como era → como ficou**
> e a confirmação **problema → solução**. Implementado em ondas, por impacto operacional real.

Legenda de origem: `S#` = Situação do Bloco 1 · `B2/B3/B4` = Blocos 2/3/4 · `5.x` = Bloco 5.

---

## ONDA 0 — Correção crítica

### 🐞 Bug: encerrar viagem quebrava o sistema

**Como era:**
Ao clicar em "Encerrar Viagem", o código chamava `drivers.find(...)` para calcular a comissão,
mas a lista de motoristas nunca era carregada naquela tela. Resultado: `ReferenceError` —
a viagem **não encerrava**, não gravava custo/lucro, não lançava as despesas de combustível/
pedágio/comissão e não concluía os pedidos. Tudo travava.

**Como ficou:**
A tela da viagem agora carrega os motoristas (`useQuery ["drivers"]`). O encerramento calcula a
comissão corretamente, grava lucro líquido, lança as despesas e conclui os pedidos da viagem.

**Problema → Solução:** Encerramento de viagem travado → consulta de motoristas adicionada;
fluxo de acerto (Fase 6) volta a funcionar de ponta a ponta.

---

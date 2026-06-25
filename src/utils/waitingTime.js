/**
 * VELOX — Tempo de espera / estadia (item 43 do levantamento de mercado).
 *
 * O motorista chega ao local (`arrived_at`) e só sai quando a parada é
 * concluída (`completed_at`). O tempo entre os dois é o "tempo no local".
 * Acima de um período livre (cortesia), o excedente é cobrado como ESTADIA,
 * por hora ou fração, usando a tarifa de Configurações.
 *
 * Tarifas (settings.pricing):
 *   - waiting_fee_hour     R$/hora de estadia (já existe no sistema)
 *   - waiting_free_minutes minutos de cortesia antes de cobrar (padrão 60)
 */

export const DEFAULT_FREE_MINUTES = 60;

/** Minutos inteiros entre chegada e conclusão da parada. 0 se faltar dado. */
export function stopWaitingMinutes(stop) {
  if (!stop?.arrived_at || !stop?.completed_at) return 0;
  const a = new Date(stop.arrived_at).getTime();
  const b = new Date(stop.completed_at).getTime();
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  return Math.floor((b - a) / 60000);
}

/** Tarifa de estadia configurada (R$/hora). 0 se não configurada. */
export function waitingRate(pricing) {
  return Number(pricing?.waiting_fee_hour) || 0;
}

/** Período livre (minutos) antes de cobrar estadia. */
export function freeMinutes(pricing) {
  const v = Number(pricing?.waiting_free_minutes);
  return Number.isFinite(v) && v >= 0 ? v : DEFAULT_FREE_MINUTES;
}

/**
 * Estadia de UMA parada. Cobra por hora OU FRAÇÃO o que exceder o tempo livre.
 * Retorna { minutes, billableMinutes, billableHours, fee }.
 */
export function stopEstadia(stop, pricing) {
  const minutes = stopWaitingMinutes(stop);
  const free = freeMinutes(pricing);
  const rate = waitingRate(pricing);
  const billableMinutes = Math.max(0, minutes - free);
  const billableHours = billableMinutes > 0 ? Math.ceil(billableMinutes / 60) : 0;
  const fee = Math.round(billableHours * rate * 100) / 100;
  return { minutes, billableMinutes, billableHours, fee };
}

/**
 * Resumo de estadia da viagem inteira: uma linha por parada que excedeu o
 * tempo livre, com o pedido associado, mais os totais.
 */
export function tripEstadiaSummary(trip, pricing) {
  const rows = (trip?.stops || [])
    .map((stop, index) => {
      const est = stopEstadia(stop, pricing);
      return {
        index,
        order_id: stop.order_id || null,
        recipient_name: stop.recipient_name || stop.address || `Parada ${index + 1}`,
        type: stop.type,
        already_charged: !!stop.estadia_charged,
        ...est,
      };
    })
    .filter(r => r.fee > 0);
  const totalMinutes = rows.reduce((s, r) => s + r.minutes, 0);
  const totalFee = Math.round(rows.reduce((s, r) => s + r.fee, 0) * 100) / 100;
  const pendingFee = Math.round(rows.filter(r => !r.already_charged).reduce((s, r) => s + r.fee, 0) * 100) / 100;
  return { rows, totalMinutes, totalFee, pendingFee, hasPending: pendingFee > 0 };
}

/** "1h 35min" / "45min" — formatação amigável de minutos. */
export function formatMinutes(min) {
  const m = Math.max(0, Math.round(min || 0));
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

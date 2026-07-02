import { supabase } from "@/api/supabaseClient";
import { buildFiscalPayload } from "@/services/fiscalPayload";

/**
 * Serviço fiscal (Projeto 09.3) — cliente da fila fiscal.
 * Monta o payload (provider-agnóstico) e enfileira a emissão. A autorização real
 * na SEFAZ depende de PROVEDOR (pago) + certificado — sem eles, o documento fica
 * em 'provider_pending' (não autoriza nada).
 */

export async function requestFiscal(kind, entityType, entityId, data) {
  const payload = buildFiscalPayload(kind, data);
  const { data: id, error } = await supabase.rpc("fiscal_request", {
    p_kind: kind, p_entity_type: entityType, p_entity_id: entityId, p_payload: payload,
  });
  if (error) throw error;
  return id;
}

export async function markContingency(id) {
  const { error } = await supabase.rpc("fiscal_mark_contingency", { p_id: id });
  if (error) throw error;
}

export async function cancelFiscal(id, reason) {
  const { error } = await supabase.rpc("fiscal_cancel", { p_id: id, p_reason: reason });
  if (error) throw error;
}

/** Aciona a Edge Function que processaria a fila junto ao provedor (quando ligado). */
export async function processFiscalQueue(opts = {}) {
  const { data, error } = await supabase.functions.invoke("fiscal-emit", { body: { limit: opts.limit ?? 20 } });
  if (error) throw error;
  return data;
}

import { supabase } from "@/api/supabaseClient";

/**
 * Registra uma ação sensível na trilha de auditoria central (2.3).
 * Best-effort: nunca lança — se falhar (RPC ausente/sem permissão), apenas
 * ignora, para não travar a ação principal do usuário.
 *
 * @param {string} action    verbo/ação (ex: "Cancelou pedido")
 * @param {string} [entity]  tipo (ex: "order", "invoice", "trip")
 * @param {string} [entityId] referência (protocolo/número/id)
 * @param {string} [detail]  texto livre
 */
export async function logAction(action, entity = null, entityId = null, detail = null) {
  try {
    await supabase.rpc("log_action", {
      p_action: action, p_entity: entity, p_entity_id: entityId, p_detail: detail,
    });
  } catch {
    // silencioso de propósito
  }
}

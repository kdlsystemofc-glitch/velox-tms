import { supabase } from "@/api/supabaseClient";

/**
 * Serviço de documentos (Projeto 08.4) — cliente da fila server-side.
 * Enfileira geração (request_document/batch), aciona a Edge Function de render
 * e resolve signed URLs para download do bucket privado 'documents'.
 */

export async function requestDocument(type, entityType, entityId, title = null) {
  const { data, error } = await supabase.rpc("request_document", {
    p_type: type, p_entity_type: entityType, p_entity_id: entityId, p_title: title,
  });
  if (error) throw error;
  return data; // id do documento
}

export async function requestDocumentsBatch(type, entityType, entityIds) {
  const { data, error } = await supabase.rpc("request_documents_batch", {
    p_type: type, p_entity_type: entityType, p_entity_ids: entityIds,
  });
  if (error) throw error;
  return data; // quantidade enfileirada
}

/**
 * Aciona a Edge Function que processa a fila no servidor (lote assíncrono).
 * `opts.documentId` processa só um; senão processa até `opts.limit` pendentes.
 */
export async function renderPendingDocuments(opts = {}) {
  const body = opts.documentId ? { document_id: opts.documentId } : { limit: opts.limit ?? 20 };
  const { data, error } = await supabase.functions.invoke("render-documents", { body });
  if (error) throw error;
  return data; // { processed, failed }
}

/** URL assinada (temporária) para baixar um documento pronto do bucket privado. */
export async function signedDocumentUrl(storagePath, expiresIn = 60) {
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}

// ============================================================
// VELOX TMS — Projeto 09.3: Edge Function de emissão fiscal (ESQUELETO)
// ============================================================
// Processa a fila public.fiscal_documents (status='pending') chamando o PROVEDOR
// FISCAL. A integração real com a SEFAZ depende de um provedor (pago) + certificado
// digital — AINDA NÃO DECIDIDOS. Por isso o adaptador `emitViaProvider` é um STUB:
// enquanto não houver provedor, marca o documento como 'provider_pending'.
//
// Para LIGAR a emissão real:
//   1. Configure company_settings.fiscal_provider (nome) e as credenciais como
//      segredos da função (ex.: FISCAL_API_URL, FISCAL_API_TOKEN).
//   2. Implemente `emitViaProvider` chamando a API do provedor (CT-e/MDF-e).
//   3. Ao autorizar: grave access_key, protocol, number, xml_path, dacte_path
//      (subindo XML/DACTE no bucket 'documents' — serviço do P08) e status='authorized'.
//   4. Trate rejeição (status='rejected') e contingência.
//
// Deploy:   supabase functions deploy fiscal-emit   (verify_jwt on)
// Invocar:  POST { "limit": 20 }

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Adaptador do provedor (STUB). Retorna o resultado da autorização.
 * @returns { status, access_key?, protocol?, number?, xml_path?, dacte_path?, error? }
 */
async function emitViaProvider(_doc: any): Promise<any> {
  const provider = Deno.env.get("FISCAL_API_URL");
  if (!provider) {
    // Sem provedor configurado: não autoriza nada.
    return { status: "provider_pending", error: "Adaptador de provedor fiscal não configurado." };
  }
  // TODO(P09): traduzir _doc.payload → schema do provedor e chamar a API real.
  // Ex.: const res = await fetch(`${provider}/cte`, { method:"POST", headers:{...}, body: JSON.stringify(map(_doc.payload)) });
  return { status: "provider_pending", error: "Integração do provedor fiscal ainda não implementada." };
}

serve(async (req) => {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const { data: docs, error } = await admin
      .from("fiscal_documents").select("*").eq("status", "pending").order("created_at").limit(body.limit ?? 20);
    if (error) throw error;

    let authorized = 0, pending = 0, failed = 0;
    for (const doc of docs ?? []) {
      try {
        const r = await emitViaProvider(doc);
        const patch: any = { status: r.status, attempts: (doc.attempts ?? 0) + 1, updated_at: new Date().toISOString(), error: r.error ?? null };
        if (r.status === "authorized") {
          patch.access_key = r.access_key; patch.protocol = r.protocol; patch.number = r.number;
          patch.xml_path = r.xml_path; patch.dacte_path = r.dacte_path;
          patch.authorized_at = new Date().toISOString();
          authorized++;
        } else if (r.status === "provider_pending") { pending++; } else { failed++; }
        await admin.from("fiscal_documents").update(patch).eq("id", doc.id);
      } catch (e) {
        await admin.from("fiscal_documents").update({ status: "rejected", error: String((e as Error)?.message ?? e), attempts: (doc.attempts ?? 0) + 1 }).eq("id", doc.id);
        failed++;
      }
    }
    return new Response(JSON.stringify({ authorized, pending, failed }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

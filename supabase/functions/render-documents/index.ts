// ============================================================
// VELOX TMS — Projeto 08.3: Edge Function de renderização de documentos
// ============================================================
// Processa a FILA public.documents (status='pending'), renderiza o PDF NO
// SERVIDOR (pdf-lib) a partir do modelo isomórfico compartilhado, arquiva no
// bucket privado 'documents' e marca 'ready'. Lote assíncrono: uma invocação
// processa até `limit` documentos.
//
// Deploy:   supabase functions deploy render-documents
//           (verify_jwt=on por padrão → só usuários autenticados invocam; a
//            função usa a service_role internamente para gravar no Storage.)
// Segredos: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (a CLI injeta os padrões).
// Invocar:  POST { "limit": 20 }  ou  { "document_id": "<uuid>" }
// Agendar (lote): pg_cron + pg_net chamando a URL da função com o header
//           Authorization: Bearer <service_role>, ou o botão "Processar fila" no app.
//
// Observação: importa o MESMO buildDocumentModel do app (fonte única de conteúdo).
// Se o bundler não seguir o import para ../src, copie documentModel.js para
// supabase/functions/_shared/ e ajuste o import.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { buildDocumentModel } from "../../../src/services/documentModel.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ---------- coleta dos dados por tipo de entidade ----------
async function fetchData(admin: any, doc: any) {
  const { data: company } = await admin.from("company_settings").select("*").limit(1).maybeSingle();
  if (doc.entity_type === "invoice") {
    const { data: invoice } = await admin.from("invoices").select("*").eq("id", doc.entity_id).maybeSingle();
    return { invoice, company };
  }
  if (doc.entity_type === "order") {
    const { data: order } = await admin.from("orders").select("*").eq("id", doc.entity_id).maybeSingle();
    let trip = null;
    if (order?.trip_id) {
      const { data } = await admin.from("trips").select("*").eq("id", order.trip_id).maybeSingle();
      trip = data;
    }
    return { order, trip, company };
  }
  if (doc.entity_type === "trip") {
    const { data: trip } = await admin.from("trips").select("*").eq("id", doc.entity_id).maybeSingle();
    const { data: orders } = await admin.from("orders").select("*").eq("trip_id", doc.entity_id);
    return { trip, orders: orders ?? [], company };
  }
  if (doc.entity_type === "transfer") {
    const { data: transfer } = await admin.from("transfers").select("*").eq("id", doc.entity_id).maybeSingle();
    const ids = (transfer?.order_ids ?? []).map((x: any) => (typeof x === "string" ? x : x?.order_id)).filter(Boolean);
    const { data: orders } = ids.length ? await admin.from("orders").select("*").in("id", ids) : { data: [] };
    return { transfer, orders: orders ?? [], company };
  }
  throw new Error(`entity_type desconhecido: ${doc.entity_type}`);
}

// ---------- renderer pdf-lib (consome o modelo genérico) ----------
async function renderPdf(model: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const M = 40, W = 595, H = 842;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const dark = rgb(0.12, 0.14, 0.19), gray = rgb(0.45, 0.45, 0.45);

  const ensure = (need = 16) => { if (y - need < M) { page = pdf.addPage([W, H]); y = H - M; } };
  const text = (s: string, x: number, size = 10, f = font, color = dark) =>
    page.drawText(String(s ?? ""), { x, y, size, font: f, color });
  const right = (s: string, xRight: number, size = 10, f = font, color = dark) => {
    const w = f.widthOfTextAtSize(String(s ?? ""), size);
    page.drawText(String(s ?? ""), { x: xRight - w, y, size, font: f, color });
  };

  // Cabeçalho
  page.drawRectangle({ x: 0, y: H - 60, width: W, height: 60, color: dark });
  page.drawText(model.company?.name ?? "Velox", { x: M, y: H - 32, size: 15, font: bold, color: rgb(1, 1, 1) });
  if (model.company?.cnpj) page.drawText(`CNPJ: ${model.company.cnpj}`, { x: M, y: H - 48, size: 9, font, color: rgb(0.8, 0.8, 0.8) });
  const tw = bold.widthOfTextAtSize(model.title ?? "", 13);
  page.drawText(model.title ?? "", { x: W - M - tw, y: H - 32, size: 13, font: bold, color: rgb(1, 1, 1) });
  const nw = font.widthOfTextAtSize(model.docNumber ?? "", 10);
  page.drawText(model.docNumber ?? "", { x: W - M - nw, y: H - 48, size: 10, font, color: rgb(0.85, 0.85, 0.85) });
  y = H - 80;

  if (model.banner) { ensure(); text(model.banner, M, 8, bold, rgb(0.6, 0.4, 0)); y -= 16; }

  // Meta (pares label/valor em duas colunas)
  (model.meta ?? []).forEach((m: any, i: number) => {
    if (i % 2 === 0) ensure(18);
    const x = M + (i % 2) * ((W - 2 * M) / 2);
    page.drawText(String(m.label).toUpperCase(), { x, y, size: 7, font, color: gray });
    page.drawText(String(m.value ?? "—"), { x, y: y - 10, size: 10, font: bold, color: dark });
    if (i % 2 === 1) y -= 26;
  });
  if ((model.meta ?? []).length % 2 === 1) y -= 26;
  y -= 6;

  for (const b of model.blocks ?? []) {
    if (b.kind === "heading") { ensure(20); y -= 4; text(b.text, M, 10, bold); y -= 14; }
    else if (b.kind === "fields") {
      (b.items ?? []).forEach((it: any, i: number) => {
        if (i % 3 === 0) ensure(20);
        const x = M + (i % 3) * ((W - 2 * M) / 3);
        page.drawText(String(it.label).toUpperCase(), { x, y, size: 7, font, color: gray });
        page.drawText(String(it.value ?? "—"), { x, y: y - 10, size: 9, font, color: dark });
        if (i % 3 === 2) y -= 24;
      });
      if ((b.items ?? []).length % 3 !== 0) y -= 24;
    }
    else if (b.kind === "table") {
      const cols = b.columns ?? [];
      const colW = (W - 2 * M) / cols.length;
      ensure(18);
      page.drawRectangle({ x: M, y: y - 4, width: W - 2 * M, height: 16, color: rgb(0.93, 0.95, 1) });
      cols.forEach((c: any, ci: number) => {
        const x = M + ci * colW;
        if (c.align === "right") right(c.label, x + colW - 4, 8, bold, gray);
        else page.drawText(String(c.label), { x: x + 2, y: y + 2, size: 8, font: bold, color: gray });
      });
      y -= 18;
      for (const row of b.rows ?? []) {
        ensure(14);
        row.forEach((cell: any, ci: number) => {
          const x = M + ci * colW;
          if (cols[ci]?.align === "right") right(String(cell), x + colW - 4, 8);
          else text(String(cell).slice(0, 48), x + 2, 8);
        });
        y -= 13;
      }
      y -= 4;
    }
    else if (b.kind === "total") {
      ensure(22); y -= 4;
      page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
      text(b.label, M, 12, bold);
      right(b.value, W - M, 12, bold);
      y -= 18;
    }
    else if (b.kind === "labels") {
      const cols = 2, cw = (W - 2 * M) / cols, ch = 90;
      (b.items ?? []).forEach((it: any, i: number) => {
        if (i % cols === 0) ensure(ch + 6);
        const x = M + (i % cols) * cw;
        const top = y;
        page.drawRectangle({ x, y: top - ch, width: cw - 8, height: ch, borderColor: dark, borderWidth: 1 });
        (it.lines ?? []).forEach((ln: string, li: number) => {
          page.drawText(String(ln).slice(0, 34), { x: x + 8, y: top - 18 - li * 16, size: li === 0 ? 13 : 9, font: li === 0 ? bold : font, color: dark });
        });
        if (it.badge) page.drawText(String(it.badge), { x: x + cw - 40, y: top - 18, size: 11, font: bold, color: gray });
        if (i % cols === cols - 1) y -= ch + 6;
      });
      if ((b.items ?? []).length % cols !== 0) y -= ch + 6;
    }
  }

  if (model.footer) { ensure(); page.drawText(String(model.footer).slice(0, 160), { x: M, y: Math.max(M, y), size: 7, font, color: gray }); }
  return await pdf.save();
}

serve(async (req) => {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const q = body.document_id
      ? admin.from("documents").select("*").eq("id", body.document_id)
      : admin.from("documents").select("*").eq("status", "pending").order("created_at").limit(body.limit ?? 20);
    const { data: docs, error } = await q;
    if (error) throw error;

    let processed = 0, failed = 0;
    for (const doc of docs ?? []) {
      try {
        const data = await fetchData(admin, doc);
        const model = buildDocumentModel(doc.type, data);
        const bytes = await renderPdf(model);
        const path = `${doc.type}/${doc.entity_id}/${doc.id}.pdf`;
        const up = await admin.storage.from("documents").upload(path, bytes, { contentType: "application/pdf", upsert: true });
        if (up.error) throw up.error;
        await admin.from("documents").update({ status: "ready", storage_path: path, title: doc.title ?? model.title, ready_at: new Date().toISOString(), error: null }).eq("id", doc.id);
        processed++;
      } catch (e) {
        await admin.from("documents").update({ status: "error", error: String((e as Error)?.message ?? e) }).eq("id", doc.id);
        failed++;
      }
    }
    return new Response(JSON.stringify({ processed, failed }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});

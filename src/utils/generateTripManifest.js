import jsPDF from "jspdf";
import { formatDateBR } from "@/utils/dateUtils";

/**
 * Gera o ROMANEIO DE CARGA (manifesto de viagem) em PDF e retorna como Blob.
 * Documento que o motorista leva na viagem: identificação do veículo/motorista,
 * sequência de paradas, NFs, volumes, pesos e campos de assinatura.
 *
 * @param {object} trip    - viagem completa (stops, driver_name, truck_plate, ...)
 * @param {object[]} orders - pedidos vinculados à viagem (com recipients/items)
 * @param {object} company - CompanySettings
 * @returns {Blob}
 */
export function generateTripManifest(trip, orders = [], company = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 12;
  let y = 14;

  const ordersById = {};
  orders.forEach(o => { ordersById[o.id] = o; });

  const ensureSpace = (needed = 10) => {
    if (y + needed > 282) { doc.addPage(); y = 16; }
  };

  // ── Cabeçalho ─────────────────────────────────────────────
  doc.setFillColor(245, 166, 35);
  doc.rect(0, 0, W, 20, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(company?.company_name || "Velox Transportadora", margin, 13);
  doc.setFontSize(9);
  doc.text("ROMANEIO DE CARGA", W - margin, 13, { align: "right" });
  y = 28;

  // ── Identificação da viagem ───────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const departure = trip.departure_date
    ? new Date(trip.departure_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : trip.scheduled_departure
    ? new Date(trip.scheduled_departure).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  const info = [
    ["Motorista:", trip.driver_name || "—", "Placa:", trip.truck_plate || "—"],
    ["Saída:", departure, "Pedidos:", String((trip.order_ids || []).length)],
  ];
  info.forEach(([l1, v1, l2, v2]) => {
    doc.setFont("helvetica", "bold");
    doc.text(l1, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v1), margin + 22, y);
    doc.setFont("helvetica", "bold");
    doc.text(l2, margin + 110, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(v2), margin + 128, y);
    y += 5.5;
  });
  y += 2;

  // ── Resumo da carga ───────────────────────────────────────
  let totVol = 0, totKg = 0, totNfs = 0;
  orders.forEach(o => {
    totVol += Number(o.total_volumes) || 0;
    totKg += Number(o.total_weight_kg) || 0;
    (o.recipients || []).forEach(r => (r.items || []).forEach(i => { if (i.nf_number) totNfs++; }));
  });
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, W - margin * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(
    `CARGA TOTAL:  ${totVol} volumes   ·   ${totKg.toLocaleString("pt-BR")} kg   ·   ${totNfs} NF(s)`,
    margin + 2, y + 5.5
  );
  y += 12;

  // ── Sequência de paradas ──────────────────────────────────
  const stops = trip.stops || [];
  stops.forEach((stop, idx) => {
    ensureSpace(20);
    const order = ordersById[stop.order_id];
    const isCollection = stop.type === "collection";

    // Cabeçalho da parada
    doc.setFillColor(isCollection ? 224 : 209, isCollection ? 231 : 250, isCollection ? 255 : 229);
    doc.rect(margin, y, W - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    const stopLabel = isCollection ? "COLETA" : "ENTREGA";
    const who = isCollection
      ? (order?.client_name || "—")
      : (stop.recipient_name || "—");
    doc.text(`${idx + 1}. ${stopLabel} — ${who}`, margin + 2, y + 5);
    if (order?.protocol) {
      doc.setFont("helvetica", "normal");
      doc.text(order.protocol, W - margin - 2, y + 5, { align: "right" });
    }
    y += 9;

    // Endereço
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(String(stop.address || "—").substring(0, 110), margin + 4, y);
    y += 5;

    // Itens (apenas em entregas, do destinatário específico)
    if (!isCollection && order) {
      const recipient = (order.recipients || []).find(r => r.name === stop.recipient_name);
      const items = recipient?.items || [];
      if (items.length > 0) {
        doc.setTextColor(60, 60, 60);
        items.forEach(item => {
          ensureSpace(5);
          const line = [
            item.nf_number ? `NF ${item.nf_number}` : "s/ NF",
            `${item.volumes || 0} vol`,
            `${Number(item.weight_kg || 0).toLocaleString("pt-BR")} kg`,
            (item.description || "").substring(0, 50),
          ].join("  ·  ");
          doc.text(`• ${line}`, margin + 6, y);
          y += 4.5;
        });
      }
      if (recipient?.delivery_notes) {
        ensureSpace(5);
        doc.setTextColor(180, 100, 0);
        doc.text(`Obs: ${String(recipient.delivery_notes).substring(0, 100)}`, margin + 6, y);
        doc.setTextColor(60, 60, 60);
        y += 4.5;
      }
    }
    if (isCollection && order?.collection_date) {
      doc.setTextColor(90, 90, 90);
      doc.text(`Data programada: ${formatDateBR(order.collection_date)}${order.collection_notes ? ` · Obs: ${String(order.collection_notes).substring(0, 70)}` : ""}`, margin + 6, y);
      y += 4.5;
    }
    y += 3;
  });

  // ── Assinaturas ───────────────────────────────────────────
  ensureSpace(35);
  y = Math.max(y + 8, 240);
  if (y > 250) { doc.addPage(); y = 240; }
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, y, margin + 75, y);
  doc.line(W / 2 + 10, y, W / 2 + 85, y);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Conferente / Expedição", margin, y + 4);
  doc.text(`Motorista — ${trip.driver_name || ""}`, W / 2 + 10, y + 4);

  // ── Rodapé ────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    const docH = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Romaneio gerado em ${new Date().toLocaleString("pt-BR")} · ${company?.company_name || "Velox Transportadora"} · pág. ${p}/${pageCount}`,
      W / 2, docH - 6,
      { align: "center" }
    );
  }

  return doc.output("blob");
}

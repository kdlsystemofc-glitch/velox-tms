import jsPDF from "jspdf";
import { formatDateBR } from "@/utils/dateUtils";

/**
 * Gera o MANIFESTO DE TRANSFERÊNCIA (linha-haul entre filiais/CDs) em PDF.
 * Documento que acompanha a carga de uma filial/CD a outra: origem, destino,
 * veículo/motorista, lista de pedidos com NFs/volumes/peso e conferência.
 *
 * @param {object} transfer - transferência (protocol, from/to_branch_name, truck_plate, ...)
 * @param {object[]} orders - pedidos da transferência (com recipients/items)
 * @param {object} company  - CompanySettings
 * @returns {Blob}
 */
export function generateTransferManifest(transfer, orders = [], company = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 12;
  let y = 14;

  const ensureSpace = (needed = 10) => { if (y + needed > 282) { doc.addPage(); y = 16; } };

  // ── Cabeçalho ──
  doc.setFillColor(245, 166, 35);
  doc.rect(0, 0, W, 20, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(company?.company_name || "Velox Transportadora", margin, 13);
  doc.setFontSize(9);
  doc.text("MANIFESTO DE TRANSFERÊNCIA", W - margin, 13, { align: "right" });
  y = 28;

  // ── Identificação ──
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const departure = transfer.departure_date ? formatDateBR(transfer.departure_date) : "—";
  const info = [
    ["Protocolo:", transfer.protocol || "—", "Saída:", departure],
    ["Origem:", transfer.from_branch_name || "—", "Destino:", transfer.to_branch_name || "—"],
    ["Veículo:", transfer.truck_plate || "—", "Motorista:", transfer.driver_name || "—"],
  ];
  info.forEach(([l1, v1, l2, v2]) => {
    doc.setFont("helvetica", "bold"); doc.text(l1, margin, y);
    doc.setFont("helvetica", "normal"); doc.text(String(v1), margin + 22, y);
    doc.setFont("helvetica", "bold"); doc.text(l2, margin + 110, y);
    doc.setFont("helvetica", "normal"); doc.text(String(v2), margin + 128, y);
    y += 5.5;
  });
  y += 2;

  // ── Resumo da carga ──
  let totVol = 0, totKg = 0, totNfs = 0, totDeclared = 0;
  orders.forEach(o => {
    totVol += Number(o.total_volumes) || 0;
    totKg += Number(o.total_weight_kg) || 0;
    totDeclared += Number(o.total_declared_value) || 0;
    (o.recipients || []).forEach(r => (r.items || []).forEach(i => { if (i.nf_number) totNfs++; }));
  });
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, W - margin * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(
    `CARGA: ${orders.length} pedido(s)  ·  ${totVol} volumes  ·  ${totKg.toLocaleString("pt-BR")} kg  ·  ${totNfs} NF(s)  ·  Valor R$ ${totDeclared.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    margin + 2, y + 5.5
  );
  y += 12;

  // ── Lista de pedidos ──
  orders.forEach((o, idx) => {
    ensureSpace(16);
    doc.setFillColor(224, 231, 255);
    doc.rect(margin, y, W - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 40, 40);
    doc.text(`${idx + 1}. ${o.client_name || "—"}`, margin + 2, y + 5);
    if (o.protocol) { doc.setFont("helvetica", "normal"); doc.text(o.protocol, W - margin - 2, y + 5, { align: "right" }); }
    y += 9;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    const cities = (o.recipients || []).map(r => r.city).filter(Boolean).join(", ");
    const line = `${Number(o.total_volumes) || 0} vol · ${(Number(o.total_weight_kg) || 0).toLocaleString("pt-BR")} kg${cities ? ` · destino: ${cities}` : ""}`;
    doc.text(line, margin + 2, y + 1);
    y += 6;
  });

  // ── Conferência (assinaturas) ──
  ensureSpace(34);
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.line(margin, y, margin + 80, y);
  doc.line(W - margin - 80, y, W - margin, y);
  y += 4;
  doc.text("Conferente da ORIGEM (saída)", margin, y);
  doc.text("Conferente do DESTINO (recebimento)", W - margin - 80, y);
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Emitido em ${formatDateBR(new Date().toISOString())}`, margin, y);

  return doc.output("blob");
}

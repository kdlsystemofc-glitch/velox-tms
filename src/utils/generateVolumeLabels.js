import jsPDF from "jspdf";

/**
 * Gera ETIQUETAS DE VOLUME (PDF) — uma etiqueta por volume da carga, para colar
 * nos pacotes. Cada etiqueta: protocolo, remetente, destinatário, cidade/UF,
 * "volume X/N" e peso. Layout 2 colunas × 5 linhas por página A4.
 */
export function generateVolumeLabels(order, company = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297;
  const cols = 2, rows = 5;
  const mx = 8, my = 8, gap = 4;
  const lw = (W - mx * 2 - gap * (cols - 1)) / cols;   // largura da etiqueta
  const lh = (H - my * 2 - gap * (rows - 1)) / rows;    // altura da etiqueta

  // Monta a lista de volumes (1 etiqueta por volume de cada destinatário)
  const labels = [];
  (order.recipients || []).forEach((r, ri) => {
    const recVols = (r.items || []).reduce((s, it) => s + (Number(it.volumes) || 0), 0) || 1;
    const recKg = (r.items || []).reduce((s, it) => s + (Number(it.weight_kg) || 0), 0);
    for (let v = 1; v <= recVols; v++) {
      labels.push({
        recipient: r.name || `Destinatário ${ri + 1}`,
        city: [r.city, r.state].filter(Boolean).join("/"),
        idx: v, total: recVols, kg: recKg,
      });
    }
  });
  if (labels.length === 0) {
    const tv = Number(order.total_volumes) || 1;
    for (let v = 1; v <= tv; v++) labels.push({ recipient: "—", city: "", idx: v, total: tv, kg: order.total_weight_kg || 0 });
  }

  labels.forEach((lab, i) => {
    const cell = i % (cols * rows);
    if (i > 0 && cell === 0) doc.addPage();
    const c = cell % cols, rr = Math.floor(cell / cols);
    const x = mx + c * (lw + gap);
    const y = my + rr * (lh + gap);

    doc.setDrawColor(150); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, lw, lh, 2, 2);

    // faixa superior
    doc.setFillColor(245, 166, 35);
    doc.rect(x, y, lw, 9, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30, 30, 30);
    doc.text((company?.company_name || "Velox Transportadora").substring(0, 30), x + 3, y + 6);

    doc.setTextColor(20, 20, 20);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(`${lab.idx}/${lab.total}`, x + lw - 3, y + 7, { align: "right" });

    let yy = y + 15;
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(90, 90, 90);
    doc.text("Protocolo", x + 3, yy);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(20, 20, 20);
    doc.text(String(order.protocol || "—"), x + 3, yy + 5.5);
    yy += 12;

    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90, 90, 90);
    doc.text("Destinatário", x + 3, yy);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
    doc.text(doc.splitTextToSize(lab.recipient, lw - 6)[0], x + 3, yy + 5);
    yy += 10;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
    if (lab.city) doc.text(lab.city, x + 3, yy);

    doc.setFontSize(8); doc.setTextColor(90, 90, 90);
    doc.text(`Remetente: ${(order.client_name || "").substring(0, 28)}`, x + 3, y + lh - 4);
  });

  return doc.output("blob");
}

import jsPDF from "jspdf";

/** Carrega uma imagem (URL) como dataURL + dimensões, para embutir no PDF. */
function loadImageData(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve({ dataUrl: c.toDataURL("image/png"), width: img.naturalWidth, height: img.naturalHeight });
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Gera PDF de comprovante de entrega (POD) e retorna como Blob.
 * Embute a assinatura digital do recebedor quando disponível.
 * @param {object} order   - objeto completo do pedido
 * @param {object} trip    - objeto da viagem (opcional)
 * @param {object} company - dados da empresa (CompanySettings)
 * @returns {Promise<Blob>}
 */
export async function generateDeliveryReceipt(order, trip, company) {
  // Pré-carrega assinaturas dos destinatários (falha silenciosa se CORS/erro)
  const sigByRecipient = {};
  for (const r of (order.recipients || [])) {
    if (r.signature_url) {
      try { sigByRecipient[r.name] = await loadImageData(r.signature_url); } catch { /* ignora */ }
    }
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 15;
  let y = 15;

  const fmt = (n) => Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  // ── Cabeçalho ─────────────────────────────────────────────
  doc.setFillColor(245, 166, 35);
  doc.rect(0, 0, W, 22, "F");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(company?.company_name || "Velox Transportadora", margin, 14);
  doc.setFontSize(8);
  doc.text("COMPROVANTE DE ENTREGA", W - margin, 14, { align: "right" });
  y = 32;

  // ── Identificação ─────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Protocolo:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(order.protocol || "—", margin + 23, y);

  if (order.cte_number) {
    doc.setFont("helvetica", "bold");
    doc.text("CT-e:", margin + 80, y);
    doc.setFont("helvetica", "normal");
    doc.text(order.cte_number, margin + 92, y);
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Data coleta:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    order.collection_date
      ? new Date(order.collection_date + "T12:00:00").toLocaleDateString("pt-BR")
      : "—",
    margin + 26, y
  );
  y += 5;

  if (company?.cnpj || company?.address) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    if (company.address) { doc.text(company.address, margin, y); y += 4; }
    if (company.cnpj) { doc.text(`CNPJ: ${company.cnpj}`, margin, y); y += 4; }
    doc.setTextColor(60, 60, 60);
  }
  y += 3;

  // ── Remetente ─────────────────────────────────────────────
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, W - margin * 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text("REMETENTE", margin + 2, y + 5);
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(order.client_name || "—", margin + 2, y);
  if (order.client_cpf_cnpj) { y += 5; doc.text(order.client_cpf_cnpj, margin + 2, y); }
  y += 8;

  // ── Destinatários e NFs ───────────────────────────────────
  (order.recipients || []).forEach((recipient, idx) => {
    if (y > 240) { doc.addPage(); y = 20; }

    // Header do destinatário
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, W - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(`DESTINATÁRIO ${idx + 1} — ${recipient.name || "—"}`, margin + 2, y + 5);
    y += 9;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const addrParts = [recipient.street, recipient.number, recipient.city, recipient.state].filter(Boolean);
    if (addrParts.length) { doc.text(addrParts.join(", "), margin + 2, y); y += 5; }
    doc.setTextColor(60, 60, 60);

    // Tabela manual de NFs
    const items = recipient.items || [];
    if (items.length > 0) {
      const colX = [margin, margin + 22, margin + 80, margin + 110, margin + 135];
      const colW = [22, 58, 30, 25, 35];
      const headers = ["Nº NF", "Descrição", "Vol.", "Peso", "Valor decl."];

      // Cabeçalho da tabela
      doc.setFillColor(245, 166, 35);
      doc.rect(margin, y, W - margin * 2, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 4.5));
      y += 7;

      // Linhas de dados
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      items.forEach((item, ii) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const bg = ii % 2 === 0 ? [255, 255, 255] : [250, 250, 250];
        doc.setFillColor(...bg);
        doc.rect(margin, y, W - margin * 2, 6, "F");
        doc.setTextColor(50, 50, 50);
        const row = [
          item.nf_number || "—",
          (item.description || "—").substring(0, 35),
          String(item.volumes || 0),
          `${Number(item.weight_kg || 0).toLocaleString("pt-BR")} kg`,
          item.declared_value ? `R$ ${fmt(item.declared_value)}` : "—",
        ];
        row.forEach((cell, i) => doc.text(cell, colX[i] + 1, y + 4.2));
        y += 6;
      });

      // Borda ao redor da tabela
      const tableH = (items.length + 1) * 6;
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, y - tableH, W - margin * 2, tableH);
      y += 2;
    }

    // NF assinada
    const hasNf = (items).some(it => it.nf_signed_url) || recipient.nf_signed_url;
    if (hasNf) {
      doc.setFontSize(8);
      doc.setTextColor(0, 130, 0);
      doc.text("✓ NF assinada registrada no sistema", margin + 2, y + 3);
      doc.setTextColor(60, 60, 60);
      y += 7;
    }

    // Comprovante de entrega: recebedor + assinatura digital embutida
    if (recipient.receiver_name || recipient.signature_url || recipient.delivered_at) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      const recebedor = recipient.receiver_name ? `Recebido por: ${recipient.receiver_name}` : "Recebido";
      const quando = recipient.delivered_at ? `  ·  ${new Date(recipient.delivered_at).toLocaleString("pt-BR")}` : "";
      doc.text(recebedor + quando, margin + 2, y + 3);
      y += 5;
      const sig = sigByRecipient[recipient.name];
      if (sig) {
        const w = 45;
        const h = Math.min(w * (sig.height / sig.width || 0.4), 18);
        doc.addImage(sig.dataUrl, "PNG", margin + 2, y, w, h);
        doc.setDrawColor(180, 180, 180);
        doc.line(margin + 2, y + h + 1, margin + 2 + w, y + h + 1);
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        doc.text("Assinatura do recebedor", margin + 2, y + h + 4);
        doc.setTextColor(60, 60, 60);
        y += h + 7;
      }
    }
    y += 4;
  });

  // ── Motorista ─────────────────────────────────────────────
  if (trip) {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Motorista: ${trip.driver_name || "—"}  |  Caminhão: ${trip.truck_plate || "—"}`, margin, y);
    y += 5;
    if (trip.arrival_date) {
      doc.text(`Data de entrega: ${new Date(trip.arrival_date).toLocaleString("pt-BR")}`, margin, y);
      y += 5;
    }
    doc.setTextColor(60, 60, 60);
  }

  // ── Assinatura ────────────────────────────────────────────
  const sigY = Math.max(y + 10, 230);
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, sigY, margin + 75, sigY);
  doc.line(W / 2 + 5, sigY, W / 2 + 80, sigY);
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("Assinatura do destinatário", margin, sigY + 4);
  doc.text("Assinatura do motorista", W / 2 + 5, sigY + 4);
  doc.setFontSize(7);
  doc.text("CPF: ___________________", margin, sigY + 9);

  // ── Rodapé ────────────────────────────────────────────────
  const docH = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} | ${company?.company_name || "Velox Transportadora"}`,
    W / 2, docH - 8,
    { align: "center" }
  );

  return doc.output("blob");
}
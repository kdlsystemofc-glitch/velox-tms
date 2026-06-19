import jsPDF from "jspdf";

/**
 * Gera um "Documento interno de transporte" (espelho / pré-CT-e) em PDF.
 * NÃO é documento fiscal — é o espelho dos dados que comporiam o CT-e,
 * útil para o motorista levar e para o CD. A emissão fiscal (SEFAZ) é fase futura.
 *
 * @param {object} order   pedido completo
 * @param {object} company CompanySettings
 * @returns {Blob}
 */
export function generateShipmentDoc(order, company = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 15;
  let y = 14;

  const money = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const line = () => { doc.setDrawColor(210); doc.line(M, y, W - M, y); y += 5; };
  const label = (k, v, x = M, w = 90) => {
    doc.setFontSize(7); doc.setTextColor(120); doc.text(k.toUpperCase(), x, y);
    doc.setFontSize(9); doc.setTextColor(20); doc.text(String(v || "—"), x, y + 4, { maxWidth: w });
  };

  // Cabeçalho
  doc.setFillColor(27, 36, 48); doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255); doc.setFontSize(13); doc.setFont(undefined, "bold");
  doc.text(company.company_name || "Velox Transportadora", M, 10);
  doc.setFontSize(8); doc.setFont(undefined, "normal");
  doc.text("DOCUMENTO INTERNO DE TRANSPORTE (espelho / pré-CT-e)", M, 16);
  doc.setFontSize(9); doc.setFont(undefined, "bold");
  doc.text(order.protocol || "", W - M, 12, { align: "right" });
  y = 30;

  doc.setFillColor(255, 244, 214); doc.setDrawColor(240, 200, 100);
  doc.rect(M, y - 4, W - 2 * M, 7, "FD");
  doc.setTextColor(150, 100, 0); doc.setFontSize(7.5);
  doc.text("SEM VALOR FISCAL — não substitui o CT-e. Apenas espelho operacional dos dados de transporte.", W / 2, y, { align: "center" });
  doc.setTextColor(20); y += 9;

  // Emitente + datas
  label("Emitente (transportadora)", company.company_name, M, 90);
  label("CNPJ", company.cnpj, M + 95, 80);
  y += 11; line();

  // Remetente
  doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(60);
  doc.text("REMETENTE / COLETA", M, y); y += 5; doc.setFont(undefined, "normal");
  label("Cliente", order.client_name, M, 90);
  label("CNPJ/CPF", order.client_cpf_cnpj, M + 95, 80);
  y += 11;
  const o = order.origin || {};
  label("Endereço de coleta", [o.street, o.number, o.neighborhood, o.city, o.state, o.cep].filter(Boolean).join(", "), M, W - 2 * M);
  y += 11; line();

  // Destinatários + cargas
  doc.setFontSize(8); doc.setFont(undefined, "bold"); doc.setTextColor(60);
  doc.text("DESTINATÁRIOS E CARGAS", M, y); y += 5; doc.setFont(undefined, "normal"); doc.setTextColor(20);

  (order.recipients || []).forEach((r, ri) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(9); doc.setFont(undefined, "bold");
    doc.text(`${ri + 1}. ${r.name || "Destinatário"}`, M, y);
    doc.setFont(undefined, "normal"); doc.setFontSize(8); doc.setTextColor(110);
    doc.text(`${r.cnpj_cpf || ""}  ${[r.street, r.number, r.city, r.state, r.cep].filter(Boolean).join(", ")}`, M, y + 4, { maxWidth: W - 2 * M });
    doc.setTextColor(20); y += 9;

    const items = r.items || [];
    if (items.length) {
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text("NF", M, y); doc.text("DESCRIÇÃO", M + 22, y); doc.text("VOL", W - 70, y, { align: "right" });
      doc.text("PESO", W - 48, y, { align: "right" }); doc.text("VALOR", W - M, y, { align: "right" });
      doc.setTextColor(20); y += 4;
      items.forEach(it => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(8);
        doc.text(String(it.nf_number || "—"), M, y);
        doc.text(String(it.description || "—").slice(0, 40), M + 22, y);
        doc.text(String(it.volumes || 0), W - 70, y, { align: "right" });
        doc.text(`${it.weight_kg || 0} kg`, W - 48, y, { align: "right" });
        doc.text(money(it.declared_value), W - M, y, { align: "right" });
        y += 4.5;
      });
    } else {
      doc.setFontSize(8); doc.setTextColor(120);
      doc.text("(coleta simplificada — NFs vinculadas posteriormente)", M, y); doc.setTextColor(20); y += 4.5;
    }
    y += 3;
  });

  line();
  // Totais + frete
  label("Total volumes", order.total_volumes, M, 40);
  label("Peso total", `${(order.total_weight_kg || 0).toLocaleString("pt-BR")} kg`, M + 45, 40);
  label("Valor declarado", money(order.total_declared_value), M + 95, 50);
  y += 11;
  doc.setFont(undefined, "bold"); doc.setFontSize(10);
  doc.text(`Frete: ${money(order.freight_value)}  ·  ${order.freight_payer === "fob" ? "FOB (destinatário paga)" : "CIF (remetente paga)"}`, M, y);
  doc.setFont(undefined, "normal");
  y += 10;

  doc.setFontSize(7); doc.setTextColor(140);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} — ${company.company_name || "Velox"}`, M, 288);

  return doc.output("blob");
}

export default generateShipmentDoc;

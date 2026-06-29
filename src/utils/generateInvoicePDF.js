import jsPDF from "jspdf";
import { formatDateBR } from "@/utils/dateUtils";

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

/**
 * Gera a FATURA em PDF (Blob). Cabeçalho da empresa, dados da fatura/cliente,
 * tabela de linhas (pedidos faturados) e total.
 * @param {object} invoice - fatura (number, client_name, issue_date, due_date, total, lines[], status)
 * @param {object} company - CompanySettings
 */
export function generateInvoicePDF(invoice, company = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, margin = 14;
  let y = 14;

  // Cabeçalho
  doc.setFillColor(37, 99, 235); // azul Velox
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15); doc.setFont("helvetica", "bold");
  doc.text(company?.company_name || "Velox Transportadora", margin, 11);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  if (company?.cnpj) doc.text(`CNPJ: ${company.cnpj}`, margin, 17);
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("FATURA", W - margin, 12, { align: "right" });
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(invoice.number || "—", W - margin, 18, { align: "right" });
  y = 32;

  // Dados da fatura / cliente
  doc.setTextColor(40, 40, 40); doc.setFontSize(10);
  doc.setFont("helvetica", "bold"); doc.text("Cliente", margin, y);
  doc.setFont("helvetica", "normal"); doc.text(invoice.client_name || "—", margin, y + 5);
  doc.setFont("helvetica", "bold"); doc.text("Emissão", W - margin - 50, y);
  doc.setFont("helvetica", "normal"); doc.text(formatDateBR(invoice.issue_date), W - margin - 50, y + 5);
  doc.setFont("helvetica", "bold"); doc.text("Vencimento", W - margin, y, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.text(formatDateBR(invoice.due_date), W - margin, y + 5, { align: "right" });
  y += 16;

  // Cabeçalho da tabela
  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y, W - margin * 2, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
  doc.text("Protocolo", margin + 2, y + 5.5);
  doc.text("Descrição", margin + 40, y + 5.5);
  doc.text("Valor", W - margin - 2, y + 5.5, { align: "right" });
  y += 11;

  // Linhas
  doc.setFont("helvetica", "normal"); doc.setTextColor(40, 40, 40);
  (invoice.lines || []).forEach((l) => {
    if (y > 270) { doc.addPage(); y = 18; }
    doc.text(String(l.protocol || "—"), margin + 2, y);
    doc.text(String(l.description || "Frete"), margin + 40, y);
    doc.text(brl(l.amount), W - margin - 2, y, { align: "right" });
    y += 6;
  });

  // Total
  y += 2;
  doc.setDrawColor(200); doc.line(margin, y, W - margin, y); y += 7;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text("TOTAL", margin + 2, y);
  doc.text(brl(invoice.total), W - margin - 2, y, { align: "right" });

  // Rodapé
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(`Status: ${invoice.status === "paid" ? "Paga" : invoice.status === "cancelled" ? "Cancelada" : "Em aberto"}`, margin, 288);
  if (invoice.notes) doc.text(String(invoice.notes).slice(0, 120), margin, 292);

  return doc.output("blob");
}

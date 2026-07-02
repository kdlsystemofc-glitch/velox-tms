/**
 * Modelo isomórfico de documentos (Projeto 08.2).
 *
 * Fonte ÚNICA do CONTEÚDO de cada documento, sem dependência de browser (jsPDF)
 * nem de servidor (pdf-lib) — só dados puros. É consumido pela Edge Function
 * (render server-side, Deno + pdf-lib) e pode ser reusado no cliente. Assim a
 * definição do que entra em cada documento fica num lugar só e é testável.
 *
 * Modelo genérico: { type, title, docNumber, banner, company, meta[], blocks[], footer }
 *   blocks: heading | fields | table | total | labels
 */

const brl = (n) => `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const dateBR = (d) => {
  if (!d) return "—";
  const dt = typeof d === "string" && d.length === 10 ? new Date(d + "T12:00:00") : new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("pt-BR");
};
const addr = (a = {}) => [a.street, a.number, a.neighborhood, a.city, a.state, a.cep].filter(Boolean).join(", ");
const companyOf = (c = {}) => ({ name: c.company_name || "Velox Transportadora", cnpj: c.cnpj || "", address: c.address || "" });

function buildInvoice({ invoice, company }) {
  const inv = invoice || {};
  return {
    type: "invoice", title: "FATURA", docNumber: inv.number || "—", banner: null, company: companyOf(company),
    meta: [
      { label: "Cliente", value: inv.client_name || "—" },
      { label: "Emissão", value: dateBR(inv.issue_date) },
      { label: "Vencimento", value: dateBR(inv.due_date) },
    ],
    blocks: [
      { kind: "table",
        columns: [{ label: "Protocolo" }, { label: "Descrição" }, { label: "Valor", align: "right" }],
        rows: (inv.lines || []).map((l) => [String(l.protocol || "—"), String(l.description || "Frete"), brl(l.amount)]) },
      { kind: "total", label: "TOTAL", value: brl(inv.total) },
    ],
    footer: `Status: ${inv.status === "paid" ? "Paga" : inv.status === "cancelled" ? "Cancelada" : "Em aberto"}${inv.notes ? " · " + String(inv.notes).slice(0, 120) : ""}`,
  };
}

function buildReceipt({ order, trip, company }) {
  const o = order || {};
  const rows = (o.recipients || []).map((r) => [r.name || "—", r.city || "—",
    String((r.items || []).reduce((s, it) => s + (Number(it.volumes) || 0), 0)),
    `${(r.items || []).reduce((s, it) => s + (Number(it.weight_kg) || 0), 0)} kg`]);
  return {
    type: "receipt", title: "COMPROVANTE DE ENTREGA", docNumber: o.protocol || "—", banner: null, company: companyOf(company),
    meta: [
      { label: "Protocolo", value: o.protocol || "—" },
      { label: "CT-e", value: o.cte_number || "—" },
      { label: "Cliente", value: o.client_name || "—" },
      { label: "Coleta", value: dateBR(o.collection_date) },
    ],
    blocks: [
      { kind: "heading", text: "Destinatários" },
      { kind: "table", columns: [{ label: "Destinatário" }, { label: "Cidade" }, { label: "Vol.", align: "right" }, { label: "Peso", align: "right" }], rows },
      { kind: "fields", items: [
        { label: "Motorista", value: trip?.driver_name || "—" },
        { label: "Caminhão", value: trip?.truck_plate || "—" },
        { label: "Entrega", value: trip?.arrival_date ? new Date(trip.arrival_date).toLocaleString("pt-BR") : "—" },
      ] },
      { kind: "heading", text: "Recebido por (nome / assinatura / data): _______________________________________" },
    ],
    footer: `Gerado em ${new Date().toLocaleString("pt-BR")}`,
  };
}

function buildShipment({ order, company }) {
  const o = order || {};
  const blocks = [
    { kind: "fields", items: [
      { label: "Cliente", value: o.client_name || "—" },
      { label: "CNPJ/CPF", value: o.client_cpf_cnpj || "—" },
      { label: "Coleta", value: addr(o.origin) || "—" },
    ] },
    { kind: "heading", text: "Destinatários e cargas" },
  ];
  (o.recipients || []).forEach((r, i) => {
    blocks.push({ kind: "heading", text: `${i + 1}. ${r.name || "Destinatário"} — ${[r.city, r.state].filter(Boolean).join("/")}` });
    blocks.push({ kind: "table",
      columns: [{ label: "NF" }, { label: "Descrição" }, { label: "Vol.", align: "right" }, { label: "Peso", align: "right" }, { label: "Valor", align: "right" }],
      rows: (r.items || []).map((it) => [String(it.nf_number || "—"), String(it.description || "—").slice(0, 40),
        String(it.volumes || 0), `${it.weight_kg || 0} kg`, brl(it.declared_value)]) });
  });
  blocks.push({ kind: "fields", items: [
    { label: "Total volumes", value: String(o.total_volumes || 0) },
    { label: "Peso total", value: `${(o.total_weight_kg || 0).toLocaleString("pt-BR")} kg` },
    { label: "Valor declarado", value: brl(o.total_declared_value) },
  ] });
  blocks.push({ kind: "total", label: `Frete (${o.freight_payer === "fob" ? "FOB" : "CIF"})`, value: brl(o.freight_value) });
  return {
    type: "shipment", title: "DOCUMENTO INTERNO DE TRANSPORTE", docNumber: o.protocol || "—",
    banner: "SEM VALOR FISCAL — espelho operacional (pré-CT-e). Não substitui o CT-e.",
    company: companyOf(company), meta: [{ label: "Protocolo", value: o.protocol || "—" }], blocks,
    footer: `Gerado em ${new Date().toLocaleString("pt-BR")}`,
  };
}

function manifestRows(orders) {
  return (orders || []).map((o) => {
    let nfs = 0, vol = 0, kg = 0;
    (o.recipients || []).forEach((r) => (r.items || []).forEach((i) => { if (i.nf_number) nfs++; vol += Number(i.volumes) || 0; kg += Number(i.weight_kg) || 0; }));
    const cities = (o.recipients || []).map((r) => r.city).filter(Boolean).join(", ");
    return [String(o.protocol || "—"), cities || "—", String(nfs), String(vol), `${kg} kg`];
  });
}
const manifestCols = [{ label: "Protocolo" }, { label: "Cidades" }, { label: "NFs", align: "right" }, { label: "Vol.", align: "right" }, { label: "Peso", align: "right" }];

function buildTripManifest({ trip, orders, company }) {
  const t = trip || {};
  return {
    type: "trip_manifest", title: "ROMANEIO DE VIAGEM", docNumber: t.truck_plate || "—", banner: null, company: companyOf(company),
    meta: [
      { label: "Motorista", value: t.driver_name || "—" },
      { label: "Placa", value: t.truck_plate || "—" },
      { label: "Saída", value: t.departure_date ? new Date(t.departure_date).toLocaleString("pt-BR") : "—" },
      { label: "Pedidos", value: String((t.order_ids || []).length) },
    ],
    blocks: [{ kind: "table", columns: manifestCols, rows: manifestRows(orders) }],
    footer: "Motorista: __________________________    Conferente: __________________________",
  };
}

function buildTransferManifest({ transfer, orders, company }) {
  const t = transfer || {};
  return {
    type: "transfer_manifest", title: "MANIFESTO DE TRANSFERÊNCIA", docNumber: t.protocol || "—", banner: null, company: companyOf(company),
    meta: [
      { label: "Origem", value: t.from_branch_name || "—" },
      { label: "Destino", value: t.to_branch_name || "—" },
      { label: "Veículo", value: t.truck_plate || "—" },
      { label: "Motorista", value: t.driver_name || "—" },
    ],
    blocks: [{ kind: "table", columns: manifestCols, rows: manifestRows(orders) }],
    footer: "Expedição: __________________________    Recebimento: __________________________",
  };
}

function buildLabels({ order, company }) {
  const o = order || {};
  const items = [];
  const recipients = o.recipients || [];
  if (recipients.length) {
    recipients.forEach((r) => {
      const vols = (r.items || []).reduce((s, it) => s + (Number(it.volumes) || 0), 0) || 1;
      for (let v = 1; v <= vols; v++) {
        items.push({ badge: `${v}/${vols}`, lines: [o.protocol || "—", r.name || "—", [r.city, r.state].filter(Boolean).join("/"), `Rem: ${(o.client_name || "").slice(0, 28)}`] });
      }
    });
  } else {
    const tv = Number(o.total_volumes) || 1;
    for (let v = 1; v <= tv; v++) items.push({ badge: `${v}/${tv}`, lines: [o.protocol || "—", "—", "", `Rem: ${(o.client_name || "").slice(0, 28)}`] });
  }
  return {
    type: "labels", title: "ETIQUETAS DE VOLUME", docNumber: o.protocol || "—", banner: null, company: companyOf(company),
    meta: [], blocks: [{ kind: "labels", items }], footer: null,
  };
}

const BUILDERS = {
  invoice: buildInvoice,
  receipt: buildReceipt,
  shipment: buildShipment,
  trip_manifest: buildTripManifest,
  transfer_manifest: buildTransferManifest,
  labels: buildLabels,
};

/**
 * @param {string} type  invoice|receipt|shipment|trip_manifest|transfer_manifest|labels
 * @param {object} data  entidades necessárias (invoice/order/trip/transfer/orders/company)
 * @returns modelo normalizado do documento
 */
export function buildDocumentModel(type, data = {}) {
  const fn = BUILDERS[type];
  if (!fn) throw new Error(`Tipo de documento desconhecido: ${type}`);
  return fn(data);
}

export const DOCUMENT_TYPES = Object.keys(BUILDERS);

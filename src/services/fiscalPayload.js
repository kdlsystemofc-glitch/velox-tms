/**
 * Builder de payload fiscal (Projeto 09.2) — provider-AGNÓSTICO.
 *
 * Mapeia pedido/viagem + empresa + tarifa (snapshot do P03) para um modelo de
 * dados de CT-e/MDF-e. É a fonte única do CONTEÚDO fiscal, pura e testável; o
 * adaptador do provedor (quando existir) traduz este modelo para o schema do
 * provedor. NÃO calcula tributos definitivos (isso é do provedor/SEFAZ) — carrega
 * os dados do documento. Nenhuma emissão acontece aqui.
 */

const digits = (s) => String(s || "").replace(/\D/g, "");
const addr = (a = {}) => ({
  street: a.street || "", number: a.number || "", district: a.neighborhood || "",
  city: a.city || "", state: a.state || "", cep: digits(a.cep),
});

function emitenteOf(company = {}) {
  return {
    cnpj: digits(company.cnpj),
    ie: company.ie || "",
    name: company.company_name || "Velox Transportadora",
    crt: company.crt || "",           // 1=Simples, 3=Regime normal…
    rntrc: company.rntrc || "",
    address: company.address || "",
  };
}

/**
 * CT-e (Conhecimento de Transporte) a partir de um pedido.
 * @returns modelo { kind:'cte', environment, emitente, tomador, remetente, destinatario, valores, carga, refNFe, observacoes }
 */
export function buildCTePayload({ order = {}, company = {}, environment = "homologacao" } = {}) {
  const recipients = order.recipients || [];
  const dest = recipients[0] || {};
  // Tomador do serviço: CIF → remetente paga; FOB → destinatário paga.
  const tomador = order.freight_payer === "fob" ? "destinatario" : "remetente";
  // Frete: prioriza o snapshot congelado (P03); senão o freight_value.
  const freight = Number(order.freight_breakdown?.snapshot_freight_value ?? order.freight_breakdown?.total ?? order.freight_value) || 0;
  // Chaves de NF-e vinculadas (das quais a carga é composta).
  const refNFe = recipients.flatMap((r) => (r.items || []))
    .map((it) => digits(it.nf_key)).filter((k) => k.length === 44);

  return {
    kind: "cte",
    environment,
    emitente: emitenteOf(company),
    tomador,
    remetente: { name: order.client_name || "", cnpjCpf: digits(order.client_cpf_cnpj), address: addr(order.origin) },
    destinatario: { name: dest.name || "", cnpjCpf: digits(dest.cnpj_cpf), address: addr(dest) },
    valores: {
      total: Number(freight.toFixed(2)),
      receber: Number(freight.toFixed(2)),
      // Tributos simplificados — o provedor/SEFAZ calcula o definitivo.
      icms: { cst: company.crt === "1" ? "90" : "00", base: 0, aliquota: 0, valor: 0 },
    },
    carga: {
      valorCarga: Number(order.total_declared_value) || 0,
      produto: dest.items?.[0]?.description || "Carga geral",
      pesoKg: Number(order.total_weight_kg) || 0,
      volumes: Number(order.total_volumes) || 0,
    },
    refNFe,
    observacoes: order.general_notes || "",
  };
}

/**
 * MDF-e (Manifesto de Documentos Fiscais) a partir de uma viagem + pedidos.
 * @returns modelo { kind:'mdfe', environment, emitente, veiculo, condutor, ufIni, ufFim, documentos, totais }
 */
export function buildMDFePayload({ trip = {}, orders = [], company = {}, environment = "homologacao" } = {}) {
  const totalKg = orders.reduce((s, o) => s + (Number(o.total_weight_kg) || 0), 0);
  const totalCarga = orders.reduce((s, o) => s + (Number(o.total_declared_value) || 0), 0);
  const ufIni = orders[0]?.origin?.state || "";
  const ufFim = (orders[orders.length - 1]?.recipients || [])[0]?.state || ufIni;
  // Documentos vinculados: chaves de CT-e ou NF-e por pedido.
  const documentos = orders.map((o) => ({
    order_id: o.id,
    protocol: o.protocol || "",
    cte: o.cte_number || null,
    nfeKeys: (o.recipients || []).flatMap((r) => (r.items || [])).map((it) => digits(it.nf_key)).filter((k) => k.length === 44),
  }));

  return {
    kind: "mdfe",
    environment,
    emitente: emitenteOf(company),
    veiculo: { placa: trip.truck_plate || "", rntrc: company.rntrc || "" },
    condutor: { name: trip.driver_name || "", cpf: digits(trip.driver_cpf) },
    ufIni, ufFim,
    documentos,
    totais: { pesoKg: Number(totalKg.toFixed(3)), valorCarga: Number(totalCarga.toFixed(2)), qDoc: documentos.length },
  };
}

export function buildFiscalPayload(kind, data) {
  if (kind === "cte") return buildCTePayload(data);
  if (kind === "mdfe") return buildMDFePayload(data);
  throw new Error(`Tipo fiscal desconhecido: ${kind}`);
}

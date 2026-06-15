/**
 * VELOX — Parser de XML da NF-e (client-side, sem dependências/serviços externos).
 * Extrai os campos úteis para pré-preencher um pedido a partir do XML da nota.
 *
 * Estrutura padrão NF-e (namespace http://www.portalfiscal.inf.br/nfe):
 *   infNFe@Id = "NFe" + chave(44) · ide/nNF · dest/* · transp/vol/* · total/ICMSTot/*
 */

function txt(parent, tag) {
  if (!parent) return "";
  const el = parent.getElementsByTagName(tag)[0];
  return el ? (el.textContent || "").trim() : "";
}

function num(parent, tag) {
  const v = txt(parent, tag).replace(",", ".");
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/**
 * @param {string} xmlString
 * @returns {object|null} { nf_key, nf_number, recipient, item, totals } ou null se inválido
 */
export function parseNFeXML(xmlString) {
  try {
    const doc = new DOMParser().parseFromString(xmlString, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) return null;

    const infNFe = doc.getElementsByTagName("infNFe")[0];
    if (!infNFe) return null;

    // Chave de acesso (Id = "NFe" + 44 dígitos)
    const rawId = infNFe.getAttribute("Id") || "";
    const nf_key = rawId.replace(/\D/g, "").slice(-44);

    const ide = infNFe.getElementsByTagName("ide")[0];
    const nf_number = txt(ide, "nNF");

    // Destinatário
    const dest = infNFe.getElementsByTagName("dest")[0];
    const ender = dest ? dest.getElementsByTagName("enderDest")[0] : null;
    const recipient = {
      name: txt(dest, "xNome"),
      cnpj_cpf: txt(dest, "CNPJ") || txt(dest, "CPF"),
      phone: txt(dest, "fone"),
      cep: txt(ender, "CEP"),
      street: txt(ender, "xLgr"),
      number: txt(ender, "nro"),
      complement: txt(ender, "xCpl"),
      neighborhood: txt(ender, "xBairro"),
      city: txt(ender, "xMun"),
      state: txt(ender, "UF"),
    };

    // Transporte / volumes
    const transp = infNFe.getElementsByTagName("transp")[0];
    const vols = transp ? Array.from(transp.getElementsByTagName("vol")) : [];
    let volumes = 0, pesoB = 0, especie = "";
    vols.forEach(v => {
      volumes += parseInt(txt(v, "qVol") || "0", 10) || 0;
      pesoB += num(v, "pesoB");
      if (!especie) especie = txt(v, "esp");
    });

    // Totais
    const total = infNFe.getElementsByTagName("ICMSTot")[0];
    const vNF = num(total, "vNF");

    // Descrição: primeira mercadoria (ou genérica)
    const prods = Array.from(infNFe.getElementsByTagName("prod"));
    const firstDesc = prods.length ? txt(prods[0], "xProd") : "";
    const description = prods.length > 1
      ? `${firstDesc} e mais ${prods.length - 1} item(ns)`
      : firstDesc || `Mercadoria NF ${nf_number}`;
    const ncm = prods.length ? txt(prods[0], "NCM") : "";

    return {
      nf_key,
      nf_number,
      recipient,
      item: {
        nf_number,
        nf_key,
        ncm,
        description,
        package_type: (especie || "").toLowerCase().includes("pal") ? "palete" : "caixa",
        volumes: volumes || 1,
        weight_kg: pesoB ? Number(pesoB.toFixed(2)) : "",
        declared_value: vNF ? Number(vNF.toFixed(2)) : "",
      },
      totals: { volumes, weight_kg: pesoB, declared_value: vNF, items: prods.length },
    };
  } catch {
    return null;
  }
}

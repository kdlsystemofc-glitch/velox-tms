/**
 * Serviço de tarifa versionada (Projeto 03.2).
 *
 * Resolvedor PURO no cliente — espelha `resolve_tariff_payload` do banco. Escolhe
 * a versão vigente para uma data e devolve seu payload (mesmo formato de
 * `company_settings.pricing`), com FALLBACK ao JSON legado quando não há versão
 * (fallback read-through, decisão do Projeto 03). O motor de frete não muda:
 * continua recebendo um objeto `pricing` simples — só que agora vindo de uma versão.
 */

/** Chave canônica de uma tarifa por escopo. */
export function tariffKey(scope, scopeKey) {
  return `${scope}:${scopeKey ?? ""}`;
}

// Índice de tarifas vigentes, publicado por useCompanySettings no carregamento.
// quoteFreight lê daqui para resolver a tarifa do CLIENTE por data (mesmo padrão
// do settingsCache em módulo). Null = sem versões carregadas → fallback total.
let _tariffIndex = null;
export function setTariffIndex(index) { _tariffIndex = index; }
export function getTariffIndex() { return _tariffIndex; }

/**
 * Constrói um índice `${scope}:${key}` → [versões] a partir de uma lista plana de
 * tariff_versions já com { scope, scope_key } (via join na leitura).
 */
export function buildTariffIndex(versions) {
  const index = {};
  for (const v of versions || []) {
    const k = tariffKey(v.scope, v.scope_key);
    (index[k] || (index[k] = [])).push(v);
  }
  return index;
}

/**
 * Escolhe a versão vigente para a data: entre as ativas e dentro da vigência,
 * a de maior `version_no`. Retorna null se nenhuma se aplica.
 */
export function resolveTariffVersion(versions, refDate) {
  if (!Array.isArray(versions) || versions.length === 0) return null;
  const date = refDate || new Date().toISOString().slice(0, 10);
  const inEffect = (v) => {
    if (v.status && v.status !== "active") return false;
    if (v.valid_from && date < v.valid_from) return false;
    if (v.valid_until && date > v.valid_until) return false;
    return true;
  };
  const applicable = versions.filter(inEffect);
  if (applicable.length === 0) return null;
  return applicable.reduce((best, v) =>
    (Number(v.version_no) || 0) > (Number(best.version_no) || 0) ? v : best);
}

/**
 * Payload de tarifa vigente para (scope, key), com fallback ao JSON legado.
 * @param index    saída de buildTariffIndex (pode ser null → sempre fallback)
 * @param fallback objeto de preço legado a usar quando não há versão vigente
 */
export function resolveTariffPayload(index, scope, scopeKey, refDate, fallback = null) {
  const v = resolveTariffVersion(index?.[tariffKey(scope, scopeKey)], refDate);
  return v ? v.payload : fallback;
}

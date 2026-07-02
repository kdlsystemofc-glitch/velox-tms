import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { buildTariffIndex, resolveTariffPayload, resolveTariffVersion, tariffKey, setTariffIndex } from '@/services/tariff';

let settingsCache = null;

export function resetSettingsCache() {
  settingsCache = null;
  setTariffIndex(null);
}

/**
 * Sobrepõe as tarifas VERSIONADAS (Projeto 03.3) sobre o settings legado, com
 * fallback read-through: se não houver versão para um escopo, mantém o JSON atual.
 * Publica o índice para o quoteFreight resolver a tarifa do cliente por data.
 * Tolerante a falhas — se as tabelas ainda não existem ou o usuário é anônimo
 * (RLS staff), a leitura falha em silêncio e tudo cai no legado.
 */
async function overlayTariffs(settings) {
  let versions = [];
  try {
    const { data, error } = await supabase
      .from('tariff_versions')
      .select('version_no, payload, valid_from, valid_until, status, tariff_tables!inner(scope, scope_key, active)')
      .eq('status', 'active');
    if (error) throw error;
    versions = (data || [])
      .filter((v) => v.tariff_tables?.active)
      .map((v) => ({ ...v, scope: v.tariff_tables.scope, scope_key: v.tariff_tables.scope_key }));
  } catch {
    setTariffIndex(null);
    return settings; // sem versões → fallback total ao JSON legado
  }

  const index = buildTariffIndex(versions);
  setTariffIndex(index);

  const today = new Date().toISOString().slice(0, 10);
  const merged = { ...settings };

  // Tabela padrão versionada > pricing legado
  const defPayload = resolveTariffPayload(index, 'default', null, today, null);
  if (defPayload) merged.pricing = defPayload;

  // Corredores: o JSON legado é a fonte de EXISTÊNCIA (mantido em sync a cada
  // save; exclusões persistem); a versão vigente governa o CONTEÚDO por corredor.
  // Mescla por chave — nunca ressuscita um corredor removido.
  const legacyRoutes = settings.route_pricing || [];
  merged.route_pricing = legacyRoutes.map((r) => {
    if (!r.origin_state || !r.dest_state) return r;
    const versioned = resolveTariffVersion(index[tariffKey('route', `${r.origin_state}-${r.dest_state}`)], today)?.payload;
    return versioned || r;
  });

  return merged;
}

const SETTINGS_DEFAULTS = {
  hero_title: 'Sua carga, no prazo certo.',
  hero_subtitle: 'Transporte de cargas com segurança e pontualidade.',
  company_name: 'Velox Transportadora',
  phone: '',
  email: '',
  whatsapp: '',
  cnpj: '',
  address: '',
  region: '',
  social_instagram: '',
  social_linkedin: '',
  social_facebook: '',
  about_text: '',
  mission: '',
  values: '',
  fleet_photo_url: '',
  coverage_type: 'none',
  coverage_states: [],
  coverage_cities: [],
  coverage_cep_ranges: [],
  working_days: [1, 2, 3, 4, 5],
  min_advance_days: 2,
  pricing: {},
  delivery_days_table: [],
  route_pricing: [],
  google_maps_api_key: '',
};

export function useCompanySettings() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['company_settings'],
    queryFn: async () => {
      if (settingsCache) return settingsCache;
      // Autenticado lê a linha completa (RLS de autenticados); anônimo recebe null
      // pela RLS e cai no subconjunto seguro via RPC public_settings (Cfg-1).
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) { settingsCache = await overlayTariffs(data); return settingsCache; }
      const { data: pub } = await supabase.rpc('public_settings');
      settingsCache = pub || {};
      return settingsCache;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10,
  });

  // Nunca retorna undefined — usa defaults enquanto carrega ou se não houver registro
  const settings = { ...SETTINGS_DEFAULTS, ...(data || {}) };

  return { settings, isLoading, error };
}

export default useCompanySettings;

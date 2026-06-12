import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';

let settingsCache = null;

export function resetSettingsCache() {
  settingsCache = null;
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
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      settingsCache = data || {};
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

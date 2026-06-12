import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';

let settingsCache = null;

export function resetSettingsCache() {
  settingsCache = null;
}

export function useCompanySettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
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

  return { settings, isLoading, error };
}

export default useCompanySettings;

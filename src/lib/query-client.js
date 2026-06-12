import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 1000 * 60 * 2,   // 2 min — evita refetch desnecessário
			gcTime:    1000 * 60 * 10,  // 10 min — mantém cache na memória
		},
	},
});
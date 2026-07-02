import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

/**
 * Realtime (Projeto 05.2): assina postgres_changes das tabelas informadas e
 * INVALIDA as queries do react-query correspondentes — substituindo o polling
 * curto por push. Mantém-se um refetchInterval longo de fallback nas telas, então
 * se o Realtime não estiver disponível/habilitado, a tela ainda atualiza.
 *
 * @param {string[]} tables    tabelas a observar (ex.: ["orders","trips"])
 * @param {Array}    queryKeys chaves de query a invalidar (string ou array)
 *
 * A RLS de cada tabela vale no Realtime — cada usuário só recebe o que pode ler.
 */
export function useRealtime(tables, queryKeys) {
  const queryClient = useQueryClient();
  // Serializa as deps para não re-assinar a cada render (arrays mudam de identidade).
  const tablesKey = JSON.stringify(tables);
  const queryKeysKey = JSON.stringify(queryKeys);

  useEffect(() => {
    const list = JSON.parse(tablesKey);
    const keys = JSON.parse(queryKeysKey);
    if (!list.length) return undefined;

    const channel = supabase.channel(`rt:${list.join("-")}:${Math.random().toString(36).slice(2)}`);
    for (const table of list) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        for (const k of keys) {
          queryClient.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] });
        }
      });
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tablesKey, queryKeysKey, queryClient]);
}

export default useRealtime;

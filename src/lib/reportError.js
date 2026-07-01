/**
 * VELOX — Ponto único de reporte de erros.
 * Hoje: registra no console. Amanhã: se você carregar o Sentry (script + DSN),
 * ele é encaminhado automaticamente — sem precisar mexer no código.
 */
export function reportError(error, context = {}) {
  try {

    console.error("[Velox]", error, context);
    if (typeof window !== "undefined" && window.Sentry?.captureException) {
      window.Sentry.captureException(error, { extra: context });
    }
    // Persiste no banco (observabilidade cost-free) — best-effort, sem await.
    persistError(error, context);
  } catch {
    /* nunca deixe o reporter quebrar o app */
  }
}

async function persistError(error, context) {
  try {
    // Import dinâmico para não acoplar o reporter à camada de dados.
    const { supabase } = await import("@/api/supabaseClient");
    await supabase.rpc("log_client_error", {
      p_message: String(error?.message || error || "erro").slice(0, 1000),
      p_stack: String(error?.stack || context?.componentStack || "").slice(0, 6000),
      p_url: typeof window !== "undefined" ? window.location.pathname : null,
    });
  } catch {
    /* silencioso */
  }
}

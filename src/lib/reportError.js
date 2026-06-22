/**
 * VELOX — Ponto único de reporte de erros.
 * Hoje: registra no console. Amanhã: se você carregar o Sentry (script + DSN),
 * ele é encaminhado automaticamente — sem precisar mexer no código.
 */
export function reportError(error, context = {}) {
  try {
    // eslint-disable-next-line no-console
    console.error("[Velox]", error, context);
    if (typeof window !== "undefined" && window.Sentry?.captureException) {
      window.Sentry.captureException(error, { extra: context });
    }
  } catch {
    /* nunca deixe o reporter quebrar o app */
  }
}

// VELOX — preferência de tema do ADMIN (claro/escuro). Padrão: ESCURO (Open TMS).
// O escuro vale APENAS para o painel admin — o site público e o app do motorista
// têm identidade própria. Por isso a classe `dark` é aplicada no AdminLayout
// (não no <html>), e aqui só guardamos a preferência e avisamos quem ouve.
const KEY = "velox-theme";
const EVENT = "velox-theme-change";

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function setTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  try { localStorage.setItem(KEY, t); } catch { /* ignora */ }
  window.dispatchEvent(new Event(EVENT));
  return t;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}

/** Assina mudanças de tema. Retorna a função de cancelamento. */
export function onThemeChange(handler) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

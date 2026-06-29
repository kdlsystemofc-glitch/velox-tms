// VELOX — alternância de tema (claro/escuro). Padrão: ESCURO (padrão Open TMS).
// A aplicação inicial acontece no <script> de index.html (antes da pintura).
const KEY = "velox-theme";

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  try { localStorage.setItem(KEY, isDark ? "dark" : "light"); } catch { /* ignora */ }
  return isDark ? "dark" : "light";
}

export function toggleTheme() {
  return applyTheme(getTheme() === "dark" ? "light" : "dark");
}

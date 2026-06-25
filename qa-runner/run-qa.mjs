#!/usr/bin/env node
/**
 * VELOX TMS — Runner de QA por IA (navegador-only / anti-trapaça).
 *
 * O que isto faz: sobe um agente Claude que tem acesso APENAS a:
 *   - ferramentas de navegador (Playwright MCP): navegar, clicar, digitar,
 *     ler a página, tirar screenshot;
 *   - leitura de arquivos do repo (para ler o roteiro e o mapa da simulação).
 *
 * O que ele NÃO tem (bloqueado de propósito — é o que impede a trapaça da
 * rodada anterior, que rodava por SQL): Bash, escrita de arquivos, fetch/HTTP
 * direto, busca web. Sem isso, o ÚNICO jeito de mexer no sistema é pela tela.
 *
 * Saída: evidências (screenshots) em ./reports/artifacts e o relatório final
 * (formato §0.3 do roteiro) em ./reports/qa-report-<timestamp>.md.
 */
import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const reportsDir = join(__dirname, "reports");
const artifactsDir = join(reportsDir, "artifacts");
mkdirSync(artifactsDir, { recursive: true });

// ── 1) Credenciais e parâmetros (de variáveis de ambiente / .env) ──
const env = process.env;
const cfg = {
  url: env.VELOX_URL || "https://velox-tms.vercel.app",
  adminEmail: env.ADMIN_EMAIL || "",
  adminPassword: env.ADMIN_PASSWORD || "",
  // Operador e motorista são CRIADOS pelo agente. Estas são as credenciais que
  // ele deve usar ao criar; em branco = o agente inventa e reporta.
  operatorEmail: env.OPERATOR_EMAIL || "operador.qa@velox.teste",
  operatorPassword: env.OPERATOR_PASSWORD || "(escolha uma senha forte e informe no relatório)",
  driverEmail: env.DRIVER_EMAIL || "motorista.qa@velox.teste",
  driverPassword: env.DRIVER_PASSWORD || "(escolha uma senha forte e informe no relatório)",
  mapsKey: env.GOOGLE_MAPS_API_KEY || "(não fornecida — registre como bloqueio e teste o fallback por CEP)",
  maxTurns: Number(env.MAX_TURNS || 1500),
  model: env.QA_MODEL || "claude-opus-4-8",
};

const missing = [];
if (!env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
if (!cfg.adminEmail) missing.push("ADMIN_EMAIL");
if (!cfg.adminPassword) missing.push("ADMIN_PASSWORD");
if (missing.length) {
  console.error(`\n✖ Faltam variáveis obrigatórias: ${missing.join(", ")}`);
  console.error("  Copie qa-runner/.env.example para .env e preencha. Veja o README.\n");
  process.exit(1);
}

// ── 2) Monta o prompt a partir do template, injetando credenciais ──
const promptTemplate = readFileSync(join(__dirname, "prompt.md"), "utf8");
const prompt = promptTemplate
  .replaceAll("{{VELOX_URL}}", cfg.url)
  .replaceAll("{{ADMIN_EMAIL}}", cfg.adminEmail)
  .replaceAll("{{ADMIN_PASSWORD}}", cfg.adminPassword)
  .replaceAll("{{OPERATOR_EMAIL}}", cfg.operatorEmail)
  .replaceAll("{{OPERATOR_PASSWORD}}", cfg.operatorPassword)
  .replaceAll("{{DRIVER_EMAIL}}", cfg.driverEmail)
  .replaceAll("{{DRIVER_PASSWORD}}", cfg.driverPassword)
  .replaceAll("{{GOOGLE_MAPS_API_KEY}}", cfg.mapsKey)
  .replaceAll("{{ARTIFACTS_DIR}}", artifactsDir.replace(/\\/g, "/"));

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
console.log(`\n▶ Velox QA runner — alvo: ${cfg.url}`);
console.log(`  modelo: ${cfg.model} · maxTurns: ${cfg.maxTurns}`);
console.log(`  evidências: ${artifactsDir}\n`);

// ── 3) Executa o agente navegador-only ──
const response = query({
  prompt,
  options: {
    cwd: repoRoot,
    model: cfg.model,
    permissionMode: "bypassPermissions", // headless autônomo
    settingSources: [],                   // ignora settings do repo
    maxTurns: cfg.maxTurns,
    // 🔒 ANTI-TRAPAÇA: remove tudo que não seja navegador/leitura.
    // Sem Bash/Write/WebFetch/WebSearch o agente NÃO consegue tocar no banco,
    // rodar scripts, nem chamar a API direto — só a interface renderizada.
    disallowedTools: [
      "Bash", "Write", "Edit", "MultiEdit", "NotebookEdit",
      "WebFetch", "WebSearch", "Task", "KillShell", "Glob", "Grep",
    ],
    // Playwright MCP = único caminho para o sistema. Screenshots vão p/ artifacts.
    mcpServers: {
      playwright: {
        command: "npx",
        args: [
          "-y", "@playwright/mcp@latest",
          "--headless",
          "--viewport-size", "1280,900",
          "--output-dir", artifactsDir,
        ],
      },
    },
  },
});

// ── 4) Streaming + captura do relatório final ──
let finalText = "";
try {
  for await (const msg of response) {
    if (msg.type === "assistant") {
      for (const block of msg.message?.content || []) {
        if (block.type === "text" && block.text) process.stdout.write(block.text);
        else if (block.type === "tool_use") process.stdout.write(`\n  · [${block.name}]\n`);
      }
    } else if (msg.type === "result") {
      if (msg.subtype === "success" && msg.result) finalText = msg.result;
      const cost = typeof msg.total_cost_usd === "number" ? `$${msg.total_cost_usd.toFixed(2)}` : "?";
      console.log(`\n\n— sessão encerrada — turns: ${msg.num_turns ?? "?"} · custo: ${cost}`);
    }
  }
} catch (e) {
  console.error("\n✖ Erro durante a execução:", e?.message || e);
}

const reportPath = join(reportsDir, `qa-report-${stamp}.md`);
writeFileSync(reportPath, finalText || "(o agente não retornou um relatório final — veja o log acima)", "utf8");
console.log(`\n✔ Relatório salvo em: ${reportPath}`);
console.log(`✔ Screenshots/evidências em: ${artifactsDir}\n`);

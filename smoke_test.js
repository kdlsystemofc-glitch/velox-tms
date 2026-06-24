import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const url = 'https://velox-tms.vercel.app';
const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

const routes = [
  '/admin',
  '/admin/coletas',
  '/admin/coletas/nova',
  '/admin/cotacao',
  '/admin/despacho',
  '/admin/replanejamento',
  '/admin/ocorrencias',
  '/admin/transferencias',
  '/admin/viagens',
  '/admin/viagens/nova',
  '/admin/frota',
  '/admin/cadastros',
  '/admin/documentos',
  '/admin/mensagens',
  '/admin/alertas',
  '/admin/financeiro',
  '/admin/indicadores',
  '/admin/usuarios',
  '/admin/config'
];

async function run() {
  console.log('Iniciando o teste de fumaça...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const networkErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text });
    if (type === 'error') {
      console.error(`[CONSOLE ERROR] ${text}`);
    }
  });

  page.on('pageerror', err => {
    consoleLogs.push({ type: 'pageerror', text: err.message });
    console.error(`[PAGE UNCAUGHT ERROR] ${err.message}`);
  });

  page.on('requestfailed', request => {
    const failure = request.failure();
    networkErrors.push({ url: request.url(), error: failure ? failure.errorText : 'unknown' });
    console.error(`[REQUEST FAILED] ${request.url()} - ${failure ? failure.errorText : 'unknown'}`);
  });

  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push({ url: response.url(), status, text: response.statusText() });
      console.error(`[HTTP ERROR] ${response.url()} returned status ${status}`);
    }
  });

  // Login
  console.log('Navegando para o login...');
  await page.goto(`${url}/login`);
  await page.waitForLoadState('networkidle');

  console.log('Preenchendo credenciais...');
  // Find email and password inputs
  await page.fill('input[type="email"], input[placeholder="seu@email.com"]', email);
  await page.fill('input[type="password"], input[placeholder="••••••••"]', pass);
  
  console.log('Clicando no botão de Entrar...');
  await Promise.all([
    page.click('button:has-text("Entrar"), button[type="submit"]'),
    page.waitForURL(/.*\/admin.*/, { timeout: 15000 }).catch(e => console.log('Timeout esperando redirecionamento do login'))
  ]);

  await page.waitForTimeout(3000);
  console.log(`URL atual após login: ${page.url()}`);

  const resultsDir = path.join(process.cwd(), 'smoke_test_screenshots');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  // Navigate each route
  for (const route of routes) {
    console.log(`\nNavegando para: ${route}`);
    try {
      await page.goto(`${url}${route}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Allow any local state/rendering to finish
      
      const screenshotPath = path.join(resultsDir, `${route.replace(/\//g, '_')}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`Página carregada e screenshot salvo em: ${screenshotPath}`);
    } catch (e) {
      console.error(`Erro ao navegar para ${route}: ${e.message}`);
    }
  }

  await browser.close();
  
  // Write reports
  fs.writeFileSync('console_logs.json', JSON.stringify(consoleLogs, null, 2));
  fs.writeFileSync('network_errors.json', JSON.stringify(networkErrors, null, 2));
  console.log('\n--- Teste de fumaça concluído! ---');
  console.log(`Total de logs de console capturados: ${consoleLogs.length}`);
  console.log(`Total de erros de rede capturados: ${networkErrors.length}`);
}

run().catch(console.error);

import { chromium } from 'playwright';

const url = 'http://localhost:3000';
const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  console.log('Iniciando o navegador para depurar erro local...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
  });

  page.on('pageerror', err => {
    console.error('--- ERRO DETECTADO NA PÁGINA ---');
    console.error(err.stack || err.message);
    console.error('--------------------------------');
  });

  // Login
  console.log('Navegando para o login local...');
  await page.goto(`${url}/login`);
  await page.waitForLoadState('networkidle');

  console.log('Preenchendo credenciais...');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  
  console.log('Clicando no botão de Entrar...');
  await Promise.all([
    page.click('button:has-text("Entrar")'),
    page.waitForURL(/.*\/admin.*/, { timeout: 15000 }).catch(e => console.log('Timeout esperando redirecionamento do login'))
  ]);

  await page.waitForTimeout(3000);
  console.log(`URL atual após login: ${page.url()}`);

  console.log('\n--- Navegando para /admin/coletas/nova ---');
  try {
    await page.goto(`${url}/admin/coletas/nova`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    console.log(`URL final /admin/coletas/nova: ${page.url()}`);
    const content = await page.textContent('body');
    console.log(`Texto na página /admin/coletas/nova:\n${content}\n`);
  } catch (e) {
    console.error(`Erro ao navegar para /admin/coletas/nova: ${e.message}`);
  }

  console.log('\n--- Navegando para /admin/viagens/nova ---');
  try {
    await page.goto(`${url}/admin/viagens/nova`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    console.log(`URL final /admin/viagens/nova: ${page.url()}`);
    const content = await page.textContent('body');
    console.log(`Texto na página /admin/viagens/nova:\n${content}\n`);
  } catch (e) {
    console.error(`Erro ao navegar para /admin/viagens/nova: ${e.message}`);
  }

  await browser.close();
}

run().catch(console.error);

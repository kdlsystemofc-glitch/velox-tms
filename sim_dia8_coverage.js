/**
 * DIA 8 — Teste de cobertura por CEP no site público
 * Abre /agendar e testa CEPs cobertos vs não-cobertos
 */
import { chromium } from 'playwright';

const url = 'http://localhost:3000';

async function run() {
  console.log('=== DIA 8 — Teste de Cobertura por CEP ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleLogs = [];
  const networkErrors = [];
  const findings = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleLogs.push(msg.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({ url: response.url(), status: response.status() });
    }
  });

  // Navigate to booking form
  console.log('Navegando para /agendar...');
  await page.goto(`${url}/agendar`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Take screenshot of initial state
  await page.screenshot({ path: 'smoke_test_screenshots/dia8_agendar_initial.png' });
  console.log('Screenshot capturada: dia8_agendar_initial.png');

  // The booking form has step-by-step. We need to:
  // 1. Fill step 1 (Dados do Solicitante) minimally
  // 2. Advance to step 2 (Origem da Coleta) where the CEP field is
  // 3. Test different CEPs

  // Step 1: Fill minimal solicitor data
  console.log('\nPreenchendo Passo 1 (Dados do Solicitante)...');
  try {
    // Try to find and fill required fields
    const nameInput = await page.$('input[placeholder*="nome"], input[placeholder*="Nome"], input[placeholder*="razão"]');
    if (nameInput) {
      await nameInput.fill('Teste QA Cobertura');
      console.log('  ✓ Nome preenchido');
    }

    const responsavelInput = await page.$('input[placeholder*="solicitando"], input[placeholder*="Responsável"]');
    if (responsavelInput) {
      await responsavelInput.fill('QA Tester');
      console.log('  ✓ Responsável preenchido');
    }

    const phoneInput = await page.$('input[placeholder*="(00)"], input[placeholder*="telefone"]');
    if (phoneInput) {
      await phoneInput.fill('(11) 99999-9999');
      console.log('  ✓ Telefone preenchido');
    }

    const emailInput = await page.$('input[placeholder*="seu@email.com"], input[placeholder*="E-mail"]');
    if (emailInput) {
      await emailInput.fill('tester@velox.com.br');
      console.log('  ✓ E-mail preenchido');
    }

    // Try to advance to step 2
    const nextBtn = await page.$('button:has-text("Avançar"), button:has-text("Próximo"), button:has-text("Continuar")');
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      
      // Verify that we are on step 2
      const step2Header = await page.$('h3:has-text("Origem da Coleta")');
      if (step2Header) {
        console.log('  ✓ Avançou para Passo 2 com sucesso!');
      } else {
        console.log('  ❌ Falhou em avançar para Passo 2 (não encontrou cabeçalho)');
      }
    }
  } catch (e) {
    console.log('  ⚠ Erro preenchendo passo 1:', e.message);
  }

  await page.screenshot({ path: 'smoke_test_screenshots/dia8_step2.png' });

  // Step 2: Test CEP coverage
  const testCases = [
    { cep: '05422-000', label: 'Grande SP (Pinheiros)', expected: 'aceito' },
    { cep: '13010-111', label: 'Campinas/RMC', expected: 'aceito' },
    { cep: '14010-000', label: 'Ribeirão Preto (fora)', expected: 'bloqueado' },
    { cep: '10000-000', label: 'Buraco entre faixas', expected: 'bloqueado' },
  ];

  console.log('\n--- Testando CEPs ---');
  for (const tc of testCases) {
    console.log(`\nTestando CEP ${tc.cep} (${tc.label}) — esperado: ${tc.expected}`);
    try {
      // Find CEP input on the current step
      const cepInput = await page.$('input[placeholder*="00000-000"], input[placeholder*="CEP"], input[name*="cep"]');
      if (cepInput) {
        await cepInput.fill('');
        await cepInput.fill(tc.cep);
        await page.waitForTimeout(2000); // Wait for ViaCEP autofill + coverage check

        // Check for coverage warning/block
        const pageContent = await page.textContent('body');
        const hasBlockMessage = pageContent.includes('não atendemos') || 
                                 pageContent.includes('Região não atendida') ||
                                 pageContent.includes('fora da área') ||
                                 pageContent.includes('No momento não');

        const result = hasBlockMessage ? 'bloqueado' : 'aceito';
        const passed = result === tc.expected;

        console.log(`  Resultado: ${result} — ${passed ? '✅ PASSOU' : '❌ FALHOU'}`);
        
        if (!passed) {
          findings.push({
            id: `COV-${tc.cep}`,
            title: `CEP ${tc.cep} deveria ser "${tc.expected}" mas foi "${result}"`,
            type: 'BUG',
            severity: 'ALTA',
            domain: 'Site Público / Agendar / /agendar',
          });
        }

        await page.screenshot({ path: `smoke_test_screenshots/dia8_cep_${tc.cep.replace('-','')}.png` });
      } else {
        console.log('  ⚠ Campo CEP não encontrado nesta etapa');
        
        // Try looking for CEP in destination fields instead
        const destCepInput = await page.$('input[placeholder*="01310"], input[placeholder*="destino"]');
        if (destCepInput) {
          console.log('  → Encontrado campo de CEP destino, tentando...');
          await destCepInput.fill('');
          await destCepInput.fill(tc.cep);
          await page.waitForTimeout(2000);
        }
      }
    } catch (e) {
      console.log(`  ⚠ Erro testando CEP ${tc.cep}:`, e.message);
    }
  }

  // Check for console errors
  console.log('\n--- Console Errors ---');
  if (consoleLogs.length > 0) {
    consoleLogs.forEach(l => console.log(`  [ERROR] ${l.substring(0, 200)}`));
    findings.push({
      id: 'COV-CONSOLE',
      title: `${consoleLogs.length} erro(s) de console durante teste de cobertura`,
      type: 'BUG',
      severity: 'MÉDIA',
    });
  } else {
    console.log('  Nenhum erro de console.');
  }

  // Check for network errors
  console.log('\n--- Network Errors ---');
  if (networkErrors.length > 0) {
    networkErrors.forEach(e => console.log(`  [${e.status}] ${e.url.substring(0, 100)}`));
  } else {
    console.log('  Nenhum erro de rede.');
  }

  console.log('\n=== RESUMO DIA 8 ===');
  console.log(`Achados: ${findings.length}`);
  findings.forEach(f => console.log(`  [${f.id}] ${f.title} (${f.type} / ${f.severity})`));

  await browser.close();
  console.log('\nDia 8 concluído.');
}

run().catch(console.error);

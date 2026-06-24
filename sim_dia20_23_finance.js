/**
 * DIAS 20-23 — Recebimentos, despesas fixas e batimento financeiro
 * 
 * Executa as seguintes operações no Supabase:
 * 1. Dia 20: Dá baixa (status: 'received', received_date: hoje) nas receitas dos pedidos:
 *    - VLX-2026-00001 (P01)
 *    - VLX-2026-00003 (P03)
 *    - VLX-2026-00006 (P06)
 *    - VLX-2026-00007 (P07)
 *    - VLX-2026-00008 (P08)
 * 2. Dia 21: Insere as despesas fixas do mês:
 *    - Salários: R$ 8.400,00 (pago, hoje)
 *    - Aluguel: R$ 3.500,00 (pago, hoje)
 *    - Seguro: R$ 1.200,00 (a pagar, hoje + 30 dias) -> Fornecedor "Protege Corretora de Seguros Ltda"
 *    - Manutenção: R$ 680,00 (a pagar, hoje + 25 dias) -> Fornecedor "DieselFix Centro Automotivo" e Caminhão "FRC-2B22"
 *    - Pneus: R$ 1.300,00 (a pagar, hoje + 40 dias) -> Fornecedor "PneuJá Comércio de Pneus" e Caminhão "FRC-3C33"
 *    - Impostos: R$ 200,10 (a pagar, hoje + 30 dias)
 * 3. Dia 23: Executa consultas para verificação final do DRE e batimento contábil.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';
const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  console.log('=== DIAS 20-23 — SIMULAÇÃO FINANCEIRA E DRE ===\n');

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  await supabase.auth.signInWithPassword({ email, password: pass });

  const today = new Date();
  const todayISO = today.toISOString();
  const todayDate = todayISO.slice(0, 10);

  const getFutureDateStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  // 1. DIA 20 — Recebimentos (baixa nas receitas dos pedidos à vista/pix)
  console.log('--- Dia 20: Baixando receitas à vista/pix ---');
  const paidProtocols = [
    'VLX-2026-00001', // P01
    'VLX-2026-00003', // P03
    'VLX-2026-00006', // P06
    'VLX-2026-00007', // P07
    'VLX-2026-00008', // P08
  ];

  // Fetch all orders
  const { data: orders, error: oErr } = await supabase.from('orders').select('*');
  if (oErr) throw oErr;

  // Fetch all revenues
  const { data: revenues, error: rErr } = await supabase.from('revenues').select('*');
  if (rErr) throw rErr;

  let paidCount = 0;
  for (const protocol of paidProtocols) {
    const order = orders.find(o => o.protocol === protocol);
    if (!order) {
      console.warn(`  ✗ Pedido ${protocol} não encontrado no banco.`);
      continue;
    }

    const revenue = revenues.find(r => r.order_id === order.id);
    if (!revenue) {
      console.warn(`  ✗ Receita para o pedido ${protocol} não encontrada.`);
      continue;
    }

    const { error: updateErr } = await supabase.from('revenues').update({
      status: 'received',
      received_date: todayDate
    }).eq('id', revenue.id);

    if (updateErr) {
      console.error(`  ✗ Falha ao baixar receita ${protocol}: ${updateErr.message}`);
    } else {
      console.log(`  ✓ Receita ${protocol} baixada como RECEBIDO (R$ ${Number(revenue.amount).toFixed(2)})`);
      paidCount++;
    }
  }
  console.log(`Total de receitas baixadas: ${paidCount}/${paidProtocols.length}\n`);

  // 2. DIA 21 — Cadastro de despesas fixas
  console.log('--- Dia 21: Cadastrando despesas fixas ---');

  // Fetch suppliers, trucks, and drivers to get their UUIDs
  const { data: suppliers, error: sErr } = await supabase.from('suppliers').select('*');
  if (sErr) throw sErr;
  const { data: trucks, error: tErr } = await supabase.from('trucks').select('*');
  if (tErr) throw tErr;

  const protege = suppliers.find(s => s.name?.includes('Protege'));
  const dieselfix = suppliers.find(s => s.name?.includes('DieselFix') || s.name?.includes('Mecânica') || s.name?.includes('Centro Automotivo'));
  const pneuja = suppliers.find(s => s.name?.includes('PneuJá') || s.name?.includes('Distribuidora') || s.name?.includes('Comércio de Pneus'));

  const truck2B22 = trucks.find(t => t.plate === 'FRC-2B22');
  const truck3C33 = trucks.find(t => t.plate === 'FRC-3C33');

  console.log('Dados encontrados para vínculo de despesas:');
  console.log(`  Protege Corretora: ${protege ? 'OK' : 'NÃO ENCONTRADA'}`);
  console.log(`  DieselFix: ${dieselfix ? 'OK' : 'NÃO ENCONTRADA'}`);
  console.log(`  PneuJá: ${pneuja ? 'OK' : 'NÃO ENCONTRADA'}`);
  console.log(`  Caminhão FRC-2B22: ${truck2B22 ? 'OK' : 'NÃO ENCONTRADO'}`);
  console.log(`  Caminhão FRC-3C33: ${truck3C33 ? 'OK' : 'NÃO ENCONTRADO'}\n`);

  const fixedExpenses = [
    {
      category: 'salaries',
      description: 'Folha — 3 motoristas',
      amount: 8400.00,
      status: 'paid',
      date: todayDate,
      due_date: todayDate,
      paid_date: todayDate,
      payment_method: 'pix',
      cost_center: 'Administrativo'
    },
    {
      category: 'rent',
      description: 'Galpão cross-docking',
      amount: 3500.00,
      status: 'paid',
      date: todayDate,
      due_date: todayDate,
      paid_date: todayDate,
      payment_method: 'pix',
      cost_center: 'Administrativo'
    },
    {
      category: 'insurance',
      description: 'Parcela seguro da frota',
      amount: 1200.00,
      status: 'pending',
      date: todayDate,
      due_date: getFutureDateStr(30),
      supplier_id: protege?.id,
      cost_center: 'Frota'
    },
    {
      category: 'maintenance',
      description: 'Revisão FRC-2B22',
      amount: 680.00,
      status: 'pending',
      date: todayDate,
      due_date: getFutureDateStr(25),
      supplier_id: dieselfix?.id,
      truck_id: truck2B22?.id,
      cost_center: 'Manutenção'
    },
    {
      category: 'tires',
      description: '2 pneus FRC-3C33',
      amount: 1300.00,
      status: 'pending',
      date: todayDate,
      due_date: getFutureDateStr(40),
      supplier_id: pneuja?.id,
      truck_id: truck3C33?.id,
      cost_center: 'Manutenção'
    },
    {
      category: 'taxes',
      description: 'Simples/ISS do período',
      amount: 200.10,
      status: 'pending',
      date: todayDate,
      due_date: getFutureDateStr(30),
      cost_center: 'Administrativo'
    }
  ];

  for (const exp of fixedExpenses) {
    const { error: insErr } = await supabase.from('expenses').insert([exp]);
    if (insErr) {
      console.error(`  ✗ Erro ao criar despesa [${exp.category}] "${exp.description}": ${insErr.message}`);
    } else {
      console.log(`  ✓ Despesa "${exp.description}" criada com sucesso (R$ ${exp.amount.toFixed(2)})`);
    }
  }

  // 3. DIA 23 — Verificação final e DRE contábil
  console.log('\n--- Dia 23: Batimento Financeiro Contábil (DRE) ---');

  // Re-fetch all revenues and expenses
  const { data: finalRevenues } = await supabase.from('revenues').select('*');
  const { data: finalExpenses } = await supabase.from('expenses').select('*');

  const activeRevenues = finalRevenues.filter(r => r.status !== 'cancelled');
  const totalRevenues = activeRevenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const receivedRevenues = activeRevenues.filter(r => r.status === 'received').reduce((sum, r) => sum + Number(r.amount), 0);
  const receivableRevenues = activeRevenues.filter(r => r.status === 'receivable' || r.status === 'overdue').reduce((sum, r) => sum + Number(r.amount), 0);

  const totalExpenses = finalExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const paidExpenses = finalExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingExpenses = finalExpenses.filter(e => e.status === 'pending' || e.status === 'installment').reduce((sum, e) => sum + Number(e.amount), 0);

  // Direct costs (fuel + assistant helper) vs fixed costs
  // Let's filter direct costs from trip closure
  const directExpenses = finalExpenses.filter(e => e.category === 'fuel' || e.description?.includes('Ajudante'));
  const totalDirect = directExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  console.log('\n=== DRE CONTÁBIL (REGIME DE COMPETÊNCIA) ===');
  console.log(`Receita Bruta Ativa (14 pedidos): R$ ${totalRevenues.toFixed(2)}  (Esperado: R$ 3.335,00)`);
  console.log(`(-) Custos Diretos (Combustível + Ajudante): R$ ${totalDirect.toFixed(2)}`);
  console.log(`(=) Margem de Contribuição: R$ ${(totalRevenues - totalDirect).toFixed(2)} (Margem: ${((totalRevenues - totalDirect) / totalRevenues * 100).toFixed(1)}%)`);
  console.log(`(-) Custos Fixos / Outras Despesas: R$ ${(totalExpenses - totalDirect).toFixed(2)}`);
  console.log(`(=) RESULTADO LÍQUIDO DO PERÍODO: R$ ${(totalRevenues - totalExpenses).toFixed(2)}`);

  console.log('\n=== FLUXO DE CAIXA (REGIME DE CAIXA) ===');
  console.log(`Entradas (Receitas recebidas): R$ ${receivedRevenues.toFixed(2)}  (Esperado: R$ 1.322,00)`);
  console.log(`Saídas (Despesas pagas): R$ ${paidExpenses.toFixed(2)}`);
  console.log(`(=) SALDO LÍQUIDO DE CAIXA: R$ ${(receivedRevenues - paidExpenses).toFixed(2)}`);

  console.log('\n=== DETALHE DE CONTAS A RECEBER E A PAGAR ===');
  console.log(`Contas a Receber (Aging aberto): R$ ${receivableRevenues.toFixed(2)}  (Esperado: R$ 2.013,00)`);
  console.log(`Contas a Pagar: R$ ${pendingExpenses.toFixed(2)}  (Esperado: R$ 3.380,10)`);
}

run().catch(console.error);

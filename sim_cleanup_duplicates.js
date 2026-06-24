/**
 * sim_cleanup_duplicates.js
 * Deleta despesas e ocorrências duplicadas geradas pela execução duplicada dos scripts de simulação.
 * Deixa exatamente 1 despesa de combustível para cada placa, 1 despesa de ajudante e 1 ocorrência para o P04.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';
const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  console.log('=== LIMPANDO DUPLICATAS DA SIMULAÇÃO ===\n');

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  await supabase.auth.signInWithPassword({ email, password: pass });

  // 1. Limpar despesas de combustível duplicadas
  const { data: fuelExpenses, error: fErr } = await supabase
    .from('expenses')
    .select('id, description, amount, created_at')
    .eq('category', 'fuel');
  if (fErr) throw fErr;

  const fuelGroups = {};
  for (const exp of fuelExpenses) {
    if (!fuelGroups[exp.description]) {
      fuelGroups[exp.description] = [];
    }
    fuelGroups[exp.description].push(exp);
  }

  for (const desc in fuelGroups) {
    const list = fuelGroups[desc];
    if (list.length > 1) {
      // Sort by created_at ascending (keep the first, delete others)
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const keep = list[0];
      const toDelete = list.slice(1);
      console.log(`Combustível "${desc}": mantendo id ${keep.id}, deletando ${toDelete.length} duplicata(s)...`);
      for (const d of toDelete) {
        const { error: delErr } = await supabase.from('expenses').delete().eq('id', d.id);
        if (delErr) console.error(`  ✗ Erro: ${delErr.message}`);
        else console.log(`  ✓ Deletada id ${d.id}`);
      }
    }
  }

  // 2. Limpar despesa de ajudante duplicada
  const { data: otherExpenses, error: oErr } = await supabase
    .from('expenses')
    .select('id, description, amount, created_at')
    .eq('category', 'other')
    .ilike('description', '%Ajudante%');
  if (oErr) throw oErr;

  if (otherExpenses.length > 1) {
    otherExpenses.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const keep = otherExpenses[0];
    const toDelete = otherExpenses.slice(1);
    console.log(`Despesa ajudante: mantendo id ${keep.id}, deletando ${toDelete.length} duplicata(s)...`);
    for (const d of toDelete) {
      const { error: delErr } = await supabase.from('expenses').delete().eq('id', d.id);
      if (delErr) console.error(`  ✗ Erro: ${delErr.message}`);
      else console.log(`  ✓ Deletada id ${d.id}`);
    }
  }

  // 3. Limpar ocorrências duplicadas para P04
  const { data: orders } = await supabase.from('orders').select('id').eq('protocol', 'VLX-2026-00004');
  if (orders && orders.length > 0) {
    const p04Id = orders[0].id;
    const { data: incidents, error: iErr } = await supabase
      .from('incidents')
      .select('id, type, created_at')
      .eq('order_id', p04Id);
    if (iErr) throw iErr;

    if (incidents.length > 1) {
      incidents.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const keep = incidents[0];
      const toDelete = incidents.slice(1);
      console.log(`Ocorrências P04: mantendo id ${keep.id}, deletando ${toDelete.length} duplicata(s)...`);
      for (const d of toDelete) {
        const { error: delErr } = await supabase.from('incidents').delete().eq('id', d.id);
        if (delErr) console.error(`  ✗ Erro: ${delErr.message}`);
        else console.log(`  ✓ Deletada id ${d.id}`);
      }
    }
  }

  console.log('\n=== RE-VERIFICANDO BATIMENTO APÓS LIMPEZA ===');
  // Re-run the verification queries
  const { data: finalRevenues } = await supabase.from('revenues').select('*');
  const { data: finalExpenses } = await supabase.from('expenses').select('*');

  const activeRevenues = finalRevenues.filter(r => r.status !== 'cancelled');
  const totalRevenues = activeRevenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const receivedRevenues = activeRevenues.filter(r => r.status === 'received').reduce((sum, r) => sum + Number(r.amount), 0);
  const receivableRevenues = activeRevenues.filter(r => r.status === 'receivable' || r.status === 'overdue').reduce((sum, r) => sum + Number(r.amount), 0);

  const totalExpenses = finalExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const paidExpenses = finalExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0);
  const pendingExpenses = finalExpenses.filter(e => e.status === 'pending' || e.status === 'installment').reduce((sum, e) => sum + Number(e.amount), 0);

  const directExpenses = finalExpenses.filter(e => e.category === 'fuel' || e.description?.includes('Ajudante'));
  const totalDirect = directExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  console.log('\n=== DRE CONTÁBIL (REGIME DE COMPETÊNCIA) ===');
  console.log(`Receita Bruta Ativa (14 pedidos): R$ ${totalRevenues.toFixed(2)}  (Esperado: R$ 3.335,00)`);
  console.log(`(-) Custos Diretos (Combustível + Ajudante): R$ ${totalDirect.toFixed(2)}  (Esperado: R$ 1.310,00)`);
  console.log(`(=) Margem de Contribuição: R$ ${(totalRevenues - totalDirect).toFixed(2)} (Margem: ${((totalRevenues - totalDirect) / totalRevenues * 100).toFixed(1)}%)  (Esperado: R$ 2.025,00)`);
  console.log(`(-) Custos Fixos / Outras Despesas: R$ ${(totalExpenses - totalDirect).toFixed(2)}  (Esperado: R$ 15.280,10)`);
  console.log(`(=) RESULTADO LÍQUIDO DO PERÍODO: R$ ${(totalRevenues - totalExpenses).toFixed(2)}  (Esperado: -R$ 13.255,10)`);

  console.log('\n=== FLUXO DE CAIXA (REGIME DE CAIXA) ===');
  console.log(`Entradas (Receitas recebidas): R$ ${receivedRevenues.toFixed(2)}  (Esperado: R$ 1.322,00)`);
  console.log(`Saídas (Despesas pagas): R$ ${paidExpenses.toFixed(2)}  (Esperado: R$ 13.210,00)`);
  console.log(`(=) SALDO LÍQUIDO DE CAIXA: R$ ${(receivedRevenues - paidExpenses).toFixed(2)}  (Esperado: -R$ 11.888,00)`);
}

run().catch(console.error);

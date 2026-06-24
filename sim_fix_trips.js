/**
 * FIX: Encerrar 3 viagens + criar despesas de combustível + ajudante
 * Uses correct column names based on schema inspection
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';
const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  console.log('=== FIX — Encerrar viagens e criar despesas ===\n');
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  await supabase.auth.signInWithPassword({ email, password: pass });

  const today = new Date().toISOString();
  const todayDate = today.slice(0, 10);

  // Fetch all trips
  const { data: trips } = await supabase.from('trips').select('*');
  const { data: trucks } = await supabase.from('trucks').select('*');
  const { data: drivers } = await supabase.from('drivers').select('*');
  const { data: orders } = await supabase.from('orders').select('*');

  console.log(`Viagens encontradas: ${trips.length}`);

  const routeConfig = [
    { plate: 'FRC-1A11', kmFinal: 120, fuelCost: 180.00 },
    { plate: 'FRC-2B22', kmFinal: 160, fuelCost: 270.00 },
    { plate: 'FRC-3C33', kmFinal: 400, fuelCost: 620.00 },
  ];

  for (const trip of trips) {
    const config = routeConfig.find(r => r.plate === trip.truck_plate);
    if (!config) continue;

    console.log(`\nEncerrando viagem ${trip.truck_plate} (${trip.id.slice(0,8)})...`);

    // Close the trip with correct column names
    const { error: closeError } = await supabase.from('trips').update({
      status: 'completed',
      real_km: config.kmFinal,
      fuel_cost: config.fuelCost,
      tolls_cost: 0,
      total_cost: config.fuelCost,
      arrival_date: today,
      net_profit: trip.total_revenue - config.fuelCost,
    }).eq('id', trip.id);

    if (closeError) {
      console.error(`  ✗ Erro: ${closeError.message}`);
    } else {
      console.log(`  ✓ Viagem encerrada (Km: ${config.kmFinal}, Combustível: R$ ${config.fuelCost.toFixed(2)})`);
    }

    // Create fuel expense
    const truck = trucks.find(t => t.plate === trip.truck_plate);
    const { error: fuelErr } = await supabase.from('expenses').insert([{
      category: 'fuel',
      description: `Combustível — ${trip.truck_plate}`,
      amount: config.fuelCost,
      date: todayDate,
      status: 'paid',
      truck_id: truck?.id,
    }]);

    if (fuelErr) {
      console.error(`  ✗ Erro despesa combustível: ${fuelErr.message}`);
    } else {
      console.log(`  ✓ Despesa combustível R$ ${config.fuelCost.toFixed(2)}`);
    }
  }

  // Create ajudante expense for R3 (Cláudio)
  console.log('\nCriando despesa ajudante R3...');
  const claudio = drivers.find(d => d.name === 'Cláudio Souza');
  const { error: adjErr } = await supabase.from('expenses').insert([{
    category: 'other',
    description: 'Ajudante — rota R3 (interior)',
    amount: 240.00,
    date: todayDate,
    status: 'paid',
    driver_id: claudio?.id,
  }]);
  if (adjErr) {
    console.error(`  ✗ Erro: ${adjErr.message}`);
  } else {
    console.log(`  ✓ Despesa ajudante R$ 240,00`);
  }

  // Create incident for P04 (tentativa de entrega)
  console.log('\nCriando ocorrência para P04...');
  const p04 = orders.find(o => o.protocol === 'VLX-2026-00004');
  if (p04) {
    const { error: incErr } = await supabase.from('incidents').insert([{
      order_id: p04.id,
      type: 'tentativa_entrega',
      description: 'Destinatário ausente no local',
      status: 'open',
    }]);
    if (incErr) {
      console.error(`  ✗ Erro: ${incErr.message}`);
    } else {
      console.log(`  ✓ Ocorrência criada para P04`);
    }
  }

  // ── VERIFICAÇÃO FINAL ──
  console.log('\n--- Verificação final ---');
  const { data: finalTrips } = await supabase.from('trips').select('status, total_revenue, total_cost, net_profit, truck_plate');
  const completed = finalTrips.filter(t => t.status === 'completed');
  console.log(`Viagens concluídas: ${completed.length}/3`);
  completed.forEach(t => console.log(`  ${t.truck_plate}: Receita R$ ${t.total_revenue?.toFixed(2)} | Custo R$ ${t.total_cost?.toFixed(2)} | Lucro R$ ${t.net_profit?.toFixed(2)}`));

  const { data: expenses } = await supabase.from('expenses').select('category, description, amount, status');
  console.log(`\nDespesas criadas: ${expenses.length}`);
  let totalExpenses = 0;
  expenses.forEach(e => {
    console.log(`  [${e.category}] ${e.description}: R$ ${Number(e.amount).toFixed(2)} (${e.status})`);
    totalExpenses += Number(e.amount);
  });
  console.log(`Total despesas: R$ ${totalExpenses.toFixed(2)} (esperado: R$ 1.310,00 = 1.070 comb + 240 ajudante)`);

  const { data: incidents } = await supabase.from('incidents').select('type, description, status');
  console.log(`\nOcorrências: ${incidents.length}`);
  incidents.forEach(i => console.log(`  [${i.type}] ${i.description} (${i.status})`));
}

run().catch(console.error);

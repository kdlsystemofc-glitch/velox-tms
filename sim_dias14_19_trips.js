/**
 * DIAS 14-19 — Criar 3 viagens (R1, R2, R3), iniciar, concluir paradas, encerrar
 * 
 * R1: VUC FRC-1A11 + Antônio → P01, P03, P07, P11
 * R2: 3/4 FRC-2B22 + Beatriz → P02, P04, P06, P08, P09
 * R3: Toco FRC-3C33 + Cláudio → P12, P13, P14, P15, P16
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';
const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

const findings = [];

const ROUTES = [
  {
    name: 'R1',
    truckPlate: 'FRC-1A11',
    driverName: 'Antônio Ferreira',
    protocols: ['VLX-2026-00001', 'VLX-2026-00003', 'VLX-2026-00007', 'VLX-2026-00011'],
    receivers: { 'VLX-2026-00001': 'Marcos Aurélio', 'VLX-2026-00003': 'Pedro Henrique', 'VLX-2026-00007': 'Luiza Campos', 'VLX-2026-00011': 'Camila Reis' },
    kmFinal: 120,
    fuelCost: 180.00,
    tollCost: 0,
  },
  {
    name: 'R2',
    truckPlate: 'FRC-2B22',
    driverName: 'Beatriz Lima',
    protocols: ['VLX-2026-00002', 'VLX-2026-00004', 'VLX-2026-00006', 'VLX-2026-00008', 'VLX-2026-00009'],
    receivers: { 'VLX-2026-00002': 'Rogério Pinto', 'VLX-2026-00004': 'Tânia Melo', 'VLX-2026-00006': 'Evandro Dias', 'VLX-2026-00008': 'Ana Souza', 'VLX-2026-00009': 'Caio Tavares' },
    kmFinal: 160,
    fuelCost: 270.00,
    tollCost: 0,
    incident: { protocol: 'VLX-2026-00004', type: 'tentativa_entrega', description: 'Destinatário ausente no local' },
  },
  {
    name: 'R3',
    truckPlate: 'FRC-3C33',
    driverName: 'Cláudio Souza',
    protocols: ['VLX-2026-00012', 'VLX-2026-00013', 'VLX-2026-00014', 'VLX-2026-00015', 'VLX-2026-00016'],
    receivers: { 'VLX-2026-00012': 'Sueli Ramos', 'VLX-2026-00013': 'Renato Aguiar', 'VLX-2026-00014': 'Paula Furtado', 'VLX-2026-00015': 'Bruno Alves', 'VLX-2026-00016': 'Otávio Lopes' },
    kmFinal: 400,
    fuelCost: 620.00,
    tollCost: 0,
    extraExpense: { category: 'other', amount: 240.00, description: 'Ajudante — rota R3 (interior)', driver: 'Cláudio Souza' },
  },
];

async function run() {
  console.log('=== DIAS 14-19 — Criar Viagens, Executar e Encerrar ===\n');

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (authError) { console.error('Erro de autenticação:', authError.message); return; }
  console.log('Autenticado!\n');

  // Fetch all confirmed orders, trucks, drivers
  const { data: orders } = await supabase.from('orders').select('*');
  const { data: trucks } = await supabase.from('trucks').select('*');
  const { data: drivers } = await supabase.from('drivers').select('*');

  const today = new Date().toISOString();
  const todayDate = today.slice(0, 10);

  // ── DIA 15: Set FRC-3C33 to available (it was in 'maintenance') ──
  console.log('--- Dia 15: Liberando FRC-3C33 (Toco) ---');
  const toco = trucks.find(t => t.plate === 'FRC-3C33');
  if (toco) {
    if (toco.status === 'maintenance') {
      const { error } = await supabase.from('trucks').update({ status: 'available' }).eq('id', toco.id);
      if (error) {
        console.error('  ✗ Erro ao liberar Toco:', error.message);
        findings.push({ id: 'D15-TOCO', title: 'Falha ao mudar status do FRC-3C33 para available', type: 'BUG', severity: 'ALTA' });
      } else {
        console.log('  ✓ FRC-3C33 agora está Disponível');
      }
    } else {
      console.log(`  ℹ FRC-3C33 já está com status: ${toco.status}`);
    }
  }

  // ── DIA 15: Criar 3 viagens ──
  console.log('\n--- Dia 15: Criando 3 viagens ---');
  const createdTrips = [];

  for (const route of ROUTES) {
    const truck = trucks.find(t => t.plate === route.truckPlate);
    const driver = drivers.find(d => d.name === route.driverName);
    const routeOrders = route.protocols.map(p => orders.find(o => o.protocol === p)).filter(Boolean);

    if (!truck) { console.error(`  ✗ Caminhão ${route.truckPlate} não encontrado`); continue; }
    if (!driver) { console.error(`  ✗ Motorista ${route.driverName} não encontrado`); continue; }
    if (routeOrders.length !== route.protocols.length) {
      console.error(`  ✗ Nem todos os pedidos da ${route.name} foram encontrados (${routeOrders.length}/${route.protocols.length})`);
    }

    // Build stops
    const stops = [];
    routeOrders.forEach(o => {
      stops.push({
        type: 'collection',
        order_id: o.id,
        cep: o.origin?.cep || '',
        address: `${o.origin?.street || ''}, ${o.origin?.number || ''}, ${o.origin?.city || ''} - ${o.origin?.state || ''}`,
        city: o.origin?.city,
        state: o.origin?.state,
        status: 'pending',
      });
      (o.recipients || []).forEach(r => {
        stops.push({
          type: 'delivery',
          order_id: o.id,
          cep: r.cep || '',
          recipient_name: r.name,
          address: `${r.street || ''}, ${r.number || ''}, ${r.city || ''} - ${r.state || ''}`,
          city: r.city,
          state: r.state,
          status: 'pending',
        });
      });
    });

    const totalRevenue = routeOrders.reduce((s, o) => s + (o.freight_value || 0), 0);

    const tripData = {
      driver_id: driver.id,
      driver_name: driver.name,
      truck_id: truck.id,
      truck_plate: truck.plate,
      order_ids: routeOrders.map(o => o.id),
      order_protocols: routeOrders.map(o => o.protocol),
      status: 'planned',
      departure_date: today,
      stops,
      vehicles: [{ truck_id: truck.id, truck_plate: truck.plate, driver_id: driver.id, driver_name: driver.name }],
      total_revenue: totalRevenue,
      notes: `Rota ${route.name} — teste de simulação`,
    };

    const { data: trip, error: tripError } = await supabase.from('trips').insert([tripData]).select().single();
    if (tripError) {
      console.error(`  ✗ Erro ao criar viagem ${route.name}: ${tripError.message}`);
      findings.push({ id: `D15-TRIP-${route.name}`, title: `Falha ao criar viagem ${route.name}: ${tripError.message}`, type: 'BUG', severity: 'CRÍTICA' });
      continue;
    }

    console.log(`  ✓ Viagem ${route.name} criada (ID: ${trip.id.slice(0,8)}...) — ${routeOrders.length} pedidos, R$ ${totalRevenue.toFixed(2)}`);
    createdTrips.push({ ...route, tripId: trip.id, trip });

    // Link orders to trip
    for (const o of routeOrders) {
      await supabase.from('orders').update({ trip_id: trip.id, driver_id: driver.id, truck_id: truck.id }).eq('id', o.id);
    }
  }

  // ── DIA 16: Iniciar viagens ──
  console.log('\n--- Dia 16: Iniciando viagens ---');
  for (const ct of createdTrips) {
    // Update trip to in_progress
    const { error } = await supabase.from('trips').update({ status: 'in_progress' }).eq('id', ct.tripId);
    if (error) {
      console.error(`  ✗ Erro ao iniciar ${ct.name}: ${error.message}`);
      findings.push({ id: `D16-START-${ct.name}`, title: `Falha ao iniciar viagem ${ct.name}`, type: 'BUG', severity: 'ALTA' });
    } else {
      console.log(`  ✓ ${ct.name} iniciada`);
    }

    // Update truck status to on_route
    const truck = trucks.find(t => t.plate === ct.truckPlate);
    if (truck) {
      await supabase.from('trucks').update({ status: 'on_route' }).eq('id', truck.id);
    }

    // Update orders to 'collecting'
    const routeOrders = ct.protocols.map(p => orders.find(o => o.protocol === p)).filter(Boolean);
    for (const o of routeOrders) {
      await supabase.from('orders').update({
        status: 'collecting',
        status_history: [...(o.status_history || []), { status: 'collecting', timestamp: today, user: 'Admin', note: 'Viagem iniciada' }]
      }).eq('id', o.id);
    }
  }

  // ── DIAS 17-19: Concluir paradas e encerrar viagens ──
  console.log('\n--- Dias 17-19: Concluindo paradas e encerrando viagens ---');

  for (const ct of createdTrips) {
    console.log(`\n  [${ct.name}] Concluindo paradas...`);

    // Create incident for R2/P04 before completing
    if (ct.incident) {
      const incidentOrder = orders.find(o => o.protocol === ct.incident.protocol);
      if (incidentOrder) {
        const { error: incError } = await supabase.from('incidents').insert([{
          order_id: incidentOrder.id,
          type: ct.incident.type,
          description: ct.incident.description,
          status: 'open',
          created_by: 'Admin',
          created_at: today,
        }]);
        if (incError) {
          console.log(`    ⚠ Erro ao criar ocorrência para ${ct.incident.protocol}: ${incError.message}`);
          findings.push({ id: 'D18-INC', title: `Ocorrência não criada para P04`, type: 'BUG', severity: 'MÉDIA' });
        } else {
          console.log(`    ✓ Ocorrência criada para ${ct.incident.protocol}: ${ct.incident.description}`);
        }
      }
    }

    // Mark all orders as delivered
    const routeOrders = ct.protocols.map(p => orders.find(o => o.protocol === p)).filter(Boolean);
    for (const o of routeOrders) {
      const receiver = ct.receivers[o.protocol] || 'Recebedor';
      await supabase.from('orders').update({
        status: 'delivered',
        status_history: [...(o.status_history || []),
          { status: 'collecting', timestamp: today, user: 'Admin', note: 'Viagem iniciada' },
          { status: 'in_transit', timestamp: today, user: 'Admin', note: 'Em trânsito' },
          { status: 'delivered', timestamp: today, user: 'Admin', note: `Entregue — recebedor: ${receiver}` },
        ]
      }).eq('id', o.id);
      console.log(`    ✓ ${o.protocol} entregue (recebedor: ${receiver})`);
    }

    // Complete all stops
    const { data: tripData } = await supabase.from('trips').select('stops').eq('id', ct.tripId).single();
    if (tripData?.stops) {
      const updatedStops = tripData.stops.map(s => ({ ...s, status: 'completed' }));
      await supabase.from('trips').update({ stops: updatedStops }).eq('id', ct.tripId);
    }

    // Encerrar viagem
    console.log(`  [${ct.name}] Encerrando viagem...`);
    const closingData = {
      status: 'completed',
      km_final: ct.kmFinal,
      fuel_cost: ct.fuelCost,
      toll_cost: ct.tollCost,
      total_cost: ct.fuelCost + ct.tollCost,
      completed_at: today,
    };

    const { error: closeError } = await supabase.from('trips').update(closingData).eq('id', ct.tripId);
    if (closeError) {
      console.error(`  ✗ Erro ao encerrar ${ct.name}: ${closeError.message}`);
      findings.push({ id: `D17-CLOSE-${ct.name}`, title: `Falha ao encerrar viagem ${ct.name}: ${closeError.message}`, type: 'BUG', severity: 'ALTA' });
    } else {
      console.log(`  ✓ ${ct.name} encerrada (Km: ${ct.kmFinal}, Comb: R$ ${ct.fuelCost.toFixed(2)})`);
    }

    // Create fuel expense (the system does this automatically on encerrar, but since we're doing it via API we create manually)
    const truck = trucks.find(t => t.plate === ct.truckPlate);
    const { error: fuelExpError } = await supabase.from('expenses').insert([{
      category: 'fuel',
      description: `Combustível — ${ct.name} (${ct.truckPlate})`,
      amount: ct.fuelCost,
      date: todayDate,
      competence_date: todayDate,
      status: 'paid',
      payment_date: todayDate,
      payment_method: 'pix',
      truck_id: truck?.id,
    }]);
    if (fuelExpError) {
      console.log(`    ⚠ Erro ao criar despesa combustível ${ct.name}: ${fuelExpError.message}`);
      findings.push({ id: `D17-FUEL-${ct.name}`, title: `Despesa combustível não criada para ${ct.name}`, type: 'BUG', severity: 'ALTA' });
    } else {
      console.log(`    ✓ Despesa combustível R$ ${ct.fuelCost.toFixed(2)} criada`);
    }

    // Set truck back to available
    if (truck) {
      await supabase.from('trucks').update({ status: 'available', total_km: (truck.total_km || 0) + ct.kmFinal }).eq('id', truck.id);
    }

    // Extra expense (ajudante for R3)
    if (ct.extraExpense) {
      const driver = drivers.find(d => d.name === ct.extraExpense.driver);
      const { error: extraError } = await supabase.from('expenses').insert([{
        category: ct.extraExpense.category,
        description: ct.extraExpense.description,
        amount: ct.extraExpense.amount,
        date: todayDate,
        competence_date: todayDate,
        status: 'paid',
        payment_date: todayDate,
        payment_method: 'pix',
        driver_id: driver?.id,
      }]);
      if (extraError) {
        console.log(`    ⚠ Erro ao criar despesa extra: ${extraError.message}`);
      } else {
        console.log(`    ✓ Despesa extra R$ ${ct.extraExpense.amount.toFixed(2)} (${ct.extraExpense.description})`);
      }
    }
  }

  // ── VERIFICAÇÕES ──
  console.log('\n--- Verificações ---');

  const { data: finalOrders } = await supabase.from('orders').select('protocol, status, freight_value');
  const delivered = finalOrders.filter(o => o.status === 'delivered');
  console.log(`  Pedidos entregues: ${delivered.length} (esperado: 14)`);
  if (delivered.length !== 14) {
    findings.push({ id: 'D19-DEL-COUNT', title: `${delivered.length} entregues vs 14 esperados`, type: 'LÓGICA', severity: 'ALTA' });
  }

  const { data: finalTrips } = await supabase.from('trips').select('status, total_revenue');
  const completedTrips = finalTrips.filter(t => t.status === 'completed');
  console.log(`  Viagens concluídas: ${completedTrips.length} (esperado: 3)`);
  if (completedTrips.length !== 3) {
    findings.push({ id: 'D19-TRIP-COUNT', title: `${completedTrips.length} viagens concluídas vs 3 esperadas`, type: 'LÓGICA', severity: 'ALTA' });
  }

  const { data: finalTrucks } = await supabase.from('trucks').select('plate, status');
  const availableTrucks = finalTrucks.filter(t => t.status === 'available');
  console.log(`  Caminhões disponíveis: ${availableTrucks.length} (esperado: 3)`);
  if (availableTrucks.length !== 3) {
    findings.push({ id: 'D19-TRUCK-STATUS', title: `${availableTrucks.length} caminhões disponíveis vs 3 esperados`, type: 'LÓGICA', severity: 'MÉDIA' });
  }

  const { data: expenses } = await supabase.from('expenses').select('category, amount, status');
  const fuelExpenses = expenses.filter(e => e.category === 'fuel');
  const totalFuel = fuelExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  console.log(`  Despesas combustível: ${fuelExpenses.length} (esperado: 3), total: R$ ${totalFuel.toFixed(2)} (esperado: R$ 1.070,00)`);
  if (Math.abs(totalFuel - 1070.00) > 0.01) {
    findings.push({ id: 'D19-FUEL-TOTAL', title: `Combustível R$ ${totalFuel.toFixed(2)} vs R$ 1.070,00`, type: 'LÓGICA', severity: 'ALTA' });
  }

  console.log('\n=== RESUMO DIAS 14-19 ===');
  console.log(`Viagens criadas: ${createdTrips.length}/3`);
  console.log(`Pedidos entregues: ${delivered.length}/14`);
  console.log(`Achados: ${findings.length}`);
  findings.forEach(f => console.log(`  [${f.id}] ${f.title} (${f.type} / ${f.severity})`));
}

run().catch(console.error);

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';

const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass
  });

  if (authError) {
    console.error('Erro de autenticação:', authError.message);
    return;
  }
  console.log('Autenticado!');

  console.log('\n--- CLIENTES ---');
  const { data: clients } = await supabase.from('clients').select('code, company_name, cpf_cnpj');
  clients?.forEach(c => console.log(`${c.code}: ${c.company_name} (${c.cpf_cnpj})`));

  console.log('\n--- FORNECEDORES ---');
  const { data: suppliers } = await supabase.from('suppliers').select('code, company_name, category');
  suppliers?.forEach(s => console.log(`${s.code}: ${s.company_name} (${s.category})`));

  console.log('\n--- CAMINHÕES ---');
  const { data: trucks } = await supabase.from('trucks').select('plate, model, capacity, status');
  trucks?.forEach(t => console.log(`${t.plate}: ${t.model} (${t.capacity} kg) - Status: ${t.status}`));

  console.log('\n--- MOTORISTAS ---');
  const { data: drivers } = await supabase.from('drivers').select('name, cnh_number, status');
  drivers?.forEach(d => console.log(`${d.name} (${d.cnh_number}) - Status: ${d.status}`));

  console.log('\n--- PEDIDOS ---');
  const { data: orders } = await supabase.from('orders').select('protocol, client_name, status, total_volumes, total_weight_kg, freight_value');
  orders?.sort((a,b) => a.protocol.localeCompare(b.protocol)).forEach(o => {
    console.log(`${o.protocol}: ${o.client_name} - ${o.status} - Vol: ${o.total_volumes} - Peso: ${o.total_weight_kg}kg - Frete: R$ ${o.freight_value}`);
  });
}

run().catch(console.error);

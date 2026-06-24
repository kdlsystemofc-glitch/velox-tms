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

  const tables = ['company_settings', 'clients', 'suppliers', 'branches', 'trucks', 'drivers', 'orders'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Erro ao consultar ${table}:`, error.message);
    } else {
      console.log(`\n=== TABELA: ${table} (${data.length} registros) ===`);
      if (data.length > 0) {
        console.log('Primeiro registro:', JSON.stringify(data[0], null, 2));
      }
    }
  }
}

run().catch(console.error);

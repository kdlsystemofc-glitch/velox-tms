import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'company_settings',
  'clients',
  'recipients',
  'suppliers',
  'branches',
  'trucks',
  'drivers',
  'orders',
  'trips',
  'expenses',
  'revenues',
  'incidents',
  'alerts'
];

const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  console.log('--- RELATÓRIO DO BANCO DE DADOS ---');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // Login
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass
  });

  if (authError) {
    console.error('Erro de autenticação:', authError.message);
    return;
  }

  for (const table of tables) {
    try {
      const { data, count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`Tabela ${table}: Erro - ${error.message}`);
      } else {
        console.log(`Tabela ${table}: ${count} registros`);
      }
    } catch (e) {
      console.error(`Tabela ${table}: Falha - ${e.message}`);
    }
  }
}

run().catch(console.error);

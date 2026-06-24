import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Consultando company_settings...');
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro na consulta table company_settings:', error);
  } else {
    console.log('Dados da table company_settings:', JSON.stringify(data, null, 2));
  }

  console.log('Consultando RPC public_settings...');
  const { data: pubData, error: pubError } = await supabase.rpc('public_settings');

  if (pubError) {
    console.error('Erro na consulta RPC public_settings:', pubError);
  } else {
    console.log('Dados RPC public_settings:', JSON.stringify(pubData, null, 2));
  }
}

run().catch(console.error);

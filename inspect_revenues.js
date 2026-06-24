import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';
const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  await supabase.auth.signInWithPassword({ email, password: pass });

  const { data: revRow, error: revErr } = await supabase.from('revenues').select('*').limit(1);
  if (revErr) {
    console.log('Revenues error:', revErr.message);
  } else if (revRow.length > 0) {
    console.log('=== REVENUES COLUMNS ===');
    console.log(Object.keys(revRow[0]).join(', '));
    console.log('\nRevenues first row:', JSON.stringify(revRow[0], null, 2));
  } else {
    console.log('No revenues found');
  }
}

run().catch(console.error);

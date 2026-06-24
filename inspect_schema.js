import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';
const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  await supabase.auth.signInWithPassword({ email, password: pass });

  // Inspect trips schema
  const { data: tripRow, error: tripErr } = await supabase.from('trips').select('*').limit(1);
  if (tripErr) console.log('Trips error:', tripErr.message);
  else if (tripRow.length > 0) {
    console.log('=== TRIPS COLUMNS ===');
    console.log(Object.keys(tripRow[0]).join(', '));
    console.log('\nTrips first row:', JSON.stringify(tripRow[0], null, 2));
  } else {
    // Insert a dummy to see schema
    console.log('No trips yet');
  }

  // Inspect expenses schema
  const { data: expRow, error: expErr } = await supabase.from('expenses').select('*').limit(1);
  if (expErr) console.log('Expenses error:', expErr.message);
  else {
    if (expRow.length === 0) {
      console.log('\n=== EXPENSES: 0 rows, inserting test to see schema ===');
      const { data: testExp, error: testErr } = await supabase.from('expenses').insert([{
        category: 'fuel',
        description: 'Test schema discovery',
        amount: 0.01,
        status: 'paid',
      }]).select();
      if (testErr) console.log('  Insert error:', testErr.message);
      else {
        console.log('=== EXPENSES COLUMNS ===');
        console.log(Object.keys(testExp[0]).join(', '));
        console.log('\nExpenses row:', JSON.stringify(testExp[0], null, 2));
        // Clean up
        await supabase.from('expenses').delete().eq('id', testExp[0].id);
      }
    } else {
      console.log('\n=== EXPENSES COLUMNS ===');
      console.log(Object.keys(expRow[0]).join(', '));
    }
  }

  // Inspect incidents schema
  const { data: incRow, error: incErr } = await supabase.from('incidents').select('*').limit(1);
  if (incErr) console.log('Incidents error:', incErr.message);
  else {
    if (incRow.length === 0) {
      console.log('\n=== INCIDENTS: 0 rows, inserting test ===');
      const { data: testInc, error: testIncErr } = await supabase.from('incidents').insert([{
        type: 'test',
        description: 'Schema test',
        status: 'open',
      }]).select();
      if (testIncErr) console.log('  Insert error:', testIncErr.message);
      else {
        console.log('=== INCIDENTS COLUMNS ===');
        console.log(Object.keys(testInc[0]).join(', '));
        console.log('\nIncidents row:', JSON.stringify(testInc[0], null, 2));
        await supabase.from('incidents').delete().eq('id', testInc[0].id);
      }
    } else {
      console.log('\n=== INCIDENTS COLUMNS ===');
      console.log(Object.keys(incRow[0]).join(', '));
    }
  }
}

run().catch(console.error);

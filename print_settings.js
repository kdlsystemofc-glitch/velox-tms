import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';

async function run() {
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  // 1. Direct select (will probably return null for anon, but let's see)
  const { data: direct, error: dirErr } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
  console.log('Direct select (anon):', direct, dirErr ? dirErr.message : '');

  // 2. RPC call (should return sub-settings for anon)
  const { data: pub, error: pubErr } = await supabase.rpc('public_settings');
  console.log('RPC public_settings (anon):', pub, pubErr ? pubErr.message : '');
}

run().catch(console.error);

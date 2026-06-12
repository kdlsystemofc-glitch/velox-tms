// Este arquivo agora aponta para o cliente Supabase
// O código existente que importa de '@/api/base44Client' continua funcionando
export { base44, supabase, auth, storage, functions } from './supabaseClient.js';
export { base44 as default } from './supabaseClient.js';

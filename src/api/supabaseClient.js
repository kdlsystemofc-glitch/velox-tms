import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente do Supabase não encontradas. Verifique seu arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================================
// CAMADA DE COMPATIBILIDADE — imita a API do base44
// Isso permite trocar base44 por Supabase sem reescrever tudo
// ============================================================

export const TABLE_MAP = {
  Order:           'orders',
  Client:          'clients',
  Supplier:        'suppliers',
  Driver:          'drivers',
  Truck:           'trucks',
  Trip:            'trips',
  Revenue:         'revenues',
  Expense:         'expenses',
  Alert:           'alerts',
  Incident:        'incidents',
  OrderTemplate:   'order_templates',
  Recipient:       'recipients',
  Branch:          'branches',
  Transfer:        'transfers',
  ScheduleBlock:   'schedule_blocks',
  ContactMessage:  'contact_messages',
  Testimonial:     'testimonials',
  CompanySettings: 'company_settings',
  Invoice:         'invoices',
  Carrier:         'carriers',
  BankTransaction: 'bank_transactions',
  AuditLog:        'audit_log',
  ClientError:     'client_errors',
  TariffTable:     'tariff_tables',
  TariffVersion:   'tariff_versions',
  Settlement:      'settlements',
  DomainEvent:     'domain_events',
  JobRun:          'job_runs',
};

// Converte campos created_date/updated_date do base44 para created_at/updated_at do Supabase
function normalizeRecord(record) {
  if (!record) return record;
  const r = { ...record };
  if (r.created_at && !r.created_date) r.created_date = r.created_at;
  if (r.updated_at && !r.updated_date) r.updated_date = r.updated_at;
  return r;
}

function normalizeRecords(records) {
  if (!Array.isArray(records)) return records;
  return records.map(normalizeRecord);
}

// Remove campos que NÃO são colunas reais antes de gravar.
// normalizeRecord() injeta created_date/updated_date (aliases base44) na leitura;
// telas que carregam o registro inteiro e salvam de volta acabam reenviando esses
// campos fantasma, o que faz o PostgREST responder 400 (coluna inexistente).
// Também removemos id/created_at/updated_at, gerenciados pelo banco.
const READ_ONLY_FIELDS = ['created_date', 'updated_date', 'created_at', 'updated_at', 'id'];

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const clean = { ...payload };
  for (const field of READ_ONLY_FIELDS) {
    delete clean[field];
  }
  // String vazia em colunas UUID/DATE quebra o PostgREST (400 "invalid input
  // syntax for type uuid/date"). Converte "" -> null nessas colunas.
  for (const key of Object.keys(clean)) {
    if (clean[key] === '' && /_(id|date|expiry)$/.test(key)) {
      clean[key] = null;
    }
  }
  return clean;
}

// Construtor da camada de entidade
export function createEntityLayer(tableName) {
  return {
    // Listar com ordenação e limite
    async list(orderBy = '-created_at', limit = 200) {
      let ascending = true;
      let column = orderBy;
      if (orderBy.startsWith('-')) {
        ascending = false;
        column = orderBy.slice(1);
      }
      // Mapear nomes de campos base44 → Supabase
      const colMap = { created_date: 'created_at', updated_date: 'updated_at' };
      column = colMap[column] || column;

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order(column, { ascending })
        .limit(limit);

      if (error) throw new Error(error.message);
      return normalizeRecords(data);
    },

    // Filtrar com objeto de critérios simples
    async filter(criteria, orderBy = '-created_at', limit = 200) {
      let ascending = true;
      let column = orderBy;
      if (orderBy.startsWith('-')) {
        ascending = false;
        column = orderBy.slice(1);
      }
      const colMap = { created_date: 'created_at', updated_date: 'updated_at' };
      column = colMap[column] || column;

      let query = supabase.from(tableName).select('*');

      // Aplicar filtros
      for (const [key, value] of Object.entries(criteria)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      const { data, error } = await query
        .order(column, { ascending })
        .limit(limit);

      if (error) throw new Error(error.message);
      return normalizeRecords(data);
    },

    // Paginação server-side (range + contagem total). Retorna { rows, total }.
    // Uso: Entidade.page({ orderBy, page, pageSize, criteria })
    async page({ orderBy = '-created_at', page = 0, pageSize = 25, criteria = {} } = {}) {
      let ascending = true;
      let column = orderBy;
      if (orderBy.startsWith('-')) { ascending = false; column = orderBy.slice(1); }
      const colMap = { created_date: 'created_at', updated_date: 'updated_at' };
      column = colMap[column] || column;

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from(tableName).select('*', { count: 'exact' });
      for (const [key, value] of Object.entries(criteria)) {
        if (Array.isArray(value)) {
          if (value.length) query = query.in(key, value);
        } else if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      }

      const { data, error, count } = await query.order(column, { ascending }).range(from, to);
      if (error) throw new Error(error.message);
      return { rows: normalizeRecords(data), total: count ?? 0 };
    },

    // Buscar por ID
    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return normalizeRecord(data);
    },

    // Criar novo registro
    async create(payload) {
      const { data, error } = await supabase
        .from(tableName)
        .insert([sanitizePayload(payload)])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return normalizeRecord(data);
    },

    // Atualizar registro
    async update(id, payload) {
      const { data, error } = await supabase
        .from(tableName)
        .update(sanitizePayload(payload))
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return normalizeRecord(data);
    },

    // Deletar registro
    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      return { success: true };
    },
  };
}

// ============================================================
// API de autenticação compatível com base44
// ============================================================
export const auth = {
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  async loginWithProvider(provider, redirectTo = '/admin') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${redirectTo}`,
      },
    });
    if (error) throw new Error(error.message);
  },

  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Buscar perfil para obter o role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name || user.user_metadata?.full_name,
      role: profile?.role || 'admin',
      driver_id: profile?.driver_id,
    };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  },

  async resetPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============================================================
// Upload de arquivos (substitui base44.integrations.Core.UploadFile)
// ============================================================
export const storage = {
  async uploadFile(file, bucket = 'uploads') {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (error) throw new Error(error.message);

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { file_url: publicUrl };
  },
};

// ============================================================
// Funções de backend (substitui base44.functions.invoke)
// ============================================================
export const functions = {
  async invoke(functionName, params = {}) {
    // Funções simples implementadas no cliente
    if (functionName === 'generateProtocol') {
      const year = new Date().getFullYear();
      const prefix = `VLX-${year}-`;
      // Preferencial: função SECURITY DEFINER no banco (não exige ler orders).
      try {
        const { data: proto, error } = await supabase.rpc('next_protocol');
        if (!error && proto) return { data: { protocol: proto } };
      } catch { /* RPC ainda não criada — usa fallback abaixo */ }
      try {
        // Sequencial: busca o maior protocolo do ano e incrementa
        const { data: rows } = await supabase
          .from('orders')
          .select('protocol')
          .like('protocol', `${prefix}%`)
          .order('protocol', { ascending: false })
          .limit(1);
        const last = rows?.[0]?.protocol;
        const lastNum = last ? parseInt(last.slice(prefix.length), 10) : 0;
        const next = (isNaN(lastNum) ? 0 : lastNum) + 1;
        return { data: { protocol: `${prefix}${String(next).padStart(5, '0')}` } };
      } catch {
        // Fallback: aleatório com verificação de colisão
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;
          const { data: clash } = await supabase
            .from('orders').select('id').eq('protocol', candidate).limit(1);
          if (!clash || clash.length === 0) return { data: { protocol: candidate } };
        }
        return { data: { protocol: `${prefix}${Date.now() % 100000}` } };
      }
    }

    if (functionName === 'getClientByCnpj') {
      const { cnpj } = params;
      const clean = cnpj?.replace(/\D/g, '');
      if (!clean) return { data: { found: false } };

      // Preferencial: função SECURITY DEFINER (não expõe a base de clientes ao anon).
      try {
        const { data: rpcData, error } = await supabase.rpc('client_by_cnpj', { p_cnpj: cnpj });
        if (!error && rpcData) return { data: rpcData };
      } catch { /* RPC ainda não criada — usa fallback abaixo */ }

      const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name, cpf_cnpj, phone, email, address, contacts')
        .eq('status', 'active');

      const match = (clients || []).find(c =>
        (c.cpf_cnpj || '').replace(/\D/g, '') === clean
      );

      if (!match) return { data: { found: false } };

      const primary = (match.contacts || []).find(c => c.is_primary);
      return {
        data: {
          found: true,
          company_name: match.company_name || '',
          phone: match.phone || '',
          email: match.email || '',
          client_id: match.id,
          address: match.address || null,
          primary_contact: primary || null,
        }
      };
    }

    if (functionName === 'syncAlerts') {
      // Implementação client-side do sync de alertas
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
          { data: settings },
          { data: trucks },
          { data: drivers },
          { data: existingAlerts },
        ] = await Promise.all([
          supabase.from('company_settings').select('*').limit(1).single(),
          supabase.from('trucks').select('*'),
          supabase.from('drivers').select('*'),
          supabase.from('alerts').select('*').eq('resolved', false),
        ]);

        const alertDaysCnh  = settings?.alert_days_cnh      || 60;
        const alertDaysCrlv = settings?.alert_days_crlv     || 60;
        const alertDaysIns  = settings?.alert_days_insurance || 30;
        const alertsToCreate = [];

        const diffDays = (dateStr) => {
          if (!dateStr) return null;
          const d = new Date(dateStr + 'T12:00:00');
          return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
        };

        const alreadyExists = (refId, type) =>
          (existingAlerts || []).some(a => a.reference_id === refId && a.type === type && !a.resolved);

        // Alertas de caminhões
        for (const truck of (trucks || [])) {
          const truckChecks = [
            { field: truck.crlv_expiry,      type: 'crlv_expiring',      label: 'CRLV',     days: alertDaysCrlv },
            { field: truck.insurance_expiry,  type: 'insurance_expiring', label: 'Seguro',   days: alertDaysIns  },
            { field: truck.tachograph_next,   type: 'tachograph_expiring',label: 'Tacógrafo',days: 30            },
          ];
          for (const check of truckChecks) {
            const d = diffDays(check.field);
            if (d !== null && d <= check.days && !alreadyExists(truck.id, check.type)) {
              alertsToCreate.push({
                type: check.type,
                level: d <= 7 ? 'critical' : 'warning',
                message: d <= 0
                  ? `${check.label} do caminhão ${truck.plate} está VENCIDO`
                  : `${check.label} do caminhão ${truck.plate} vence em ${d} dias`,
                reference_id: truck.id,
                reference_type: 'truck',
                read: false,
                resolved: false,
              });
            }
          }
          // Alertas de km
          const kmAlerts = [
            { alertKm: truck.km_alert_oil    || settings?.maintenance_km_alerts?.oil_change_km    || 20000, type: 'oil_maintenance_km',  label: 'Troca de óleo' },
            { alertKm: truck.km_alert_review || settings?.maintenance_km_alerts?.general_review_km || 40000, type: 'review_km',           label: 'Revisão geral'  },
          ];
          for (const km of kmAlerts) {
            if (truck.total_km && km.alertKm) {
              const lastMaint = (truck.maintenance_history || [])
                .filter(m => m.type === (km.type === 'oil_maintenance_km' ? 'óleo' : 'revisão'))
                .sort((a, b) => b.km - a.km)[0];
              const lastKm = lastMaint?.km || 0;
              const diff = (truck.total_km || 0) - lastKm;
              if (diff >= km.alertKm * 0.9 && !alreadyExists(truck.id, km.type)) {
                const remaining = km.alertKm - diff;
                alertsToCreate.push({
                  type: km.type,
                  level: remaining <= 0 ? 'critical' : 'warning',
                  message: remaining <= 0
                    ? `${km.label} da ${truck.plate} está ATRASADA (${Math.abs(remaining).toLocaleString('pt-BR')} km acima do limite)`
                    : `${km.label} da ${truck.plate} prevista em ${remaining.toLocaleString('pt-BR')} km`,
                  reference_id: truck.id,
                  reference_type: 'truck',
                  read: false,
                  resolved: false,
                });
              }
            }
          }
        }

        // Alertas de motoristas (CNH)
        for (const driver of (drivers || [])) {
          const d = diffDays(driver.cnh_expiry);
          if (d !== null && d <= alertDaysCnh && !alreadyExists(driver.id, 'cnh_expiring')) {
            alertsToCreate.push({
              type: 'cnh_expiring',
              level: d <= 7 ? 'critical' : 'warning',
              message: d <= 0
                ? `CNH de ${driver.name} está VENCIDA`
                : `CNH de ${driver.name} vence em ${d} dias`,
              reference_id: driver.id,
              reference_type: 'driver',
              read: false,
              resolved: false,
            });
          }
        }

        if (alertsToCreate.length > 0) {
          await supabase.from('alerts').insert(alertsToCreate);
        }
      } catch (e) {
        console.warn('syncAlerts client-side falhou:', e);
      }
      return { data: { ok: true } };
    }

    if (functionName === 'calculateDistance') {
      // Sem Google Maps API key configurada, retorna null silenciosamente
      return { data: { distance_km: null } };
    }

    // Chamar Edge Function do Supabase para funções não implementadas aqui
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body: params });
      if (error) throw new Error(error.message);
      return { data };
    } catch {
      return { data: null }; // Falhar silenciosamente
    }
  },
};

// ============================================================
// Objeto principal compatível com o código que usa base44
// ============================================================
// P02.3: a fachada de ENTIDADES (base44.entities.*) foi aposentada — o acesso a
// dados agora é pela camada de repositórios (`import { db } from "@/repositories"`).
// Restam aqui apenas auth/storage/functions/integrations (facetas menores ainda
// usadas em poucos pontos).
export const base44 = {
  auth,
  storage,
  functions,
  // Compatibilidade com base44.integrations.Core.UploadFile
  integrations: {
    Core: {
      UploadFile: ({ file }) => storage.uploadFile(file),
    },
  },
};

export default base44;

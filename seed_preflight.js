import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';

const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  console.log('Iniciando o seeding de pré-voo no Supabase...');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
  });

  // Login
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass
  });

  if (authError) {
    console.error('Erro de autenticação:', authError.message);
    return;
  }
  console.log('Autenticado com sucesso como admin!');

  const today = new Date();
  const formatOffsetDate = (days) => {
    const d = new Date(today);
    d.setDate(today.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  // 1. Company Settings
  console.log('Configurando company_settings...');
  const settingsData = {
    company_name: 'Velox Fracionado Ltda',
    cnpj: '31.444.555/0001-22',
    phone: '(11) 4002-8922',
    email: 'operacao@veloxfracionado.com.br',
    whatsapp: '(11) 99100-2200',
    region: 'Grande SP, Baixada, Campinas e Vale do Paraíba',
    address: 'Rua do Cross-Docking, 500 — Galpão 3, Guarulhos/SP',
    mission: 'Entregar cargas fracionadas com previsibilidade e baixo custo.',
    vision: 'Ser a referência em distribuição fracionada no interior paulista.',
    values: 'Pontualidade, Cuidado com a carga, Transparência',
    hero_title: 'Sua encomenda entregue no prazo, sem complicação.',
    hero_subtitle: 'Transporte fracionado na Grande SP, Baixada, Campinas e Vale.',
    about_text: 'Somos especialistas em cargas fracionadas: consolidamos suas entregas em rotas otimizadas, reduzindo seu custo de frete.',
    pricing: {
      price_per_kg: 1.0,
      price_per_km: 0.0,
      fixed_fee: 20.0,
      minimum_freight: 100.0,
      gris_percent: 0.3,
      ad_valorem_percent: 0.0,
      tde_per_nf: 5.0,
      tda_per_nf: 5.0,
      toll_per_kg: 0.0,
      cubage_factor: 6000
    },
    coverage_type: 'cep_range',
    coverage_cep_ranges: [
      { from: '01000-000', to: '09999-999', label: 'Grande SP' },
      { from: '11000-000', to: '11999-999', label: 'Baixada Santista' },
      { from: '12000-000', to: '12999-999', label: 'Vale do Paraíba' },
      { from: '13000-000', to: '13139-999', label: 'Campinas / RMC' }
    ],
    coverage_message: 'No momento não atendemos este CEP. Fale com a gente para avaliar uma exceção.',
    min_advance_days: 1,
    working_days: [1, 2, 3, 4, 5],
    alert_days_cnh: 60,
    alert_days_crlv: 60,
    alert_days_insurance: 30,
    tax_rate_percent: 6,
    monthly_depreciation: 1500,
    service_type: 'fractional',
    collection_model: 'both',
    opening_cash_balance: 50000,
    opening_cash_date: formatOffsetDate(0)
  };

  // Limpar tabelas primeiro
  console.log('Limpando tabelas...');
  await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('revenues').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('trucks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('branches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('company_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Salvar settings
  const { error: settingsError } = await supabase.from('company_settings').insert([settingsData]);
  if (settingsError) console.error('Erro ao salvar settings:', settingsError.message);
  else console.log('Company settings salvas com sucesso!');

  // 2. Filiais & CDs (Branches)
  console.log('Inserindo filiais...');
  const branches = [
    { name: 'Matriz Guarulhos', code: 'FIL001', address: { cep: '07020-000', street: 'Rua do Cross-Docking', number: '500', city: 'Guarulhos', state: 'SP' }, type: 'filial', phone: '(11) 4002-8922' },
    { name: 'CD Campinas', code: 'FIL002', address: { cep: '13010-111', street: 'Av. Anhanguera', number: '95', city: 'Campinas', state: 'SP' }, type: 'cd', phone: '(19) 4400-4400' }
  ];
  const { error: branchesError } = await supabase.from('branches').insert(branches);
  if (branchesError) console.error('Erro ao salvar filiais:', branchesError.message);

  // 3. Fornecedores
  console.log('Inserindo fornecedores...');
  const suppliers = [
    { name: 'Auto Posto Marginal Tietê Ltda', code: 'FOR001', cnpj_cpf: '11.111.111/0001-11', category: 'fuel', contact_name: 'Roberto Alves', phone: '(11) 3550-1000', whatsapp: '(11) 95500-1000', email: 'gerente@postomarginal.com.br', address: { cep: '02011-000', street: 'Av. Marginal', number: '1000', city: 'São Paulo', state: 'SP' }, payment_terms: 'À vista (PIX na bomba)', pix_key: '11.111.111/0001-11' },
    { name: 'DieselFix Centro Automotivo Ltda', code: 'FOR002', cnpj_cpf: '22.222.222/0001-22', category: 'maintenance', contact_name: 'Sandro Oliveira', phone: '(11) 2400-2000', whatsapp: '(11) 96400-2000', email: 'os@dieselfix.com.br', address: { cep: '07020-000', street: 'Rua das Oficinas', number: '50', city: 'Guarulhos', state: 'SP' }, payment_terms: '28 dias (boleto)', pix_key: '22.222.222/0001-22' },
    { name: 'PneuJá Comércio de Pneus Ltda', code: 'FOR003', cnpj_cpf: '33.333.333/0001-33', category: 'tires', contact_name: 'Paulo Ramos', phone: '(11) 3700-3000', whatsapp: '(11) 97700-3000', email: 'vendas@pneuja.com.br', address: { cep: '06010-000', street: 'Av. dos Pneus', number: '80', city: 'Osasco', state: 'SP' }, payment_terms: 'Boleto 15/30', pix_key: '33.333.333/0001-33' },
    { name: 'Protege Corretora de Seguros Ltda', code: 'FOR004', cnpj_cpf: '44.444.444/0001-44', category: 'insurance', contact_name: 'Marta Andrade', phone: '(11) 3000-4000', whatsapp: '(11) 98000-4000', email: 'apolices@protege.com.br', address: { cep: '04571-010', street: 'Av. Berrini', number: '2000', city: 'São Paulo', state: 'SP' }, payment_terms: 'Mensal (débito automático)', pix_key: '44.444.444/0001-44' }
  ];
  const { error: suppliersError } = await supabase.from('suppliers').insert(suppliers);
  if (suppliersError) console.error('Erro ao salvar fornecedores:', suppliersError.message);

  // 4. Clientes
  console.log('Inserindo clientes...');
  const clients = [
    { code: 'CLI001', company_name: 'Loja Online Tech Comércio Eletrônico ME', cpf_cnpj: '50.111.111/0001-11', state_registration: '110.111.111', email: 'logistica@lojatech.com.br', phone: '(11) 4100-1100', client_type: 'recorrente', billing_type: 'monthly', billing_day: 25, payment_term_days: 30, status: 'active', address: { cep: '04571-010', street: 'Av. Eng. Luís Carlos Berrini', number: '1200', complement: 'CD — Bloco B', neighborhood: 'Cidade Monções', city: 'São Paulo', state: 'SP' }, contacts: [{ name: 'Ana Souza', role: 'Logística', phone: '(11) 4100-1101', email: 'ana.logistica@lojatech.com.br', is_primary: true }] },
    { code: 'CLI002', company_name: 'Distribuidora Norte SP Ltda', cpf_cnpj: '50.222.222/0001-22', state_registration: '110.222.222', email: 'compras@distnorte.com.br', phone: '(11) 4200-2200', client_type: 'recorrente', billing_type: 'per_trip', status: 'active', address: { cep: '02011-000', street: 'Av. Cruzeiro do Sul', number: '750', complement: 'Depósito 2', neighborhood: 'Santana', city: 'São Paulo', state: 'SP' }, contacts: [{ name: 'Carlos Nunes', role: 'Compras', phone: '(11) 4200-2201', email: 'carlos@distnorte.com.br', is_primary: true }] },
    { code: 'CLI003', company_name: 'Magazine Casa & Cia Comércio Varejista Ltda', cpf_cnpj: '50.333.333/0001-33', state_registration: '110.333.333', email: 'expedicao@casaecia.com.br', phone: '(11) 4300-3300', client_type: 'recorrente', billing_type: 'per_trip', status: 'active', address: { cep: '09010-000', street: 'Rua Coronel Oliveira', number: '300', complement: 'Loja central', neighborhood: 'Centro', city: 'Santo André', state: 'SP' }, contacts: [{ name: 'Júlia Prado', role: 'Logística', phone: '(11) 4300-3301', email: 'julia@casaecia.com.br', is_primary: true }] },
    { code: 'CLI004', company_name: 'AutoPeças Expressa Comércio de Peças Ltda', cpf_cnpj: '50.444.444/0001-44', state_registration: '110.444.444', email: 'vendas@autopecasexpressa.com.br', phone: '(19) 4400-4400', client_type: 'eventual', billing_type: 'per_trip', status: 'active', address: { cep: '13010-111', street: 'Av. Francisco Glicério', number: '95', complement: 'Galpão A', neighborhood: 'Centro', city: 'Campinas', state: 'SP' }, contacts: [{ name: 'Rafael Tonin', role: 'Compras', phone: '(19) 4400-4401', email: 'rafael@autopecasexpressa.com.br', is_primary: true }] },
    { code: 'CLI005', company_name: 'Moda Vale Confecções Ltda', cpf_cnpj: '50.555.555/0001-55', state_registration: '110.555.555', email: 'expedicao@modavale.com.br', phone: '(12) 4500-5500', client_type: 'eventual', billing_type: 'per_trip', status: 'active', address: { cep: '12210-130', street: 'Av. Dr. João Guilhermino', number: '410', complement: 'Galpão 1', neighborhood: 'Centro', city: 'São José dos Campos', state: 'SP' }, contacts: [{ name: 'Sônia Reis', role: 'Logística', phone: '(12) 4500-5501', email: 'sonia@modavale.com.br', is_primary: true }] },
    { code: 'CLI006', company_name: 'EletroBaixada Atacado de Eletrônicos Ltda', cpf_cnpj: '50.666.666/0001-66', state_registration: '110.666.666', email: 'compras@eletrobaixada.com.br', phone: '(13) 4600-6600', client_type: 'eventual', billing_type: 'per_trip', status: 'active', address: { cep: '11013-000', street: 'Av. João Pessoa', number: '88', complement: 'Loja Centro', neighborhood: 'Centro', city: 'Santos', state: 'SP' }, contacts: [{ name: 'Diego Matos', role: 'Compras', phone: '(13) 4600-6601', email: 'diego@eletrobaixada.com.br', is_primary: true }] }
  ];
  const { data: insertedClients, error: clientsError } = await supabase.from('clients').insert(clients).select();
  if (clientsError) console.error('Erro ao salvar clientes:', clientsError.message);
  else console.log('Clientes salvos com sucesso!');

  // 5. Motoristas
  console.log('Inserindo motoristas...');
  const drivers = [
    { name: 'Antônio Ferreira', cpf: '123.456.789-01', birth_date: '1986-03-10', phone: '(11) 97000-1001', email: 'antonio@veloxfracionado.com', cnh_number: '12345678901', cnh_category: 'C', cnh_expiry: '2027-07-22', role: 'motorista', contract_type: 'clt', base_salary: 2600.0, status: 'active', bank_info: { bank: 'Bradesco', agency: '1111', account: '11111-1', pix_key: '123.456.789-01' }, address: { cep: '07020-000', street: 'Rua das Flores', number: '100', city: 'Guarulhos', state: 'SP' }, commission_percent: 10 },
    { name: 'Beatriz Lima', cpf: '234.567.890-12', birth_date: '1992-07-22', phone: '(11) 97000-1002', email: 'beatriz@veloxfracionado.com', cnh_number: '23456789012', cnh_category: 'C', cnh_expiry: formatOffsetDate(40), role: 'motorista', contract_type: 'clt', base_salary: 2600.0, status: 'active', bank_info: { bank: 'Itaú', agency: '2222', account: '22222-2', pix_key: 'beatriz@veloxfracionado.com' }, address: { cep: '06010-000', street: 'Rua do Sol', number: '200', city: 'Osasco', state: 'SP' }, commission_percent: 10 },
    { name: 'Cláudio Souza', cpf: '345.678.901-23', birth_date: '1980-11-05', phone: '(11) 97000-1003', email: 'claudio@veloxfracionado.com', cnh_number: '34567890123', cnh_category: 'D', cnh_expiry: '2028-03-28', role: 'motorista', contract_type: 'pj', base_salary: 3200.0, status: 'active', bank_info: { bank: 'Nubank', agency: '0001', account: '33333-3', pix_key: '(11) 97000-1003' }, address: { cep: '02011-000', street: 'Rua da Cantareira', number: '300', city: 'São Paulo', state: 'SP' }, commission_percent: 10 }
  ];
  const { data: insertedDrivers, error: driversError } = await supabase.from('drivers').insert(drivers).select();
  if (driversError) console.error('Erro ao salvar motoristas:', driversError.message);
  else console.log('Motoristas salvos com sucesso!');

  // 6. Caminhões (Trucks)
  console.log('Inserindo caminhões...');
  const trucks = [
    { plate: 'FRC-1A11', model: 'Delivery 6.160', manufacturer: 'Volkswagen', year: 2022, truck_type: 'vuc', capacity_kg: 3500.0, dimensions: { length_m: 4.5, width_m: 2.2, height_m: 2.2 }, renavam: '11111111111', chassis: '9BWZZZ377NV100111', color: 'Branco', status: 'available', crlv_expiry: '2026-09-10', insurance_expiry: '2026-10-15', tachograph_last: '2025-08-21', tachograph_next: '2026-07-27', total_km: 82000, km_alert_oil: 10000, km_alert_review: 20000, km_alert_tires: 40000, notes: 'Rota capital — entregas leves' },
    { plate: 'FRC-2B22', model: 'Accelo 1016', manufacturer: 'Mercedes-Benz', year: 2021, truck_type: 'truck', capacity_kg: 6000.0, dimensions: { length_m: 5.5, width_m: 2.3, height_m: 2.4 }, renavam: '22222222222', chassis: '9BWZZZ377MV200222', color: 'Branco', status: 'available', crlv_expiry: '2026-08-01', insurance_expiry: '2027-01-03', tachograph_last: '2025-07-23', tachograph_next: '2026-07-02', total_km: 145000, km_alert_oil: 15000, km_alert_review: 30000, km_alert_tires: 50000, notes: 'Rota mista capital + ABC' },
    { plate: 'FRC-3C33', model: 'Constellation 13.190', manufacturer: 'Volkswagen', year: 2020, truck_type: 'toco', capacity_kg: 9000.0, dimensions: { length_m: 7.0, width_m: 2.5, height_m: 2.6 }, renavam: '33333333333', chassis: '9BWZZZ377LV300333', color: 'Prata', status: 'maintenance', crlv_expiry: '2027-01-03', insurance_expiry: formatOffsetDate(8), tachograph_last: '2025-11-29', tachograph_next: '2026-09-15', total_km: 205000, km_alert_oil: 15000, km_alert_review: 30000, km_alert_tires: 50000, notes: 'Rota interior — Campinas/Vale, consolida volume' }
  ];
  const { error: trucksError } = await supabase.from('trucks').insert(trucks);
  if (trucksError) console.error('Erro ao salvar caminhões:', trucksError.message);
  else console.log('Caminhões salvos com sucesso!');

  console.log('--- SEEDING DE PRÉ-VOO CONCLUÍDO COM SUCESSO! ---');
}

run().catch(console.error);

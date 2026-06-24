import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dalwguqltlwrroiignbq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhbHdndXFsdGx3cnJvaWlnbmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMzQ1NTMsImV4cCI6MjA5NjgxMDU1M30.BK0ApyP-k1o8IXKWSg7usWJ45fZ9S8urbMKDI5fsQlk';

const email = 'kauanealefy123@gmail.com';
const pass = 'Kkubia6697';

async function run() {
  console.log('Iniciando o seeding de pedidos no Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey, {
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

  // Fetch clients to link their IDs
  const { data: clients, error: clientsError } = await supabase.from('clients').select('*');
  if (clientsError) {
    console.error('Erro ao buscar clientes:', clientsError.message);
    return;
  }

  const getClient = (code) => clients.find(c => c.code === code);

  const today = new Date().toISOString().slice(0, 10);

  const orders = [
    // P01
    {
      protocol: 'VLX-2026-00001',
      client_id: getClient('CLI002').id,
      client_name: getClient('CLI002').company_name,
      client_cpf_cnpj: getClient('CLI002').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'after_delivery',
      origin: getClient('CLI002').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Varejo Pinheiros Ltda',
        cnpj_cpf: '60.001.001/0001-01',
        cep: '05422-000',
        street: 'Rua dos Pinheiros',
        number: '100',
        neighborhood: 'Pinheiros',
        city: 'São Paulo',
        state: 'SP',
        items: [{
          nf_number: '1001',
          volumes: 6,
          weight_kg: 80,
          declared_value: 5000.0,
          description: 'Mercadorias eletrônicas',
          package_type: 'caixa',
          height_cm: 40,
          width_cm: 40,
          length_cm: 40
        }]
      }],
      total_volumes: 6,
      total_weight_kg: 80,
      total_declared_value: 5000.0,
      freight_value: 125.0,
      payment_method: 'pix',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P01',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P02
    {
      protocol: 'VLX-2026-00002',
      client_id: getClient('CLI003').id,
      client_name: getClient('CLI003').company_name,
      client_cpf_cnpj: getClient('CLI003').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: '15_days',
      origin: getClient('CLI003').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Casa & Cia Santo André',
        cnpj_cpf: '60.002.002/0001-02',
        cep: '09010-000',
        street: 'Rua Coronel Oliveira',
        number: '100',
        neighborhood: 'Centro',
        city: 'Santo André',
        state: 'SP',
        items: [{
          nf_number: '1002',
          volumes: 10,
          weight_kg: 150,
          declared_value: 8000.0,
          description: 'Móveis desmontados',
          package_type: 'caixa',
          height_cm: 50,
          width_cm: 40,
          length_cm: 40
        }]
      }],
      total_volumes: 10,
      total_weight_kg: 150,
      total_declared_value: 8000.0,
      freight_value: 204.0,
      payment_method: 'boleto',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P02',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P03
    {
      protocol: 'VLX-2026-00003',
      client_id: getClient('CLI002').id,
      client_name: getClient('CLI002').company_name,
      client_cpf_cnpj: getClient('CLI002').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'after_delivery',
      origin: getClient('CLI002').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Depósito Guarulhos ME',
        cnpj_cpf: '60.003.003/0001-03',
        cep: '07020-000',
        street: 'Av. Guarulhos',
        number: '100',
        neighborhood: 'Centro',
        city: 'Guarulhos',
        state: 'SP',
        items: [{
          nf_number: '1003',
          volumes: 3,
          weight_kg: 45,
          declared_value: 3000.0,
          description: 'Bebidas diversas',
          package_type: 'caixa',
          height_cm: 50,
          width_cm: 50,
          length_cm: 60
        }]
      }],
      total_volumes: 3,
      total_weight_kg: 45,
      total_declared_value: 3000.0,
      freight_value: 114.0,
      payment_method: 'pix',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P03',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P04
    {
      protocol: 'VLX-2026-00004',
      client_id: getClient('CLI003').id,
      client_name: getClient('CLI003').company_name,
      client_cpf_cnpj: getClient('CLI003').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: '15_days',
      origin: getClient('CLI003').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Loja Osasco Center',
        cnpj_cpf: '60.004.004/0001-04',
        cep: '06010-000',
        street: 'Rua do Sol',
        number: '100',
        neighborhood: 'Centro',
        city: 'Osasco',
        state: 'SP',
        items: [
          {
            nf_number: '1004',
            volumes: 8,
            weight_kg: 120,
            declared_value: 7000.0,
            description: 'Móveis quarto',
            package_type: 'caixa',
            height_cm: 40,
            width_cm: 40,
            length_cm: 40
          },
          {
            nf_number: '1005',
            volumes: 6,
            weight_kg: 100,
            declared_value: 5000.0,
            description: 'Móveis sala',
            package_type: 'caixa',
            height_cm: 40,
            width_cm: 40,
            length_cm: 40
          }
        ]
      }],
      total_volumes: 14,
      total_weight_kg: 220,
      total_declared_value: 12000.0,
      freight_value: 296.0,
      payment_method: 'boleto',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P04',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P05
    {
      protocol: 'VLX-2026-00005',
      client_id: getClient('CLI004').id,
      client_name: getClient('CLI004').company_name,
      client_cpf_cnpj: getClient('CLI004').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'after_delivery',
      origin: getClient('CLI004').address,
      collection_date: today,
      collection_time: 'afternoon',
      recipients: [{
        name: 'AutoPeças Itaquera',
        cnpj_cpf: '60.005.005/0001-05',
        cep: '08210-000',
        street: 'Rua Itaquera',
        number: '100',
        neighborhood: 'Itaquera',
        city: 'São Paulo',
        state: 'SP',
        items: [{
          nf_number: '1006',
          volumes: 2,
          weight_kg: 30,
          declared_value: 2000.0,
          description: 'Peças automotivas',
          package_type: 'caixa',
          height_cm: 40,
          width_cm: 40,
          length_cm: 40
        }]
      }],
      total_volumes: 2,
      total_weight_kg: 30,
      total_declared_value: 2000.0,
      freight_value: 100.0,
      payment_method: 'pix',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P05',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P06
    {
      protocol: 'VLX-2026-00006',
      client_id: getClient('CLI003').id,
      client_name: getClient('CLI003').company_name,
      client_cpf_cnpj: getClient('CLI003').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: '15_days',
      origin: getClient('CLI003').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Eletro SBC Atacado',
        cnpj_cpf: '60.006.006/0001-06',
        cep: '09710-000',
        street: 'Rua SBC',
        number: '100',
        neighborhood: 'Centro',
        city: 'São Bernardo do Campo',
        state: 'SP',
        items: [
          {
            nf_number: '1007',
            volumes: 12,
            weight_kg: 300,
            declared_value: 15000.0,
            description: 'Eletrônicos lote A',
            package_type: 'caixa',
            height_cm: 50,
            width_cm: 40,
            length_cm: 40
          },
          {
            nf_number: '1008',
            volumes: 8,
            weight_kg: 200,
            declared_value: 10000.0,
            description: 'Eletrônicos lote B',
            package_type: 'caixa',
            height_cm: 50,
            width_cm: 40,
            length_cm: 40
          }
        ]
      }],
      total_volumes: 20,
      total_weight_kg: 500,
      total_declared_value: 25000.0,
      freight_value: 615.0,
      payment_method: 'boleto',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P06',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P07
    {
      protocol: 'VLX-2026-00007',
      client_id: getClient('CLI002').id,
      client_name: getClient('CLI002').company_name,
      client_cpf_cnpj: getClient('CLI002').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'after_delivery',
      origin: getClient('CLI002').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Mercado Brás Ltda',
        cnpj_cpf: '60.007.007/0001-07',
        cep: '03007-000',
        street: 'Rua do Brás',
        number: '100',
        neighborhood: 'Brás',
        city: 'São Paulo',
        state: 'SP',
        items: [{
          nf_number: '1009',
          volumes: 6,
          weight_kg: 90,
          declared_value: 6000.0,
          description: 'Fardos de bebidas',
          package_type: 'caixa',
          height_cm: 40,
          width_cm: 40,
          length_cm: 40
        }]
      }],
      total_volumes: 6,
      total_weight_kg: 90,
      total_declared_value: 6000.0,
      freight_value: 138.0,
      payment_method: 'pix',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P07',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P08
    {
      protocol: 'VLX-2026-00008',
      client_id: getClient('CLI001').id,
      client_name: getClient('CLI001').company_name,
      client_cpf_cnpj: getClient('CLI001').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'monthly',
      origin: getClient('CLI001').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Tech Berrini Store',
        cnpj_cpf: '60.008.008/0001-08',
        cep: '04571-010',
        street: 'Av. Eng. Luís Carlos Berrini',
        number: '100',
        neighborhood: 'Berrini',
        city: 'São Paulo',
        state: 'SP',
        items: [{
          nf_number: '1010',
          volumes: 8,
          weight_kg: 60,
          declared_value: 4000.0,
          description: 'Laptops',
          package_type: 'caixa',
          height_cm: 60,
          width_cm: 60,
          length_cm: 60
        }]
      }],
      total_volumes: 8,
      total_weight_kg: 60,
      total_declared_value: 4000.0,
      freight_value: 330.0,
      payment_method: 'boleto',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P08',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P09
    {
      protocol: 'VLX-2026-00009',
      client_id: getClient('CLI001').id,
      client_name: getClient('CLI001').company_name,
      client_cpf_cnpj: getClient('CLI001').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'monthly',
      origin: getClient('CLI001').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Distribuidora Santana',
        cnpj_cpf: '60.009.009/0001-09',
        cep: '02011-000',
        street: 'Av. Cruzeiro do Sul',
        number: '100',
        neighborhood: 'Santana',
        city: 'São Paulo',
        state: 'SP',
        items: [{
          nf_number: '1011',
          volumes: 8,
          weight_kg: 120,
          declared_value: 7000.0,
          description: 'Acessórios Tech',
          package_type: 'caixa',
          height_cm: 40,
          width_cm: 40,
          length_cm: 40
        }]
      }],
      total_volumes: 8,
      total_weight_kg: 120,
      total_declared_value: 7000.0,
      freight_value: 171.0,
      payment_method: 'boleto',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P09',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P10
    {
      protocol: 'VLX-2026-00010',
      client_id: getClient('CLI004').id,
      client_name: getClient('CLI004').company_name,
      client_cpf_cnpj: getClient('CLI004').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'after_delivery',
      origin: getClient('CLI004').address,
      collection_date: today,
      collection_time: 'afternoon',
      recipients: [{
        name: 'AutoPeças Campinas',
        cnpj_cpf: '60.010.010/0001-10',
        cep: '13010-111',
        street: 'Rua de Campinas',
        number: '100',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'SP',
        items: [{
          nf_number: '1012',
          volumes: 12,
          weight_kg: 200,
          declared_value: 10000.0,
          description: 'Pneus e rodas',
          package_type: 'caixa',
          height_cm: 40,
          width_cm: 40,
          length_cm: 40
        }]
      }],
      total_volumes: 12,
      total_weight_kg: 200,
      total_declared_value: 10000.0,
      freight_value: 260.0,
      payment_method: 'pix',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P10',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P11
    {
      protocol: 'VLX-2026-00011',
      client_id: getClient('CLI001').id,
      client_name: getClient('CLI001').company_name,
      client_cpf_cnpj: getClient('CLI001').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'monthly',
      origin: getClient('CLI001').address,
      collection_date: today,
      collection_time: 'morning',
      recipients: [{
        name: 'Boutique Pinheiros',
        cnpj_cpf: '60.011.011/0001-11',
        cep: '05422-000',
        street: 'Rua dos Pinheiros',
        number: '100',
        neighborhood: 'Pinheiros',
        city: 'São Paulo',
        state: 'SP',
        items: [{
          nf_number: '1013',
          volumes: 5,
          weight_kg: 75,
          declared_value: 5500.0,
          description: 'Vestuário Tech',
          package_type: 'caixa',
          height_cm: 40,
          width_cm: 40,
          length_cm: 45
        }]
      }],
      total_volumes: 5,
      total_weight_kg: 75,
      total_declared_value: 5500.0,
      freight_value: 121.5,
      payment_method: 'boleto',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P11',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P12
    {
      protocol: 'VLX-2026-00012',
      client_id: getClient('CLI005').id,
      client_name: getClient('CLI005').company_name,
      client_cpf_cnpj: getClient('CLI005').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: '15_days',
      origin: getClient('CLI005').address,
      collection_date: today,
      collection_time: 'afternoon',
      recipients: [{
        name: 'Moda Vale SJC',
        cnpj_cpf: '60.012.012/0001-12',
        cep: '12210-130',
        street: 'Av. Dr. João Guilhermino',
        number: '100',
        neighborhood: 'Centro',
        city: 'São José dos Campos',
        state: 'SP',
        items: [
          {
            nf_number: '1014',
            volumes: 10,
            weight_kg: 180,
            declared_value: 9000.0,
            description: 'Roupas lote A',
            package_type: 'caixa',
            height_cm: 45,
            width_cm: 40,
            length_cm: 40
          },
          {
            nf_number: '1015',
            volumes: 6,
            weight_kg: 120,
            declared_value: 6000.0,
            description: 'Roupas lote B',
            package_type: 'caixa',
            height_cm: 45,
            width_cm: 40,
            length_cm: 40
          }
        ]
      }],
      total_volumes: 16,
      total_weight_kg: 300,
      total_declared_value: 15000.0,
      freight_value: 385.0,
      payment_method: 'transfer',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P12',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P13
    {
      protocol: 'VLX-2026-00013',
      client_id: getClient('CLI004').id,
      client_name: getClient('CLI004').company_name,
      client_cpf_cnpj: getClient('CLI004').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'after_delivery',
      origin: getClient('CLI004').address,
      collection_date: today,
      collection_time: 'afternoon',
      recipients: [{
        name: 'Oficina Campinas Sul',
        cnpj_cpf: '60.013.013/0001-13',
        cep: '13010-111',
        street: 'Av. Francisco Glicério',
        number: '100',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'SP',
        items: [{
          nf_number: '1016',
          volumes: 7,
          weight_kg: 110,
          declared_value: 6500.0,
          description: 'Acessórios auto',
          package_type: 'caixa',
          height_cm: 45,
          width_cm: 45,
          length_cm: 45
        }]
      }],
      total_volumes: 7,
      total_weight_kg: 110,
      total_declared_value: 6500.0,
      freight_value: 159.5,
      payment_method: 'pix',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P13',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P14
    {
      protocol: 'VLX-2026-00014',
      client_id: getClient('CLI006').id,
      client_name: getClient('CLI006').company_name,
      client_cpf_cnpj: getClient('CLI006').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'after_delivery',
      origin: getClient('CLI006').address,
      collection_date: today,
      collection_time: 'afternoon',
      recipients: [{
        name: 'EletroBaixada Santos',
        cnpj_cpf: '60.014.014/0001-14',
        cep: '11013-000',
        street: 'Av. João Pessoa',
        number: '100',
        neighborhood: 'Centro',
        city: 'Santos',
        state: 'SP',
        items: [
          {
            nf_number: '1017',
            volumes: 8,
            weight_kg: 160,
            declared_value: 8000.0,
            description: 'Fardos de eletrônicos A',
            package_type: 'caixa',
            height_cm: 45,
            width_cm: 45,
            length_cm: 45
          },
          {
            nf_number: '1018',
            volumes: 6,
            weight_kg: 100,
            declared_value: 5000.0,
            description: 'Fardos de eletrônicos B',
            package_type: 'caixa',
            height_cm: 45,
            width_cm: 45,
            length_cm: 45
          }
        ]
      }],
      total_volumes: 14,
      total_weight_kg: 260,
      total_declared_value: 13000.0,
      freight_value: 339.0,
      payment_method: 'pix',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P14',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P15
    {
      protocol: 'VLX-2026-00015',
      client_id: getClient('CLI006').id,
      client_name: getClient('CLI006').company_name,
      client_cpf_cnpj: getClient('CLI006').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: 'after_delivery',
      origin: getClient('CLI006').address,
      collection_date: today,
      collection_time: 'afternoon',
      recipients: [{
        name: 'Loja São Vicente',
        cnpj_cpf: '60.015.015/0001-15',
        cep: '11310-000',
        street: 'Rua São Vicente',
        number: '100',
        neighborhood: 'Centro',
        city: 'São Vicente',
        state: 'SP',
        items: [{
          nf_number: '1019',
          volumes: 3,
          weight_kg: 40,
          declared_value: 2500.0,
          description: 'Carga leve São Vicente',
          package_type: 'caixa',
          height_cm: 40,
          width_cm: 40,
          length_cm: 40
        }]
      }],
      total_volumes: 3,
      total_weight_kg: 40,
      total_declared_value: 2500.0,
      freight_value: 100.0,
      payment_method: 'pix',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P15',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    },
    // P16
    {
      protocol: 'VLX-2026-00016',
      client_id: getClient('CLI005').id,
      client_name: getClient('CLI005').company_name,
      client_cpf_cnpj: getClient('CLI005').cpf_cnpj,
      status: 'new',
      freight_type: 'shared',
      freight_payer: 'cif',
      payment_terms: '15_days',
      origin: getClient('CLI005').address,
      collection_date: today,
      collection_time: 'afternoon',
      recipients: [{
        name: 'Confecções Vale Norte',
        cnpj_cpf: '60.016.016/0001-16',
        cep: '12308-010',
        street: 'Rua Vale Jacareí',
        number: '100',
        neighborhood: 'Centro',
        city: 'Jacareí',
        state: 'SP',
        items: [{
          nf_number: '1020',
          volumes: 10,
          weight_kg: 180,
          declared_value: 9000.0,
          description: 'Tecidos em fardos',
          package_type: 'caixa',
          height_cm: 45,
          width_cm: 45,
          length_cm: 45
        }]
      }],
      total_volumes: 10,
      total_weight_kg: 180,
      total_declared_value: 9000.0,
      freight_value: 237.0,
      payment_method: 'transfer',
      payment_status: 'pending',
      general_notes: 'Pedido de teste P16',
      status_history: [{ status: 'new', timestamp: new Date().toISOString(), user: 'Admin', note: 'Coleta criada pelo painel de teste' }]
    }
  ];

  const { error: ordersError } = await supabase.from('orders').insert(orders);
  if (ordersError) console.error('Erro ao salvar pedidos:', ordersError.message);
  else console.log('16 pedidos salvos com sucesso!');
}

run().catch(console.error);

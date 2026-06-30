import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';

import { lazy, Suspense } from 'react';

// Guards e layout — leves, carregados de imediato
import AdminLayout from '@/components/admin/AdminLayout';
import AdminRoute from '@/components/auth/AdminRoute';
import OperatorRoute from '@/components/auth/OperatorRoute';
import DriverRoute from '@/components/auth/DriverRoute';
import ClientRoute from '@/components/auth/ClientRoute';
import CarrierRoute from '@/components/auth/CarrierRoute';

// Auth pages — primeiro contato, mantidas eager
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import NoAccess from '@/pages/NoAccess';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Demais páginas — carregadas sob demanda (code splitting)
const Home = lazy(() => import('@/pages/Home'));
const BookingForm = lazy(() => import('@/pages/BookingForm'));
const Tracking = lazy(() => import('@/pages/Tracking'));
const QuickQuote = lazy(() => import('@/pages/QuickQuote'));
const QuoteForm = lazy(() => import('@/pages/QuoteForm'));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const OperationsHub = lazy(() => import('@/pages/admin/OperationsHub'));
const OrdersWorkspace = lazy(() => import('@/pages/admin/OrdersWorkspace'));
const Cotacao = lazy(() => import('@/pages/admin/Cotacao'));
const DispatchBoard = lazy(() => import('@/pages/admin/DispatchBoard'));
const Replanning = lazy(() => import('@/pages/admin/Replanning'));
const Incidents = lazy(() => import('@/pages/admin/Incidents'));
const Indicators = lazy(() => import('@/pages/admin/Indicators'));
const Transfers = lazy(() => import('@/pages/admin/Transfers'));
const OrderWorkspace = lazy(() => import('@/pages/admin/OrderWorkspace'));
const NewOrder = lazy(() => import('@/pages/admin/NewOrder'));
const TruckDetailPage = lazy(() => import('@/pages/admin/TruckDetailPage'));
const DriverDetailPage = lazy(() => import('@/pages/admin/DriverDetailPage'));
const Trips = lazy(() => import('@/pages/admin/Trips'));
const NewTrip = lazy(() => import('@/pages/admin/NewTrip'));
const TripDetailPage = lazy(() => import('@/pages/admin/TripDetailPage'));
const ClientDetailPage = lazy(() => import('@/pages/admin/ClientDetailPage'));
const CadastrosPage = lazy(() => import('@/pages/admin/CadastrosPage'));
const Documents = lazy(() => import('@/pages/admin/Documents'));
const Messages = lazy(() => import('@/pages/admin/Messages'));
const AlertsPage = lazy(() => import('@/pages/admin/AlertsPage'));
const FrotaPage = lazy(() => import('@/pages/admin/FrotaPage'));
const FinanceiroPage = lazy(() => import('@/pages/admin/FinanceiroPage'));
const ConfigPage = lazy(() => import('@/pages/admin/ConfigPage'));
const ClientAccess = lazy(() => import('@/pages/admin/ClientAccess'));
const Carriers = lazy(() => import('@/pages/admin/Carriers'));
const CarrierAccess = lazy(() => import('@/pages/admin/CarrierAccess'));
const DriverHome = lazy(() => import('@/pages/driver/DriverHome'));
const DriverTrip = lazy(() => import('@/pages/driver/DriverTrip'));
const DriverHistory = lazy(() => import('@/pages/driver/DriverHistory'));
const PortalLayout = lazy(() => import('@/pages/portal/PortalLayout'));
const ClientOrders = lazy(() => import('@/pages/portal/ClientOrders'));
const ClientOrderDetail = lazy(() => import('@/pages/portal/ClientOrderDetail'));
const ClientNewOrder = lazy(() => import('@/pages/portal/ClientNewOrder'));
const ClientInvoices = lazy(() => import('@/pages/portal/ClientInvoices'));
const ClientRegister = lazy(() => import('@/pages/portal/ClientRegister'));
const CarrierLayout = lazy(() => import('@/pages/carrier/CarrierLayout'));
const CarrierOffers = lazy(() => import('@/pages/carrier/CarrierOffers'));
const CarrierOrders = lazy(() => import('@/pages/carrier/CarrierOrders'));
const CarrierOrderDetail = lazy(() => import('@/pages/carrier/CarrierOrderDetail'));
const CarrierRegister = lazy(() => import('@/pages/carrier/CarrierRegister'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-velox-dark">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-velox-amber/20 border-t-velox-amber rounded-full animate-spin mx-auto" />
          <p className="text-white/40 text-sm mt-4 font-heading">Carregando...</p>
        </div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-velox-amber/20 border-t-velox-amber rounded-full animate-spin" />
      </div>
    }>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/agendar" element={<BookingForm />} />
      <Route path="/cotacao" element={<QuoteForm />} />
      <Route path="/cotacao-avancada" element={<QuickQuote />} />
      <Route path="/rastrear" element={<Tracking />} />

      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/portal/cadastro" element={<ClientRegister />} />
      <Route path="/parceiro/cadastro" element={<CarrierRegister />} />
      <Route path="/sem-acesso" element={<NoAccess />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected admin routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AdminLayout />}>
          {/* Rotas operacionais — admin e operador (inclui Painel e detalhe da viagem) */}
          <Route element={<OperatorRoute />}>
            <Route path="/admin" element={<OperationsHub />} />
            <Route path="/admin/viagens/:id" element={<TripDetailPage />} />
            {/* Pedidos (nova rota canônica) */}
            <Route path="/admin/coletas" element={<OrdersWorkspace />} />
            <Route path="/admin/coletas/nova" element={<NewOrder />} />
            <Route path="/admin/cotacao" element={<Cotacao />} />
            <Route path="/admin/coletas/:id" element={<OrderWorkspace />} />

            {/* Despacho (novo quadro) */}
            <Route path="/admin/despacho" element={<DispatchBoard />} />
            <Route path="/admin/replanejamento" element={<Replanning />} />
            <Route path="/admin/ocorrencias" element={<Incidents />} />
            <Route path="/admin/transferencias" element={<Transfers />} />

            {/* Redirecionamentos legados */}
            <Route path="/admin/pedidos" element={<Navigate to="/admin/coletas" replace />} />
            <Route path="/admin/pedidos/novo" element={<Navigate to="/admin/coletas/nova" replace />} />
            <Route path="/admin/pedidos/:id" element={<Navigate to="/admin/coletas" replace />} />
            <Route path="/admin/operacoes" element={<Navigate to="/admin/despacho" replace />} />
            <Route path="/admin/programacao" element={<Navigate to="/admin/despacho" replace />} />
            <Route path="/admin/agenda" element={<Navigate to="/admin/despacho" replace />} />
            <Route path="/admin/motoristas" element={<Navigate to="/admin/frota" replace />} />
            <Route path="/admin/motoristas/:id" element={<DriverDetailPage />} />
            <Route path="/admin/documentos" element={<Documents />} />
            <Route path="/admin/mensagens" element={<Messages />} />
            <Route path="/admin/alertas" element={<AlertsPage />} />
            <Route path="/admin/mapa" element={<Navigate to="/admin/config" replace />} />
            <Route path="/admin/carregamento" element={<Navigate to="/admin/frota" replace />} />

            {/* Frota (unificada) */}
            <Route path="/admin/frota" element={<FrotaPage />} />
            <Route path="/admin/frota/:id" element={<TruckDetailPage />} />

            {/* Viagens */}
            <Route path="/admin/viagens" element={<Trips />} />
            <Route path="/admin/viagens/nova" element={<NewTrip />} />

            {/* Cadastros (unificado) */}
            <Route path="/admin/cadastros" element={<CadastrosPage />} />
            <Route path="/admin/clientes" element={<Navigate to="/admin/cadastros" replace />} />
            <Route path="/admin/clientes/:id" element={<ClientDetailPage />} />
            <Route path="/admin/transportadoras" element={<Carriers />} />
            <Route path="/admin/fornecedores" element={<Navigate to="/admin/cadastros?aba=fornecedores" replace />} />
          </Route>

          {/* Gestão — admin only */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/financeiro" element={<FinanceiroPage />} />
            <Route path="/admin/financeiro/receitas" element={<Navigate to="/admin/financeiro?aba=receitas" replace />} />
            <Route path="/admin/financeiro/despesas" element={<Navigate to="/admin/financeiro?aba=despesas" replace />} />
            <Route path="/admin/financeiro/dre" element={<Navigate to="/admin/financeiro?aba=dre" replace />} />
            <Route path="/admin/financeiro/fluxo" element={<Navigate to="/admin/financeiro?aba=fluxo" replace />} />
            <Route path="/admin/config" element={<ConfigPage />} />
            <Route path="/admin/configuracoes" element={<Navigate to="/admin/config" replace />} />
            <Route path="/admin/usuarios" element={<UserManagement />} />
            <Route path="/admin/indicadores" element={<Indicators />} />
            <Route path="/admin/portal-clientes" element={<ClientAccess />} />
            <Route path="/admin/portal-parceiros" element={<CarrierAccess />} />
          </Route>
        </Route>
      </Route>

      {/* Driver routes */}
      <Route element={<DriverRoute />}>
        <Route path="/motorista" element={<DriverHome />} />
        <Route path="/motorista/viagem/:id" element={<DriverTrip />} />
        <Route path="/motorista/historico" element={<DriverHistory />} />
      </Route>

      {/* Portal do Cliente */}
      <Route element={<ClientRoute />}>
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<ClientOrders />} />
          <Route path="novo" element={<ClientNewOrder />} />
          <Route path="pedido/:id" element={<ClientOrderDetail />} />
          <Route path="faturas" element={<ClientInvoices />} />
        </Route>
      </Route>

      {/* Portal da Transportadora (parceiro subcontratado) */}
      <Route element={<CarrierRoute />}>
        <Route path="/parceiro" element={<CarrierLayout />}>
          <Route index element={<CarrierOffers />} />
          <Route path="cargas" element={<CarrierOrders />} />
          <Route path="carga/:id" element={<CarrierOrderDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
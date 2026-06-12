import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

// Public pages
import Home from '@/pages/Home';
import BookingForm from '@/pages/BookingForm';
import Tracking from '@/pages/Tracking';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Admin layout
import AdminLayout from '@/components/admin/AdminLayout';

// Admin pages
import Dashboard from '@/pages/admin/Dashboard';
import Orders from '@/pages/admin/Orders';
import NewOrder from '@/pages/admin/NewOrder';
import OrderDetailPage from '@/pages/admin/OrderDetailPage';
import TruckDetailPage from '@/pages/admin/TruckDetailPage';
import DriverDetailPage from '@/pages/admin/DriverDetailPage';
import Trips from '@/pages/admin/Trips';
import NewTrip from '@/pages/admin/NewTrip';
import TripDetailPage from '@/pages/admin/TripDetailPage';
import ClientDetailPage from '@/pages/admin/ClientDetailPage';
import AdminRoute from '@/components/auth/AdminRoute';
import OperatorRoute from '@/components/auth/OperatorRoute';
import AgendaPage from '@/pages/admin/AgendaPage';
import CadastrosPage from '@/pages/admin/CadastrosPage';
import QuickQuote from '@/pages/QuickQuote';
import QuoteForm from '@/pages/QuoteForm';
import FrotaPage from '@/pages/admin/FrotaPage';
import FinanceiroPage from '@/pages/admin/FinanceiroPage';
import ConfigPage from '@/pages/admin/ConfigPage';
import DriverRoute from '@/components/auth/DriverRoute';
import DriverHome from '@/pages/driver/DriverHome';
import DriverTrip from '@/pages/driver/DriverTrip';
import DriverHistory from '@/pages/driver/DriverHistory';

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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected admin routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AdminLayout />}>
          {/* Dashboard — todos */}
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/viagens/:id" element={<TripDetailPage />} />

          {/* Rotas operacionais — admin e operador */}
          <Route element={<OperatorRoute />}>
            {/* Coletas (nova rota canônica) */}
            <Route path="/admin/coletas" element={<Orders />} />
            <Route path="/admin/coletas/nova" element={<NewOrder />} />
            <Route path="/admin/coletas/:id" element={<OrderDetailPage />} />

            {/* Redirecionamentos legados */}
            <Route path="/admin/pedidos" element={<Navigate to="/admin/coletas" replace />} />
            <Route path="/admin/pedidos/novo" element={<Navigate to="/admin/coletas/nova" replace />} />
            <Route path="/admin/pedidos/:id" element={<Navigate to="/admin/coletas" replace />} />
            <Route path="/admin/operacoes" element={<Navigate to="/admin/agenda" replace />} />
            <Route path="/admin/programacao" element={<Navigate to="/admin/agenda" replace />} />
            <Route path="/admin/motoristas" element={<Navigate to="/admin/frota" replace />} />
            <Route path="/admin/motoristas/:id" element={<DriverDetailPage />} />
            <Route path="/admin/alertas" element={<Navigate to="/admin/config" replace />} />
            <Route path="/admin/documentos" element={<Navigate to="/admin/config" replace />} />
            <Route path="/admin/mapa" element={<Navigate to="/admin/config" replace />} />
            <Route path="/admin/carregamento" element={<Navigate to="/admin/frota" replace />} />

            {/* Programação (unificada) */}
            <Route path="/admin/agenda" element={<AgendaPage />} />

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
          </Route>
        </Route>
      </Route>

      {/* Driver routes */}
      <Route element={<DriverRoute />}>
        <Route path="/motorista" element={<DriverHome />} />
        <Route path="/motorista/viagem/:id" element={<DriverTrip />} />
        <Route path="/motorista/historico" element={<DriverHistory />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
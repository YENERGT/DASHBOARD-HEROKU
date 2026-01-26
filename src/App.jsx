import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/shared/Layout';
import Home from './pages/Home';
import FELDashboard from './pages/FELDashboard';
import ExpensesDashboard from './pages/ExpensesDashboard';
import ProductsDashboard from './pages/ProductsDashboard';
import Login from './pages/Login';
import UsersManagement from './pages/UsersManagement';
import ShippingGuides from './pages/ShippingGuides';
import GuidesHistory from './pages/GuidesHistory';
import Payments from './pages/Payments';
import PaymentsHistory from './pages/PaymentsHistory';
import MisVentas from './pages/MisVentas';
import VentasVendedores from './pages/VentasVendedores';

// Componente para proteger rutas
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir si la ruta es solo para admin y el usuario no es admin
  if (adminOnly && !isAdmin) {
    return <Navigate to="/mis-ventas" replace />;
  }

  return children;
}

// Componente para redirigir según el rol
function RoleBasedRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si es vendedor, ir a mis-ventas; si es admin, mostrar Home
  if (user?.role === 'ventas') {
    return <Navigate to="/mis-ventas" replace />;
  }

  return (
    <Layout>
      <Home />
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />

      {/* Ruta principal - redirige según rol */}
      <Route path="/" element={
        <ProtectedRoute>
          <RoleBasedRedirect />
        </ProtectedRoute>
      } />
      <Route path="/dashboard-fel" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <FELDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard-gastos" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <ExpensesDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard-productos" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <ProductsDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/usuarios" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <UsersManagement />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/guias-envio" element={
        <ProtectedRoute>
          <Layout>
            <ShippingGuides />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/historial-guias" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <GuidesHistory />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/pagos" element={
        <ProtectedRoute>
          <Layout>
            <Payments />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/historial-pagos" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <PaymentsHistory />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/mis-ventas" element={
        <ProtectedRoute>
          <Layout>
            <MisVentas />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/ventas-vendedores" element={
        <ProtectedRoute adminOnly>
          <Layout>
            <VentasVendedores />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Ruta por defecto */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

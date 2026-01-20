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

// Componente para proteger rutas
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

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

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<Login />} />

      {/* Rutas protegidas */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Home />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard-fel" element={
        <ProtectedRoute>
          <Layout>
            <FELDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard-gastos" element={
        <ProtectedRoute>
          <Layout>
            <ExpensesDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard-productos" element={
        <ProtectedRoute>
          <Layout>
            <ProductsDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/usuarios" element={
        <ProtectedRoute>
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
        <ProtectedRoute>
          <Layout>
            <GuidesHistory />
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

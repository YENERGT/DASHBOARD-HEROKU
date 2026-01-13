import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Escuchar cambios en localStorage para sincronizar estado de colapso
  useEffect(() => {
    const handleStorage = () => {
      setSidebarCollapsed(localStorage.getItem('sidebarCollapsed') === 'true');
    };

    window.addEventListener('storage', handleStorage);

    // También verificar periódicamente para cambios locales
    const interval = setInterval(() => {
      const currentValue = localStorage.getItem('sidebarCollapsed') === 'true';
      if (currentValue !== sidebarCollapsed) {
        setSidebarCollapsed(currentValue);
      }
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [sidebarCollapsed]);

  // Calcular margen izquierdo basado en estado del sidebar
  const mainMargin = isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-16' : 'ml-64');

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className={`transition-all duration-300 ${mainMargin}`}>
        {/* Header móvil */}
        {isMobile && (
          <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-700">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Botón hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <MenuIcon className="w-6 h-6" />
              </button>

              {/* Logo centro */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-lg">
                  📈
                </div>
                <span className="font-bold text-white">Dashboard</span>
              </div>

              {/* Avatar usuario */}
              <div className="w-8 h-8">
                {user?.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Header desktop - más compacto */}
        {!isMobile && (
          <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
            <div className="flex items-center justify-between px-6 py-3">
              {/* Fecha actual */}
              <div>
                <p className="text-sm text-slate-400">
                  {new Date().toLocaleDateString('es-GT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Info del sistema */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Sistema FEL Guatemala</p>
                  <p className="text-xs text-slate-600">v1.0.0</p>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Contenido principal */}
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800 mt-8">
          <div className="px-4 md:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
              <p>© 2025 Dashboard Heroku - Sistema FEL Guatemala</p>
              <p>Grupo Revisa</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Icono de menú hamburger
const MenuIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default Layout;

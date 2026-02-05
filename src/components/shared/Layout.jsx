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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setSidebarCollapsed(localStorage.getItem('sidebarCollapsed') === 'true');
    };

    window.addEventListener('storage', handleStorage);

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

  const mainMargin = isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-16' : 'ml-60');

  const getRoleBadge = () => {
    const role = user?.role;
    if (role === 'admin') return 'bg-[#8B5CF6]';
    if (role === 'ventas') return 'bg-[#3B82F6]';
    return 'bg-[#10B981]';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
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
          <header className="sticky top-0 z-30 bg-[#0A0A0A] border-b border-[#1F1F1F]">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Botón hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-[#6B7280] hover:text-white hover:bg-[#1A1A1A] transition-colors"
              >
                <MenuIcon className="w-6 h-6" />
              </button>

              {/* Logo centro */}
              <div className="flex items-center gap-2">
                <span className="text-[#10B981] text-xl font-bold">&gt;_</span>
                <span className="font-bold text-white">terminal.db</span>
              </div>

              {/* Avatar usuario */}
              <div className={`w-8 h-8 ${getRoleBadge()} flex items-center justify-center text-[#0A0A0A] font-bold text-sm`}>
                {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </header>
        )}

        {/* Header desktop */}
        {!isMobile && (
          <header className="sticky top-0 z-30 bg-[#0A0A0A]/90 backdrop-blur-sm border-b border-[#1F1F1F]">
            <div className="flex items-center justify-between px-6 py-3">
              {/* Fecha actual */}
              <div>
                <p className="text-sm text-[#6B7280]">
                  // {new Date().toLocaleDateString('es-GT', {
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
                  <p className="text-xs text-[#4B5563]">sistema_fel_guatemala</p>
                  <p className="text-xs text-[#10B981]">v1.0.0</p>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Contenido principal */}
        <main className="p-4 md:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#1F1F1F] mt-8">
          <div className="px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#4B5563]">
              <p>// dashboard_heroku - sistema_fel_guatemala</p>
              <p className="text-[#10B981]">&copy; {new Date().getFullYear()} grupo_revisa</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

const MenuIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default Layout;

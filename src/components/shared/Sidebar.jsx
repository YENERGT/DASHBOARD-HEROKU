import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ isOpen, setIsOpen, isMobile }) => {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Recuperar estado guardado en localStorage (solo desktop)
    if (typeof window !== 'undefined' && !isMobile) {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });

  // Guardar estado en localStorage cuando cambie (solo desktop)
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
    }
  }, [isCollapsed, isMobile]);

  const navItems = [
    {
      section: 'PRINCIPAL',
      items: [
        { path: '/dashboard-fel', label: 'Dashboard FEL', icon: ChartIcon },
        { path: '/dashboard-gastos', label: 'Gastos', icon: MoneyIcon },
        { path: '/dashboard-productos', label: 'Productos', icon: BoxIcon },
      ]
    },
    ...(isAdmin ? [{
      section: 'ADMINISTRACIÓN',
      items: [
        { path: '/usuarios', label: 'Usuarios', icon: UsersIcon },
      ]
    }] : [])
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = () => {
    // En móvil, cerrar sidebar al navegar
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Determinar ancho del sidebar
  const sidebarWidth = isMobile ? 'w-72' : (isCollapsed ? 'w-16' : 'w-64');

  return (
    <>
      {/* Overlay para móvil */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-700 z-50
          transition-all duration-300 ease-in-out
          ${sidebarWidth}
          ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header del Sidebar */}
          <div className={`p-4 border-b border-slate-700 ${isCollapsed && !isMobile ? 'px-2' : ''}`}>
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3" onClick={handleNavClick}>
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                  📈
                </div>
                {(!isCollapsed || isMobile) && (
                  <div className="overflow-hidden">
                    <h1 className="text-lg font-bold text-white whitespace-nowrap">Dashboard</h1>
                    <p className="text-xs text-slate-400 whitespace-nowrap">Sistema FEL</p>
                  </div>
                )}
              </Link>

              {/* Botón cerrar en móvil */}
              {isMobile && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto py-4">
            {navItems.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6">
                {/* Título de sección */}
                {(!isCollapsed || isMobile) && (
                  <h3 className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {group.section}
                  </h3>
                )}

                {/* Items de navegación */}
                <ul className="space-y-1 px-2">
                  {group.items.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={handleNavClick}
                        title={isCollapsed && !isMobile ? item.label : undefined}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                          ${isActive(item.path)
                            ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 -ml-0.5 pl-2.5'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }
                          ${isCollapsed && !isMobile ? 'justify-center' : ''}
                        `}
                      >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive(item.path) ? 'text-blue-400' : ''}`} />
                        {(!isCollapsed || isMobile) && (
                          <span className="font-medium whitespace-nowrap">{item.label}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer del Sidebar - Usuario */}
          <div className={`border-t border-slate-700 p-4 ${isCollapsed && !isMobile ? 'px-2' : ''}`}>
            {/* Info del usuario */}
            {(!isCollapsed || isMobile) && (
              <div className="mb-3 px-2">
                <div className="flex items-center gap-3">
                  {user?.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user?.displayName || user?.email}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      user?.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      user?.role === 'ventas' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de logout */}
            <button
              onClick={logout}
              title={isCollapsed && !isMobile ? 'Cerrar Sesión' : undefined}
              className={`
                flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
                text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors
                ${isCollapsed && !isMobile ? 'justify-center' : ''}
              `}
            >
              <LogoutIcon className="w-5 h-5 flex-shrink-0" />
              {(!isCollapsed || isMobile) && (
                <span className="font-medium">Cerrar Sesión</span>
              )}
            </button>

            {/* Botón colapsar/expandir (solo desktop) */}
            {!isMobile && (
              <button
                onClick={toggleCollapse}
                className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors justify-center"
                title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="w-5 h-5" />
                ) : (
                  <>
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span className="font-medium">Colapsar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

// Iconos SVG como componentes
const ChartIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const MoneyIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BoxIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const LogoutIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const CloseIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronLeftIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default Sidebar;

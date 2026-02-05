import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ isOpen, setIsOpen, isMobile }) => {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && !isMobile) {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
    }
  }, [isCollapsed, isMobile]);

  const canAccessGuides = user?.role === 'admin' || user?.role === 'ventas';
  const isVentas = user?.role === 'ventas';

  const navItems = [
    ...(isAdmin ? [{
      section: '// principal',
      items: [
        { path: '/', label: '$ home', icon: '>' },
        { path: '/dashboard-fel', label: '$ dashboard_fel', icon: '>' },
        { path: '/dashboard-gastos', label: '$ gastos', icon: '>' },
        { path: '/dashboard-productos', label: '$ productos', icon: '>' },
      ]
    }] : []),
    ...(canAccessGuides ? [{
      section: '// ventas',
      items: [
        ...(isVentas ? [{ path: '/mis-ventas', label: '$ mis_ventas', icon: '>' }] : []),
        { path: '/guias-envio', label: '$ guias --envio', icon: '>' },
        { path: '/pagos', label: '$ pagos', icon: '>' },
        ...(isVentas ? [{ path: '/devoluciones', label: '$ devoluciones', icon: '>' }] : []),
      ]
    }] : []),
    ...(isAdmin ? [{
      section: '// admin',
      items: [
        { path: '/ventas-vendedores', label: '$ ventas --vendedores', icon: '>' },
        { path: '/devoluciones', label: '$ devoluciones', icon: '>' },
        { path: '/productos-agotados', label: '$ productos --agotados', icon: '>' },
        { path: '/historial-guias', label: '$ guias --historial', icon: '>' },
        { path: '/historial-pagos', label: '$ pagos --historial', icon: '>' },
        { path: '/usuarios', label: '$ usuarios --admin', icon: '>' },
      ]
    }] : [])
  ];

  const isActive = (path) => location.pathname === path;

  const handleNavClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const sidebarWidth = isMobile ? 'w-72' : (isCollapsed ? 'w-16' : 'w-60');

  const getRoleBadge = () => {
    const role = user?.role;
    if (role === 'admin') return { bg: 'bg-[#8B5CF6]', text: 'text-[#0A0A0A]', label: 'admin' };
    if (role === 'ventas') return { bg: 'bg-[#3B82F6]', text: 'text-[#0A0A0A]', label: 'ventas' };
    return { bg: 'bg-[#10B981]', text: 'text-[#0A0A0A]', label: 'bodega' };
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-[#0A0A0A] border-r border-[#1F1F1F] z-50
          transition-all duration-300 ease-in-out
          ${sidebarWidth}
          ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header del Sidebar */}
          <div className={`p-4 border-b border-[#1F1F1F] ${isCollapsed && !isMobile ? 'px-2' : ''}`}>
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3" onClick={handleNavClick}>
                <span className="text-[#10B981] text-2xl font-bold">&gt;_</span>
                {(!isCollapsed || isMobile) && (
                  <div className="overflow-hidden">
                    <h1 className="text-lg font-bold text-white whitespace-nowrap">terminal.db</h1>
                  </div>
                )}
              </Link>

              {isMobile && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-[#6B7280] hover:text-white hover:bg-[#1A1A1A] transition-colors"
                >
                  <span className="text-lg">&times;</span>
                </button>
              )}
            </div>
          </div>

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto py-4">
            {navItems.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-6">
                {(!isCollapsed || isMobile) && (
                  <h3 className="px-4 mb-2 text-xs text-[#4B5563]">
                    {group.section}
                  </h3>
                )}

                <ul className="space-y-1 px-2">
                  {group.items.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={handleNavClick}
                        title={isCollapsed && !isMobile ? item.label : undefined}
                        className={`
                          flex items-center gap-2 px-3 py-2 transition-all duration-200
                          ${isActive(item.path)
                            ? 'bg-[#10B981] text-[#0A0A0A] font-semibold'
                            : 'text-[#6B7280] hover:text-white hover:bg-[#1A1A1A]'
                          }
                          ${isCollapsed && !isMobile ? 'justify-center' : ''}
                        `}
                      >
                        <span className={`font-bold ${isActive(item.path) ? 'text-[#0A0A0A]' : 'text-[#10B981]'}`}>
                          {item.icon}
                        </span>
                        {(!isCollapsed || isMobile) && (
                          <span className="text-sm whitespace-nowrap">{item.label.replace('$ ', '')}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer del Sidebar - Usuario */}
          <div className={`border-t border-[#1F1F1F] p-4 ${isCollapsed && !isMobile ? 'px-2' : ''}`}>
            {(!isCollapsed || isMobile) && (
              <div className="mb-3 px-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 ${getRoleBadge().bg} flex items-center justify-center text-[#0A0A0A] font-bold text-sm flex-shrink-0`}>
                    {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{user?.displayName || user?.email}</p>
                    <span className={`text-xs px-2 py-0.5 ${getRoleBadge().bg} ${getRoleBadge().text}`}>
                      {getRoleBadge().label}
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
                flex items-center gap-2 w-full px-3 py-2
                text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors
                ${isCollapsed && !isMobile ? 'justify-center' : ''}
              `}
            >
              <span className="font-bold">x</span>
              {(!isCollapsed || isMobile) && (
                <span className="text-sm">$ logout</span>
              )}
            </button>

            {/* Botón colapsar/expandir (solo desktop) */}
            {!isMobile && (
              <button
                onClick={toggleCollapse}
                className="flex items-center gap-2 w-full px-3 py-2 mt-2 text-[#6B7280] hover:text-white hover:bg-[#1A1A1A] transition-colors justify-center"
                title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              >
                {isCollapsed ? (
                  <span>&gt;&gt;</span>
                ) : (
                  <>
                    <span>&lt;&lt;</span>
                    <span className="text-sm">colapsar</span>
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

export default Sidebar;

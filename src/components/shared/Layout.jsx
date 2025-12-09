import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Inicio', icon: '🏠' },
    { path: '/dashboard-fel', label: 'Dashboard FEL', icon: '📊' },
    { path: '/dashboard-gastos', label: 'Gastos', icon: '💰' },
    { path: '/dashboard-productos', label: 'Productos', icon: '📦' }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-card border-b border-dark-border sticky top-0 z-50">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 rounded-lg flex items-center justify-center text-lg sm:text-xl">
                📈
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-white">Dashboard Heroku</h1>
                <p className="text-xs text-gray-400 hidden sm:block">Sistema de Gestión FEL</p>
              </div>
            </div>

            {/* Fecha actual */}
            <div className="text-right hidden md:block">
              <p className="text-sm text-gray-400">
                {new Date().toLocaleDateString('es-GT', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-xs text-gray-500">
                {new Date().toLocaleTimeString('es-GT')}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-dark-card border-b border-dark-border overflow-x-auto scrollbar-hide">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex gap-0.5 sm:gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2
                  px-2 sm:px-6 py-2 sm:py-4
                  text-xs sm:text-sm font-medium transition-all duration-200
                  border-b-2 whitespace-nowrap min-w-[60px] sm:min-w-0
                  ${isActive(item.path)
                    ? 'border-primary-500 text-primary-400 bg-dark-hover'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-dark-hover'
                  }
                `}
              >
                <span className="text-lg sm:text-lg">{item.icon}</span>
                <span className="text-[9px] sm:text-sm leading-tight sm:leading-normal text-center sm:text-left">
                  {item.label === 'Dashboard FEL' ?
                    <><span className="sm:hidden">FEL</span><span className="hidden sm:inline">Dashboard FEL</span></> :
                   item.label === 'Dashboard Gastos' ?
                    <><span className="sm:hidden">Gastos</span><span className="hidden sm:inline">Gastos</span></> :
                   item.label === 'Dashboard Productos' ?
                    <><span className="sm:hidden">Productos</span><span className="hidden sm:inline">Productos</span></> :
                   item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-dark-card border-t border-dark-border mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-gray-500">
            <p className="text-center sm:text-left">© 2025 Dashboard Heroku - Sistema FEL Guatemala</p>
            <p>Versión 1.0.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

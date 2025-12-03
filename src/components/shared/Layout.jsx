import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Inicio', icon: '🏠' },
    { path: '/dashboard-fel', label: 'Dashboard FEL', icon: '📊' },
    { path: '/dashboard-gastos', label: 'Gastos', icon: '💰' }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-card border-b border-dark-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-xl">
                📈
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Dashboard Heroku</h1>
                <p className="text-xs text-gray-400">Sistema de Gestión FEL</p>
              </div>
            </div>

            {/* Fecha actual */}
            <div className="text-right">
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
      <nav className="bg-dark-card border-b border-dark-border">
        <div className="container mx-auto px-4">
          <div className="flex gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all duration-200
                  border-b-2
                  ${isActive(item.path)
                    ? 'border-primary-500 text-primary-400 bg-dark-hover'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-dark-hover'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
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
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>© 2025 Dashboard Heroku - Sistema FEL Guatemala</p>
            <p>Versión 1.0.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

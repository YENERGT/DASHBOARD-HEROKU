import React, { useState, useEffect } from 'react';
import Card from '../components/shared/Card';
import Table from '../components/shared/Table';
import PeriodSelector from '../components/shared/PeriodSelector';
import DateSelector from '../components/shared/DateSelector';
import dataService from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const MisVentas = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [periodType, setPeriodType] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.displayName) return;

      setLoading(true);
      try {
        // Obtener ventas del vendedor
        const salesData = await dataService.getSalesByVendor(
          user.displayName,
          periodType,
          selectedDate
        );
        setMetrics(salesData);

        // Obtener top productos del vendedor
        const products = await dataService.getVendorTopProducts(
          user.displayName,
          periodType,
          selectedDate,
          5
        );
        setTopProducts(products);

        // Calcular datos diarios para el gráfico
        if (salesData.current.data) {
          const daily = {};
          salesData.current.data
            .filter(inv => inv.estado === 'paid')
            .forEach(inv => {
              const date = new Date(inv.fecha).toLocaleDateString('es-GT', {
                day: '2-digit',
                month: 'short'
              });
              if (!daily[date]) {
                daily[date] = { date, total: 0, count: 0 };
              }
              daily[date].total += inv.totalGeneral;
              daily[date].count += 1;
            });
          setDailyData(Object.values(daily).reverse());
        }
      } catch (error) {
        console.error('Error loading vendor sales:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Resetear paginación y búsqueda al cambiar período/fecha
    setVisibleCount(25);
    setSearchTerm('');
  }, [user, periodType, selectedDate]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando tus ventas...</p>
        </div>
      </div>
    );
  }

  const tableColumns = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value) => {
        const date = new Date(value);
        return (
          <span className="text-gray-300">
            {date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}
            <span className="text-gray-500 ml-2 text-xs">
              {date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
        );
      }
    },
    {
      header: 'Pedido',
      accessor: 'pedido',
      render: (value) => <span className="font-semibold text-primary-400">{value}</span>
    },
    {
      header: 'Cliente',
      accessor: 'nombreNit',
      render: (value) => <span className="truncate max-w-xs block">{value}</span>
    },
    {
      header: 'Total',
      accessor: 'totalGeneral',
      render: (value) => <span className="font-semibold text-green-400">{formatCurrency(value)}</span>
    },
    {
      header: 'Estado',
      accessor: 'estado',
      render: (value) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          value === 'paid'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {value === 'paid' ? 'Pagado' : 'Anulado'}
        </span>
      )
    }
  ];

  const paidCount = metrics.current.data.filter(inv => inv.estado === 'paid').length;
  const periodLabel = periodType === 'day' ? 'ayer' : periodType === 'month' ? 'mes anterior' : 'año anterior';

  // Filtrar datos por búsqueda
  const filteredData = metrics.current.data.filter(inv => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const pedido = (inv.pedido || '').toLowerCase();
    const nit = (inv.nit || '').toLowerCase();
    const nombreNit = (inv.nombreNit || '').toLowerCase();
    return pedido.includes(term) || nit.includes(term) || nombreNit.includes(term);
  });

  // Datos visibles con paginación
  const visibleData = filteredData.slice(0, visibleCount);
  const hasMore = filteredData.length > visibleCount;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 25);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Mis Ventas</h1>
          <p className="text-gray-400">
            Bienvenido, <span className="text-blue-400 font-medium">{user?.displayName}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PeriodSelector selectedPeriod={periodType} onPeriodChange={setPeriodType} />
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            periodType={periodType}
          />
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Ventas"
          value={formatCurrency(metrics.current.total)}
          icon="💰"
          comparison={`vs ${periodLabel}: ${formatCurrency(metrics.previous.total)}`}
          trend={metrics.comparison.total}
        />
        <Card
          title="Facturas"
          value={paidCount}
          icon="📋"
          comparison={`vs ${periodLabel}: ${metrics.previous.count}`}
          trend={metrics.comparison.count}
        />
        <Card
          title="Ticket Promedio"
          value={formatCurrency(metrics.current.average)}
          icon="🎯"
          comparison={`vs ${periodLabel}: ${formatCurrency(metrics.previous.average)}`}
          trend={metrics.comparison.average}
        />
        <Card
          title="IVA Generado"
          value={formatCurrency(metrics.current.totalIVA)}
          icon="💳"
          comparison={`vs ${periodLabel}: ${formatCurrency(metrics.previous.totalIVA)}`}
          trend={metrics.comparison.totalIVA}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Ventas por Día */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Ventas por Día</h2>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `Q${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Total']}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No hay datos para mostrar
            </div>
          )}
        </div>

        {/* Top Productos */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Mis Top Productos</h2>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300' :
                      index === 2 ? 'bg-amber-600/20 text-amber-500' :
                      'bg-slate-600/20 text-slate-400'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium truncate max-w-[200px]">{product.nombre}</p>
                      <p className="text-xs text-gray-500">{product.cantidad} vendidos</p>
                    </div>
                  </div>
                  <span className="text-green-400 font-semibold">{formatCurrency(product.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-500">
              No hay productos vendidos en este período
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Historial de Ventas</h2>
            <span className="text-sm text-gray-400">
              {searchTerm ? `${filteredData.length} de ${metrics.current.data.length}` : metrics.current.data.length} registros
            </span>
          </div>
          {/* Buscador */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por pedido, NIT o cliente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(25); // Resetear paginación al buscar
              }}
              className="w-full md:w-80 px-4 py-2 pl-10 bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {filteredData.length > 0 ? (
          <>
            <Table columns={tableColumns} data={visibleData} />
            {/* Botón Ver Más */}
            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-3 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors font-medium"
                >
                  Ver más ({filteredData.length - visibleCount} restantes)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-dark-card border border-dark-border rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">{searchTerm ? '🔍' : '📋'}</div>
            <p className="text-gray-400">
              {searchTerm
                ? `No se encontraron ventas con "${searchTerm}"`
                : 'No tienes ventas registradas en este período'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MisVentas;

import { useState, useEffect } from 'react';
import Card from '../components/shared/Card';
import Table from '../components/shared/Table';
import PeriodSelector from '../components/shared/PeriodSelector';
import DateSelector from '../components/shared/DateSelector';
import dataService from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
        <p className="text-[#6B7280] font-mono">$ cargando ventas<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  const tableColumns = [
    {
      header: 'fecha',
      accessor: 'fecha',
      render: (value) => {
        const date = new Date(value);
        return (
          <span className="text-[#FAFAFA] font-mono text-sm">
            {date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}
            <span className="text-[#4B5563] ml-2 text-xs">
              {date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
        );
      }
    },
    {
      header: 'pedido',
      accessor: 'pedido',
      render: (value) => <span className="font-semibold text-[#10B981]">#{value}</span>
    },
    {
      header: 'cliente',
      accessor: 'nombreNit',
      render: (value) => <span className="truncate max-w-xs block text-[#FAFAFA]">{value}</span>
    },
    {
      header: 'total',
      accessor: 'totalGeneral',
      render: (value) => <span className="font-semibold text-white">{formatCurrency(value)}</span>
    },
    {
      header: 'estado',
      accessor: 'estado',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-mono ${
          value === 'paid'
            ? 'bg-[#10B981]/20 text-[#10B981]'
            : 'bg-[#EF4444]/20 text-[#EF4444]'
        }`}>
          {value === 'paid' ? '[pagado]' : '[anulado]'}
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
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-[#10B981]">&gt;</span> mis_ventas
          </h1>
          <p className="text-[#6B7280] text-sm">
            // vendedor: <span className="text-[#3B82F6]">{user?.displayName}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full md:w-auto">
          <PeriodSelector selectedPeriod={periodType} onPeriodChange={setPeriodType} />
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            periodType={periodType}
          />
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="total_ventas"
          value={formatCurrency(metrics.current.total)}
          icon="$"
          comparison={`// vs ${periodLabel}: ${formatCurrency(metrics.previous.total)}`}
          trend={metrics.comparison.total?.percentage}
        />
        <Card
          title="facturas"
          value={paidCount}
          icon="#"
          comparison={`// vs ${periodLabel}: ${metrics.previous.count}`}
          trend={metrics.comparison.count?.percentage}
        />
        <Card
          title="ticket_promedio"
          value={formatCurrency(metrics.current.average)}
          icon="~"
          comparison={`// vs ${periodLabel}: ${formatCurrency(metrics.previous.average)}`}
          trend={metrics.comparison.average?.percentage}
        />
        <Card
          title="iva_generado"
          value={formatCurrency(metrics.current.totalIVA)}
          icon="%"
          comparison={`// vs ${periodLabel}: ${formatCurrency(metrics.previous.totalIVA)}`}
          trend={metrics.comparison.totalIVA?.percentage}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Ventas por Día */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> ventas_por_dia
          </h2>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} tickFormatter={(v) => `Q${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid #1F1F1F',
                    borderRadius: '0',
                    color: '#FAFAFA'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Total']}
                />
                <Bar dataKey="total" fill="#3B82F6" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-[#4B5563]">
              // no hay datos para mostrar
            </div>
          )}
        </div>

        {/* Top Productos */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> top_productos
          </h2>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#1A1A1A] border border-[#1F1F1F]"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center text-sm font-bold font-mono ${
                      index === 0 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                      index === 1 ? 'bg-[#6B7280]/20 text-[#6B7280]' :
                      index === 2 ? 'bg-[#F59E0B]/10 text-[#F59E0B]/70' :
                      'bg-[#1F1F1F] text-[#4B5563]'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium truncate max-w-[200px]">{product.nombre}</p>
                      <p className="text-xs text-[#4B5563]">// {product.cantidad} vendidos</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-[#4B5563]">
              // no hay productos vendidos
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              <span className="text-[#10B981]">&gt;</span> historial_ventas
            </h2>
            <span className="text-sm text-[#4B5563]">
              // {searchTerm ? `${filteredData.length} de ${metrics.current.data.length}` : metrics.current.data.length} registros
            </span>
          </div>
          {/* Buscador */}
          <div className="relative">
            <input
              type="text"
              placeholder="$ buscar pedido, NIT, cliente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(25);
              }}
              className="w-full md:w-80 px-4 py-2 pl-10 bg-[#111111] border border-[#1F1F1F] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#10B981] font-mono text-sm"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#4B5563]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#4B5563] hover:text-white"
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
                  className="px-6 py-3 bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 transition-colors font-mono"
                >
                  $ ver_mas --restantes {filteredData.length - visibleCount}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-[#111111] border border-[#1F1F1F] p-12 text-center">
            <p className="text-[#4B5563] font-mono text-lg mb-2">
              {searchTerm ? '$ grep --no-results' : '$ ls --empty'}
            </p>
            <p className="text-[#4B5563] text-sm">
              {searchTerm
                ? `// no se encontraron ventas con "${searchTerm}"`
                : '// no tienes ventas en este periodo'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MisVentas;

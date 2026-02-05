import { useState, useEffect } from 'react';
import Card from '../components/shared/Card';
import Table from '../components/shared/Table';
import PeriodSelector from '../components/shared/PeriodSelector';
import DateSelector from '../components/shared/DateSelector';
import PDFModal from '../components/shared/PDFModal';
import dataService from '../services/dataService';
import { formatCurrency, getTopClients, groupByHour, groupByDay, groupByMonth } from '../utils/calculations';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const FELDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [metrics, setMetrics] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [searchNIT, setSearchNIT] = useState('');
  const [pdfModal, setPdfModal] = useState({ isOpen: false, url: '', invoiceNumber: '' });

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedDate]);

  // Auto-actualización cada 2 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Actualizando datos automáticamente...');
      loadData();
    }, 120000); // 120000ms = 2 minutos

    return () => clearInterval(interval);
  }, [selectedPeriod, selectedDate]);

  const loadData = async () => {
    try {
      let periodMetrics;

      // Usar la fecha seleccionada en lugar de "hoy"
      periodMetrics = await dataService.getInvoicesByPeriod(selectedPeriod, selectedDate);

      setMetrics(periodMetrics);

      // Obtener top clientes del período actual (solo facturas pagadas)
      const paidInvoices = periodMetrics.current.data.filter(inv => inv.estado === 'paid');
      const clients = getTopClients(paidInvoices, 10, 'total');
      setTopClients(clients);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6B7280] font-mono">$ cargando dashboard<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  const getPreviousPeriodLabel = () => {
    switch(selectedPeriod) {
      case 'day':
        return 'Ayer';
      case 'month':
        return 'Mes anterior';
      case 'year':
        return 'Año anterior';
      default:
        return '';
    }
  };

  // Datos para gráfica comparativa
  const comparisonData = [
    {
      name: 'Actual',
      'Ingresos Totales': metrics.current.total,
      'Ingresos sin IVA': metrics.current.totalSinIVA,
      IVA: metrics.current.totalIVA
    },
    {
      name: 'Anterior',
      'Ingresos Totales': metrics.previous.total,
      'Ingresos sin IVA': metrics.previous.totalSinIVA,
      IVA: metrics.previous.totalIVA
    }
  ];

  // Datos dinámicos para gráfica de facturas según período
  const getInvoiceAnalysisData = () => {
    // Solo usar facturas pagadas para los gráficos
    const paidInvoices = metrics.current.data.filter(inv => inv.estado === 'paid');

    switch(selectedPeriod) {
      case 'day':
        // Mostrar datos por hora
        return groupByHour(paidInvoices);
      case 'month':
        // Mostrar datos por día usando la fecha seleccionada
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        return groupByDay(paidInvoices, year, month);
      case 'year':
        // Mostrar datos por mes
        return groupByMonth(paidInvoices);
      default:
        return [];
    }
  };

  const invoiceAnalysisData = getInvoiceAnalysisData();

  // Obtener la clave del eje X según el período
  const getXAxisKey = () => {
    switch(selectedPeriod) {
      case 'day':
        return 'hour';
      case 'month':
        return 'day';
      case 'year':
        return 'month';
      default:
        return 'hour';
    }
  };

  const invoiceTableColumns = [
    {
      header: 'pedido',
      accessor: 'pedido',
      render: (value) => <span className="font-mono text-[#10B981]">#{value}</span>
    },
    {
      header: 'cliente',
      accessor: 'nombreNit',
      render: (value) => <span className="truncate max-w-xs block text-[#FAFAFA]">{value}</span>
    },
    {
      header: 'nit',
      accessor: 'nit',
      render: (value) => <span className="font-mono text-sm text-[#6B7280]">{value}</span>
    },
    {
      header: 'total',
      accessor: 'totalGeneral',
      render: (value) => <span className="font-semibold text-white">{formatCurrency(value)}</span>
    },
    {
      header: 'iva',
      accessor: 'totalIVA',
      render: (value) => <span className="text-sm text-[#F59E0B]">{formatCurrency(value)}</span>
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
    },
    {
      header: 'fecha',
      accessor: 'fecha',
      render: (value) => {
        const date = new Date(value);
        return (
          <div className="text-sm font-mono">
            <div className="text-[#FAFAFA]">{date.toLocaleDateString('es-GT')}</div>
            <div className="text-xs text-[#4B5563]">{date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );
      }
    },
    {
      header: 'acciones',
      accessor: 'pdfUrl',
      render: (value, row) => (
        <button
          onClick={() => setPdfModal({ isOpen: true, url: value, invoiceNumber: row.pedido })}
          className="text-[#3B82F6] hover:text-[#60A5FA] transition-colors cursor-pointer font-mono text-sm"
        >
          $ ver_pdf
        </button>
      )
    }
  ];

  // Filtrar y limitar facturas
  const getFilteredInvoices = () => {
    let invoices = metrics.current.data;

    // Filtrar por NIT o Pedido si hay búsqueda
    if (searchNIT.trim() !== '') {
      const searchTerm = searchNIT.toLowerCase();
      invoices = invoices.filter(invoice =>
        (invoice.nit && invoice.nit.toLowerCase().includes(searchTerm)) ||
        (invoice.pedido && invoice.pedido.toLowerCase().includes(searchTerm))
      );
      // Si hay búsqueda, mostrar todos los resultados sin límite
      return invoices;
    }

    // Sin búsqueda, limitar a las últimas 20 transacciones
    return invoices.slice(0, 20);
  };

  const clientTableColumns = [
    {
      header: '#',
      accessor: 'index',
      render: (_, _row, index) => <span className="text-[#4B5563] font-mono">#{index + 1}</span>
    },
    {
      header: 'cliente',
      accessor: 'nombre',
      render: (value) => <span className="font-medium text-[#FAFAFA]">{value}</span>
    },
    {
      header: 'nit',
      accessor: 'nit',
      render: (value) => <span className="font-mono text-sm text-[#6B7280]">{value}</span>
    },
    {
      header: 'compras',
      accessor: 'count',
      render: (value) => <span className="font-semibold text-white">{value}</span>
    },
    {
      header: 'total_gastado',
      accessor: 'total',
      render: (value) => <span className="font-bold text-[#10B981]">{formatCurrency(value)}</span>
    }
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header con selector de período y fecha */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <span className="text-[#10B981]">&gt;</span> dashboard_fel
            </h1>
            <p className="text-sm text-[#6B7280]">
              // {metrics.current.period.label}
            </p>
          </div>
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </div>

        {/* Selector de fecha */}
        <div className="flex justify-end">
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            periodType={selectedPeriod}
          />
        </div>
      </div>

      {/* Métricas Principales con Comparativas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="ingresos_totales"
          value={formatCurrency(metrics.current.total)}
          icon="$"
          comparison={`// vs ${getPreviousPeriodLabel().toLowerCase()}: ${formatCurrency(metrics.previous.total)}`}
          trend={metrics.comparison.total?.percentage}
        />
        <Card
          title="total_facturas"
          value={metrics.current.count}
          icon="#"
          comparison={`// vs ${getPreviousPeriodLabel().toLowerCase()}: ${metrics.previous.count}`}
          trend={metrics.comparison.count?.percentage}
        />
        <Card
          title="iva_total"
          value={formatCurrency(metrics.current.totalIVA)}
          icon="%"
          comparison={`// vs ${getPreviousPeriodLabel().toLowerCase()}: ${formatCurrency(metrics.previous.totalIVA)}`}
          trend={metrics.comparison.totalIVA?.percentage}
        />
        <Card
          title="ingresos_sin_iva"
          value={formatCurrency(metrics.current.totalSinIVA)}
          icon="~"
          subtitle={`// promedio: ${formatCurrency(metrics.current.average)}`}
        />
      </div>

      {/* Gráficas Comparativas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfica de Ingresos Comparativos */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> comparativa_ingresos
          </h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[400px] md:min-w-0 px-4 md:px-0">
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid #1F1F1F',
                  borderRadius: '0',
                  color: '#FAFAFA'
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend wrapperStyle={{ color: '#FAFAFA' }} />
              <Bar dataKey="Ingresos Totales" fill="#3B82F6" />
              <Bar dataKey="Ingresos sin IVA" fill="#10B981" />
              <Bar dataKey="IVA" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráfica de Facturas */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> analisis_facturas
          </h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[400px] md:min-w-0 px-4 md:px-0">
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
            <LineChart data={invoiceAnalysisData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
              <XAxis dataKey={getXAxisKey()} stroke="#6B7280" />
              <YAxis yAxisId="left" stroke="#6B7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid #1F1F1F',
                  borderRadius: '0',
                  color: '#FAFAFA'
                }}
                formatter={(value, name) => {
                  if (name === 'Monto') {
                    return formatCurrency(value);
                  }
                  return value;
                }}
              />
              <Legend wrapperStyle={{ color: '#FAFAFA' }} />
              <Line yAxisId="left" type="monotone" dataKey="Facturas" stroke="#8B5CF6" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="Monto" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Clientes */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">
          <span className="text-[#10B981]">&gt;</span> top_clientes --limit 10
        </h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <Table columns={clientTableColumns} data={topClients} />
          </div>
        </div>
      </div>

      {/* Tabla Detallada de Facturas */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4">
          <h2 className="text-lg font-bold text-white">
            <span className="text-[#10B981]">&gt;</span> facturas_detalladas
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <input
              id="searchNIT"
              type="text"
              value={searchNIT}
              onChange={(e) => setSearchNIT(e.target.value)}
              placeholder="$ grep nit|pedido..."
              className="px-3 md:px-4 py-2 text-sm bg-[#111111] border border-[#1F1F1F] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#10B981] w-full sm:w-auto font-mono"
            />
            {searchNIT && (
              <button
                onClick={() => setSearchNIT('')}
                className="px-3 py-2 bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30 transition-colors text-sm font-mono"
                title="Limpiar búsqueda"
              >
                x
              </button>
            )}
          </div>
        </div>
        <div className="text-xs md:text-sm text-[#4B5563] mb-2 font-mono">
          {searchNIT ? (
            <>
              // resultados: <span className="text-[#10B981]">{getFilteredInvoices().length}</span> | query: <span className="text-[#10B981]">{searchNIT}</span>
            </>
          ) : (
            <>// mostrando ultimas 20 transacciones</>
          )}
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <Table columns={invoiceTableColumns} data={getFilteredInvoices()} />
          </div>
        </div>
      </div>

      {/* Modal para visualizar PDF */}
      <PDFModal
        isOpen={pdfModal.isOpen}
        onClose={() => setPdfModal({ isOpen: false, url: '', invoiceNumber: '' })}
        pdfUrl={pdfModal.url}
        invoiceNumber={pdfModal.invoiceNumber}
      />
    </div>
  );
};

export default FELDashboard;

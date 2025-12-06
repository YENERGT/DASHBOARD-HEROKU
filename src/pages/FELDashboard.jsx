import React, { useState, useEffect } from 'react';
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
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  const getPeriodLabel = () => {
    switch(selectedPeriod) {
      case 'day':
        return 'Hoy';
      case 'month':
        return 'Este Mes';
      case 'year':
        return 'Este Año';
      default:
        return '';
    }
  };

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

  // Obtener el título de la gráfica según el período
  const getChartTitle = () => {
    switch(selectedPeriod) {
      case 'day':
        return 'Análisis de Facturas por Hora';
      case 'month':
        return 'Análisis de Facturas por Día';
      case 'year':
        return 'Análisis de Facturas por Mes';
      default:
        return 'Análisis de Facturas';
    }
  };

  const invoiceTableColumns = [
    {
      header: 'Pedido',
      accessor: 'pedido',
      render: (value) => <span className="font-mono text-primary-400">{value}</span>
    },
    {
      header: 'Cliente',
      accessor: 'nombreNit',
      render: (value) => <span className="truncate max-w-xs block">{value}</span>
    },
    {
      header: 'NIT',
      accessor: 'nit',
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    {
      header: 'Total',
      accessor: 'totalGeneral',
      render: (value) => <span className="font-semibold">{formatCurrency(value)}</span>
    },
    {
      header: 'IVA',
      accessor: 'totalIVA',
      render: (value) => <span className="text-sm">{formatCurrency(value)}</span>
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
          {value === 'paid' ? '✅ Paid' : '❌ Anulado'}
        </span>
      )
    },
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value) => {
        const date = new Date(value);
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString('es-GT')}</div>
            <div className="text-xs text-gray-500">{date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );
      }
    },
    {
      header: 'Acciones',
      accessor: 'pdfUrl',
      render: (value, row) => (
        <button
          onClick={() => setPdfModal({ isOpen: true, url: value, invoiceNumber: row.pedido })}
          className="text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
        >
          📄 Ver PDF
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
      render: (value, row, index) => <span className="text-gray-500">{index + 1}</span>
    },
    {
      header: 'Cliente',
      accessor: 'nombre',
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      header: 'NIT',
      accessor: 'nit',
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    {
      header: 'Compras',
      accessor: 'count',
      render: (value) => <span className="font-semibold">{value}</span>
    },
    {
      header: 'Total Gastado',
      accessor: 'total',
      render: (value) => <span className="font-bold text-primary-400">{formatCurrency(value)}</span>
    }
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header con selector de período y fecha */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Dashboard FEL</h1>
            <p className="text-sm md:text-base text-gray-400">
              Análisis de ingresos y facturación - {metrics.current.period.label}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card
          title={`Ingresos ${getPeriodLabel()}`}
          value={formatCurrency(metrics.current.total)}
          icon="💰"
          comparison={`${getPreviousPeriodLabel()}: ${formatCurrency(metrics.previous.total)}`}
          trend={metrics.comparison.total}
        />
        <Card
          title="Total Facturas"
          value={metrics.current.count}
          icon="📊"
          comparison={`${getPreviousPeriodLabel()}: ${metrics.previous.count} facturas`}
          trend={metrics.comparison.count}
        />
        <Card
          title="IVA Total"
          value={formatCurrency(metrics.current.totalIVA)}
          icon="💳"
          comparison={`${getPreviousPeriodLabel()}: ${formatCurrency(metrics.previous.totalIVA)}`}
          trend={metrics.comparison.totalIVA}
        />
        <Card
          title="Ingresos sin IVA"
          value={formatCurrency(metrics.current.totalSinIVA)}
          icon="📈"
          subtitle={`Promedio: ${formatCurrency(metrics.current.average)}`}
        />
      </div>

      {/* Gráficas Comparativas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Gráfica de Ingresos Comparativos */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4">
            Comparativa de Ingresos: {getPeriodLabel()} vs {getPreviousPeriodLabel()}
          </h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[400px] md:min-w-0 px-4 md:px-0">
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0'
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              <Bar dataKey="Ingresos Totales" fill="#0ea5e9" />
              <Bar dataKey="Ingresos sin IVA" fill="#10b981" />
              <Bar dataKey="IVA" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráfica de Facturas */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4">{getChartTitle()}</h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[400px] md:min-w-0 px-4 md:px-0">
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
            <LineChart data={invoiceAnalysisData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey={getXAxisKey()} stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0'
                }}
                formatter={(value, name) => {
                  if (name === 'Monto') {
                    return formatCurrency(value);
                  }
                  return value;
                }}
              />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              <Line yAxisId="left" type="monotone" dataKey="Facturas" stroke="#8b5cf6" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="Monto" stroke="#ec4899" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top 10 Clientes */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-white mb-4">Top 10 Clientes por Monto</h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <Table columns={clientTableColumns} data={topClients} />
          </div>
        </div>
      </div>

      {/* Tabla Detallada de Facturas */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4">
          <h2 className="text-lg md:text-xl font-bold text-white">
            Facturas Detalladas - {getPeriodLabel()}
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <label htmlFor="searchNIT" className="text-gray-400 text-sm hidden sm:block">
              Buscar:
            </label>
            <input
              id="searchNIT"
              type="text"
              value={searchNIT}
              onChange={(e) => setSearchNIT(e.target.value)}
              placeholder="NIT o Pedido..."
              className="px-3 md:px-4 py-2 text-sm md:text-base bg-dark-card border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full sm:w-auto"
            />
            {searchNIT && (
              <button
                onClick={() => setSearchNIT('')}
                className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm md:text-base"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="text-xs md:text-sm text-gray-400 mb-2">
          {searchNIT ? (
            <>
              Mostrando <span className="font-semibold text-primary-400">{getFilteredInvoices().length}</span> resultado(s) para: <span className="font-mono text-primary-400">{searchNIT}</span>
            </>
          ) : (
            <>Mostrando las últimas 20 transacciones</>
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

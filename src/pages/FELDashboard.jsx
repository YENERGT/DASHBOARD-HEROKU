import React, { useState, useEffect } from 'react';
import Card from '../components/shared/Card';
import Table from '../components/shared/Table';
import PeriodSelector from '../components/shared/PeriodSelector';
import dataService from '../services/dataService';
import { formatCurrency, getTopClients } from '../utils/calculations';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const FELDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [metrics, setMetrics] = useState(null);
  const [topClients, setTopClients] = useState([]);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = () => {
    let periodMetrics;

    switch(selectedPeriod) {
      case 'day':
        periodMetrics = dataService.getTodayMetrics();
        break;
      case 'month':
        periodMetrics = dataService.getMonthMetrics();
        break;
      case 'year':
        periodMetrics = dataService.getYearMetrics();
        break;
      default:
        periodMetrics = dataService.getTodayMetrics();
    }

    setMetrics(periodMetrics);

    // Obtener top clientes del período actual
    const clients = getTopClients(periodMetrics.current.data, 10, 'total');
    setTopClients(clients);
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

  // Datos para gráfica de facturas
  const invoiceComparisonData = [
    {
      name: getPeriodLabel(),
      Facturas: metrics.current.count,
      Promedio: metrics.current.average
    },
    {
      name: getPreviousPeriodLabel(),
      Facturas: metrics.previous.count,
      Promedio: metrics.previous.average
    }
  ];

  const invoiceTableColumns = [
    {
      header: 'Serie',
      accessor: 'serie',
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
      render: (value) => (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-400 hover:text-primary-300 transition-colors"
        >
          📄 Ver PDF
        </a>
      )
    }
  ];

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
    <div className="space-y-8">
      {/* Header con selector de período */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard FEL</h1>
          <p className="text-gray-400">
            Análisis de ingresos y facturación - {metrics.current.period.label}
          </p>
        </div>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Métricas Principales con Comparativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica de Ingresos Comparativos */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Comparativa de Ingresos: {getPeriodLabel()} vs {getPreviousPeriodLabel()}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
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

        {/* Gráfica de Facturas */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Análisis de Facturas</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={invoiceComparisonData}>
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
              />
              <Legend wrapperStyle={{ color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="Facturas" stroke="#8b5cf6" strokeWidth={2} />
              <Line type="monotone" dataKey="Promedio" stroke="#ec4899" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 10 Clientes */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Top 10 Clientes por Monto</h2>
        <Table columns={clientTableColumns} data={topClients} />
      </div>

      {/* Tabla Detallada de Facturas */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Facturas Detalladas - {getPeriodLabel()}
        </h2>
        <Table columns={invoiceTableColumns} data={metrics.current.data} />
      </div>
    </div>
  );
};

export default FELDashboard;

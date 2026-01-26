import React, { useState, useEffect } from 'react';
import Card from '../components/shared/Card';
import Table from '../components/shared/Table';
import PeriodSelector from '../components/shared/PeriodSelector';
import DateSelector from '../components/shared/DateSelector';
import dataService from '../services/dataService';
import { formatCurrency } from '../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const VentasVendedores = () => {
  const [summary, setSummary] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorDetail, setVendorDetail] = useState(null);
  const [periodType, setPeriodType] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      try {
        const data = await dataService.getAllVendorsSummary(periodType, selectedDate);
        setSummary(data);
      } catch (error) {
        console.error('Error loading vendors summary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
    setSelectedVendor(null);
    setVendorDetail(null);
  }, [periodType, selectedDate]);

  useEffect(() => {
    const loadVendorDetail = async () => {
      if (!selectedVendor) {
        setVendorDetail(null);
        return;
      }

      try {
        const sales = await dataService.getSalesByVendor(selectedVendor, periodType, selectedDate);
        const products = await dataService.getVendorTopProducts(selectedVendor, periodType, selectedDate, 5);
        setVendorDetail({ sales, products });
      } catch (error) {
        console.error('Error loading vendor detail:', error);
      }
    };

    loadVendorDetail();
  }, [selectedVendor, periodType, selectedDate]);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando resumen de vendedores...</p>
        </div>
      </div>
    );
  }

  const rankingColumns = [
    {
      header: '#',
      accessor: 'rank',
      render: (_, row, index) => (
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
          index === 1 ? 'bg-gray-400/20 text-gray-300' :
          index === 2 ? 'bg-amber-600/20 text-amber-500' :
          'bg-slate-600/20 text-slate-400'
        }`}>
          {index + 1}
        </span>
      )
    },
    {
      header: 'Vendedor',
      accessor: 'vendedor',
      render: (value) => (
        <button
          onClick={() => setSelectedVendor(value)}
          className="text-blue-400 hover:text-blue-300 font-medium hover:underline text-left"
        >
          {value}
        </button>
      )
    },
    {
      header: 'Total Ventas',
      accessor: 'total',
      render: (value) => <span className="font-semibold text-green-400">{formatCurrency(value)}</span>
    },
    {
      header: 'Facturas',
      accessor: 'paid',
      render: (value) => <span className="text-white">{value}</span>
    },
    {
      header: 'Anuladas',
      accessor: 'cancelled',
      render: (value) => (
        <span className={value > 0 ? 'text-red-400' : 'text-gray-500'}>{value}</span>
      )
    },
    {
      header: 'Promedio',
      accessor: 'average',
      render: (value) => <span className="text-gray-300">{formatCurrency(value)}</span>
    }
  ];

  const detailColumns = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      render: (value) => {
        const date = new Date(value);
        return (
          <span className="text-gray-300">
            {date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}
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
      render: (value) => <span className="truncate max-w-[150px] block">{value}</span>
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
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          value === 'paid'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {value === 'paid' ? 'Pagado' : 'Anulado'}
        </span>
      )
    }
  ];

  const chartData = summary.vendors
    .filter(v => v.total > 0)
    .slice(0, 8)
    .map((v, i) => ({
      name: v.vendedor.split(' ')[0], // Solo primer nombre para el gráfico
      fullName: v.vendedor,
      total: v.total,
      color: COLORS[i % COLORS.length]
    }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Ventas por Vendedor</h1>
          <p className="text-gray-400">
            Resumen y análisis del rendimiento de cada vendedor
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PeriodSelector value={periodType} onChange={setPeriodType} />
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            periodType={periodType}
          />
        </div>
      </div>

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Total Ventas"
          value={formatCurrency(summary.totals.totalSales)}
          icon="💰"
          comparison={`${summary.totals.totalPaid} facturas pagadas`}
        />
        <Card
          title="Vendedores Activos"
          value={summary.totals.activeVendors}
          icon="👥"
          comparison={`de ${summary.vendors.length} registrados`}
        />
        <Card
          title="Promedio por Vendedor"
          value={formatCurrency(summary.totals.activeVendors > 0 ? summary.totals.totalSales / summary.totals.activeVendors : 0)}
          icon="📊"
          comparison="promedio de ventas"
        />
        <Card
          title="Facturas Anuladas"
          value={summary.totals.totalCancelled}
          icon="❌"
          comparison={`${summary.totals.totalInvoices > 0 ? ((summary.totals.totalCancelled / summary.totals.totalInvoices) * 100).toFixed(1) : 0}% del total`}
        />
      </div>

      {/* Gráfico y Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Comparación de Ventas</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `Q${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                  formatter={(value, name, props) => [formatCurrency(value), props.payload.fullName]}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-gray-500">
              No hay datos para mostrar
            </div>
          )}
        </div>

        {/* Tabla Ranking */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Ranking de Vendedores</h2>
          <div className="overflow-y-auto max-h-[350px]">
            <Table columns={rankingColumns} data={summary.vendors.filter(v => v.vendedor !== 'Sin asignar')} />
          </div>
        </div>
      </div>

      {/* Detalle del Vendedor Seleccionado */}
      {selectedVendor && vendorDetail && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Detalle: {selectedVendor}</h2>
              <p className="text-sm text-gray-400">
                {vendorDetail.sales.current.data.length} ventas en el período
              </p>
            </div>
            <button
              onClick={() => setSelectedVendor(null)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Métricas del vendedor */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Total Ventas</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(vendorDetail.sales.current.total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {vendorDetail.sales.current.count} facturas
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Ticket Promedio</p>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(vendorDetail.sales.current.average)}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Comparación</p>
              <p className={`text-2xl font-bold ${vendorDetail.sales.comparison.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {vendorDetail.sales.comparison.total >= 0 ? '+' : ''}{vendorDetail.sales.comparison.total.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">vs período anterior</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Productos */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Top Productos</h3>
              {vendorDetail.products.length > 0 ? (
                <div className="space-y-2">
                  {vendorDetail.products.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">{index + 1}.</span>
                        <span className="text-white truncate max-w-[180px]">{product.nombre}</span>
                      </div>
                      <span className="text-green-400 text-sm">{product.cantidad} uds</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Sin productos</p>
              )}
            </div>

            {/* Últimas Ventas */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Últimas Ventas</h3>
              <div className="overflow-y-auto max-h-[200px]">
                <Table columns={detailColumns} data={vendorDetail.sales.current.data.slice(0, 5)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ventas sin vendedor asignado */}
      {summary.vendors.find(v => v.vendedor === 'Sin asignar' && v.count > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-yellow-400 font-medium">Ventas sin vendedor asignado</p>
              <p className="text-sm text-gray-400">
                Hay {summary.vendors.find(v => v.vendedor === 'Sin asignar')?.count || 0} ventas sin vendedor en la columna R
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasVendedores;

import React, { useState, useEffect } from 'react';
import Card from '../components/shared/Card';
import Table from '../components/shared/Table';
import dataService from '../services/dataService';
import { formatCurrency } from '../utils/calculations';
import { groupByChannel } from '../utils/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const Home = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [channelData, setChannelData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Obtener métricas del día
        const todayMetrics = await dataService.getTodayMetrics();
        setMetrics(todayMetrics);

        // Obtener últimas transacciones
        const transactions = await dataService.getRecentTransactions(5);
        setRecentTransactions(transactions);

        // Obtener datos por canal
        const channels = groupByChannel(todayMetrics.current.data);
        setChannelData(channels);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const tableColumns = [
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
      render: (value) => <span className="font-semibold">{formatCurrency(value)}</span>
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
          {value === 'paid' ? '✅ Pagado' : '❌ Anulado'}
        </span>
      )
    },
    {
      header: 'Hora',
      accessor: 'fecha',
      render: (value) => {
        const date = new Date(value);
        return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
      }
    }
  ];

  const paidCount = metrics.current.data.filter(inv => inv.estado === 'paid').length;
  const cancelledCount = metrics.current.data.length - paidCount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Resumen del Día</h1>
        <p className="text-gray-400">
          Vista general de las operaciones de hoy - {new Date().toLocaleDateString('es-GT')}
        </p>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Ventas del Día"
          value={formatCurrency(metrics.current.total)}
          icon="💰"
          comparison={`vs ayer: ${formatCurrency(metrics.previous.total)}`}
          trend={metrics.comparison.total}
        />
        <Card
          title="Facturas Emitidas"
          value={metrics.current.count}
          icon="📋"
          comparison={`vs ayer: ${metrics.previous.count} facturas`}
          trend={metrics.comparison.count}
        />
        <Card
          title="IVA Recaudado"
          value={formatCurrency(metrics.current.totalIVA)}
          icon="💳"
          comparison={`vs ayer: ${formatCurrency(metrics.previous.totalIVA)}`}
          trend={metrics.comparison.totalIVA}
        />
        <Card
          title="Ticket Promedio"
          value={formatCurrency(metrics.current.average)}
          icon="🎯"
          comparison={`vs ayer: ${formatCurrency(metrics.previous.average)}`}
          trend={metrics.comparison.average}
        />
      </div>

      {/* Ventas por Canal y Estado de Facturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por Canal */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Ventas por Canal</h2>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0'
                  }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend
                  wrapperStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay datos de canales</p>
          )}
        </div>

        {/* Estado de Facturas */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Estado de Facturas</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-2xl">
                  ✅
                </div>
                <div>
                  <p className="text-sm text-gray-400">Facturas Pagadas</p>
                  <p className="text-2xl font-bold text-white">{paidCount}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 text-2xl font-bold">
                  {metrics.current.count > 0 ? ((paidCount / metrics.current.count) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-2xl">
                  ❌
                </div>
                <div>
                  <p className="text-sm text-gray-400">Facturas Anuladas</p>
                  <p className="text-2xl font-bold text-white">{cancelledCount}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-red-400 text-2xl font-bold">
                  {metrics.current.count > 0 ? ((cancelledCount / metrics.current.count) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-dark-border">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Facturas</span>
                <span className="text-xl font-bold text-white">{metrics.current.count}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Últimas Transacciones */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Últimas Transacciones</h2>
        <Table columns={tableColumns} data={recentTransactions} />
      </div>
    </div>
  );
};

export default Home;

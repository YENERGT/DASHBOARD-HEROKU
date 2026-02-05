import { useState, useEffect } from 'react';
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

    // Auto-actualización cada 2 minutos
    const interval = setInterval(() => {
      console.log('🔄 Actualizando datos del Home automáticamente...');
      loadData();
    }, 120000); // 120000ms = 2 minutos

    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6B7280] font-mono">$ cargando datos<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  const tableColumns = [
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
    },
    {
      header: 'hora',
      accessor: 'fecha',
      render: (value) => {
        const date = new Date(value);
        return <span className="text-[#6B7280] font-mono">{date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</span>;
      }
    }
  ];

  const paidCount = metrics.current.data.filter(inv => inv.estado === 'paid').length;
  const cancelledCount = metrics.current.data.length - paidCount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          <span className="text-[#10B981]">&gt;</span> resumen_del_dia
        </h1>
        <p className="text-[#6B7280] text-sm">
          // operaciones de hoy - {new Date().toLocaleDateString('es-GT')}
        </p>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="ventas_del_dia"
          value={formatCurrency(metrics.current.total)}
          icon="$"
          comparison={`// vs ayer: ${formatCurrency(metrics.previous.total)}`}
          trend={metrics.comparison.total?.percentage}
        />
        <Card
          title="facturas_emitidas"
          value={metrics.current.count}
          icon="#"
          comparison={`// vs ayer: ${metrics.previous.count} facturas`}
          trend={metrics.comparison.count?.percentage}
        />
        <Card
          title="iva_recaudado"
          value={formatCurrency(metrics.current.totalIVA)}
          icon="%"
          comparison={`// vs ayer: ${formatCurrency(metrics.previous.totalIVA)}`}
          trend={metrics.comparison.totalIVA?.percentage}
        />
        <Card
          title="ticket_promedio"
          value={formatCurrency(metrics.current.average)}
          icon="~"
          comparison={`// vs ayer: ${formatCurrency(metrics.previous.average)}`}
          trend={metrics.comparison.average?.percentage}
        />
      </div>

      {/* Ventas por Canal y Estado de Facturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ventas por Canal */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> ventas_por_canal
          </h2>
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
                    backgroundColor: '#111111',
                    border: '1px solid #1F1F1F',
                    borderRadius: '0',
                    color: '#FAFAFA'
                  }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend
                  wrapperStyle={{ color: '#FAFAFA' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#4B5563] text-center py-8">// no hay datos de canales</p>
          )}
        </div>

        {/* Estado de Facturas */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> estado_facturas
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#10B981]/10 border border-[#10B981]/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#10B981]/20 flex items-center justify-center text-[#10B981] font-bold text-xl">
                  ++
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">// facturas_pagadas</p>
                  <p className="text-2xl font-bold text-white">{paidCount}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#10B981] text-2xl font-bold font-mono">
                  [{metrics.current.count > 0 ? ((paidCount / metrics.current.count) * 100).toFixed(0) : 0}%]
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#EF4444]/10 border border-[#EF4444]/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#EF4444]/20 flex items-center justify-center text-[#EF4444] font-bold text-xl">
                  --
                </div>
                <div>
                  <p className="text-sm text-[#6B7280]">// facturas_anuladas</p>
                  <p className="text-2xl font-bold text-white">{cancelledCount}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#EF4444] text-2xl font-bold font-mono">
                  [{metrics.current.count > 0 ? ((cancelledCount / metrics.current.count) * 100).toFixed(0) : 0}%]
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1F1F1F]">
              <div className="flex justify-between items-center">
                <span className="text-[#6B7280]">// total_facturas</span>
                <span className="text-xl font-bold text-white">{metrics.current.count}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Últimas Transacciones */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">
          <span className="text-[#10B981]">&gt;</span> ultimas_transacciones
        </h2>
        <Table columns={tableColumns} data={recentTransactions} />
      </div>
    </div>
  );
};

export default Home;

import { useState, useEffect } from 'react';
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
        <p className="text-[#6B7280] font-mono">$ cargando vendedores<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  const rankingColumns = [
    {
      header: '#',
      accessor: 'rank',
      render: (_, _row, index) => (
        <span className={`w-8 h-8 flex items-center justify-center text-sm font-bold font-mono ${
          index === 0 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
          index === 1 ? 'bg-[#6B7280]/20 text-[#6B7280]' :
          index === 2 ? 'bg-[#F59E0B]/10 text-[#F59E0B]/70' :
          'bg-[#1F1F1F] text-[#4B5563]'
        }`}>
          #{index + 1}
        </span>
      )
    },
    {
      header: 'vendedor',
      accessor: 'vendedor',
      render: (value) => (
        <button
          onClick={() => setSelectedVendor(value)}
          className="text-[#3B82F6] hover:text-[#3B82F6]/80 font-medium text-left"
        >
          {value}
        </button>
      )
    },
    {
      header: 'total_ventas',
      accessor: 'total',
      render: (value) => <span className="font-mono font-bold text-[#10B981]">{formatCurrency(value)}</span>
    },
    {
      header: 'facturas',
      accessor: 'paid',
      render: (value) => <span className="text-white font-mono">{value}</span>
    },
    {
      header: 'anuladas',
      accessor: 'cancelled',
      render: (value) => (
        <span className={`font-mono ${value > 0 ? 'text-[#EF4444]' : 'text-[#4B5563]'}`}>{value}</span>
      )
    },
    {
      header: 'promedio',
      accessor: 'average',
      render: (value) => <span className="text-[#6B7280] font-mono">{formatCurrency(value)}</span>
    }
  ];

  const detailColumns = [
    {
      header: 'fecha',
      accessor: 'fecha',
      render: (value) => {
        const date = new Date(value);
        return (
          <span className="text-[#FAFAFA] font-mono">
            {date.toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}
          </span>
        );
      }
    },
    {
      header: 'pedido',
      accessor: 'pedido',
      render: (value) => <span className="font-mono font-semibold text-[#10B981]">#{value}</span>
    },
    {
      header: 'cliente',
      accessor: 'nombreNit',
      render: (value) => <span className="truncate max-w-[150px] block text-[#FAFAFA]">{value}</span>
    },
    {
      header: 'total',
      accessor: 'totalGeneral',
      render: (value) => <span className="font-mono font-bold text-[#10B981]">{formatCurrency(value)}</span>
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
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-[#10B981]">&gt;</span> ventas_vendedores
          </h1>
          <p className="text-[#6B7280] text-sm">
            // resumen y analisis de rendimiento
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

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="total_ventas"
          value={formatCurrency(summary.totals.totalSales)}
          icon="$"
          subtitle={`// ${summary.totals.totalPaid} facturas pagadas`}
        />
        <Card
          title="vendedores_activos"
          value={summary.totals.activeVendors}
          icon="@"
          subtitle={`// de ${summary.vendors.length} registrados`}
        />
        <Card
          title="promedio_vendedor"
          value={formatCurrency(summary.totals.activeVendors > 0 ? summary.totals.totalSales / summary.totals.activeVendors : 0)}
          icon="~"
          subtitle="// promedio de ventas"
        />
        <Card
          title="facturas_anuladas"
          value={summary.totals.totalCancelled}
          icon="-"
          subtitle={`// ${summary.totals.totalInvoices > 0 ? ((summary.totals.totalCancelled / summary.totals.totalInvoices) * 100).toFixed(1) : 0}% del total`}
        />
      </div>

      {/* Gráfico y Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Barras */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> comparacion_ventas
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                <XAxis type="number" stroke="#6B7280" fontSize={12} tickFormatter={(v) => `Q${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid #1F1F1F',
                    borderRadius: '0',
                    color: '#FAFAFA'
                  }}
                  formatter={(value, _name, props) => [formatCurrency(value), props.payload.fullName]}
                />
                <Bar dataKey="total">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-[#4B5563] font-mono">
              // no hay datos
            </div>
          )}
        </div>

        {/* Tabla Ranking */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> ranking_vendedores
          </h2>
          <div className="overflow-y-auto max-h-[350px]">
            <Table columns={rankingColumns} data={summary.vendors.filter(v => v.vendedor !== 'Sin asignar')} />
          </div>
        </div>
      </div>

      {/* Detalle del Vendedor Seleccionado */}
      {selectedVendor && vendorDetail && (
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                <span className="text-[#10B981]">&gt;</span> detalle --vendedor "{selectedVendor}"
              </h2>
              <p className="text-sm text-[#6B7280] font-mono">
                // {vendorDetail.sales.current.data.length} ventas en el periodo
              </p>
            </div>
            <button
              onClick={() => setSelectedVendor(null)}
              className="px-4 py-2 bg-[#1A1A1A] border border-[#1F1F1F] hover:border-[#EF4444] text-white font-mono"
            >
              $ cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Métricas del vendedor */}
            <div className="bg-[#1A1A1A] border border-[#1F1F1F] p-4">
              <p className="text-xs text-[#6B7280] font-mono mb-1">// total_ventas</p>
              <p className="text-2xl font-bold text-[#10B981] font-mono">
                {formatCurrency(vendorDetail.sales.current.total)}
              </p>
              <p className="text-xs text-[#4B5563] mt-1 font-mono">
                {vendorDetail.sales.current.count} facturas
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#1F1F1F] p-4">
              <p className="text-xs text-[#6B7280] font-mono mb-1">// ticket_promedio</p>
              <p className="text-2xl font-bold text-[#3B82F6] font-mono">
                {formatCurrency(vendorDetail.sales.current.average)}
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#1F1F1F] p-4">
              <p className="text-xs text-[#6B7280] font-mono mb-1">// comparacion</p>
              <p className={`text-2xl font-bold font-mono ${vendorDetail.sales.comparison.total >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                [{vendorDetail.sales.comparison.total >= 0 ? '+' : ''}{vendorDetail.sales.comparison.total.toFixed(1)}%]
              </p>
              <p className="text-xs text-[#4B5563] mt-1 font-mono">vs periodo anterior</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Productos */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">
                <span className="text-[#10B981]">&gt;</span> top_productos
              </h3>
              {vendorDetail.products.length > 0 ? (
                <div className="space-y-2">
                  {vendorDetail.products.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[#1A1A1A] border border-[#1F1F1F]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#4B5563] text-sm font-mono">#{index + 1}</span>
                        <span className="text-white truncate max-w-[180px]">{product.nombre}</span>
                      </div>
                      <span className="text-[#10B981] text-sm font-mono">{product.cantidad} uds</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#4B5563] text-center py-4 font-mono">// sin productos</p>
              )}
            </div>

            {/* Últimas Ventas */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">
                <span className="text-[#10B981]">&gt;</span> ultimas_ventas
              </h3>
              <div className="overflow-y-auto max-h-[200px]">
                <Table columns={detailColumns} data={vendorDetail.sales.current.data.slice(0, 5)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ventas sin vendedor asignado */}
      {summary.vendors.find(v => v.vendedor === 'Sin asignar' && v.count > 0) && (
        <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-4">
          <div className="flex items-center gap-3">
            <span className="text-[#F59E0B] font-mono font-bold">[!]</span>
            <div>
              <p className="text-[#F59E0B] font-medium font-mono">ventas_sin_vendedor</p>
              <p className="text-sm text-[#6B7280] font-mono">
                // hay {summary.vendors.find(v => v.vendedor === 'Sin asignar')?.count || 0} ventas sin asignar
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VentasVendedores;

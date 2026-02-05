import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import dataService from '../services/dataService';
import Card from '../components/shared/Card';
import PeriodSelector from '../components/shared/PeriodSelector';
import DateSelector from '../components/shared/DateSelector';

const ProductsDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mostSoldProduct, setMostSoldProduct] = useState(null);
  const [productMetrics, setProductMetrics] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [brandStats, setBrandStats] = useState([]);
  const [topProductsByBrand, setTopProductsByBrand] = useState({});
  const [loading, setLoading] = useState(true);

  // Cargar datos
  useEffect(() => {
    loadProductData();

    // Auto-refresh cada 2 minutos
    const interval = setInterval(() => {
      loadProductData();
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedPeriod, selectedDate]);

  const loadProductData = async () => {
    setLoading(true);
    try {
      const [mostSold, metrics, top, brands, byBrand] = await Promise.all([
        dataService.getMostSoldProductByPeriod(selectedPeriod, selectedDate),
        dataService.getProductMetricsByPeriod(selectedPeriod, selectedDate),
        dataService.getTopProductsByPeriod(selectedPeriod, selectedDate, 10),
        dataService.getBrandStatsByPeriod(selectedPeriod, selectedDate),
        dataService.getTopProductsByBrandByPeriod(selectedPeriod, selectedDate, 5, 3)
      ]);

      setMostSoldProduct(mostSold);
      setProductMetrics(metrics);
      setTopProducts(top);
      setBrandStats(brands);
      setTopProductsByBrand(byBrand);
    } catch (error) {
      console.error('Error loading product data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formato de moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(value || 0);
  };

  // Colores para gráficas
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

  // Preparar datos para el gráfico de top productos
  const topProductsChartData = topProducts.map(p => ({
    nombre: p.nombre.length > 30 ? p.nombre.substring(0, 30) + '...' : p.nombre,
    cantidad: p.totalCantidad,
    ventas: p.totalVentas
  }));

  // Preparar datos para el gráfico de marcas (Pie Chart)
  const brandChartData = brandStats.slice(0, 8).map(b => ({
    name: b.marca,
    value: b.totalVentas,
    cantidad: b.totalCantidad
  }));

  // Preparar datos para gráfico de productos por marca
  const productsByBrandChartData = [];
  Object.entries(topProductsByBrand).forEach(([brand, products]) => {
    products.forEach(product => {
      productsByBrandChartData.push({
        marca: brand,
        producto: product.nombre.length > 25 ? product.nombre.substring(0, 25) + '...' : product.nombre,
        cantidad: product.totalCantidad
      });
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-[#6B7280] font-mono">$ cargando productos<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-[#10B981]">&gt;</span> productos_marcas
          </h1>
          <p className="text-sm text-[#6B7280]">// analisis de inventario</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            periodType={selectedPeriod}
          />
        </div>
      </div>

      {/* Producto Más Vendido - Card Grande */}
      {mostSoldProduct && mostSoldProduct.current && (
        <div className="bg-[#3B82F6]/10 border border-[#3B82F6]/30 p-4 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[#3B82F6] font-bold text-2xl">#1</span>
                <h2 className="text-xs md:text-sm font-mono text-[#3B82F6] uppercase tracking-wide">
                  // producto_mas_vendido
                </h2>
              </div>
              <div className="text-xl md:text-3xl font-bold text-white mb-2">
                {mostSoldProduct.current.nombre}
              </div>
              <div className="flex flex-wrap gap-4 text-sm md:text-base text-[#FAFAFA] font-mono">
                <div>
                  <span className="text-[#6B7280]">cantidad:</span> {mostSoldProduct.current.totalCantidad}
                </div>
                <div>
                  <span className="text-[#6B7280]">ventas:</span> {formatCurrency(mostSoldProduct.current.totalVentas)}
                </div>
                <div>
                  <span className="text-[#6B7280]">marca:</span> {mostSoldProduct.current.marca}
                </div>
                <div>
                  <span className="text-[#6B7280]">facturas:</span> {mostSoldProduct.current.ocurrencias}
                </div>
              </div>
            </div>

            {/* Comparación con período anterior */}
            {mostSoldProduct.comparison && (
              <div className="bg-[#1A1A1A] border border-[#1F1F1F] p-4 min-w-[200px]">
                <div className="text-xs text-[#6B7280] mb-2 font-mono">// vs_periodo_anterior</div>
                <div className="space-y-2 font-mono">
                  <div className={`flex items-center gap-2 ${mostSoldProduct.comparison.cantidad.percentage >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    <span>{mostSoldProduct.comparison.cantidad.percentage >= 0 ? '++' : '--'}</span>
                    <span className="font-bold">[{mostSoldProduct.comparison.cantidad.percentage.toFixed(1)}%]</span>
                    <span className="text-xs text-[#6B7280]">cantidad</span>
                  </div>
                  <div className={`flex items-center gap-2 ${mostSoldProduct.comparison.ventas.percentage >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    <span>{mostSoldProduct.comparison.ventas.percentage >= 0 ? '++' : '--'}</span>
                    <span className="font-bold">[{mostSoldProduct.comparison.ventas.percentage.toFixed(1)}%]</span>
                    <span className="text-xs text-[#6B7280]">ventas</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
      {productMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card
            title="productos_vendidos"
            value={productMetrics.current.totalProductsSold.toLocaleString('es-GT')}
            icon="#"
            trend={productMetrics.comparison.totalProductsSold.percentage !== 0 ? productMetrics.comparison.totalProductsSold.percentage : null}
            comparison="// vs periodo anterior"
          />
          <Card
            title="productos_unicos"
            value={productMetrics.current.uniqueProducts.toLocaleString('es-GT')}
            icon="*"
            trend={productMetrics.comparison.uniqueProducts.percentage !== 0 ? productMetrics.comparison.uniqueProducts.percentage : null}
            comparison="// vs periodo anterior"
          />
          <Card
            title="marcas_activas"
            value={productMetrics.current.uniqueBrands.toLocaleString('es-GT')}
            icon="@"
            trend={productMetrics.comparison.uniqueBrands.percentage !== 0 ? productMetrics.comparison.uniqueBrands.percentage : null}
            comparison="// vs periodo anterior"
          />
        </div>
      )}

      {/* Top 10 Productos - Bar Chart */}
      <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          <span className="text-[#10B981]">&gt;</span> top_productos --limit 10
        </h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-[600px] md:min-w-0 px-4 md:px-0">
            <ResponsiveContainer width="100%" height={400} className="md:!h-[500px]">
              <BarChart data={topProductsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                <XAxis type="number" stroke="#6B7280" />
                <YAxis dataKey="nombre" type="category" stroke="#6B7280" width={140} style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111111', border: '1px solid #1F1F1F', borderRadius: '0' }}
                  labelStyle={{ color: '#FAFAFA' }}
                  formatter={(value, name) => {
                    if (name === 'cantidad') return [value + ' unidades', 'Cantidad'];
                    if (name === 'ventas') return [formatCurrency(value), 'Ventas'];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ color: '#FAFAFA' }} />
                <Bar dataKey="cantidad" fill="#3B82F6" name="Cantidad Vendida" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribución por Marca - Pie Chart */}
      <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          <span className="text-[#10B981]">&gt;</span> distribucion_marcas
        </h2>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Gráfica */}
          <div className="w-full lg:w-1/2 overflow-x-auto">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={300} className="md:!h-[400px]">
                <PieChart>
                  <Pie
                    data={brandChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {brandChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111111', border: '1px solid #1F1F1F', borderRadius: '0' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla de estadísticas */}
          <div className="w-full lg:w-1/2 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1F1F1F]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">marca</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">unidades</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">ventas</th>
                </tr>
              </thead>
              <tbody>
                {brandStats.slice(0, 8).map((brand, index) => (
                  <tr key={index} className="border-b border-[#1F1F1F]/50 hover:bg-[#1A1A1A] transition-colors">
                    <td className="py-3 px-4 text-white font-medium flex items-center gap-2">
                      <div
                        className="w-3 h-3"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {brand.marca}
                    </td>
                    <td className="py-3 px-4 text-right text-[#FAFAFA] font-mono">{brand.totalCantidad}</td>
                    <td className="py-3 px-4 text-right text-[#10B981] font-mono">{formatCurrency(brand.totalVentas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Productos por Marca - Grouped Bar Chart */}
      {productsByBrandChartData.length > 0 && (
        <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> productos_por_marca
          </h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[600px] md:min-w-0 px-4 md:px-0">
              <ResponsiveContainer width="100%" height={400} className="md:!h-[500px]">
                <BarChart data={productsByBrandChartData} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                  <XAxis type="number" stroke="#6B7280" />
                  <YAxis dataKey="producto" type="category" stroke="#6B7280" width={190} style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111111', border: '1px solid #1F1F1F', borderRadius: '0' }}
                    labelStyle={{ color: '#FAFAFA' }}
                  />
                  <Legend wrapperStyle={{ color: '#FAFAFA' }} />
                  <Bar dataKey="cantidad" fill="#10B981" name="Cantidad Vendida" radius={[0, 0, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Detallada de Productos */}
      <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          <span className="text-[#10B981]">&gt;</span> detalle_productos
        </h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[#1F1F1F]">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">producto</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">marca</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">cantidad</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">ventas</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">promedio</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] lowercase">facturas</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index} className="border-b border-[#1F1F1F]/50 hover:bg-[#1A1A1A] transition-colors">
                    <td className="py-3 px-4 text-[#4B5563] font-mono">#{index + 1}</td>
                    <td className="py-3 px-4 text-white font-medium max-w-md">
                      <div className="truncate" title={product.nombre}>{product.nombre}</div>
                    </td>
                    <td className="py-3 px-4 text-[#FAFAFA]">
                      <span className="px-2 py-1 bg-[#3B82F6]/20 text-[#3B82F6] text-xs font-mono">
                        [{product.marca}]
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[#FAFAFA] font-mono font-semibold">{product.totalCantidad}</td>
                    <td className="py-3 px-4 text-right text-[#10B981] font-mono font-semibold">{formatCurrency(product.totalVentas)}</td>
                    <td className="py-3 px-4 text-right text-[#6B7280] font-mono">{formatCurrency(product.promedioVenta)}</td>
                    <td className="py-3 px-4 text-right text-[#4B5563] font-mono">{product.ocurrencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsDashboard;

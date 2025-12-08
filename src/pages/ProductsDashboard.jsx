import React, { useState, useEffect } from 'react';
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
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

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
        <div className="text-center">
          <div className="text-4xl mb-4">📦</div>
          <div className="text-gray-400">Cargando datos de productos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard de Productos y Marcas</h1>
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
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500 rounded-xl p-4 md:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl md:text-4xl">🏆</span>
                <h2 className="text-xs md:text-sm font-medium text-blue-100 uppercase tracking-wide">
                  PRODUCTO MÁS VENDIDO DEL PERÍODO
                </h2>
              </div>
              <div className="text-xl md:text-3xl font-bold text-white mb-2">
                {mostSoldProduct.current.nombre}
              </div>
              <div className="flex flex-wrap gap-4 text-sm md:text-base text-blue-100">
                <div>
                  <span className="font-semibold">Cantidad:</span> {mostSoldProduct.current.totalCantidad} unidades
                </div>
                <div>
                  <span className="font-semibold">Ventas:</span> {formatCurrency(mostSoldProduct.current.totalVentas)}
                </div>
                <div>
                  <span className="font-semibold">Marca:</span> {mostSoldProduct.current.marca}
                </div>
                <div>
                  <span className="font-semibold">Ocurrencias:</span> {mostSoldProduct.current.ocurrencias} facturas
                </div>
              </div>
            </div>

            {/* Comparación con período anterior */}
            {mostSoldProduct.comparison && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[200px]">
                <div className="text-xs text-blue-100 mb-2 uppercase">vs. período anterior</div>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${mostSoldProduct.comparison.cantidad.percentage >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    <span>{mostSoldProduct.comparison.cantidad.percentage >= 0 ? '📈' : '📉'}</span>
                    <span className="font-bold">{mostSoldProduct.comparison.cantidad.percentage.toFixed(1)}%</span>
                    <span className="text-xs">cantidad</span>
                  </div>
                  <div className={`flex items-center gap-2 ${mostSoldProduct.comparison.ventas.percentage >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    <span>{mostSoldProduct.comparison.ventas.percentage >= 0 ? '📈' : '📉'}</span>
                    <span className="font-bold">{mostSoldProduct.comparison.ventas.percentage.toFixed(1)}%</span>
                    <span className="text-xs">ventas</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cards de Métricas */}
      {productMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Card
            title="Total Productos Vendidos"
            value={productMetrics.current.totalProductsSold.toLocaleString('es-GT')}
            icon="📦"
            trend={productMetrics.comparison.totalProductsSold.percentage !== 0 ? {
              isPositive: productMetrics.comparison.totalProductsSold.percentage > 0,
              percentage: Math.abs(productMetrics.comparison.totalProductsSold.percentage).toFixed(1),
              difference: productMetrics.comparison.totalProductsSold.difference
            } : null}
            comparison="vs. período anterior"
          />
          <Card
            title="Productos Únicos"
            value={productMetrics.current.uniqueProducts.toLocaleString('es-GT')}
            icon="🎯"
            trend={productMetrics.comparison.uniqueProducts.percentage !== 0 ? {
              isPositive: productMetrics.comparison.uniqueProducts.percentage > 0,
              percentage: Math.abs(productMetrics.comparison.uniqueProducts.percentage).toFixed(1),
              difference: productMetrics.comparison.uniqueProducts.difference
            } : null}
            comparison="vs. período anterior"
          />
          <Card
            title="Marcas Activas"
            value={productMetrics.current.uniqueBrands.toLocaleString('es-GT')}
            icon="🏷️"
            trend={productMetrics.comparison.uniqueBrands.percentage !== 0 ? {
              isPositive: productMetrics.comparison.uniqueBrands.percentage > 0,
              percentage: Math.abs(productMetrics.comparison.uniqueBrands.percentage).toFixed(1),
              difference: productMetrics.comparison.uniqueBrands.difference
            } : null}
            comparison="vs. período anterior"
          />
        </div>
      )}

      {/* Top 10 Productos - Bar Chart */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📊</span>
          <span>Top 10 Productos Más Vendidos</span>
        </h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-[600px] md:min-w-0 px-4 md:px-0">
            <ResponsiveContainer width="100%" height={400} className="md:!h-[500px]">
              <BarChart data={topProductsChartData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="nombre" type="category" stroke="#9ca3af" width={140} style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value, name) => {
                    if (name === 'cantidad') return [value + ' unidades', 'Cantidad'];
                    if (name === 'ventas') return [formatCurrency(value), 'Ventas'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="cantidad" fill="#3b82f6" name="Cantidad Vendida" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribución por Marca - Pie Chart */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🏷️</span>
          <span>Distribución de Ventas por Marca</span>
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
                    {brandChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
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
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Marca</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Unidades</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Ventas</th>
                </tr>
              </thead>
              <tbody>
                {brandStats.slice(0, 8).map((brand, index) => (
                  <tr key={index} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                    <td className="py-3 px-4 text-white font-medium flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {brand.marca}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">{brand.totalCantidad}</td>
                    <td className="py-3 px-4 text-right text-gray-300">{formatCurrency(brand.totalVentas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Productos por Marca - Grouped Bar Chart */}
      {productsByBrandChartData.length > 0 && (
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🎯</span>
            <span>Top Productos por Marca</span>
          </h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[600px] md:min-w-0 px-4 md:px-0">
              <ResponsiveContainer width="100%" height={400} className="md:!h-[500px]">
                <BarChart data={productsByBrandChartData} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" />
                  <YAxis dataKey="producto" type="category" stroke="#9ca3af" width={190} style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#10b981" name="Cantidad Vendida" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tabla Detallada de Productos */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📋</span>
          <span>Detalle de Todos los Productos</span>
        </h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">#</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Producto</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Marca</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Cantidad</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Ventas</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Promedio</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Facturas</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index} className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors">
                    <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                    <td className="py-3 px-4 text-white font-medium max-w-md">
                      <div className="truncate" title={product.nombre}>{product.nombre}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      <span className="px-2 py-1 bg-primary-600/20 text-primary-400 rounded text-xs font-medium">
                        {product.marca}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300 font-semibold">{product.totalCantidad}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-semibold">{formatCurrency(product.totalVentas)}</td>
                    <td className="py-3 px-4 text-right text-gray-300">{formatCurrency(product.promedioVenta)}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{product.ocurrencias}</td>
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

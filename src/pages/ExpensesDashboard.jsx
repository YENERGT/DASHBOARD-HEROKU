import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/calculations';
import {
  groupByHour,
  groupByDay,
  groupByMonth,
  getTopExpensesByCompany,
  getTopExpensesByProduct
} from '../utils/calculations';
import dataService from '../services/dataService';
import Card from '../components/shared/Card';
import PeriodSelector from '../components/shared/PeriodSelector';
import DateSelector from '../components/shared/DateSelector';
import Table from '../components/shared/Table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const ExpensesDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [profitData, setProfitData] = useState(null);
  const [expensesData, setExpensesData] = useState(null);
  const [invoicesData, setInvoicesData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar datos al montar y cuando cambie el período o fecha
  useEffect(() => {
    loadData();

    // Auto-refresh cada 2 minutos
    const interval = setInterval(() => {
      loadData(true);
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [selectedPeriod, selectedDate]);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      // Cargar profit, gastos e ingresos del período
      const profit = await dataService.getProfitByPeriod(selectedPeriod, selectedDate);
      const expenses = await dataService.getExpensesByPeriod(selectedPeriod, selectedDate);
      const invoices = await dataService.getInvoicesByPeriod(selectedPeriod, selectedDate);

      setProfitData(profit);
      setExpensesData(expenses);
      setInvoicesData(invoices);

      // Generar datos para el gráfico combinado
      const chart = generateChartData(invoices.current.data, expenses.current.data);
      setChartData(chart);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateChartData = (invoices, expenses) => {
    let chartData = [];

    if (selectedPeriod === 'day') {
      // Agrupar por hora (0-23)
      const invoicesByHour = groupByHour(invoices);
      const expensesByHour = expenses.reduce((acc, expense) => {
        const date = new Date(expense.fecha);
        const hour = date.getHours();
        const key = `${hour.toString().padStart(2, '0')}:00`;

        if (!acc[key]) acc[key] = 0;
        acc[key] += parseFloat(expense.monto || 0);
        return acc;
      }, {});

      chartData = invoicesByHour.map(item => ({
        name: item.hour,
        Ingresos: item.Monto,
        Gastos: expensesByHour[item.hour] || 0,
        Profit: item.Monto - (expensesByHour[item.hour] || 0)
      }));
    } else if (selectedPeriod === 'month') {
      // Agrupar por día
      const date = new Date(selectedDate);
      const invoicesByDay = groupByDay(invoices, date.getFullYear(), date.getMonth());
      const expensesByDay = expenses.reduce((acc, expense) => {
        const expDate = new Date(expense.fecha);
        const day = expDate.getDate();

        if (!acc[day]) acc[day] = 0;
        acc[day] += parseFloat(expense.monto || 0);
        return acc;
      }, {});

      chartData = invoicesByDay.map(item => ({
        name: `Día ${item.day}`,
        Ingresos: item.Monto,
        Gastos: expensesByDay[parseInt(item.day)] || 0,
        Profit: item.Monto - (expensesByDay[parseInt(item.day)] || 0)
      }));
    } else if (selectedPeriod === 'year') {
      // Agrupar por mes
      const invoicesByMonth = groupByMonth(invoices);
      const expensesByMonth = expenses.reduce((acc, expense) => {
        const date = new Date(expense.fecha);
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const month = monthNames[date.getMonth()];

        if (!acc[month]) acc[month] = 0;
        acc[month] += parseFloat(expense.monto || 0);
        return acc;
      }, {});

      chartData = invoicesByMonth.map(item => ({
        name: item.month,
        Ingresos: item.Monto,
        Gastos: expensesByMonth[item.month] || 0,
        Profit: item.Monto - (expensesByMonth[item.month] || 0)
      }));
    }

    return chartData;
  };

  // Filtrar gastos por búsqueda
  const filteredExpenses = expensesData?.current.data.filter(expense => {
    const query = searchQuery.toLowerCase();
    return (
      expense.empresa?.toLowerCase().includes(query) ||
      expense.producto?.toLowerCase().includes(query)
    );
  }) || [];

  const displayExpenses = searchQuery ? filteredExpenses : expensesData?.current.data.slice(0, 20) || [];

  // Top gastos por empresa
  const topCompaniesByExpense = expensesData?.current.data
    ? getTopExpensesByCompany(expensesData.current.data, 5)
    : [];

  // Top gastos por producto
  const topProductsByExpense = expensesData?.current.data
    ? getTopExpensesByProduct(expensesData.current.data, 5)
    : [];

  // Colores para gráficos
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-400">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard de Gastos y Profit</h1>
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

      {/* PROFIT Card - Grande y destacado */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 border border-green-500 rounded-xl p-4 md:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-white text-opacity-90 text-xs md:text-sm font-medium uppercase tracking-wide mb-2">
              PROFIT DEL PERÍODO
            </h2>
            <div className="text-3xl md:text-5xl font-bold text-white mb-2">
              {formatCurrency(profitData?.current.profit || 0)}
            </div>
            <div className="text-xl md:text-2xl text-green-100">
              Margen: {profitData?.current.margin || 0}%
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-white text-opacity-75 text-xs md:text-sm mb-1">vs período anterior</div>
            <div className={`text-xl md:text-2xl font-bold ${profitData?.comparison.profit.isPositive ? 'text-green-200' : 'text-red-200'}`}>
              {profitData?.comparison.profit.isPositive ? '+' : ''}{profitData?.comparison.profit.percentage}%
            </div>
            <div className="text-lg md:text-xl">
              {profitData?.comparison.profit.isPositive ? '📈' : '📉'}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <Card
          title="Ingresos"
          value={formatCurrency(invoicesData?.current.total || 0)}
          subtitle={`${invoicesData?.current.count || 0} facturas`}
          trend={invoicesData?.comparison.total}
          icon="💰"
        />
        <Card
          title="Gastos"
          value={formatCurrency(expensesData?.current.total || 0)}
          subtitle={`${expensesData?.current.count || 0} transacciones`}
          trend={expensesData?.comparison.total}
          icon="💸"
        />
        <Card
          title="Relación Ingresos/Gastos"
          value={invoicesData?.current.total > 0
            ? `${((expensesData?.current.total / invoicesData?.current.total) * 100).toFixed(1)}%`
            : '0%'}
          subtitle={`${((invoicesData?.current.total - expensesData?.current.total) / invoicesData?.current.total * 100).toFixed(1)}% profit`}
          icon="📊"
        />
      </div>

      {/* Gráfico combinado - GRANDE */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold text-white mb-4">
          Evolución de Ingresos, Gastos y Profit
        </h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-[500px] md:min-w-0 px-4 md:px-0">
            <ResponsiveContainer width="100%" height={300} className="md:!h-[400px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#fff' }}
              formatter={(value) => formatCurrency(value)}
            />
            <Legend />
            <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={3} name="Ingresos" />
            <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={3} name="Gastos" />
            <Line type="monotone" dataKey="Profit" stroke="#3b82f6" strokeWidth={3} name="Profit" />
          </LineChart>
        </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Gastos por Empresa y Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top Empresas */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Top Gastos por Empresa</h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[400px] md:min-w-0 px-4 md:px-0">
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
            <BarChart data={topCompaniesByExpense}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="empresa" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar dataKey="total" fill="#ef4444" name="Gasto Total" />
            </BarChart>
          </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Distribución de Gastos (Pie Chart) */}
        <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-4">Distribución de Gastos por Producto</h2>
          <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
            <PieChart>
              <Pie
                data={topProductsByExpense}
                dataKey="total"
                nameKey="producto"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={false}
              >
                {topProductsByExpense.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de gastos con búsqueda */}
      <div className="bg-dark-card border border-dark-border rounded-lg p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-lg md:text-xl font-semibold text-white">Gastos Detallados</h2>
          <input
            type="text"
            placeholder="Buscar empresa o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-dark-bg border border-dark-border rounded-lg px-3 md:px-4 py-2 text-sm md:text-base text-gray-300 focus:outline-none focus:border-blue-500 w-full sm:w-auto"
          />
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <Table
          columns={[
            { header: 'Fecha', accessor: 'fecha', render: (value) => new Date(value).toLocaleString('es-GT') },
            { header: 'Empresa', accessor: 'empresa' },
            { header: 'Producto', accessor: 'producto' },
            { header: 'Monto', accessor: 'monto', render: (value) => formatCurrency(value) }
          ]}
          data={displayExpenses}
        />
          </div>
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-400 px-4 md:px-0">
            Mostrando {filteredExpenses.length} resultado{filteredExpenses.length !== 1 ? 's' : ''}
          </div>
        )}
        {!searchQuery && expensesData?.current.data.length > 20 && (
          <div className="mt-2 text-sm text-gray-400 px-4 md:px-0">
            Mostrando últimas 20 transacciones de {expensesData.current.data.length} totales
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesDashboard;

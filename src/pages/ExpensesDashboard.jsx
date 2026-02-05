import { useState, useEffect } from 'react';
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
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-[#6B7280] font-mono">$ cargando gastos<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-[#10B981]">&gt;</span> gastos_profit
          </h1>
          <p className="text-sm text-[#6B7280]">// analisis financiero</p>
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

      {/* PROFIT Card - Grande y destacado */}
      <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-4 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-[#10B981] text-xs md:text-sm font-mono uppercase tracking-wide mb-2">
              // profit_del_periodo
            </h2>
            <div className="text-3xl md:text-5xl font-bold text-white mb-2 font-mono">
              {formatCurrency(profitData?.current.profit || 0)}
            </div>
            <div className="text-xl md:text-2xl text-[#10B981] font-mono">
              margen: [{profitData?.current.margin || 0}%]
            </div>
          </div>
          <div className="text-left sm:text-right w-full sm:w-auto">
            <div className="text-[#6B7280] text-xs md:text-sm mb-1 font-mono">// vs periodo_anterior</div>
            <div className={`text-xl md:text-2xl font-bold font-mono ${profitData?.comparison.profit.isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              [{profitData?.comparison.profit.isPositive ? '+' : ''}{profitData?.comparison.profit.percentage}%]
            </div>
            <div className="text-lg md:text-xl font-mono">
              {profitData?.comparison.profit.isPositive ? '++' : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas principales - 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card
          title="ingresos"
          value={formatCurrency(invoicesData?.current.total || 0)}
          subtitle={`// ${invoicesData?.current.count || 0} facturas`}
          trend={invoicesData?.comparison.total?.percentage}
          icon="$"
        />
        <Card
          title="gastos"
          value={formatCurrency(expensesData?.current.total || 0)}
          subtitle={`// ${expensesData?.current.count || 0} transacciones`}
          trend={expensesData?.comparison.total?.percentage}
          icon="-"
        />
        <Card
          title="relacion_ingresos_gastos"
          value={invoicesData?.current.total > 0
            ? `${((expensesData?.current.total / invoicesData?.current.total) * 100).toFixed(1)}%`
            : '0%'}
          subtitle={`// ${((invoicesData?.current.total - expensesData?.current.total) / invoicesData?.current.total * 100).toFixed(1)}% profit`}
          icon="%"
        />
      </div>

      {/* Gráfico combinado - GRANDE */}
      <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          <span className="text-[#10B981]">&gt;</span> evolucion_financiera
        </h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-[500px] md:min-w-0 px-4 md:px-0">
            <ResponsiveContainer width="100%" height={300} className="md:!h-[400px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
            <XAxis dataKey="name" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip
              contentStyle={{ backgroundColor: '#111111', border: '1px solid #1F1F1F', borderRadius: '0' }}
              labelStyle={{ color: '#FAFAFA' }}
              formatter={(value) => formatCurrency(value)}
            />
            <Legend wrapperStyle={{ color: '#FAFAFA' }} />
            <Line type="monotone" dataKey="Ingresos" stroke="#10B981" strokeWidth={2} name="Ingresos" />
            <Line type="monotone" dataKey="Gastos" stroke="#EF4444" strokeWidth={2} name="Gastos" />
            <Line type="monotone" dataKey="Profit" stroke="#3B82F6" strokeWidth={2} name="Profit" />
          </LineChart>
        </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Gastos por Empresa y Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Empresas */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> top_gastos_empresa
          </h2>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[400px] md:min-w-0 px-4 md:px-0">
              <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
            <BarChart data={topCompaniesByExpense}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
              <XAxis dataKey="empresa" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#111111', border: '1px solid #1F1F1F', borderRadius: '0' }}
                labelStyle={{ color: '#FAFAFA' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar dataKey="total" fill="#EF4444" name="Gasto Total" />
            </BarChart>
          </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Distribución de Gastos (Pie Chart) */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> distribucion_gastos
          </h2>
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
                {topProductsByExpense.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#111111', border: '1px solid #1F1F1F', borderRadius: '0' }}
                labelStyle={{ color: '#FAFAFA' }}
              />
              <Legend wrapperStyle={{ color: '#FAFAFA' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de gastos con búsqueda */}
      <div className="bg-[#111111] border border-[#1F1F1F] p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">
            <span className="text-[#10B981]">&gt;</span> gastos_detallados
          </h2>
          <input
            type="text"
            placeholder="$ grep empresa|producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0A0A0A] border border-[#1F1F1F] px-3 md:px-4 py-2 text-sm text-[#FAFAFA] placeholder-[#4B5563] focus:outline-none focus:border-[#10B981] w-full sm:w-auto font-mono"
          />
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <Table
          columns={[
            { header: 'fecha', accessor: 'fecha', render: (value) => <span className="font-mono text-[#FAFAFA]">{new Date(value).toLocaleString('es-GT')}</span> },
            { header: 'empresa', accessor: 'empresa', render: (value) => <span className="text-[#FAFAFA]">{value}</span> },
            { header: 'producto', accessor: 'producto', render: (value) => <span className="text-[#6B7280]">{value}</span> },
            { header: 'monto', accessor: 'monto', render: (value) => <span className="font-mono text-[#EF4444]">-{formatCurrency(value)}</span> }
          ]}
          data={displayExpenses}
        />
          </div>
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-[#4B5563] px-4 md:px-0 font-mono">
            // resultados: {filteredExpenses.length}
          </div>
        )}
        {!searchQuery && expensesData?.current.data.length > 20 && (
          <div className="mt-2 text-sm text-[#4B5563] px-4 md:px-0 font-mono">
            // mostrando 20 de {expensesData.current.data.length} totales
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesDashboard;

import axios from 'axios';
import { sampleInvoices, sampleExpenses } from '../data/sampleData';
import {
  filterByDateRange,
  calculateMetrics,
  getCurrentPeriod,
  getPreviousPeriod,
  calculateComparison
} from '../utils/calculations';

const API_URL = 'http://localhost:3001/api';

/**
 * Servicio para manejar datos de facturas y gastos
 * Conectado con Backend API que consume Google Sheets
 */

class DataService {
  constructor() {
    this.invoices = [];
    this.expenses = sampleExpenses;
    this.useRealData = true;
    this.isLoading = false;
    this.lastFetch = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos de cache
  }

  /**
   * Carga los datos desde el backend API
   */
  async loadData() {
    // Si ya tenemos datos recientes en cache, usarlos
    if (this.invoices.length > 0 && this.lastFetch &&
        (Date.now() - this.lastFetch) < this.cacheTimeout) {
      console.log('📦 Using cached data');
      return this.invoices;
    }

    // Evitar múltiples llamadas simultáneas
    if (this.isLoading) {
      console.log('⏳ Already loading data...');
      return this.invoices;
    }

    this.isLoading = true;

    try {
      if (this.useRealData) {
        console.log('📡 Fetching data from backend API...');
        const response = await axios.get(`${API_URL}/invoices`);

        if (response.data.success) {
          this.invoices = response.data.data;
          this.lastFetch = Date.now();
          console.log(`✅ Loaded ${this.invoices.length} invoices from API`);
        } else {
          throw new Error('API returned unsuccessful response');
        }
      } else {
        console.log('📝 Using sample data');
        this.invoices = sampleInvoices;
      }
    } catch (error) {
      console.error('❌ Error loading data from API:', error.message);
      console.log('⚠️ Falling back to sample data');
      this.invoices = sampleInvoices;
    } finally {
      this.isLoading = false;
    }

    return this.invoices;
  }

  /**
   * Obtiene todas las facturas
   */
  async getAllInvoices() {
    await this.loadData();
    return this.invoices;
  }

  /**
   * Obtiene facturas por período
   */
  async getInvoicesByPeriod(periodType = 'day', date = new Date()) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);
    const previousPeriod = getPreviousPeriod(date, periodType);

    const currentData = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      currentPeriod.start,
      currentPeriod.end
    );

    const previousData = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      previousPeriod.start,
      previousPeriod.end
    );

    const currentMetrics = calculateMetrics(currentData);
    const previousMetrics = calculateMetrics(previousData);

    return {
      current: {
        ...currentMetrics,
        data: currentData,
        period: currentPeriod
      },
      previous: {
        ...previousMetrics,
        data: previousData,
        period: previousPeriod
      },
      comparison: {
        total: calculateComparison(currentMetrics.total, previousMetrics.total),
        count: calculateComparison(currentMetrics.count, previousMetrics.count),
        average: calculateComparison(currentMetrics.average, previousMetrics.average),
        totalIVA: calculateComparison(currentMetrics.totalIVA, previousMetrics.totalIVA)
      }
    };
  }

  /**
   * Obtiene métricas del día actual
   */
  async getTodayMetrics() {
    return await this.getInvoicesByPeriod('day', new Date());
  }

  /**
   * Obtiene métricas del mes actual
   */
  async getMonthMetrics() {
    return await this.getInvoicesByPeriod('month', new Date());
  }

  /**
   * Obtiene métricas del año actual
   */
  async getYearMetrics() {
    return await this.getInvoicesByPeriod('year', new Date());
  }

  /**
   * Obtiene últimas transacciones
   */
  async getRecentTransactions(limit = 10) {
    await this.loadData();
    return [...this.invoices]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, limit);
  }

  /**
   * Fuerza la recarga de datos desde el backend
   */
  async refreshData() {
    try {
      console.log('🔄 Forcing data refresh...');
      const response = await axios.post(`${API_URL}/invoices/refresh`);

      if (response.data.success) {
        this.invoices = response.data.data;
        this.lastFetch = Date.now();
        console.log(`✅ Refreshed ${this.invoices.length} invoices`);
        return this.invoices;
      }
    } catch (error) {
      console.error('❌ Error refreshing data:', error.message);
      // Intentar carga normal
      this.lastFetch = null;
      return await this.loadData();
    }
  }

  /**
   * Obtiene todos los gastos
   */
  getAllExpenses() {
    return this.expenses;
  }

  /**
   * Obtiene gastos por período
   */
  getExpensesByPeriod(periodType = 'day', date = new Date()) {
    const currentPeriod = getCurrentPeriod(date, periodType);
    const previousPeriod = getPreviousPeriod(date, periodType);

    const currentData = filterByDateRange(
      this.expenses,
      currentPeriod.start,
      currentPeriod.end
    );

    const previousData = filterByDateRange(
      this.expenses,
      previousPeriod.start,
      previousPeriod.end
    );

    const currentTotal = currentData.reduce((sum, item) => sum + item.monto, 0);
    const previousTotal = previousData.reduce((sum, item) => sum + item.monto, 0);

    return {
      current: {
        total: currentTotal,
        data: currentData,
        period: currentPeriod
      },
      previous: {
        total: previousTotal,
        data: previousData,
        period: previousPeriod
      },
      comparison: calculateComparison(currentTotal, previousTotal)
    };
  }

  /**
   * Calcula el profit (ingresos - gastos)
   */
  async getProfitByPeriod(periodType = 'day', date = new Date()) {
    const invoiceData = await this.getInvoicesByPeriod(periodType, date);
    const expenseData = this.getExpensesByPeriod(periodType, date);

    const currentProfit = invoiceData.current.total - expenseData.current.total;
    const previousProfit = invoiceData.previous.total - expenseData.previous.total;

    const currentMargin = invoiceData.current.total > 0
      ? (currentProfit / invoiceData.current.total) * 100
      : 0;

    const previousMargin = invoiceData.previous.total > 0
      ? (previousProfit / invoiceData.previous.total) * 100
      : 0;

    return {
      current: {
        profit: currentProfit,
        margin: currentMargin.toFixed(2),
        income: invoiceData.current.total,
        expenses: expenseData.current.total,
        period: invoiceData.current.period
      },
      previous: {
        profit: previousProfit,
        margin: previousMargin.toFixed(2),
        income: invoiceData.previous.total,
        expenses: expenseData.previous.total,
        period: invoiceData.previous.period
      },
      comparison: {
        profit: calculateComparison(currentProfit, previousProfit),
        margin: calculateComparison(currentMargin, previousMargin)
      }
    };
  }
}

// Exportar instancia única del servicio
export default new DataService();

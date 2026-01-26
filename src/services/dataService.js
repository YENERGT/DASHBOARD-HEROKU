import axios from 'axios';
import { sampleInvoices, sampleExpenses } from '../data/sampleData';
import {
  filterByDateRange,
  calculateMetrics,
  getCurrentPeriod,
  getPreviousPeriod,
  calculateComparison
} from '../utils/calculations';
import {
  getMostSoldProduct,
  getTopProducts,
  getBrandStats,
  getTopProductsByBrand,
  getProductMetrics
} from '../utils/productAnalysis';

// Usar la URL de producción o localhost según el entorno
const API_URL = import.meta.env.VITE_API_URL || window.location.origin + '/api';

/**
 * Servicio para manejar datos de facturas y gastos
 * Conectado con Backend API que consume Google Sheets
 */

class DataService {
  constructor() {
    this.invoices = [];
    this.expenses = [];
    this.useRealData = true;
    this.isLoading = false;
    this.isLoadingExpenses = false;
    this.lastFetch = null;
    this.lastExpensesFetch = null;
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
   * Nota: Solo cuenta facturas con estado 'paid' para métricas, pero incluye TODAS en data
   */
  async getInvoicesByPeriod(periodType = 'day', date = new Date()) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);
    const previousPeriod = getPreviousPeriod(date, periodType);

    // Obtener TODAS las facturas del período (incluyendo anuladas) para mostrar en listados
    const allCurrentData = filterByDateRange(
      this.invoices,
      currentPeriod.start,
      currentPeriod.end
    ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Ordenar: más reciente primero

    const allPreviousData = filterByDateRange(
      this.invoices,
      previousPeriod.start,
      previousPeriod.end
    ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Ordenar: más reciente primero

    // Filtrar solo facturas pagadas para calcular métricas (excluir ANULADO de cálculos)
    const currentPaidData = allCurrentData.filter(inv => inv.estado === 'paid');
    const previousPaidData = allPreviousData.filter(inv => inv.estado === 'paid');

    const currentMetrics = calculateMetrics(currentPaidData);
    const previousMetrics = calculateMetrics(previousPaidData);

    return {
      current: {
        ...currentMetrics,
        data: allCurrentData, // Incluir TODAS las facturas (con anuladas)
        period: currentPeriod
      },
      previous: {
        ...previousMetrics,
        data: allPreviousData, // Incluir TODAS las facturas (con anuladas)
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
   * Fuerza la recarga de datos de gastos desde el backend
   */
  async refreshExpenses() {
    try {
      console.log('🔄 Forcing expenses data refresh...');
      const response = await axios.post(`${API_URL}/expenses/refresh`);

      if (response.data.success) {
        this.expenses = response.data.data;
        this.lastExpensesFetch = Date.now();
        console.log(`✅ Refreshed ${this.expenses.length} expenses`);
        return this.expenses;
      }
    } catch (error) {
      console.error('❌ Error refreshing expenses data:', error.message);
      // Intentar carga normal
      this.lastExpensesFetch = null;
      return await this.loadExpenses();
    }
  }

  /**
   * Carga los datos de gastos desde el backend API
   */
  async loadExpenses() {
    // Si ya tenemos datos recientes en cache, usarlos
    if (this.expenses.length > 0 && this.lastExpensesFetch &&
        (Date.now() - this.lastExpensesFetch) < this.cacheTimeout) {
      console.log('📦 Using cached expenses data');
      return this.expenses;
    }

    // Evitar múltiples llamadas simultáneas
    if (this.isLoadingExpenses) {
      console.log('⏳ Already loading expenses data...');
      return this.expenses;
    }

    this.isLoadingExpenses = true;

    try {
      if (this.useRealData) {
        console.log('📡 Fetching expenses data from backend API...');
        const response = await axios.get(`${API_URL}/expenses`);

        if (response.data.success) {
          this.expenses = response.data.data;
          this.lastExpensesFetch = Date.now();
          console.log(`✅ Loaded ${this.expenses.length} expenses from API`);
        } else {
          throw new Error('API returned unsuccessful response');
        }
      } else {
        console.log('📝 Using sample expenses data');
        this.expenses = sampleExpenses;
      }
    } catch (error) {
      console.error('❌ Error loading expenses from API:', error.message);
      console.log('⚠️ Falling back to sample expenses data');
      this.expenses = sampleExpenses;
    } finally {
      this.isLoadingExpenses = false;
    }

    return this.expenses;
  }

  /**
   * Obtiene todos los gastos
   */
  async getAllExpenses() {
    await this.loadExpenses();
    return this.expenses;
  }

  /**
   * Obtiene gastos por período
   */
  async getExpensesByPeriod(periodType = 'day', date = new Date()) {
    await this.loadExpenses();

    const currentPeriod = getCurrentPeriod(date, periodType);
    const previousPeriod = getPreviousPeriod(date, periodType);

    const currentData = filterByDateRange(
      this.expenses,
      currentPeriod.start,
      currentPeriod.end
    ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Ordenar: más reciente primero

    const previousData = filterByDateRange(
      this.expenses,
      previousPeriod.start,
      previousPeriod.end
    ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Ordenar: más reciente primero

    const currentTotal = currentData.reduce((sum, item) => sum + parseFloat(item.monto || 0), 0);
    const previousTotal = previousData.reduce((sum, item) => sum + parseFloat(item.monto || 0), 0);
    const currentCount = currentData.length;
    const previousCount = previousData.length;
    const currentAverage = currentCount > 0 ? currentTotal / currentCount : 0;
    const previousAverage = previousCount > 0 ? previousTotal / previousCount : 0;

    return {
      current: {
        total: parseFloat(currentTotal.toFixed(2)),
        count: currentCount,
        average: parseFloat(currentAverage.toFixed(2)),
        data: currentData,
        period: currentPeriod
      },
      previous: {
        total: parseFloat(previousTotal.toFixed(2)),
        count: previousCount,
        average: parseFloat(previousAverage.toFixed(2)),
        data: previousData,
        period: previousPeriod
      },
      comparison: {
        total: calculateComparison(currentTotal, previousTotal),
        count: calculateComparison(currentCount, previousCount),
        average: calculateComparison(currentAverage, previousAverage)
      }
    };
  }

  /**
   * Calcula el profit (ingresos - gastos)
   */
  async getProfitByPeriod(periodType = 'day', date = new Date()) {
    const invoiceData = await this.getInvoicesByPeriod(periodType, date);
    const expenseData = await this.getExpensesByPeriod(periodType, date);

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

  /**
   * Obtiene el producto más vendido por período
   */
  async getMostSoldProductByPeriod(periodType = 'day', date = new Date()) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);
    const previousPeriod = getPreviousPeriod(date, periodType);

    const currentInvoices = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      currentPeriod.start,
      currentPeriod.end
    );

    const previousInvoices = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      previousPeriod.start,
      previousPeriod.end
    );

    const currentMostSold = getMostSoldProduct(currentInvoices);
    const previousMostSold = getMostSoldProduct(previousInvoices);

    return {
      current: currentMostSold,
      previous: previousMostSold,
      comparison: {
        cantidad: calculateComparison(currentMostSold.totalCantidad, previousMostSold.totalCantidad),
        ventas: calculateComparison(currentMostSold.totalVentas, previousMostSold.totalVentas)
      }
    };
  }

  /**
   * Obtiene top productos por período
   */
  async getTopProductsByPeriod(periodType = 'day', date = new Date(), limit = 10) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);

    const currentInvoices = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      currentPeriod.start,
      currentPeriod.end
    );

    return getTopProducts(currentInvoices, limit);
  }

  /**
   * Obtiene estadísticas por marca por período
   */
  async getBrandStatsByPeriod(periodType = 'day', date = new Date()) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);

    const currentInvoices = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      currentPeriod.start,
      currentPeriod.end
    );

    return getBrandStats(currentInvoices);
  }

  /**
   * Obtiene top productos por marca por período
   */
  async getTopProductsByBrandByPeriod(periodType = 'day', date = new Date(), topBrands = 5, topProducts = 3) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);

    const currentInvoices = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      currentPeriod.start,
      currentPeriod.end
    );

    return getTopProductsByBrand(currentInvoices, topBrands, topProducts);
  }

  /**
   * Obtiene métricas generales de productos por período
   */
  async getProductMetricsByPeriod(periodType = 'day', date = new Date()) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);
    const previousPeriod = getPreviousPeriod(date, periodType);

    const currentInvoices = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      currentPeriod.start,
      currentPeriod.end
    );

    const previousInvoices = filterByDateRange(
      this.invoices.filter(inv => inv.estado === 'paid'),
      previousPeriod.start,
      previousPeriod.end
    );

    const currentMetrics = getProductMetrics(currentInvoices);
    const previousMetrics = getProductMetrics(previousInvoices);

    return {
      current: currentMetrics,
      previous: previousMetrics,
      comparison: {
        totalProductsSold: calculateComparison(currentMetrics.totalProductsSold, previousMetrics.totalProductsSold),
        uniqueProducts: calculateComparison(currentMetrics.uniqueProducts, previousMetrics.uniqueProducts),
        uniqueBrands: calculateComparison(currentMetrics.uniqueBrands, previousMetrics.uniqueBrands),
        totalRevenue: calculateComparison(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
        averageProductPrice: calculateComparison(currentMetrics.averageProductPrice, previousMetrics.averageProductPrice)
      }
    };
  }

  /**
   * Obtiene ventas filtradas por vendedor
   */
  async getSalesByVendor(vendorName, periodType = 'month', date = new Date()) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);
    const previousPeriod = getPreviousPeriod(date, periodType);

    // Filtrar por vendedor (comparación case-insensitive)
    const vendorInvoices = this.invoices.filter(inv =>
      inv.vendedor && inv.vendedor.toLowerCase() === vendorName.toLowerCase()
    );

    const allCurrentData = filterByDateRange(
      vendorInvoices,
      currentPeriod.start,
      currentPeriod.end
    ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const allPreviousData = filterByDateRange(
      vendorInvoices,
      previousPeriod.start,
      previousPeriod.end
    ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Solo facturas pagadas para métricas
    const currentPaidData = allCurrentData.filter(inv => inv.estado === 'paid');
    const previousPaidData = allPreviousData.filter(inv => inv.estado === 'paid');

    const currentMetrics = calculateMetrics(currentPaidData);
    const previousMetrics = calculateMetrics(previousPaidData);

    return {
      current: {
        ...currentMetrics,
        data: allCurrentData,
        period: currentPeriod
      },
      previous: {
        ...previousMetrics,
        data: allPreviousData,
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
   * Obtiene resumen de todos los vendedores
   */
  async getAllVendorsSummary(periodType = 'month', date = new Date()) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);

    const currentData = filterByDateRange(
      this.invoices,
      currentPeriod.start,
      currentPeriod.end
    );

    // Agrupar por vendedor
    const vendorMap = new Map();

    currentData.forEach(inv => {
      const vendedor = inv.vendedor || 'Sin asignar';
      if (!vendorMap.has(vendedor)) {
        vendorMap.set(vendedor, {
          vendedor,
          total: 0,
          count: 0,
          paid: 0,
          cancelled: 0
        });
      }

      const stats = vendorMap.get(vendedor);
      if (inv.estado === 'paid') {
        stats.total += inv.totalGeneral;
        stats.paid += 1;
      } else {
        stats.cancelled += 1;
      }
      stats.count += 1;
    });

    // Convertir a array y calcular promedios
    const vendorStats = Array.from(vendorMap.values()).map(v => ({
      ...v,
      average: v.paid > 0 ? v.total / v.paid : 0
    }));

    // Ordenar por total de ventas (descendente)
    vendorStats.sort((a, b) => b.total - a.total);

    return {
      vendors: vendorStats,
      period: currentPeriod,
      totals: {
        totalSales: vendorStats.reduce((sum, v) => sum + v.total, 0),
        totalInvoices: vendorStats.reduce((sum, v) => sum + v.count, 0),
        totalPaid: vendorStats.reduce((sum, v) => sum + v.paid, 0),
        totalCancelled: vendorStats.reduce((sum, v) => sum + v.cancelled, 0),
        activeVendors: vendorStats.filter(v => v.total > 0).length
      }
    };
  }

  /**
   * Obtiene lista única de vendedores
   */
  async getVendorsList() {
    await this.loadData();

    const vendors = new Set();
    this.invoices.forEach(inv => {
      if (inv.vendedor && inv.vendedor.trim() !== '') {
        vendors.add(inv.vendedor);
      }
    });

    return Array.from(vendors).sort();
  }

  /**
   * Obtiene top productos de un vendedor específico
   */
  async getVendorTopProducts(vendorName, periodType = 'month', date = new Date(), limit = 5) {
    await this.loadData();

    const currentPeriod = getCurrentPeriod(date, periodType);

    const vendorInvoices = filterByDateRange(
      this.invoices.filter(inv =>
        inv.vendedor &&
        inv.vendedor.toLowerCase() === vendorName.toLowerCase() &&
        inv.estado === 'paid'
      ),
      currentPeriod.start,
      currentPeriod.end
    );

    return getTopProducts(vendorInvoices, limit);
  }
}

// Exportar instancia única del servicio
export default new DataService();

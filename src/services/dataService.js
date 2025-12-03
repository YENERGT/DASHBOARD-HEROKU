import { sampleInvoices, sampleExpenses } from '../data/sampleData';
import {
  filterByDateRange,
  calculateMetrics,
  getCurrentPeriod,
  getPreviousPeriod,
  calculateComparison
} from '../utils/calculations';

/**
 * Servicio para manejar datos de facturas y gastos
 * En producción, esto se conectará a Google Sheets API
 */

class DataService {
  constructor() {
    // Por ahora usamos datos de ejemplo
    // TODO: Conectar con Google Sheets API
    this.invoices = sampleInvoices;
    this.expenses = sampleExpenses;
  }

  /**
   * Obtiene todas las facturas
   */
  getAllInvoices() {
    return this.invoices;
  }

  /**
   * Obtiene facturas por período
   */
  getInvoicesByPeriod(periodType = 'day', date = new Date()) {
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
  getTodayMetrics() {
    return this.getInvoicesByPeriod('day', new Date());
  }

  /**
   * Obtiene métricas del mes actual
   */
  getMonthMetrics() {
    return this.getInvoicesByPeriod('month', new Date());
  }

  /**
   * Obtiene métricas del año actual
   */
  getYearMetrics() {
    return this.getInvoicesByPeriod('year', new Date());
  }

  /**
   * Obtiene últimas transacciones
   */
  getRecentTransactions(limit = 10) {
    return [...this.invoices]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, limit);
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
  getProfitByPeriod(periodType = 'day', date = new Date()) {
    const invoiceData = this.getInvoicesByPeriod(periodType, date);
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

import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calcula la comparación entre dos valores
 */
export const calculateComparison = (currentValue, previousValue) => {
  if (!previousValue || previousValue === 0) {
    return {
      difference: currentValue,
      percentage: currentValue > 0 ? 100 : 0,
      isPositive: currentValue >= 0,
      icon: currentValue >= 0 ? '📈' : '📉',
      color: currentValue >= 0 ? 'green' : 'red'
    };
  }

  const difference = currentValue - previousValue;
  const percentage = ((difference / previousValue) * 100).toFixed(2);
  const isPositive = difference >= 0;

  return {
    difference: parseFloat(difference.toFixed(2)),
    percentage: parseFloat(percentage),
    isPositive,
    icon: isPositive ? '📈' : '📉',
    color: isPositive ? 'green' : 'red'
  };
};

/**
 * Obtiene el período anterior basado en el tipo
 */
export const getPreviousPeriod = (currentDate, periodType) => {
  const date = new Date(currentDate);

  switch(periodType) {
    case 'day':
      return {
        start: startOfDay(subDays(date, 1)),
        end: endOfDay(subDays(date, 1)),
        label: format(subDays(date, 1), "dd/MM/yyyy", { locale: es })
      };
    case 'month':
      const prevMonth = subMonths(date, 1);
      return {
        start: startOfMonth(prevMonth),
        end: endOfMonth(prevMonth),
        label: format(prevMonth, "MMMM yyyy", { locale: es })
      };
    case 'year':
      const prevYear = subYears(date, 1);
      return {
        start: startOfYear(prevYear),
        end: endOfYear(prevYear),
        label: format(prevYear, "yyyy", { locale: es })
      };
    default:
      return null;
  }
};

/**
 * Obtiene el período actual basado en el tipo
 */
export const getCurrentPeriod = (currentDate, periodType) => {
  const date = new Date(currentDate);

  switch(periodType) {
    case 'day':
      return {
        start: startOfDay(date),
        end: endOfDay(date),
        label: format(date, "dd/MM/yyyy", { locale: es })
      };
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
        label: format(date, "MMMM yyyy", { locale: es })
      };
    case 'year':
      return {
        start: startOfYear(date),
        end: endOfYear(date),
        label: format(date, "yyyy", { locale: es })
      };
    default:
      return null;
  }
};

/**
 * Filtra datos por rango de fechas
 */
export const filterByDateRange = (data, startDate, endDate) => {
  return data.filter(item => {
    const itemDate = new Date(item.fecha);
    return itemDate >= startDate && itemDate <= endDate;
  });
};

/**
 * Formatea moneda a Quetzales
 */
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ'
  }).format(value);
};

/**
 * Calcula métricas agregadas de un conjunto de datos
 */
export const calculateMetrics = (data) => {
  const total = data.reduce((sum, item) => sum + parseFloat(item.totalGeneral || 0), 0);
  const totalIVA = data.reduce((sum, item) => sum + parseFloat(item.totalIVA || 0), 0);
  const count = data.length;
  const average = count > 0 ? total / count : 0;

  return {
    total: parseFloat(total.toFixed(2)),
    totalIVA: parseFloat(totalIVA.toFixed(2)),
    count,
    average: parseFloat(average.toFixed(2)),
    totalSinIVA: parseFloat((total - totalIVA).toFixed(2))
  };
};

/**
 * Agrupa datos por canal de venta
 */
export const groupByChannel = (data) => {
  const grouped = data.reduce((acc, item) => {
    const channel = item.canalVenta || 'Sin canal';
    if (!acc[channel]) {
      acc[channel] = {
        channel,
        count: 0,
        total: 0
      };
    }
    acc[channel].count++;
    acc[channel].total += parseFloat(item.totalGeneral || 0);
    return acc;
  }, {});

  return Object.values(grouped);
};

/**
 * Obtiene los top N clientes por monto o frecuencia
 */
export const getTopClients = (data, limit = 10, sortBy = 'total') => {
  const grouped = data.reduce((acc, item) => {
    const clientId = item.nit || 'CF';
    const clientName = item.nombreNit || 'Consumidor Final';

    if (!acc[clientId]) {
      acc[clientId] = {
        nit: clientId,
        nombre: clientName,
        count: 0,
        total: 0
      };
    }
    acc[clientId].count++;
    acc[clientId].total += parseFloat(item.totalGeneral || 0);
    return acc;
  }, {});

  const sorted = Object.values(grouped).sort((a, b) =>
    sortBy === 'total' ? b.total - a.total : b.count - a.count
  );

  return sorted.slice(0, limit);
};

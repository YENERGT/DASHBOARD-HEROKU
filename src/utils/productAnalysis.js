/**
 * Utilidades para análisis de productos y marcas
 */

// Lista de marcas conocidas para extracción (case-insensitive)
const KNOWN_BRANDS = [
  'Ford', 'Mazda', 'Toyota', 'Honda', 'Nissan', 'Chevrolet', 'Hyundai',
  'Kia', 'Volkswagen', 'Mitsubishi', 'Suzuki', 'Isuzu', 'Subaru',
  'Mercedes', 'BMW', 'Audi', 'Volvo', 'Peugeot', 'Renault', 'Fiat',
  'Jeep', 'Dodge', 'RAM', 'GMC', 'Chrysler', 'Cadillac', 'Buick',
  'Lexus', 'Infiniti', 'Acura', 'Land Rover', 'Range Rover', 'Jaguar',
  'Tesla', 'BYD', 'Chery', 'Geely', 'Great Wall', 'JAC', 'Haval',
  'MG', 'Mini', 'Porsche', 'Ferrari', 'Lamborghini', 'Maserati',
  'Alfa Romeo', 'Seat', 'Skoda', 'Opel', 'Citroen', 'DS',
  'Daihatsu', 'Hino', 'Freightliner', 'International', 'Kenworth',
  'Peterbilt', 'Mack', 'Volvo Trucks', 'Scania', 'MAN', 'Iveco',
  'Foton', 'Dongfeng', 'FAW', 'JMC', 'Yutong', 'King Long',
  'Higer', 'Golden Dragon', 'Zhongtong', 'Ankai'
];

/**
 * Extrae la marca de un nombre de producto
 * @param {string} productName - Nombre del producto
 * @returns {string} - Marca detectada o 'Otras marcas'
 */
export function extractBrand(productName) {
  if (!productName || typeof productName !== 'string') {
    return 'Otras marcas';
  }

  const lowerName = productName.toLowerCase();

  // Buscar marca conocida en el nombre del producto
  for (const brand of KNOWN_BRANDS) {
    if (lowerName.includes(brand.toLowerCase())) {
      return brand;
    }
  }

  return 'Otras marcas';
}

/**
 * Agrupa productos por marca
 * @param {Array} products - Array de productos con campo 'nombre'
 * @returns {Object} - Objeto con marcas como keys y arrays de productos como values
 */
export function groupProductsByBrand(products) {
  const grouped = {};

  products.forEach(product => {
    const brand = extractBrand(product.nombre);
    if (!grouped[brand]) {
      grouped[brand] = [];
    }
    grouped[brand].push(product);
  });

  return grouped;
}

/**
 * Calcula el producto más vendido (por cantidad total)
 * @param {Array} invoices - Facturas con productosArray
 * @returns {Object} - {nombre, totalCantidad, totalVentas, marca, ocurrencias}
 */
export function getMostSoldProduct(invoices) {
  const productStats = {};

  invoices.forEach(invoice => {
    if (!invoice.productosArray || !Array.isArray(invoice.productosArray)) {
      return;
    }

    invoice.productosArray.forEach(product => {
      const nombre = product.nombre || 'Sin nombre';

      if (!productStats[nombre]) {
        productStats[nombre] = {
          nombre,
          totalCantidad: 0,
          totalVentas: 0,
          ocurrencias: 0,
          marca: extractBrand(nombre)
        };
      }

      productStats[nombre].totalCantidad += product.cantidad || 0;
      productStats[nombre].totalVentas += (product.precio || 0) * (product.cantidad || 0);
      productStats[nombre].ocurrencias += 1;
    });
  });

  // Convertir a array y ordenar por cantidad
  const sortedProducts = Object.values(productStats).sort((a, b) =>
    b.totalCantidad - a.totalCantidad
  );

  return sortedProducts[0] || {
    nombre: 'N/A',
    totalCantidad: 0,
    totalVentas: 0,
    marca: 'N/A',
    ocurrencias: 0
  };
}

/**
 * Obtiene el top N productos más vendidos
 * @param {Array} invoices - Facturas con productosArray
 * @param {number} limit - Número de productos a retornar (default: 10)
 * @returns {Array} - Array de productos ordenados por cantidad
 */
export function getTopProducts(invoices, limit = 10) {
  const productStats = {};

  invoices.forEach(invoice => {
    if (!invoice.productosArray || !Array.isArray(invoice.productosArray)) {
      return;
    }

    invoice.productosArray.forEach(product => {
      const nombre = product.nombre || 'Sin nombre';

      if (!productStats[nombre]) {
        productStats[nombre] = {
          nombre,
          totalCantidad: 0,
          totalVentas: 0,
          promedioVenta: 0,
          ocurrencias: 0,
          marca: extractBrand(nombre)
        };
      }

      productStats[nombre].totalCantidad += product.cantidad || 0;
      const venta = (product.precio || 0) * (product.cantidad || 0);
      productStats[nombre].totalVentas += venta;
      productStats[nombre].ocurrencias += 1;
    });
  });

  // Calcular promedio de venta
  Object.values(productStats).forEach(stat => {
    stat.promedioVenta = stat.totalVentas / stat.ocurrencias;
  });

  // Convertir a array y ordenar por cantidad
  return Object.values(productStats)
    .sort((a, b) => b.totalCantidad - a.totalCantidad)
    .slice(0, limit);
}

/**
 * Obtiene estadísticas por marca
 * @param {Array} invoices - Facturas con productosArray
 * @returns {Array} - Array de marcas con estadísticas
 */
export function getBrandStats(invoices) {
  const brandStats = {};

  invoices.forEach(invoice => {
    if (!invoice.productosArray || !Array.isArray(invoice.productosArray)) {
      return;
    }

    invoice.productosArray.forEach(product => {
      const brand = extractBrand(product.nombre);

      if (!brandStats[brand]) {
        brandStats[brand] = {
          marca: brand,
          totalProductos: 0,
          totalCantidad: 0,
          totalVentas: 0,
          productosUnicos: new Set()
        };
      }

      brandStats[brand].totalCantidad += product.cantidad || 0;
      brandStats[brand].totalVentas += (product.precio || 0) * (product.cantidad || 0);
      brandStats[brand].productosUnicos.add(product.nombre);
      brandStats[brand].totalProductos += 1;
    });
  });

  // Convertir Set a count y ordenar por ventas
  return Object.values(brandStats)
    .map(stat => ({
      ...stat,
      productosUnicos: stat.productosUnicos.size
    }))
    .sort((a, b) => b.totalVentas - a.totalVentas);
}

/**
 * Obtiene el top N productos por marca
 * @param {Array} invoices - Facturas con productosArray
 * @param {number} topBrands - Número de marcas principales (default: 5)
 * @param {number} topProducts - Número de productos por marca (default: 3)
 * @returns {Object} - {brandName: [{nombre, cantidad, ventas}]}
 */
export function getTopProductsByBrand(invoices, topBrands = 5, topProducts = 3) {
  const brandStats = getBrandStats(invoices);
  const topBrandNames = brandStats.slice(0, topBrands).map(b => b.marca);

  const result = {};

  topBrandNames.forEach(brand => {
    const productStats = {};

    invoices.forEach(invoice => {
      if (!invoice.productosArray || !Array.isArray(invoice.productosArray)) {
        return;
      }

      invoice.productosArray.forEach(product => {
        if (extractBrand(product.nombre) === brand) {
          const nombre = product.nombre || 'Sin nombre';

          if (!productStats[nombre]) {
            productStats[nombre] = {
              nombre,
              totalCantidad: 0,
              totalVentas: 0
            };
          }

          productStats[nombre].totalCantidad += product.cantidad || 0;
          productStats[nombre].totalVentas += (product.precio || 0) * (product.cantidad || 0);
        }
      });
    });

    result[brand] = Object.values(productStats)
      .sort((a, b) => b.totalCantidad - a.totalCantidad)
      .slice(0, topProducts);
  });

  return result;
}

/**
 * Calcula métricas generales de productos
 * @param {Array} invoices - Facturas con productosArray
 * @returns {Object} - Métricas generales
 */
export function getProductMetrics(invoices) {
  const uniqueProducts = new Set();
  const uniqueBrands = new Set();
  let totalProductsSold = 0;
  let totalRevenue = 0;

  invoices.forEach(invoice => {
    if (!invoice.productosArray || !Array.isArray(invoice.productosArray)) {
      return;
    }

    invoice.productosArray.forEach(product => {
      uniqueProducts.add(product.nombre);
      uniqueBrands.add(extractBrand(product.nombre));
      totalProductsSold += product.cantidad || 0;
      totalRevenue += (product.precio || 0) * (product.cantidad || 0);
    });
  });

  return {
    totalProductsSold,
    uniqueProducts: uniqueProducts.size,
    uniqueBrands: uniqueBrands.size,
    totalRevenue,
    averageProductPrice: totalProductsSold > 0 ? totalRevenue / totalProductsSold : 0
  };
}

/**
 * Filtra facturas por rango de fechas
 * @param {Array} invoices - Facturas
 * @param {Date} startDate - Fecha inicio
 * @param {Date} endDate - Fecha fin
 * @returns {Array} - Facturas filtradas
 */
export function filterInvoicesByDateRange(invoices, startDate, endDate) {
  return invoices.filter(invoice => {
    const invoiceDate = new Date(invoice.fecha);
    return invoiceDate >= startDate && invoiceDate <= endDate;
  });
}

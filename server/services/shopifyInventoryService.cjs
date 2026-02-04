/**
 * Servicio para consultar inventario de Shopify
 * Obtiene productos y variantes con stock = 0
 */

const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2024-01';

/**
 * Hace una llamada a la API de Shopify
 */
async function shopifyFetch(endpoint, options = {}) {
  if (!SHOPIFY_SHOP_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Shopify credentials not configured (SHOPIFY_SHOP_DOMAIN, SHOPIFY_ACCESS_TOKEN)');
  }

  const url = `https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${API_VERSION}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Shopify API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Obtiene todos los productos con sus variantes e inventario
 * Filtra por stock = 0
 */
async function getOutOfStockProducts() {
  const outOfStock = [];
  let pageInfo = null;
  let hasNextPage = true;

  console.log('📦 Fetching out of stock products from Shopify...');

  while (hasNextPage) {
    // Construir URL con paginación
    let endpoint = '/products.json?limit=250&fields=id,title,images,variants,status';

    if (pageInfo) {
      endpoint = `/products.json?limit=250&page_info=${pageInfo}`;
    }

    const data = await shopifyFetch(endpoint);

    // Procesar productos
    for (const product of data.products) {
      // Solo productos activos
      if (product.status !== 'active') continue;

      // Revisar cada variante
      for (const variant of product.variants) {
        if (variant.inventory_quantity <= 0) {
          outOfStock.push({
            productId: product.id,
            variantId: variant.id,
            productTitle: product.title,
            variantTitle: variant.title !== 'Default Title' ? variant.title : null,
            sku: variant.sku || null,
            inventoryQuantity: variant.inventory_quantity,
            image: product.images?.[0]?.src || null,
            // Nombre combinado para mostrar
            displayName: variant.title !== 'Default Title'
              ? `${product.title} - ${variant.title}`
              : product.title
          });
        }
      }
    }

    // Verificar si hay más páginas (Link header)
    // Shopify usa cursor-based pagination
    hasNextPage = false; // Por ahora solo primera página, extender si hay muchos productos
  }

  console.log(`✅ Found ${outOfStock.length} out of stock items`);
  return outOfStock;
}

/**
 * Verifica si un producto/variante específico ya tiene stock
 * Retorna true si stock > 0
 */
async function checkIfRestocked(variantId) {
  try {
    const data = await shopifyFetch(`/variants/${variantId}.json`);
    return data.variant.inventory_quantity > 0;
  } catch (error) {
    console.error(`Error checking variant ${variantId}:`, error);
    return false;
  }
}

/**
 * Verifica una lista de variantes y retorna las que ya tienen stock
 */
async function checkRestockedVariants(variantIds) {
  const restocked = [];

  for (const variantId of variantIds) {
    const hasStock = await checkIfRestocked(variantId);
    if (hasStock) {
      restocked.push(variantId);
    }
  }

  return restocked;
}

module.exports = {
  getOutOfStockProducts,
  checkIfRestocked,
  checkRestockedVariants
};

/**
 * Servicio para consultar inventario de Shopify
 * Obtiene productos y variantes con stock = 0
 * Soporta paginación para tiendas con +2000 productos
 */

const SHOPIFY_SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2024-01';

/**
 * Hace una llamada a la API de Shopify
 * Retorna tanto el body como los headers (para paginación)
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

  // Obtener Link header para paginación
  const linkHeader = response.headers.get('Link');
  const body = await response.json();

  return { body, linkHeader };
}

/**
 * Parsea el Link header de Shopify para obtener el cursor de la siguiente página
 */
function parseNextPageUrl(linkHeader) {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      const url = new URL(match[1]);
      return url.searchParams.get('page_info');
    }
  }
  return null;
}

/**
 * Obtiene todos los productos con sus variantes e inventario
 * Filtra por stock <= 0
 * Usa paginación cursor-based para obtener TODOS los productos
 */
async function getOutOfStockProducts() {
  const outOfStock = [];
  let pageInfo = null;
  let hasNextPage = true;
  let pageCount = 0;

  console.log('📦 Fetching ALL out of stock products from Shopify (with pagination)...');

  while (hasNextPage) {
    pageCount++;

    // Construir URL con paginación
    let endpoint;
    if (pageInfo) {
      endpoint = `/products.json?limit=250&page_info=${pageInfo}`;
    } else {
      endpoint = '/products.json?limit=250&fields=id,title,images,variants,status';
    }

    console.log(`   📄 Fetching page ${pageCount}...`);

    const { body: data, linkHeader } = await shopifyFetch(endpoint);

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
            price: variant.price || null,
            // Nombre combinado para mostrar
            displayName: variant.title !== 'Default Title'
              ? `${product.title} - ${variant.title}`
              : product.title
          });
        }
      }
    }

    // Verificar si hay más páginas
    const nextPage = parseNextPageUrl(linkHeader);
    if (nextPage) {
      pageInfo = nextPage;
      hasNextPage = true;
    } else {
      hasNextPage = false;
    }

    // Pequeña pausa para no saturar la API (rate limiting)
    if (hasNextPage) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`✅ Fetched ${pageCount} pages, found ${outOfStock.length} out of stock items`);
  return outOfStock;
}

/**
 * Verifica si un producto/variante específico ya tiene stock
 * Retorna true si stock > 0
 */
async function checkIfRestocked(variantId) {
  try {
    const { body: data } = await shopifyFetch(`/variants/${variantId}.json`);
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

  // Procesar en lotes para no saturar la API
  const batchSize = 10;
  for (let i = 0; i < variantIds.length; i += batchSize) {
    const batch = variantIds.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (variantId) => {
        const hasStock = await checkIfRestocked(variantId);
        return { variantId, hasStock };
      })
    );

    for (const result of results) {
      if (result.hasStock) {
        restocked.push(result.variantId);
      }
    }

    // Pequeña pausa entre lotes
    if (i + batchSize < variantIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return restocked;
}

module.exports = {
  getOutOfStockProducts,
  checkIfRestocked,
  checkRestockedVariants
};

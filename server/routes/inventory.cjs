/**
 * Rutas API para gestión de inventario (productos agotados)
 */

const express = require('express');
const router = express.Router();

const { isAuthenticated, isAdmin } = require('../auth/middleware.cjs');
const shopifyInventory = require('../services/shopifyInventoryService.cjs');
const {
  getRequestedProducts,
  markProductAsRequested,
  removeRequestedProducts
} = require('../database/supabase.cjs');

/**
 * GET /api/inventory/out-of-stock
 * Obtiene productos agotados de Shopify + estado de solicitud
 * Requiere rol: admin
 */
router.get('/out-of-stock', isAdmin, async (req, res) => {
  try {
    console.log('📦 Fetching out of stock products...');

    // Obtener productos agotados de Shopify
    const outOfStock = await shopifyInventory.getOutOfStockProducts();

    // Obtener productos ya marcados como solicitados
    const requestedProducts = await getRequestedProducts();
    const requestedVariantIds = new Set(requestedProducts.map(p => p.variant_id));

    // Verificar cuáles de los solicitados ya tienen stock (para limpiar)
    const requestedIds = requestedProducts.map(p => p.variant_id);
    const restocked = await shopifyInventory.checkRestockedVariants(requestedIds);

    // Limpiar los que ya tienen stock
    if (restocked.length > 0) {
      console.log(`🧹 Removing ${restocked.length} restocked products from requested list`);
      await removeRequestedProducts(restocked);
      // Actualizar el set de solicitados
      restocked.forEach(id => requestedVariantIds.delete(id));
    }

    // Combinar información
    const products = outOfStock.map(product => ({
      ...product,
      isRequested: requestedVariantIds.has(product.variantId),
      requestedInfo: requestedProducts.find(p => p.variant_id === product.variantId) || null
    }));

    // Separar por estado
    const pending = products.filter(p => !p.isRequested);
    const requested = products.filter(p => p.isRequested);

    console.log(`✅ Found ${products.length} out of stock (${pending.length} pending, ${requested.length} requested)`);

    res.json({
      success: true,
      data: {
        all: products,
        pending,
        requested
      },
      counts: {
        total: products.length,
        pending: pending.length,
        requested: requested.length,
        restockedAndRemoved: restocked.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching out of stock products:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener productos agotados'
    });
  }
});

/**
 * POST /api/inventory/mark-requested
 * Marca un producto como solicitado a proveedor
 * Requiere rol: admin
 */
router.post('/mark-requested', isAdmin, async (req, res) => {
  try {
    const { variantId, productId, productTitle, variantTitle, sku, image, notes } = req.body;

    if (!variantId || !productId) {
      return res.status(400).json({
        success: false,
        error: 'variantId y productId son requeridos'
      });
    }

    console.log(`📝 Marking variant ${variantId} as requested by ${req.user?.email}...`);

    const result = await markProductAsRequested({
      variantId,
      productId,
      productTitle,
      variantTitle,
      sku,
      image,
      requestedBy: req.user?.email || 'admin',
      notes
    });

    console.log(`✅ Product marked as requested: ${productTitle}`);

    res.json({
      success: true,
      message: 'Producto marcado como solicitado',
      data: result
    });

  } catch (error) {
    console.error('❌ Error marking product as requested:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al marcar producto'
    });
  }
});

/**
 * POST /api/inventory/mark-requested-batch
 * Marca múltiples productos como solicitados
 * Requiere rol: admin
 */
router.post('/mark-requested-batch', isAdmin, async (req, res) => {
  try {
    const { products } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de productos'
      });
    }

    console.log(`📝 Marking ${products.length} products as requested by ${req.user?.email}...`);

    const results = [];
    for (const product of products) {
      const result = await markProductAsRequested({
        ...product,
        requestedBy: req.user?.email || 'admin'
      });
      results.push(result);
    }

    console.log(`✅ ${results.length} products marked as requested`);

    res.json({
      success: true,
      message: `${results.length} productos marcados como solicitados`,
      data: results
    });

  } catch (error) {
    console.error('❌ Error marking products as requested:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al marcar productos'
    });
  }
});

/**
 * GET /api/inventory/requested
 * Obtiene solo los productos marcados como solicitados
 * Requiere rol: admin
 */
router.get('/requested', isAdmin, async (req, res) => {
  try {
    const requestedProducts = await getRequestedProducts();

    res.json({
      success: true,
      data: requestedProducts,
      count: requestedProducts.length
    });

  } catch (error) {
    console.error('❌ Error fetching requested products:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener productos solicitados'
    });
  }
});

module.exports = router;

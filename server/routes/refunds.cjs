/**
 * Rutas API para el sistema de Devoluciones
 */

const express = require('express');
const router = express.Router();

const refundsSheetService = require('../services/refundsSheetService.cjs');
const whatsappService = require('../services/whatsappService.cjs');
const { isAuthenticated, isAdmin } = require('../auth/middleware.cjs');
const { uploadRefundReceipt } = require('../database/supabase.cjs');

/**
 * GET /api/refunds
 * Obtiene todas las devoluciones
 * Requiere rol: admin
 */
router.get('/', isAdmin, async (req, res) => {
  try {
    console.log('📦 Fetching refunds...');
    const refunds = await refundsSheetService.getRefunds();

    // Separar por estado
    const enProceso = refunds.filter(r => r.estadoDevolucion === 'EN_PROCESO');
    const completadas = refunds.filter(r => r.estadoDevolucion === 'COMPLETADO');

    console.log(`✅ Found ${refunds.length} refunds (${enProceso.length} en proceso, ${completadas.length} completadas)`);

    res.json({
      success: true,
      data: {
        all: refunds,
        enProceso,
        completadas
      },
      counts: {
        total: refunds.length,
        enProceso: enProceso.length,
        completadas: completadas.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching refunds:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener devoluciones'
    });
  }
});

/**
 * GET /api/refunds/:rowIndex
 * Obtiene una devolución específica por índice de fila
 * Requiere rol: admin
 */
router.get('/:rowIndex', isAdmin, async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const refund = await refundsSheetService.getRefundByRowIndex(parseInt(rowIndex));

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Devolución no encontrada'
      });
    }

    res.json({
      success: true,
      data: refund
    });

  } catch (error) {
    console.error('❌ Error fetching refund:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener devolución'
    });
  }
});

/**
 * POST /api/refunds/:rowIndex/complete
 * Marca una devolución como completada
 * - Para depósito bancario: Llama al POS para completar flujo en Shopify + anular FEL
 * - Sube el PDF del comprobante a Supabase
 * - Actualiza el estado en Google Sheets
 * - Envía WhatsApp al cliente
 * Requiere rol: admin
 */
router.post('/:rowIndex/complete', isAdmin, async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const { pdfBase64, sendWhatsApp = true } = req.body;

    console.log(`📦 Completing refund for row ${rowIndex}...`);

    // Obtener datos de la devolución
    const refund = await refundsSheetService.getRefundByRowIndex(parseInt(rowIndex));

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Devolución no encontrada'
      });
    }

    if (refund.estadoDevolucion === 'COMPLETADO') {
      return res.status(400).json({
        success: false,
        error: 'Esta devolución ya está completada'
      });
    }

    // Subir PDF a Supabase si se proporciona
    let pdfUrl = null;
    if (pdfBase64) {
      try {
        console.log('📎 Uploading refund receipt PDF...');
        pdfUrl = await uploadRefundReceipt(pdfBase64, refund.pedido);
        console.log('✅ PDF uploaded:', pdfUrl);
      } catch (uploadError) {
        console.error('⚠️ Error uploading PDF (continuing):', uploadError);
        // Continuar sin PDF si falla la subida
      }
    }

    // Para devoluciones de depósito bancario: Llamar al POS para completar flujo en Shopify
    let posResult = null;
    if (refund.metodoDevolucion === 'deposito' && refund.datosDevolucion?.returnId) {
      const posAppUrl = process.env.POS_APP_URL;
      const internalApiKey = process.env.INTERNAL_API_KEY;
      const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;

      if (posAppUrl && internalApiKey && shopDomain) {
        console.log('🏦 Llamando al POS para completar flujo en Shopify...');
        try {
          const posResponse = await fetch(`${posAppUrl}/api/complete-deposit-return`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              apiKey: internalApiKey,
              shop: shopDomain,
              rowIndex: parseInt(rowIndex),
              orderGid: refund.orderGid,
              orderNumber: refund.pedido,
              returnId: refund.datosDevolucion.returnId,
              totalRefundAmount: refund.montoDevolucion,
              selectedItems: refund.itemsDevolucion || [],
              // Datos para anulación de factura FEL
              pdfURL: refund.pdfURL || null,
              nit: refund.nit || null,
              fecha: refund.fecha || null
            })
          });

          posResult = await posResponse.json();

          if (posResult.success) {
            console.log('✅ Flujo Shopify completado:', posResult.data);
          } else {
            console.error('⚠️ Error en flujo Shopify:', posResult.error);
            // No fallar el proceso completo, solo registrar el error
          }
        } catch (posError) {
          console.error('⚠️ Error llamando al POS:', posError.message);
          posResult = { success: false, error: posError.message };
        }
      } else {
        console.warn('⚠️ Variables de entorno para POS no configuradas (POS_APP_URL, INTERNAL_API_KEY, SHOPIFY_SHOP_DOMAIN)');
      }
    }

    // Actualizar estado en Google Sheets
    const updateResult = await refundsSheetService.completeRefund(parseInt(rowIndex), {
      pdfUrl,
      completadoPor: req.user?.email || 'admin'
    });

    // Enviar WhatsApp si está habilitado y hay teléfono
    let whatsappResult = null;
    if (sendWhatsApp && refund.telefono) {
      try {
        console.log(`📱 Sending WhatsApp to ${refund.telefono}...`);

        // Si hay PDF, enviar con documento; si no, enviar mensaje simple
        if (pdfUrl) {
          whatsappResult = await whatsappService.sendRefundNotification(refund.telefono, {
            nombreCliente: refund.nombreCliente,
            pedido: refund.pedido,
            monto: refund.montoDevolucion,
            metodo: refund.metodoDevolucion,
            pdfUrl: pdfUrl
          });
        } else {
          whatsappResult = await whatsappService.sendRefundNotificationSimple(refund.telefono, {
            nombreCliente: refund.nombreCliente,
            pedido: refund.pedido,
            monto: refund.montoDevolucion,
            metodo: refund.metodoDevolucion
          });
        }

        console.log('✅ WhatsApp result:', whatsappResult.success ? 'sent' : 'failed');
      } catch (whatsappError) {
        console.error('⚠️ Error sending WhatsApp (non-critical):', whatsappError);
        whatsappResult = {
          success: false,
          error: whatsappError.message
        };
      }
    }

    console.log(`✅ Refund completed for row ${rowIndex}`);

    res.json({
      success: true,
      message: 'Devolución completada exitosamente',
      data: {
        rowIndex: parseInt(rowIndex),
        pedido: refund.pedido,
        estadoDevolucion: 'COMPLETADO',
        pdfUrl,
        whatsapp: whatsappResult,
        shopify: posResult
      }
    });

  } catch (error) {
    console.error('❌ Error completing refund:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al completar devolución'
    });
  }
});

/**
 * POST /api/refunds/:rowIndex/send-whatsapp
 * Reenvía el WhatsApp de notificación de una devolución completada
 * Requiere rol: admin
 */
router.post('/:rowIndex/send-whatsapp', isAdmin, async (req, res) => {
  try {
    const { rowIndex } = req.params;

    const refund = await refundsSheetService.getRefundByRowIndex(parseInt(rowIndex));

    if (!refund) {
      return res.status(404).json({
        success: false,
        error: 'Devolución no encontrada'
      });
    }

    if (!refund.telefono) {
      return res.status(400).json({
        success: false,
        error: 'La devolución no tiene teléfono registrado'
      });
    }

    console.log(`📱 Resending WhatsApp to ${refund.telefono}...`);

    // Verificar si tiene PDF
    const pdfUrl = refund.datosDevolucion?.pdfComprobanteUrl;

    let whatsappResult;
    if (pdfUrl) {
      whatsappResult = await whatsappService.sendRefundNotification(refund.telefono, {
        nombreCliente: refund.nombreCliente,
        pedido: refund.pedido,
        monto: refund.montoDevolucion,
        metodo: refund.metodoDevolucion,
        pdfUrl: pdfUrl
      });
    } else {
      whatsappResult = await whatsappService.sendRefundNotificationSimple(refund.telefono, {
        nombreCliente: refund.nombreCliente,
        pedido: refund.pedido,
        monto: refund.montoDevolucion,
        metodo: refund.metodoDevolucion
      });
    }

    if (!whatsappResult.success) {
      return res.status(500).json({
        success: false,
        error: whatsappResult.error || 'Error al enviar WhatsApp'
      });
    }

    res.json({
      success: true,
      message: 'WhatsApp enviado exitosamente',
      data: whatsappResult
    });

  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al enviar WhatsApp'
    });
  }
});

/**
 * GET /api/refunds/health
 * Health check para el sistema de devoluciones
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    services: {
      sheets: !!process.env.VITE_GOOGLE_SHEETS_ID || !!process.env.GOOGLE_SHEETS_ID,
      whatsapp: !!process.env.WHATSAPP_PHONE_ID && !!process.env.WHATSAPP_ACCESS_TOKEN,
      supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
});

module.exports = router;

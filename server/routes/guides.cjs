/**
 * Rutas API para el sistema de Guías de Envío
 */

const express = require('express');
const router = express.Router();

const visionService = require('../services/visionService.cjs');
const openaiService = require('../services/openaiService.cjs');
const whatsappService = require('../services/whatsappService.cjs');
const guidesSheetService = require('../services/guidesSheetService.cjs');
const { isAuthenticated, hasRole } = require('../auth/middleware.cjs');

/**
 * POST /api/guides/process-image
 * Procesa una imagen de guías usando Vision AI + GPT
 * Requiere rol: admin o ventas
 */
router.post('/process-image', isAuthenticated, hasRole(['admin', 'ventas']), async (req, res) => {
  try {
    const { image, transport } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una imagen'
      });
    }

    if (!transport || !['guatex', 'forza', 'cargo_express'].includes(transport)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un transporte válido (guatex, forza, cargo_express)'
      });
    }

    console.log(`📷 Processing image for ${transport}...`);

    // Paso 1: Extraer texto con Google Cloud Vision
    const extractedText = await visionService.extractText(image);

    if (!extractedText || extractedText.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'No se pudo extraer texto de la imagen. Verifica que la imagen sea legible.'
      });
    }

    console.log(`📝 Extracted text length: ${extractedText.length}`);

    // Paso 2: Analizar texto con GPT-4o
    const guides = await openaiService.analyzeGuides(extractedText, transport);

    if (!guides || guides.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se encontraron guías en la imagen'
      });
    }

    console.log(`✅ Found ${guides.length} guides`);

    res.json({
      success: true,
      transport,
      extractedText: extractedText.substring(0, 500) + '...', // Preview del texto
      guides,
      count: guides.length
    });

  } catch (error) {
    console.error('❌ Error processing image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar la imagen'
    });
  }
});

/**
 * POST /api/guides/send-whatsapp
 * Envía mensajes de WhatsApp a las guías
 * Requiere rol: admin o ventas
 */
router.post('/send-whatsapp', isAuthenticated, hasRole(['admin', 'ventas']), async (req, res) => {
  try {
    const { guides, transport, imageUrl } = req.body;

    if (!guides || !Array.isArray(guides) || guides.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de guías'
      });
    }

    if (!transport || !['guatex', 'forza', 'cargo_express'].includes(transport)) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un transporte válido'
      });
    }

    console.log(`📤 Sending ${guides.filter(g => g.selected).length} WhatsApp messages...`);

    // Enviar mensajes
    const results = await whatsappService.sendBulkMessages(guides, transport);

    // Actualizar status de las guías con los resultados
    const updatedGuides = guides.map(guide => {
      const result = results.find(r => r.id === guide.id);
      if (result) {
        return {
          ...guide,
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId || null,
          error: result.error || null
        };
      }
      return guide;
    });

    // Contar resultados
    const sent = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;

    // Guardar en Google Sheets
    try {
      await guidesSheetService.ensureSheetExists();
      await guidesSheetService.saveGuides(imageUrl || '', transport, updatedGuides.filter(g => g.selected));
      console.log('✅ Guides saved to Google Sheets');
    } catch (sheetError) {
      console.error('⚠️ Error saving to Google Sheets (non-critical):', sheetError);
    }

    res.json({
      success: true,
      summary: {
        total: guides.length,
        sent,
        failed,
        skipped
      },
      results: updatedGuides
    });

  } catch (error) {
    console.error('❌ Error sending WhatsApp messages:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al enviar mensajes'
    });
  }
});

/**
 * GET /api/guides/templates
 * Obtiene las plantillas de WhatsApp disponibles
 */
router.get('/templates', isAuthenticated, (req, res) => {
  const templates = whatsappService.getTemplates();

  res.json({
    success: true,
    templates: Object.entries(templates).map(([key, value]) => ({
      id: key,
      name: value.name,
      displayName: key === 'guatex' ? 'Guatex' :
                   key === 'forza' ? 'Forza' :
                   key === 'cargo_express' ? 'Cargo Express' : key
    }))
  });
});

/**
 * GET /api/guides/health
 * Health check para el sistema de guías
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    services: {
      vision: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      whatsapp: !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_ID
    }
  });
});

module.exports = router;

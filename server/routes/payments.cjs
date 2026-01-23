/**
 * Rutas API para el sistema de Pagos
 */

const express = require('express');
const router = express.Router();

const visionService = require('../services/visionService.cjs');
const paymentsSheetService = require('../services/paymentsSheetService.cjs');
const { isAuthenticated, hasRole } = require('../auth/middleware.cjs');
const { uploadGuideImage } = require('../database/supabase.cjs');

// Configuración de OpenAI para análisis de pagos
const fetch = require('node-fetch');

/**
 * Analiza el texto extraído de un comprobante de pago con GPT-4o
 * @param {string} ocrText - Texto extraído por OCR
 * @returns {Promise<Array>} - Array de pagos con datos estructurados
 */
async function analyzePaymentWithGPT(ocrText) {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiUrl = 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no está configurada');
  }

  const systemPrompt = `Eres un asistente que analiza texto de comprobantes de pago y devuelve los datos en formato JSON.
No respondas nada más que no sea el JSON.
No incluyas \`\`\` ni ningún otro texto antes o después del JSON.`;

  const userPrompt = `A continuación tienes el texto extraído de un comprobante de pago.

EXTRAE la siguiente información:
- Nombre de la empresa que emite el pago o recibe el pago
- Fecha del pago (en formato YYYY-MM-DD si es posible identificarla)
- Monto del pago (solo el número, sin símbolo de moneda)
- Producto o servicio por el cual se realizó el pago (descripción breve)

REGLAS:
1. Si no puedes identificar algún campo, usa "Sin identificar" para texto o 0 para números.
2. El monto debe ser un número decimal (sin comas de miles, usar punto para decimales).
3. Si hay múltiples pagos en el comprobante, extrae cada uno como un objeto separado.
4. La fecha debe estar en formato YYYY-MM-DD si es posible identificar día, mes y año.

Devuelve un array JSON con esta estructura:

[
  {
    "empresa": "...",
    "fecha": "YYYY-MM-DD",
    "monto": 0.00,
    "producto": "..."
  }
]

Texto extraído por OCR:
${ocrText}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4096,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    // Limpiar el contenido (remover posibles backticks)
    let cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Parsear JSON
    let payments = [];
    try {
      payments = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ Error parsing GPT response:', parseError);
      console.error('Raw content:', content);
      throw new Error('Error al parsear la respuesta de GPT. Verifica la imagen.');
    }

    // Validar y limpiar cada pago
    payments = payments.map((payment, index) => ({
      id: `payment_${Date.now()}_${index}`,
      empresa: payment.empresa || 'Sin identificar',
      fecha: payment.fecha || new Date().toISOString().split('T')[0],
      monto: parseFloat(payment.monto) || 0,
      producto: payment.producto || 'Sin identificar',
      moneda: 'GTQ', // Por defecto GTQ, el usuario lo cambiará si es necesario
      montoConvertido: parseFloat(payment.monto) || 0,
      selected: true
    }));

    console.log(`✅ Analyzed ${payments.length} payments successfully`);
    return payments;

  } catch (error) {
    console.error('❌ Error analyzing payment with GPT:', error);
    throw error;
  }
}

/**
 * POST /api/payments/process-image
 * Procesa una imagen de comprobante de pago usando Vision AI + GPT
 * Requiere rol: admin o ventas
 */
router.post('/process-image', isAuthenticated, hasRole('admin', 'ventas'), async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una imagen'
      });
    }

    console.log('📷 Processing payment image...');

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
    const payments = await analyzePaymentWithGPT(extractedText);

    if (!payments || payments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se encontraron datos de pago en la imagen'
      });
    }

    console.log(`✅ Found ${payments.length} payments`);

    res.json({
      success: true,
      extractedText: extractedText.substring(0, 500) + '...', // Preview del texto
      payments,
      count: payments.length
    });

  } catch (error) {
    console.error('❌ Error processing payment image:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar la imagen'
    });
  }
});

/**
 * POST /api/payments/save
 * Guarda los pagos en Google Sheets
 * Requiere rol: admin o ventas
 */
router.post('/save', isAuthenticated, hasRole('admin', 'ventas'), async (req, res) => {
  try {
    const { payments, imageBase64 } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de pagos'
      });
    }

    // Filtrar solo los pagos seleccionados
    const selectedPayments = payments.filter(p => p.selected);

    if (selectedPayments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Selecciona al menos un pago para guardar'
      });
    }

    console.log(`💰 Saving ${selectedPayments.length} payments...`);

    // Subir imagen a Supabase Storage y obtener URL
    let imageUrl = '';
    if (imageBase64 && imageBase64.startsWith('data:image/')) {
      try {
        const fileName = `pago_${Date.now()}`;
        imageUrl = await uploadGuideImage(imageBase64, fileName);
        console.log('✅ Image uploaded to Supabase:', imageUrl);
      } catch (uploadError) {
        console.error('⚠️ Error uploading image to Supabase (non-critical):', uploadError);
      }
    }

    // Asegurar que la hoja existe
    await paymentsSheetService.ensureSheetExists();

    // Guardar pagos en Google Sheets
    const result = await paymentsSheetService.savePayments(
      selectedPayments,
      imageUrl,
      req.user?.email || 'unknown'
    );

    console.log('✅ Payments saved to Google Sheets');

    // Actualizar status de los pagos
    const updatedPayments = payments.map(payment => ({
      ...payment,
      status: payment.selected ? 'saved' : 'skipped',
      imageUrl: payment.selected ? imageUrl : null
    }));

    res.json({
      success: true,
      summary: {
        total: payments.length,
        saved: selectedPayments.length,
        skipped: payments.length - selectedPayments.length
      },
      results: updatedPayments,
      imageUrl
    });

  } catch (error) {
    console.error('❌ Error saving payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al guardar los pagos'
    });
  }
});

/**
 * GET /api/payments/history
 * Obtiene el historial de pagos
 * Requiere rol: admin o ventas
 */
router.get('/history', isAuthenticated, hasRole('admin', 'ventas'), async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const date = req.query.date ? new Date(req.query.date) : new Date();

    const stats = await paymentsSheetService.getPaymentsStats(period, date);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting payments history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener historial de pagos'
    });
  }
});

/**
 * GET /api/payments/health
 * Health check para el sistema de pagos
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    services: {
      vision: !!process.env.GOOGLE_CLOUD_VISION_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      sheets: !!process.env.VITE_GOOGLE_SHEETS_ID || !!process.env.GOOGLE_SHEETS_ID
    }
  });
});

module.exports = router;

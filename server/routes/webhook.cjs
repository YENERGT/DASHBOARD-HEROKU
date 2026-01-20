/**
 * Webhook para WhatsApp Business API
 * Recibe notificaciones de mensajes entrantes y envía respuestas automáticas
 */

const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService.cjs');

// Token de verificación para el webhook (debe coincidir con el configurado en Meta)
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'revisa_app_webhook_token';

// Set para rastrear mensajes ya procesados (evitar duplicados)
const processedMessages = new Set();

// Limpiar mensajes procesados cada hora para evitar memory leaks
setInterval(() => {
  processedMessages.clear();
  console.log('🧹 Cleared processed messages cache');
}, 60 * 60 * 1000);

/**
 * GET /api/webhook/whatsapp
 * Verificación del webhook por Meta
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔐 Webhook verification request:', { mode, token: token ? '***' : 'missing' });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * POST /api/webhook/whatsapp
 * Recibe notificaciones de mensajes entrantes
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    // Verificar que sea una notificación de WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    // Responder inmediatamente a Meta (requerido en < 20 segundos)
    res.sendStatus(200);

    // Procesar las entradas
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages = value.messages || [];

        for (const message of messages) {
          // Evitar procesar mensajes duplicados
          if (processedMessages.has(message.id)) {
            console.log(`⏭️ Skipping duplicate message: ${message.id}`);
            continue;
          }

          // Marcar como procesado
          processedMessages.add(message.id);

          // Ignorar mensajes de estado (read, delivered, etc.)
          if (message.type === 'system' || !message.from) {
            continue;
          }

          // Procesar el mensaje y enviar respuesta automática
          console.log(`📨 Processing incoming message from ${message.from}`);

          try {
            await whatsappService.handleIncomingMessage(message);
          } catch (error) {
            console.error('❌ Error handling incoming message:', error);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    // Ya respondimos 200, solo logueamos el error
  }
});

/**
 * GET /api/webhook/health
 * Health check para el webhook
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'WhatsApp Webhook',
    verifyToken: VERIFY_TOKEN ? 'configured' : 'missing',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

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

    // Log completo del body recibido para debug
    console.log('📥 Webhook received:', JSON.stringify(body, null, 2));

    // Verificar que sea una notificación de WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      console.log('⚠️ Not a WhatsApp notification, object:', body.object);
      return res.sendStatus(404);
    }

    // Responder inmediatamente a Meta (requerido en < 20 segundos)
    res.sendStatus(200);

    // Procesar las entradas
    const entries = body.entry || [];
    console.log(`📋 Processing ${entries.length} entries`);

    for (const entry of entries) {
      const changes = entry.changes || [];
      console.log(`📋 Entry has ${changes.length} changes`);

      for (const change of changes) {
        console.log(`📋 Change field: ${change.field}`);

        if (change.field !== 'messages') {
          console.log('⏭️ Skipping non-messages field');
          continue;
        }

        const value = change.value;
        const messages = value.messages || [];
        const statuses = value.statuses || [];

        console.log(`📋 Found ${messages.length} messages, ${statuses.length} statuses`);

        // Ignorar notificaciones de estado (delivered, read, etc.)
        if (statuses.length > 0 && messages.length === 0) {
          console.log('📋 Status update only, no action needed');
          continue;
        }

        for (const message of messages) {
          console.log(`📨 Message: id=${message.id}, from=${message.from}, type=${message.type}`);

          // Evitar procesar mensajes duplicados
          if (processedMessages.has(message.id)) {
            console.log(`⏭️ Skipping duplicate message: ${message.id}`);
            continue;
          }

          // Marcar como procesado
          processedMessages.add(message.id);

          // Ignorar mensajes de sistema
          if (message.type === 'system') {
            console.log('⏭️ Skipping system message');
            continue;
          }

          if (!message.from) {
            console.log('⏭️ Skipping message without from field');
            continue;
          }

          // Procesar el mensaje y enviar respuesta automática
          console.log(`📨 Processing incoming message from ${message.from}`);

          try {
            const result = await whatsappService.handleIncomingMessage(message);
            console.log('📤 Auto-reply result:', JSON.stringify(result));
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

/**
 * Servicio de WhatsApp Business API
 * Envía mensajes usando plantillas aprobadas
 */

const fetch = require('node-fetch');
require('dotenv').config();

class WhatsAppService {
  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.apiUrl = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;

    // Una sola plantilla para todos los transportes
    // Template ID: 540231642510842 (Meta Business)
    this.templateName = 'guias_revisa_app';
    this.templateLanguage = 'es';

    // URLs de rastreo por transporte
    this.trackingUrls = {
      guatex: 'https://servicios.guatex.gt/Guatex/Tracking/',
      forza: 'https://rastreo.forzadelivery.com/',
      cargo_express: 'https://cargoexpreso.com/tracking/'
    };

    // Nombres de transporte para mostrar
    this.transportNames = {
      guatex: 'GUATEX',
      forza: 'FORZA',
      cargo_express: 'CARGO EXPRESS'
    };
  }

  /**
   * Envía un mensaje de plantilla a un número de WhatsApp
   * Plantilla: guias_revisa_app
   * - Header: {{1}} = nombre del cliente
   * - Body: {{1}} = número de guía, {{2}} = dirección, {{3}} = número de pedido,
   *         {{4}} = nombre transporte, {{5}} = URL de rastreo
   *
   * @param {string} phone - Número de teléfono (con código de país)
   * @param {string} transport - Tipo de transporte
   * @param {object} data - Datos de la guía
   * @returns {Promise<object>} - Resultado del envío
   */
  async sendGuideMessage(phone, transport, data) {
    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }

    const transportName = this.transportNames[transport] || transport.toUpperCase();
    const trackingUrl = this.trackingUrls[transport] || '';

    // Construir el cuerpo del mensaje con la plantilla
    const messageBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'template',
      template: {
        name: this.templateName,
        language: {
          code: this.templateLanguage
        },
        components: [
          // Header con nombre del cliente
          {
            type: 'header',
            parameters: [
              {
                type: 'text',
                text: data.destinatario || 'Cliente'
              }
            ]
          },
          // Body con 5 parámetros
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: data.numeroGuia || 'N/A'
              },
              {
                type: 'text',
                text: data.direccion || 'Sin dirección'
              },
              {
                type: 'text',
                text: data.numeroPedido || 'Sin identificar'
              },
              {
                type: 'text',
                text: transportName
              },
              {
                type: 'text',
                text: trackingUrl
              }
            ]
          }
        ]
      }
    };

    try {
      console.log(`📤 Sending WhatsApp to ${phone}...`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(messageBody)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('❌ WhatsApp API error:', responseData);
        return {
          success: false,
          phone,
          error: responseData.error?.message || 'Unknown error',
          errorCode: responseData.error?.code
        };
      }

      console.log(`✅ WhatsApp sent successfully to ${phone}`);
      return {
        success: true,
        phone,
        messageId: responseData.messages?.[0]?.id,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error sending WhatsApp to ${phone}:`, error);
      return {
        success: false,
        phone,
        error: error.message
      };
    }
  }

  /**
   * Envía mensajes a múltiples guías
   * @param {Array} guides - Array de guías
   * @param {string} transport - Tipo de transporte
   * @returns {Promise<Array>} - Resultados de cada envío
   */
  async sendBulkMessages(guides, transport) {
    const results = [];

    for (const guide of guides) {
      // Solo enviar a guías seleccionadas
      if (!guide.selected) {
        results.push({
          id: guide.id,
          success: false,
          skipped: true,
          phone: guide.telefono
        });
        continue;
      }

      // Validar que tenga teléfono
      if (!guide.telefono || guide.telefono.length < 10) {
        results.push({
          id: guide.id,
          success: false,
          phone: guide.telefono,
          error: 'Número de teléfono inválido'
        });
        continue;
      }

      const result = await this.sendGuideMessage(guide.telefono, transport, guide);
      results.push({
        id: guide.id,
        ...result
      });

      // Pequeña pausa entre mensajes para evitar rate limiting
      await this.delay(500);
    }

    return results;
  }

  /**
   * Helper para hacer pausa entre envíos
   * @param {number} ms - Milisegundos
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene la información de la plantilla y transportes
   * @returns {object} - Información de plantilla y transportes
   */
  getTemplates() {
    return {
      templateName: this.templateName,
      transports: Object.entries(this.transportNames).map(([key, name]) => ({
        id: key,
        name: name,
        trackingUrl: this.trackingUrls[key]
      }))
    };
  }
}

module.exports = new WhatsAppService();

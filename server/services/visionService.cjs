/**
 * Servicio de Google Cloud Vision API
 * Extrae texto de imágenes usando OCR
 */

const fetch = require('node-fetch');
require('dotenv').config();

class VisionService {
  constructor() {
    this.apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    this.apiUrl = 'https://vision.googleapis.com/v1/images:annotate';
  }

  /**
   * Extrae texto de una imagen usando Google Cloud Vision
   * @param {string} imageBase64 - Imagen en base64 (sin el prefijo data:image/...)
   * @returns {Promise<string>} - Texto extraído de la imagen
   */
  async extractText(imageBase64) {
    if (!this.apiKey) {
      throw new Error('GOOGLE_CLOUD_VISION_API_KEY no está configurada');
    }

    // Limpiar el base64 si viene con prefijo
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const requestBody = {
      requests: [
        {
          image: {
            content: cleanBase64
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Google Vision API error:', errorData);
        throw new Error(`Google Vision API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      // Extraer el texto completo
      const fullText = data.responses?.[0]?.fullTextAnnotation?.text || '';

      if (!fullText) {
        console.warn('⚠️ No text found in image');
        return '';
      }

      console.log('✅ Text extracted successfully, length:', fullText.length);
      return fullText;

    } catch (error) {
      console.error('❌ Error in Vision Service:', error);
      throw error;
    }
  }
}

module.exports = new VisionService();

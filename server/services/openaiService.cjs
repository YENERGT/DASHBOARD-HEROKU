/**
 * Servicio de OpenAI GPT-4o
 * Analiza texto de guías de envío y extrae datos estructurados
 */

const fetch = require('node-fetch');
require('dotenv').config();

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-4o';
  }

  /**
   * Analiza el texto extraído de guías y retorna datos estructurados
   * @param {string} ocrText - Texto extraído por OCR
   * @param {string} transport - Tipo de transporte (guatex, forza, cargo_express)
   * @returns {Promise<Array>} - Array de guías con datos estructurados
   */
  async analyzeGuides(ocrText, transport) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada');
    }

    const transportName = this.getTransportDisplayName(transport);

    const systemPrompt = `Eres un asistente que analiza texto de guías de envío y devuelve los datos en formato JSON.
No respondas nada más que no sea el JSON.
No incluyas \`\`\` ni ningún otro texto antes o después del JSON.`;

    // Instrucciones específicas para Cargo Express
    const guiaInstructions = transport === 'cargo_express'
      ? 'IMPORTANTE: Para Cargo Express, el número de guía es el que aparece como "GUIA MADRE" o "Guía Madre". Ignora cualquier otro número de guía secundario.'
      : '';

    const userPrompt = `A continuación tienes un texto con varias guías de envío de ${transportName}.

EXTRAE ÚNICAMENTE la información del DESTINATARIO de cada guía:
- Número de Guía
- Nombre del Destinatario
- Teléfono del Destinatario
- Dirección del Destinatario
- Número de Pedido/Orden (si existe)

${guiaInstructions}

REGLAS:
1. Solo extrae datos del DESTINATARIO, ignora información del remitente.
2. A los números de teléfono agrégales el 502 al principio si no lo tienen.
3. Quita cualquier carácter que no sea número del teléfono.
4. Si no encuentras número de pedido, usa "Sin identificar".

Devuelve un array JSON con esta estructura:

[
  {
    "numeroGuia": "...",
    "destinatario": "...",
    "telefono": "...",
    "direccion": "...",
    "numeroPedido": "..."
  }
]

Texto extraído por OCR:
${ocrText}`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
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
      let guides = [];
      try {
        guides = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('❌ Error parsing GPT response:', parseError);
        console.error('Raw content:', content);
        throw new Error('Error al parsear la respuesta de GPT. Verifica la imagen.');
      }

      // Validar y limpiar cada guía
      guides = guides.map((guide, index) => ({
        id: `guide_${Date.now()}_${index}`,
        numeroGuia: guide.numeroGuia || '',
        destinatario: guide.destinatario || '',
        telefono: this.cleanPhoneNumber(guide.telefono || ''),
        direccion: guide.direccion || '',
        numeroPedido: guide.numeroPedido || 'Sin identificar',
        selected: true,
        status: 'pending'
      }));

      console.log(`✅ Analyzed ${guides.length} guides successfully`);
      return guides;

    } catch (error) {
      console.error('❌ Error in OpenAI Service:', error);
      throw error;
    }
  }

  /**
   * Limpia y formatea el número de teléfono
   * @param {string} phone - Número de teléfono
   * @returns {string} - Número limpio con código de país
   */
  cleanPhoneNumber(phone) {
    // Remover todo excepto números
    let cleaned = phone.replace(/\D/g, '');

    // Si no empieza con 502 y tiene 8 dígitos, agregar 502
    if (!cleaned.startsWith('502') && cleaned.length === 8) {
      cleaned = '502' + cleaned;
    }

    // Si empieza con 502 pero tiene más de 11 dígitos, tomar solo los primeros 11
    if (cleaned.startsWith('502') && cleaned.length > 11) {
      cleaned = cleaned.substring(0, 11);
    }

    return cleaned;
  }

  /**
   * Obtiene el nombre de display del transporte
   * @param {string} transport - Código del transporte
   * @returns {string} - Nombre para mostrar
   */
  getTransportDisplayName(transport) {
    const names = {
      'guatex': 'Guatex',
      'forza': 'Forza',
      'cargo_express': 'Cargo Express'
    };
    return names[transport] || transport;
  }
}

module.exports = new OpenAIService();

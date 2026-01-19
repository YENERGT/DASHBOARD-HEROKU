/**
 * Servicio para guardar guías en Google Sheets
 * Hoja: GUIAS
 */

const { google } = require('googleapis');
require('dotenv').config();

class GuidesSheetService {
  constructor() {
    this.sheets = null;
    this.initialized = false;
  }

  /**
   * Inicializa la conexión con Google Sheets (con permisos de escritura)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: (process.env.GOOGLE_PRIVATE_KEY || process.env.VITE_GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      this.initialized = true;

      console.log('✅ Guides Sheet Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Guides Sheet Service:', error);
      throw error;
    }
  }

  /**
   * Guarda las guías enviadas en el Google Sheet
   * Hoja: GUIAS
   * Columnas: A=ImageURL, B=Transporte, C=NumeroGuia, D=Destinatario, E=Telefono, F=Direccion, G=NumeroPedido, H=Estado, I=FechaEnvio, J=MessageId
   *
   * @param {string} imageUrl - URL de la imagen procesada
   * @param {string} transport - Tipo de transporte
   * @param {Array} guides - Guías con resultados de envío
   * @returns {Promise<object>} - Resultado de la operación
   */
  async saveGuides(imageUrl, transport, guides) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;
      const now = new Date().toISOString();

      // Preparar filas para insertar
      const rows = guides.map(guide => [
        imageUrl || '',                                    // A: ImageURL
        this.getTransportDisplayName(transport),           // B: Transporte
        guide.numeroGuia || '',                            // C: NumeroGuia
        guide.destinatario || '',                          // D: Destinatario
        guide.telefono || '',                              // E: Telefono
        guide.direccion || '',                             // F: Direccion
        guide.numeroPedido || 'Sin identificar',           // G: NumeroPedido
        guide.status === 'sent' ? 'Enviado' : 'Fallido',   // H: Estado
        now,                                               // I: FechaEnvio
        guide.messageId || ''                              // J: MessageId
      ]);

      // Agregar filas a la hoja GUIAS
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'GUIAS!A:J',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: rows
        }
      });

      console.log(`✅ Saved ${rows.length} guides to Google Sheets`);

      return {
        success: true,
        rowsAdded: rows.length,
        updatedRange: response.data.updates?.updatedRange
      };

    } catch (error) {
      console.error('❌ Error saving guides to Google Sheets:', error);
      throw error;
    }
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

  /**
   * Crea la hoja GUIAS si no existe (con headers)
   */
  async ensureSheetExists() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;

      // Verificar si la hoja existe
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      const guiasSheet = spreadsheet.data.sheets.find(
        sheet => sheet.properties.title === 'GUIAS'
      );

      if (!guiasSheet) {
        // Crear la hoja
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'GUIAS'
                }
              }
            }]
          }
        });

        // Agregar headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'GUIAS!A1:J1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'ImageURL',
              'Transporte',
              'NumeroGuia',
              'Destinatario',
              'Telefono',
              'Direccion',
              'NumeroPedido',
              'Estado',
              'FechaEnvio',
              'MessageId'
            ]]
          }
        });

        console.log('✅ Created GUIAS sheet with headers');
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Error ensuring GUIAS sheet exists:', error);
      throw error;
    }
  }
}

module.exports = new GuidesSheetService();

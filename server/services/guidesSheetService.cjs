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

  /**
   * Obtiene todas las guías del Google Sheet
   * @returns {Promise<Array>} - Array de guías
   */
  async getGuides() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'GUIAS!A:J'
      });

      const rows = response.data.values || [];

      // Si no hay datos o solo hay headers
      if (rows.length <= 1) {
        return [];
      }

      // Convertir filas a objetos (omitiendo header)
      const guides = rows.slice(1).map((row, index) => ({
        id: index + 1,
        imageUrl: row[0] || '',
        transporte: row[1] || '',
        numeroGuia: row[2] || '',
        destinatario: row[3] || '',
        telefono: row[4] || '',
        direccion: row[5] || '',
        numeroPedido: row[6] || 'Sin identificar',
        estado: row[7] || '',
        fechaEnvio: row[8] || '',
        messageId: row[9] || ''
      }));

      // Ordenar por fecha más reciente
      guides.sort((a, b) => new Date(b.fechaEnvio) - new Date(a.fechaEnvio));

      console.log(`✅ Retrieved ${guides.length} guides from Google Sheets`);
      return guides;

    } catch (error) {
      console.error('❌ Error getting guides from Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de guías por período
   * @param {string} period - 'day', 'month', 'year'
   * @param {Date} date - Fecha de referencia
   * @returns {Promise<object>} - Estadísticas
   */
  async getGuidesStats(period, date = new Date()) {
    try {
      const guides = await this.getGuides();

      // Filtrar guías por período
      const filterByPeriod = (guideDate, targetDate, periodType) => {
        const gDate = new Date(guideDate);
        const tDate = new Date(targetDate);

        switch (periodType) {
          case 'day':
            return gDate.toDateString() === tDate.toDateString();
          case 'month':
            return gDate.getMonth() === tDate.getMonth() &&
                   gDate.getFullYear() === tDate.getFullYear();
          case 'year':
            return gDate.getFullYear() === tDate.getFullYear();
          default:
            return false;
        }
      };

      // Calcular período anterior
      const getPreviousDate = (d, periodType) => {
        const prev = new Date(d);
        switch (periodType) {
          case 'day':
            prev.setDate(prev.getDate() - 1);
            break;
          case 'month':
            prev.setMonth(prev.getMonth() - 1);
            break;
          case 'year':
            prev.setFullYear(prev.getFullYear() - 1);
            break;
        }
        return prev;
      };

      const previousDate = getPreviousDate(date, period);

      // Filtrar guías del período actual y anterior
      const currentGuides = guides.filter(g =>
        g.fechaEnvio && filterByPeriod(g.fechaEnvio, date, period)
      );
      const previousGuides = guides.filter(g =>
        g.fechaEnvio && filterByPeriod(g.fechaEnvio, previousDate, period)
      );

      // Contar por transporte
      const countByTransport = (guidesList) => {
        return guidesList.reduce((acc, g) => {
          const transport = g.transporte || 'Desconocido';
          acc[transport] = (acc[transport] || 0) + 1;
          return acc;
        }, {});
      };

      // Agrupar por tiempo para gráfica lineal
      const groupByTime = (guidesList, periodType) => {
        const groups = {};

        guidesList.forEach(g => {
          if (!g.fechaEnvio) return;
          const gDate = new Date(g.fechaEnvio);
          let key;

          switch (periodType) {
            case 'day':
              key = gDate.getHours().toString().padStart(2, '0') + ':00';
              break;
            case 'month':
              key = gDate.getDate().toString();
              break;
            case 'year':
              const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                             'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              key = months[gDate.getMonth()];
              break;
          }

          groups[key] = (groups[key] || 0) + 1;
        });

        return Object.entries(groups).map(([label, count]) => ({
          label,
          envios: count
        })).sort((a, b) => {
          if (periodType === 'day') return a.label.localeCompare(b.label);
          if (periodType === 'month') return parseInt(a.label) - parseInt(b.label);
          return 0; // Para año, mantener orden de meses
        });
      };

      const currentTotal = currentGuides.length;
      const previousTotal = previousGuides.length;
      const percentChange = previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)
        : currentTotal > 0 ? 100 : 0;

      return {
        current: {
          total: currentTotal,
          byTransport: countByTransport(currentGuides),
          timeline: groupByTime(currentGuides, period),
          guides: currentGuides
        },
        previous: {
          total: previousTotal,
          byTransport: countByTransport(previousGuides)
        },
        comparison: {
          total: parseFloat(percentChange),
          byTransport: Object.keys(countByTransport(currentGuides)).reduce((acc, transport) => {
            const current = countByTransport(currentGuides)[transport] || 0;
            const previous = countByTransport(previousGuides)[transport] || 0;
            acc[transport] = previous > 0
              ? ((current - previous) / previous * 100).toFixed(1)
              : current > 0 ? 100 : 0;
            return acc;
          }, {})
        },
        allGuides: guides // Para el timeline completo
      };

    } catch (error) {
      console.error('❌ Error getting guides stats:', error);
      throw error;
    }
  }
}

module.exports = new GuidesSheetService();

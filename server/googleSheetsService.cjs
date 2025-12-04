const { google } = require('googleapis');
require('dotenv').config();

/**
 * Servicio para conectar con Google Sheets API (Backend)
 */
class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.initialized = false;
  }

  /**
   * Inicializa la conexión con Google Sheets
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      this.initialized = true;

      console.log('✅ Google Sheets API initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Google Sheets API:', error);
      throw error;
    }
  }

  /**
   * Obtiene datos del Google Sheet
   * Hoja: REGISTRO (donde están los datos de FEL)
   */
  async getSheetData(range = 'REGISTRO!A2:P') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        console.warn('⚠️ No data found in Google Sheets');
        return [];
      }

      console.log(`✅ Retrieved ${rows.length} rows from Google Sheets`);
      return this.parseRows(rows);
    } catch (error) {
      console.error('❌ Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  /**
   * Convierte las filas del sheet a objetos JavaScript
   * Nota: Zona horaria Guatemala (GMT-6)
   */
  parseRows(rows) {
    return rows.map((row, index) => {
      try {
        // Validar que la fila tenga fecha y serie (columnas críticas)
        const fecha = row[9];
        const serie = row[7];

        // Omitir filas sin fecha o sin serie
        if (!fecha || fecha.trim() === '' || !serie || serie.trim() === '') {
          console.log(`⚠️ Skipping row ${index + 2} - Missing fecha or serie`);
          return null;
        }

        let productos = row[1] || '';
        let direccion = row[12] || '';

        // Parsear productos si es JSON
        try {
          if (productos.startsWith('{') || productos.startsWith('[')) {
            const prodObj = JSON.parse(productos);
            if (prodObj.items && prodObj.items.length > 0) {
              productos = prodObj.items[0].description || productos;
            }
          }
        } catch (e) {}

        // Parsear dirección si es JSON
        try {
          if (direccion.startsWith('{')) {
            direccion = JSON.parse(direccion);
          }
        } catch (e) {}

        // Parsear fecha - convertir a formato ISO y asegurar zona horaria Guatemala
        // Soporta formatos: "03/12/2025 13:21:29" y "2025-11-29 19:12:31"
        let fechaISO = fecha;
        try {
          if (fechaISO.includes('/')) {
            // Formato: DD/MM/YYYY HH:mm:ss (03/12/2025 13:21:29)
            const parts = fechaISO.split(' ');
            const dateParts = parts[0].split('/');
            const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];

            fechaISO = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}T${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:${timeParts[2].padStart(2, '0')}-06:00`;
          } else if (fechaISO.includes(' ') && !fechaISO.includes('T')) {
            // Formato: YYYY-MM-DD HH:mm:ss (2025-11-29 19:12:31)
            const [datePart, timePart] = fechaISO.split(' ');
            const timeParts = timePart ? timePart.split(':') : ['00', '00', '00'];

            fechaISO = `${datePart}T${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:${timeParts[2].padStart(2, '0')}-06:00`;
          } else if (!fechaISO.includes('T')) {
            // Formato: YYYY-MM-DD (solo fecha, sin hora)
            fechaISO = `${fechaISO}T00:00:00-06:00`;
          } else if (!fechaISO.includes('-06:00') && !fechaISO.includes('Z')) {
            // Ya tiene formato ISO pero sin zona horaria
            fechaISO = fechaISO.replace(/[+-]\d{2}:\d{2}$/, '') + '-06:00';
          }
        } catch (e) {
          console.error(`Error parsing date for row ${index}:`, fechaISO, e);
        }

        return {
          pedido: row[0] || '',
          productos: productos,
          totalGeneral: parseFloat(row[2]) || 0,
          totalIVA: parseFloat(row[3]) || 0,
          nit: row[4] || 'CF',
          nombreNit: row[5] || 'Consumidor Final',
          uuid: row[6] || '',
          serie: row[7] || '',
          noAutorizacion: row[8] || '',
          fecha: fechaISO,
          estado: row[10]?.toLowerCase() === 'paid' ? 'paid' : 'ANULADO',
          pdfUrl: row[11] || '',
          direccion: direccion,
          telefono: row[13] || '',
          canalVenta: row[14] || 'Sin especificar',
          descuento: parseFloat(row[15]) || 0
        };
      } catch (error) {
        console.error(`Error parsing row ${index}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  }
}

module.exports = new GoogleSheetsService();

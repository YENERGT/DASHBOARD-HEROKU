import { google } from 'googleapis';

/**
 * Servicio para conectar con Google Sheets API
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
      // Configurar autenticación con Service Account
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: import.meta.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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
   */
  async getSheetData(range = 'Sheet1!A2:P') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID;

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

      // Convertir filas a objetos con la estructura esperada
      return this.parseRows(rows);
    } catch (error) {
      console.error('❌ Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  /**
   * Convierte las filas del sheet a objetos JavaScript
   * Basado en la estructura:
   * A: Pedido, B: Productos, C: Total General, D: Total IVA,
   * E: NIT, F: Nombre NIT, G: UUID, H: Serie, I: No Autorización,
   * J: Fecha, K: Estado, L: PDF URL, M: Dirección, N: Teléfono,
   * O: Canal de Venta, P: Descuento
   */
  parseRows(rows) {
    return rows.map(row => {
      try {
        // Parsear JSON si es necesario (columnas B y M pueden contener JSON)
        let productos = row[1] || '';
        let direccion = row[12] || '';

        // Intentar parsear como JSON si parece ser un objeto
        try {
          if (productos.startsWith('{') || productos.startsWith('[')) {
            const prodObj = JSON.parse(productos);
            // Si tiene items, extraer descripción
            if (prodObj.items && prodObj.items.length > 0) {
              productos = prodObj.items[0].description || productos;
            }
          }
        } catch (e) {
          // Si no es JSON válido, usar el valor tal cual
        }

        try {
          if (direccion.startsWith('{')) {
            const dirObj = JSON.parse(direccion);
            direccion = dirObj;
          }
        } catch (e) {
          // Si no es JSON válido, usar el valor tal cual
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
          fecha: row[9] || new Date().toISOString(),
          estado: row[10]?.toLowerCase() === 'paid' ? 'paid' : 'ANULADO',
          pdfUrl: row[11] || '',
          direccion: direccion,
          telefono: row[13] || '',
          canalVenta: row[14] || 'Sin especificar',
          descuento: parseFloat(row[15]) || 0
        };
      } catch (error) {
        console.error('Error parsing row:', error, row);
        return null;
      }
    }).filter(item => item !== null);
  }

  /**
   * Obtiene datos de un rango específico
   */
  async getRange(range) {
    return await this.getSheetData(range);
  }
}

// Exportar instancia única
export default new GoogleSheetsService();

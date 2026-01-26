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
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: (process.env.GOOGLE_PRIVATE_KEY || process.env.VITE_GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
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
  async getSheetData(range = 'REGISTRO!A2:R') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;

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
        let productosArray = []; // Array completo de productos para análisis
        let direccion = row[12] || '';

        // Parsear productos si es JSON
        try {
          if (productos.startsWith('{') || productos.startsWith('[')) {
            const prodObj = JSON.parse(productos);

            // Formato nuevo: {"json":[{"nombre":"...","precio":...,"cantidad":...}]}
            if (prodObj.json && Array.isArray(prodObj.json)) {
              productosArray = prodObj.json.map(p => ({
                nombre: p.nombre || '',
                numero: p.numero || 0,
                precio: parseFloat(p.precio) || 0,
                cantidad: parseInt(p.cantidad) || 0,
                variante: p.variante || null,
                descuento: parseFloat(p.descuento) || 0
              }));

              // Para compatibilidad, crear un string con los nombres
              productos = productosArray.map(p => p.nombre).join(', ');
            }
            // Formato antiguo: {"items":[{"description":"..."}]}
            else if (prodObj.items && Array.isArray(prodObj.items)) {
              productos = prodObj.items[0].description || productos;
              // Crear producto sintético desde items
              productosArray = [{
                nombre: productos,
                numero: 0,
                precio: parseFloat(row[2]) || 0, // totalGeneral
                cantidad: 1,
                variante: null,
                descuento: parseFloat(row[15]) || 0
              }];
            }
          } else if (productos && productos.trim() !== '') {
            // Formato texto plano - crear producto sintético
            productosArray = [{
              nombre: productos,
              numero: 0,
              precio: parseFloat(row[2]) || 0, // totalGeneral
              cantidad: 1,
              variante: null,
              descuento: parseFloat(row[15]) || 0
            }];
          }
        } catch (e) {
          console.error(`Error parsing products in row ${index + 2}:`, e);
          // Si falla el parseo, crear producto sintético con el texto
          if (productos && productos.trim() !== '') {
            productosArray = [{
              nombre: productos,
              numero: 0,
              precio: parseFloat(row[2]) || 0,
              cantidad: 1,
              variante: null,
              descuento: 0
            }];
          }
        }

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
          productos: productos, // String para compatibilidad
          productosArray: productosArray, // Array completo para análisis detallado
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
          descuento: parseFloat(row[15]) || 0,
          vendedor: row[17] || ''
        };
      } catch (error) {
        console.error(`Error parsing row ${index}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  }

  /**
   * Obtiene datos de gastos del Google Sheet
   * Hoja: PAGOS (donde están los gastos)
   */
  async getExpensesData(range = 'PAGOS!A2:D') {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        console.warn('⚠️ No expense data found in Google Sheets');
        return [];
      }

      console.log(`✅ Retrieved ${rows.length} expense rows from Google Sheets`);
      return this.parseExpenseRows(rows);
    } catch (error) {
      console.error('❌ Error fetching expense data:', error);
      throw error;
    }
  }

  /**
   * Convierte las filas de gastos a objetos JavaScript
   * Columnas: A=empresa, B=fecha, C=monto, D=producto
   */
  parseExpenseRows(rows) {
    return rows.map((row, index) => {
      try {
        const empresa = row[0];
        const fecha = row[1];
        const monto = row[2];

        // Omitir filas sin datos críticos
        if (!fecha || fecha.trim() === '' || !monto) {
          console.log(`⚠️ Skipping expense row ${index + 2} - Missing fecha or monto`);
          return null;
        }

        // Parsear producto si es JSON
        let producto = '';
        let precioProducto = 0;
        try {
          const productoData = row[3];
          if (productoData && (productoData.startsWith('{') || productoData.startsWith('['))) {
            const prodObj = JSON.parse(productoData);
            producto = prodObj.nombre || '';
            precioProducto = parseFloat(prodObj.precio) || 0;
          } else {
            producto = productoData || '';
          }
        } catch (e) {
          producto = row[3] || '';
        }

        // Parsear fecha - formato YYYY-MM-DD
        let fechaISO = fecha;
        try {
          if (fechaISO.includes('/')) {
            // Formato: DD/MM/YYYY
            const parts = fechaISO.split('/');
            fechaISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T12:00:00-06:00`;
          } else if (!fechaISO.includes('T')) {
            // Formato: YYYY-MM-DD
            fechaISO = `${fechaISO}T12:00:00-06:00`;
          } else if (!fechaISO.includes('-06:00') && !fechaISO.includes('Z')) {
            fechaISO = fechaISO.replace(/[+-]\d{2}:\d{2}$/, '') + '-06:00';
          }
        } catch (e) {
          console.error(`Error parsing expense date for row ${index}:`, fechaISO, e);
        }

        // Limpiar monto (remover Q, comas, etc)
        let montoLimpio = 0;
        try {
          if (typeof monto === 'string') {
            montoLimpio = parseFloat(monto.replace(/[Q,\s]/g, '')) || 0;
          } else {
            montoLimpio = parseFloat(monto) || 0;
          }
        } catch (e) {
          console.error(`Error parsing monto for row ${index}:`, monto, e);
        }

        return {
          empresa: empresa || 'Sin especificar',
          fecha: fechaISO,
          monto: montoLimpio,
          producto: producto,
          precioProducto: precioProducto
        };
      } catch (error) {
        console.error(`Error parsing expense row ${index}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  }
}

module.exports = new GoogleSheetsService();

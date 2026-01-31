/**
 * Servicio para gestionar devoluciones en Google Sheets
 * Lee y actualiza las columnas S-AA del sheet REGISTRO
 */

const { google } = require('googleapis');
require('dotenv').config();

class RefundsSheetService {
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
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
      });

      const authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
      this.initialized = true;

      console.log('✅ Refunds Sheet Service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Refunds Sheet Service:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las devoluciones del Google Sheet
   * Columnas: A (Pedido), S-AA (datos de devolución), más datos del cliente
   */
  async getRefunds() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;

      // Obtener columnas A-AA para tener toda la información necesaria
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'REGISTRO!A2:AA',
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        console.warn('⚠️ No refund data found in Google Sheets');
        return [];
      }

      // Filtrar y parsear solo las filas que tienen estado de devolución
      const refunds = this.parseRefundRows(rows);
      console.log(`✅ Retrieved ${refunds.length} refunds from Google Sheets`);
      return refunds;
    } catch (error) {
      console.error('❌ Error fetching refunds data:', error);
      throw error;
    }
  }

  /**
   * Parsea las filas del sheet a objetos de devolución
   * Mapeo de columnas:
   * A(0): Pedido, B(1): Productos, C(2): Total, D(3): IVA, E(4): NIT, F(5): NombreNit
   * G(6): UUID, H(7): Serie, I(8): NoAutorizacion, J(9): Fecha, K(10): Estado
   * L(11): PDF_URL, M(12): Direccion, N(13): Telefono, O(14): CanalVenta
   * P(15): Descuento, Q(16): ?, R(17): Vendedor
   * S(18): ORDER_GID, T(19): LINE_ITEMS_JSON, U(20): TRANSACTION_ID
   * V(21): GATEWAY, W(22): ESTADO_DEVOLUCION, X(23): ITEMS_DEVOLUCION
   * Y(24): MONTO_DEVOLUCION, Z(25): FECHA_INICIO_DEVOLUCION, AA(26): DATOS_DEVOLUCION
   */
  parseRefundRows(rows) {
    return rows.map((row, index) => {
      try {
        // Solo procesar filas que tienen ESTADO_DEVOLUCION (columna W, índice 22)
        const estadoDevolucion = row[22];
        if (!estadoDevolucion || estadoDevolucion.trim() === '') {
          return null;
        }

        // Parsear datos de devolución (JSON)
        let datosDevolucion = {};
        try {
          if (row[26] && row[26].trim() !== '') {
            datosDevolucion = JSON.parse(row[26]);
          }
        } catch (e) {
          console.error(`Error parsing DATOS_DEVOLUCION in row ${index + 2}:`, e);
        }

        // Parsear items de devolución (JSON array)
        let itemsDevolucion = [];
        try {
          if (row[23] && row[23].trim() !== '') {
            itemsDevolucion = JSON.parse(row[23]);
          }
        } catch (e) {
          console.error(`Error parsing ITEMS_DEVOLUCION in row ${index + 2}:`, e);
        }

        // Parsear line items original (JSON array)
        let lineItems = [];
        try {
          if (row[19] && row[19].trim() !== '') {
            lineItems = JSON.parse(row[19]);
          }
        } catch (e) {
          console.error(`Error parsing LINE_ITEMS_JSON in row ${index + 2}:`, e);
        }

        // Parsear dirección si es JSON
        let direccion = row[12] || '';
        try {
          if (direccion && direccion.startsWith('{')) {
            direccion = JSON.parse(direccion);
          }
        } catch (e) {}

        // Extraer nombre del cliente
        let nombreCliente = row[5] || 'Cliente';
        if (typeof direccion === 'object' && direccion.name) {
          nombreCliente = direccion.name;
        }

        return {
          rowIndex: index + 2, // +2 porque empezamos en A2
          // Datos del pedido
          pedido: row[0] || '',
          productos: row[1] || '',
          totalGeneral: parseFloat(row[2]) || 0,
          nombreNit: row[5] || 'Consumidor Final',
          fecha: row[9] || '',
          estadoPago: row[10] || '',
          telefono: row[13] || '',
          canalVenta: row[14] || '',
          direccion: direccion,
          nombreCliente: nombreCliente,
          // Datos de Shopify
          orderGid: row[18] || '',
          lineItems: lineItems,
          transactionId: row[20] || '',
          gateway: row[21] || '',
          // Datos de devolución
          estadoDevolucion: estadoDevolucion,
          itemsDevolucion: itemsDevolucion,
          montoDevolucion: parseFloat(row[24]) || 0,
          fechaInicioDevolucion: row[25] || '',
          datosDevolucion: datosDevolucion,
          // Método de devolución (efectivo, deposito, web)
          metodoDevolucion: datosDevolucion.metodo || 'desconocido'
        };
      } catch (error) {
        console.error(`Error parsing refund row ${index + 2}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  }

  /**
   * Actualiza el estado de una devolución a COMPLETADO
   * @param {number} rowIndex - Índice de la fila en el sheet (1-based)
   * @param {object} updateData - Datos a actualizar (pdfUrl, fechaCompletado)
   */
  async completeRefund(rowIndex, updateData = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;

      // Primero obtener los datos actuales de DATOS_DEVOLUCION (columna AA)
      const currentResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `REGISTRO!AA${rowIndex}`,
      });

      let currentData = {};
      try {
        if (currentResponse.data.values && currentResponse.data.values[0] && currentResponse.data.values[0][0]) {
          currentData = JSON.parse(currentResponse.data.values[0][0]);
        }
      } catch (e) {
        console.error('Error parsing current DATOS_DEVOLUCION:', e);
      }

      // Agregar datos del comprobante
      const updatedData = {
        ...currentData,
        completado: true,
        fechaCompletado: new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' }),
        pdfComprobanteUrl: updateData.pdfUrl || null,
        completadoPor: updateData.completadoPor || 'admin'
      };

      // Actualizar columna W (ESTADO_DEVOLUCION), AA (DATOS_DEVOLUCION) y AB (PDF_COMPROBANTE_URL)
      const requests = [
        {
          range: `REGISTRO!W${rowIndex}`,
          values: [['COMPLETADO']]
        },
        {
          range: `REGISTRO!AA${rowIndex}`,
          values: [[JSON.stringify(updatedData)]]
        },
        {
          range: `REGISTRO!AB${rowIndex}`,
          values: [[updateData.pdfUrl || '']]
        }
      ];

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: requests
        }
      });

      console.log(`✅ Refund completed for row ${rowIndex}`);
      return {
        success: true,
        rowIndex,
        estadoDevolucion: 'COMPLETADO',
        datosDevolucion: updatedData
      };
    } catch (error) {
      console.error(`❌ Error completing refund for row ${rowIndex}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene una devolución específica por número de pedido
   * @param {string} pedido - Número de pedido (ej: "#14923")
   */
  async getRefundByPedido(pedido) {
    const refunds = await this.getRefunds();
    return refunds.find(r => r.pedido === pedido || r.pedido === `#${pedido}` || r.pedido.replace('#', '') === pedido.replace('#', ''));
  }

  /**
   * Obtiene una devolución específica por índice de fila
   * @param {number} rowIndex - Índice de la fila
   */
  async getRefundByRowIndex(rowIndex) {
    const refunds = await this.getRefunds();
    return refunds.find(r => r.rowIndex === rowIndex);
  }
}

module.exports = new RefundsSheetService();

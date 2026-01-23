/**
 * Servicio para guardar pagos en Google Sheets
 * Hoja: PAGOS
 */

const { google } = require('googleapis');
require('dotenv').config();

class PaymentsSheetService {
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

      console.log('✅ Payments Sheet Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Payments Sheet Service:', error);
      throw error;
    }
  }

  /**
   * Guarda los pagos en el Google Sheet
   * Hoja: PAGOS
   * Columnas: A=Empresa, B=Fecha, C=Monto, D=Producto, E=MonedaOriginal, F=MontoOriginal, G=ImageURL, H=FechaRegistro, I=Usuario
   *
   * @param {Array} payments - Pagos a guardar
   * @param {string} imageUrl - URL de la imagen procesada
   * @param {string} userEmail - Email del usuario que registra
   * @returns {Promise<object>} - Resultado de la operación
   */
  async savePayments(payments, imageUrl, userEmail) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;
      const now = new Date().toISOString();

      // Preparar filas para insertar
      const rows = payments.map(payment => [
        payment.empresa || '',                              // A: Empresa
        payment.fecha || '',                                // B: Fecha
        payment.montoConvertido || payment.monto || 0,      // C: Monto (en GTQ)
        payment.producto || '',                             // D: Producto
        payment.moneda || 'GTQ',                            // E: MonedaOriginal
        payment.monto || 0,                                 // F: MontoOriginal
        imageUrl || '',                                     // G: ImageURL
        now,                                                // H: FechaRegistro
        userEmail || ''                                     // I: Usuario
      ]);

      // Agregar filas a la hoja PAGOS
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'PAGOS!A:I',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: rows
        }
      });

      console.log(`✅ Saved ${rows.length} payments to Google Sheets`);

      return {
        success: true,
        rowsAdded: rows.length,
        updatedRange: response.data.updates?.updatedRange
      };

    } catch (error) {
      console.error('❌ Error saving payments to Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Crea la hoja PAGOS si no existe (con headers)
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

      const pagosSheet = spreadsheet.data.sheets.find(
        sheet => sheet.properties.title === 'PAGOS'
      );

      if (!pagosSheet) {
        // Crear la hoja
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'PAGOS'
                }
              }
            }]
          }
        });

        // Agregar headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'PAGOS!A1:I1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'Empresa',
              'Fecha',
              'Monto',
              'Producto',
              'MonedaOriginal',
              'MontoOriginal',
              'ImageURL',
              'FechaRegistro',
              'Usuario'
            ]]
          }
        });

        console.log('✅ Created PAGOS sheet with headers');
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Error ensuring PAGOS sheet exists:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los pagos del Google Sheet
   * @returns {Promise<Array>} - Array de pagos
   */
  async getPayments() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const spreadsheetId = process.env.VITE_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'PAGOS!A:I'
      });

      const rows = response.data.values || [];

      // Si no hay datos o solo hay headers
      if (rows.length <= 1) {
        return [];
      }

      // Función para parsear números de forma segura (maneja comas, símbolos de moneda, etc.)
      const parseNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        // Convertir a string y remover todo excepto números, punto decimal y signo negativo
        const cleaned = String(value).replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Convertir filas a objetos (omitiendo header)
      const payments = rows.slice(1).map((row, index) => ({
        id: index + 1,
        empresa: row[0] || '',
        fecha: row[1] || '',
        monto: parseNumber(row[2]),
        producto: row[3] || '',
        monedaOriginal: row[4] || 'GTQ',
        montoOriginal: parseNumber(row[5]),
        imageUrl: row[6] || '',
        fechaRegistro: row[7] || '',
        usuario: row[8] || ''
      }));

      // Ordenar por fecha de registro más reciente
      payments.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

      console.log(`✅ Retrieved ${payments.length} payments from Google Sheets`);
      return payments;

    } catch (error) {
      console.error('❌ Error getting payments from Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de pagos por período
   * @param {string} period - 'day', 'month', 'year'
   * @param {Date} date - Fecha de referencia
   * @returns {Promise<object>} - Estadísticas
   */
  async getPaymentsStats(period, date = new Date()) {
    try {
      const payments = await this.getPayments();

      // Filtrar pagos por período
      const filterByPeriod = (paymentDate, targetDate, periodType) => {
        const pDate = new Date(paymentDate);
        const tDate = new Date(targetDate);

        switch (periodType) {
          case 'day':
            return pDate.toDateString() === tDate.toDateString();
          case 'month':
            return pDate.getMonth() === tDate.getMonth() &&
                   pDate.getFullYear() === tDate.getFullYear();
          case 'year':
            return pDate.getFullYear() === tDate.getFullYear();
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

      // Filtrar pagos del período actual y anterior
      const currentPayments = payments.filter(p =>
        p.fechaRegistro && filterByPeriod(p.fechaRegistro, date, period)
      );
      const previousPayments = payments.filter(p =>
        p.fechaRegistro && filterByPeriod(p.fechaRegistro, previousDate, period)
      );

      // Calcular total de montos
      const sumMonto = (paymentsList) => {
        return paymentsList.reduce((acc, p) => acc + (p.monto || 0), 0);
      };

      // Contar por empresa
      const countByEmpresa = (paymentsList) => {
        return paymentsList.reduce((acc, p) => {
          const empresa = p.empresa || 'Sin identificar';
          acc[empresa] = (acc[empresa] || 0) + 1;
          return acc;
        }, {});
      };

      // Sumar montos por empresa
      const sumByEmpresa = (paymentsList) => {
        return paymentsList.reduce((acc, p) => {
          const empresa = p.empresa || 'Sin identificar';
          acc[empresa] = (acc[empresa] || 0) + (p.monto || 0);
          return acc;
        }, {});
      };

      // Agrupar por tiempo para gráfica lineal
      const groupByTime = (paymentsList, periodType) => {
        const groups = {};

        paymentsList.forEach(p => {
          if (!p.fechaRegistro) return;
          const pDate = new Date(p.fechaRegistro);
          let key;

          switch (periodType) {
            case 'day':
              key = pDate.getHours().toString().padStart(2, '0') + ':00';
              break;
            case 'month':
              key = pDate.getDate().toString();
              break;
            case 'year':
              const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                             'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              key = months[pDate.getMonth()];
              break;
          }

          if (!groups[key]) {
            groups[key] = { count: 0, monto: 0 };
          }
          groups[key].count += 1;
          groups[key].monto += p.monto || 0;
        });

        return Object.entries(groups).map(([label, data]) => ({
          label,
          pagos: data.count,
          monto: data.monto
        })).sort((a, b) => {
          if (periodType === 'day') return a.label.localeCompare(b.label);
          if (periodType === 'month') return parseInt(a.label) - parseInt(b.label);
          return 0;
        });
      };

      const currentTotal = currentPayments.length;
      const previousTotal = previousPayments.length;
      const currentMonto = sumMonto(currentPayments);
      const previousMonto = sumMonto(previousPayments);

      const percentChangeCount = previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1)
        : currentTotal > 0 ? 100 : 0;

      const percentChangeMonto = previousMonto > 0
        ? ((currentMonto - previousMonto) / previousMonto * 100).toFixed(1)
        : currentMonto > 0 ? 100 : 0;

      return {
        current: {
          total: currentTotal,
          totalMonto: currentMonto,
          byEmpresa: countByEmpresa(currentPayments),
          montoByEmpresa: sumByEmpresa(currentPayments),
          timeline: groupByTime(currentPayments, period),
          payments: currentPayments
        },
        previous: {
          total: previousTotal,
          totalMonto: previousMonto,
          byEmpresa: countByEmpresa(previousPayments)
        },
        comparison: {
          total: parseFloat(percentChangeCount),
          monto: parseFloat(percentChangeMonto)
        },
        allPayments: payments
      };

    } catch (error) {
      console.error('❌ Error getting payments stats:', error);
      throw error;
    }
  }
}

module.exports = new PaymentsSheetService();

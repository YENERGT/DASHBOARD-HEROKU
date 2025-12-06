const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const googleSheetsService = require('./googleSheetsService.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos de React en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// Cache simple para facturas
let cachedData = null;
let lastFetch = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Cache para gastos
let cachedExpenses = null;
let lastExpensesFetch = null;

/**
 * GET /api/invoices
 * Obtiene todas las facturas del Google Sheet
 */
app.get('/api/invoices', async (req, res) => {
  try {
    // Verificar cache
    if (cachedData && lastFetch && (Date.now() - lastFetch) < CACHE_DURATION) {
      console.log('📦 Returning cached data');
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
        cacheAge: Math.floor((Date.now() - lastFetch) / 1000)
      });
    }

    console.log('📡 Fetching fresh data from Google Sheets...');
    const data = await googleSheetsService.getSheetData();

    cachedData = data;
    lastFetch = Date.now();

    res.json({
      success: true,
      data: data,
      cached: false,
      count: data.length
    });
  } catch (error) {
    console.error('❌ Error in /api/invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching data from Google Sheets',
      message: error.message
    });
  }
});

/**
 * POST /api/invoices/refresh
 * Fuerza la actualización del cache
 */
app.post('/api/invoices/refresh', async (req, res) => {
  try {
    console.log('🔄 Forcing cache refresh...');
    cachedData = null;
    lastFetch = null;

    const data = await googleSheetsService.getSheetData();
    cachedData = data;
    lastFetch = Date.now();

    res.json({
      success: true,
      data: data,
      count: data.length,
      message: 'Cache refreshed successfully'
    });
  } catch (error) {
    console.error('❌ Error refreshing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Error refreshing data',
      message: error.message
    });
  }
});

/**
 * GET /api/expenses
 * Obtiene todos los gastos del Google Sheet
 */
app.get('/api/expenses', async (req, res) => {
  try {
    // Verificar cache
    if (cachedExpenses && lastExpensesFetch && (Date.now() - lastExpensesFetch) < CACHE_DURATION) {
      console.log('📦 Returning cached expenses data');
      return res.json({
        success: true,
        data: cachedExpenses,
        cached: true,
        cacheAge: Math.floor((Date.now() - lastExpensesFetch) / 1000)
      });
    }

    console.log('📡 Fetching fresh expenses data from Google Sheets...');
    const data = await googleSheetsService.getExpensesData();

    cachedExpenses = data;
    lastExpensesFetch = Date.now();

    res.json({
      success: true,
      data: data,
      cached: false,
      count: data.length
    });
  } catch (error) {
    console.error('❌ Error in /api/expenses:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching expenses data from Google Sheets',
      message: error.message
    });
  }
});

/**
 * POST /api/expenses/refresh
 * Fuerza la actualización del cache de gastos
 */
app.post('/api/expenses/refresh', async (req, res) => {
  try {
    console.log('🔄 Forcing expenses cache refresh...');
    cachedExpenses = null;
    lastExpensesFetch = null;

    const data = await googleSheetsService.getExpensesData();
    cachedExpenses = data;
    lastExpensesFetch = Date.now();

    res.json({
      success: true,
      data: data,
      count: data.length,
      message: 'Expenses cache refreshed successfully'
    });
  } catch (error) {
    console.error('❌ Error refreshing expenses cache:', error);
    res.status(500).json({
      success: false,
      error: 'Error refreshing expenses data',
      message: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      invoices: {
        hasData: !!cachedData,
        lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
        age: lastFetch ? Math.floor((Date.now() - lastFetch) / 1000) : null
      },
      expenses: {
        hasData: !!cachedExpenses,
        lastFetch: lastExpensesFetch ? new Date(lastExpensesFetch).toISOString() : null,
        age: lastExpensesFetch ? Math.floor((Date.now() - lastExpensesFetch) / 1000) : null
      }
    }
  });
});

// En producción, servir el index.html de React para todas las rutas no-API
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Backend API Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:5176`);
  console.log(`📡 API Endpoints:`);
  console.log(`   Facturas:`);
  console.log(`   - GET  http://localhost:${PORT}/api/invoices`);
  console.log(`   - POST http://localhost:${PORT}/api/invoices/refresh`);
  console.log(`   Gastos:`);
  console.log(`   - GET  http://localhost:${PORT}/api/expenses`);
  console.log(`   - POST http://localhost:${PORT}/api/expenses/refresh`);
  console.log(`   Sistema:`);
  console.log(`   - GET  http://localhost:${PORT}/api/health\n`);
});

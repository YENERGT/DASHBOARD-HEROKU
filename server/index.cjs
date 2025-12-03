const express = require('express');
const cors = require('cors');
require('dotenv').config();
const googleSheetsService = require('./googleSheetsService.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Cache simple
let cachedData = null;
let lastFetch = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      hasData: !!cachedData,
      lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
      age: lastFetch ? Math.floor((Date.now() - lastFetch) / 1000) : null
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Backend API Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:5176`);
  console.log(`📡 API Endpoints:`);
  console.log(`   - GET  http://localhost:${PORT}/api/invoices`);
  console.log(`   - POST http://localhost:${PORT}/api/invoices/refresh`);
  console.log(`   - GET  http://localhost:${PORT}/api/health\n`);
});

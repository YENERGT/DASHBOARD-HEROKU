const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const googleSheetsService = require('./googleSheetsService.cjs');
const { createShopifyConfig, setupShopifyRoutes } = require('./shopifyAuth.cjs');
const { setupPassport } = require('./auth/passport.cjs');
const { isAuthenticated, isAdmin, hasRole } = require('./auth/middleware.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Confiar en el proxy de Heroku (necesario para cookies seguras)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware básico
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://dashboard-app-8ef826ce4126.herokuapp.com'
    : 'http://localhost:5176',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Configurar sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'dashboard-fel-secret-change-this',
  resave: false,
  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

// Inicializar Passport
setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// Configurar headers para permitir iframe en Shopify
app.use((req, res, next) => {
  // Permitir que la app sea embebida en iframe de Shopify
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors https://*.myshopify.com https://admin.shopify.com");
  next();
});

// Inicializar Shopify (si está configurado)
const shopify = createShopifyConfig();
if (shopify) {
  setupShopifyRoutes(app, shopify);
}

// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

/**
 * GET /auth/google
 * Inicia el flujo de autenticación con Google
 */
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * GET /auth/google/callback
 * Callback de Google OAuth
 */
app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=unauthorized',
    failureMessage: true
  }),
  (req, res) => {
    // Autenticación exitosa
    console.log('✅ Login exitoso:', req.user.email);
    res.redirect('/');
  }
);

/**
 * GET /auth/logout
 * Cerrar sesión
 */
app.get('/auth/logout', (req, res) => {
  const userEmail = req.user?.email;
  req.logout((err) => {
    if (err) {
      console.error('Error en logout:', err);
    }
    console.log('👋 Logout:', userEmail);
    res.redirect('/login');
  });
});

/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 */
app.get('/api/auth/me', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      authenticated: false
    });
  }

  res.json({
    success: true,
    authenticated: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.display_name,
      photoUrl: req.user.photo_url,
      role: req.user.role
    }
  });
});

// ========================================
// RUTAS DE GESTIÓN DE USUARIOS (Solo Admin)
// ========================================

const {
  getAllUsers,
  createUser,
  updateUserRole,
  deactivateUser
} = require('./database/supabase.cjs');

/**
 * GET /api/users
 * Obtener todos los usuarios (solo admin)
 */
app.get('/api/users', isAdmin, async (req, res) => {
  try {
    const users = await getAllUsers();

    res.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        displayName: u.display_name,
        photoUrl: u.photo_url,
        role: u.role,
        active: u.active,
        createdAt: u.created_at,
        lastLogin: u.last_login
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios'
    });
  }
});

/**
 * POST /api/users
 * Crear nuevo usuario (invitación) - solo admin
 */
app.post('/api/users', isAdmin, async (req, res) => {
  try {
    const { email, displayName, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Email y rol son requeridos'
      });
    }

    if (!['admin', 'ventas', 'bodega'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido. Debe ser: admin, ventas o bodega'
      });
    }

    const newUser = await createUser({
      email,
      displayName: displayName || email,
      role
    });

    console.log('✅ Usuario creado por', req.user.email, ':', email);

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('❌ Error creating user:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error al crear usuario'
    });
  }
});

/**
 * PATCH /api/users/:id/role
 * Actualizar rol de usuario - solo admin
 */
app.patch('/api/users/:id/role', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'ventas', 'bodega'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido'
      });
    }

    const updatedUser = await updateUserRole(id, role);

    console.log('✅ Rol actualizado por', req.user.email, ':', updatedUser.email, '->', role);

    res.json({
      success: true,
      message: 'Rol actualizado',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    console.error('❌ Error updating role:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar rol'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Desactivar usuario - solo admin
 */
app.delete('/api/users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir que el admin se elimine a sí mismo
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminarte a ti mismo'
      });
    }

    const deletedUser = await deactivateUser(id);

    console.log('✅ Usuario desactivado por', req.user.email, ':', deletedUser.email);

    res.json({
      success: true,
      message: 'Usuario desactivado'
    });
  } catch (error) {
    console.error('❌ Error deactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al desactivar usuario'
    });
  }
});

// ========================================
// PROTEGER RUTAS DE API EXISTENTES
// ========================================

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
 * PROTEGIDO: Requiere autenticación
 */
app.get('/api/invoices', isAuthenticated, async (req, res) => {
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
 * PROTEGIDO: Requiere autenticación
 */
app.post('/api/invoices/refresh', isAuthenticated, async (req, res) => {
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
 * PROTEGIDO: Requiere autenticación
 */
app.get('/api/expenses', isAuthenticated, async (req, res) => {
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
 * PROTEGIDO: Requiere autenticación
 */
app.post('/api/expenses/refresh', isAuthenticated, async (req, res) => {
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
  app.use((req, res) => {
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
  console.log(`   - GET  http://localhost:${PORT}/api/health`);

  if (shopify) {
    console.log(`   Shopify:`);
    console.log(`   - GET  http://localhost:${PORT}/api/shopify/auth?shop=STORE.myshopify.com`);
    console.log(`   - GET  http://localhost:${PORT}/shopify (embedded view)`);
  }
  console.log('');
});

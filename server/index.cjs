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
 * Soporta parámetro ?popup=true para modo popup (Shopify embedded)
 */
app.get('/auth/google', (req, res, next) => {
  // Pasar el modo popup como state parameter de OAuth
  const isPopup = req.query.popup === 'true';
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: isPopup ? 'popup' : 'normal'
  })(req, res, next);
});

/**
 * GET /auth/google/callback
 * Callback de Google OAuth
 * Si viene de popup, cierra la ventana y notifica al padre
 */
app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login?error=unauthorized',
    failureMessage: true
  }),
  (req, res) => {
    console.log('✅ Login exitoso:', req.user.email);

    // Verificar si el login fue iniciado desde un popup (via state parameter)
    const isPopup = req.query.state === 'popup';

    if (isPopup) {
      // Enviar HTML que cierra el popup y notifica al padre
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Autenticación exitosa</title>
  <style>
    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1e293b; color: white; }
    .container { text-align: center; }
    .spinner { border: 3px solid #334155; border-top: 3px solid #3b82f6; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Autenticación exitosa</p>
    <p style="font-size: 14px; color: #94a3b8;">Cerrando ventana...</p>
  </div>
  <script>
    // Notificar a la ventana padre y cerrar
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'AUTH_SUCCESS' }, '*');
      setTimeout(function() { window.close(); }, 500);
    } else {
      // Si no hay ventana padre, redirigir
      window.location.href = '/';
    }
  </script>
</body>
</html>
      `);
    } else {
      // Redirección normal
      res.redirect('/');
    }
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
  deactivateUser,
  reactivateUser,
  deleteUserPermanently
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
 * PATCH /api/users/:id/deactivate
 * Inhabilitar usuario (soft delete) - solo admin
 */
app.patch('/api/users/:id/deactivate', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes inhabilitarte a ti mismo'
      });
    }

    const user = await deactivateUser(id);

    console.log('✅ Usuario inhabilitado por', req.user.email, ':', user.email);

    res.json({
      success: true,
      message: 'Usuario inhabilitado',
      user: { id: user.id, email: user.email, active: user.active }
    });
  } catch (error) {
    console.error('❌ Error deactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al inhabilitar usuario'
    });
  }
});

/**
 * PATCH /api/users/:id/reactivate
 * Reactivar usuario inhabilitado - solo admin
 */
app.patch('/api/users/:id/reactivate', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await reactivateUser(id);

    console.log('✅ Usuario reactivado por', req.user.email, ':', user.email);

    res.json({
      success: true,
      message: 'Usuario reactivado',
      user: { id: user.id, email: user.email, active: user.active }
    });
  } catch (error) {
    console.error('❌ Error reactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al reactivar usuario'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Eliminar usuario permanentemente - solo admin
 * Solo se puede eliminar usuarios ya inhabilitados
 */
app.delete('/api/users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminarte a ti mismo'
      });
    }

    const deletedUser = await deleteUserPermanently(id);

    console.log('✅ Usuario eliminado permanentemente por', req.user.email, ':', deletedUser.email);

    res.json({
      success: true,
      message: 'Usuario eliminado permanentemente'
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario'
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

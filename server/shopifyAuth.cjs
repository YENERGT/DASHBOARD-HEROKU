const { shopifyApi } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');

/**
 * Configuración de Shopify API
 */
function createShopifyConfig() {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const scopes = process.env.SHOPIFY_SCOPES || 'read_products,read_orders,read_customers';
  const host = process.env.SHOPIFY_HOST || process.env.HOST || 'localhost';

  if (!apiKey || !apiSecret) {
    console.warn('⚠️ Shopify credentials not configured. Shopify integration disabled.');
    return null;
  }

  const shopify = shopifyApi({
    apiKey,
    apiSecretKey: apiSecret,
    scopes: scopes.split(','),
    hostName: host.replace(/https?:\/\//, ''),
    apiVersion: '2026-01', // Usar la versión de Webhooks que configuraste en Shopify
    isEmbeddedApp: true,
    isCustomStoreApp: false,
  });

  console.log('✅ Shopify API configured successfully');
  return shopify;
}

/**
 * Configura las rutas de autenticación de Shopify en Express
 */
function setupShopifyRoutes(app, shopify) {
  if (!shopify) {
    console.warn('⚠️ Shopify routes not configured (missing credentials)');
    return;
  }

  /**
   * Ruta de inicio de OAuth
   */
  app.get('/api/shopify/auth', async (req, res) => {
    try {
      const { shop } = req.query;

      if (!shop) {
        return res.status(400).send('Missing shop parameter. Use: /api/shopify/auth?shop=yourstore.myshopify.com');
      }

      // Validar que el parámetro shop sea válido
      shopify.utils.validateShop(shop);

      // Generar URL de autorización OAuth
      const authRoute = await shopify.auth.begin({
        shop,
        callbackPath: '/api/shopify/auth/callback',
        isOnline: false,
        rawRequest: req,
        rawResponse: res,
      });

      res.redirect(authRoute);
    } catch (error) {
      console.error('❌ Error in /api/shopify/auth:', error);
      res.status(500).send('Authentication error: ' + error.message);
    }
  });

  /**
   * Callback de OAuth
   */
  app.get('/api/shopify/auth/callback', async (req, res) => {
    try {
      const callback = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });

      const { session } = callback;

      console.log('✅ Shop authenticated:', session.shop);
      console.log('📝 Access Token:', session.accessToken.substring(0, 20) + '...');

      // TODO: Guardar session en base de datos si necesitas hacer llamadas a Shopify API

      // Redirigir al dashboard embebido
      const host = req.query.host;
      res.redirect(`/shopify?shop=${session.shop}&host=${host}`);
    } catch (error) {
      console.error('❌ Error in /api/shopify/auth/callback:', error);
      res.status(500).send('OAuth callback error: ' + error.message);
    }
  });

  /**
   * Ruta del dashboard embebido en Shopify
   */
  app.get('/shopify', (req, res) => {
    const { shop, host } = req.query;

    if (!shop || !host) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Error - Shopify App</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              text-align: center;
            }
            .error {
              background: #fee;
              border: 1px solid #fcc;
              padding: 20px;
              border-radius: 8px;
              max-width: 500px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>⚠️ Missing Parameters</h2>
            <p>Please install the app from Shopify Admin.</p>
            <p>Or use: <code>/api/shopify/auth?shop=yourstore.myshopify.com</code></p>
          </div>
        </body>
        </html>
      `);
    }

    // Servir HTML con Shopify App Bridge
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>APP GENERAL - Dashboard FEL</title>
        <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body, html {
            width: 100%;
            height: 100vh;
            overflow: hidden;
            background: #f4f6f8;
          }
          iframe {
            width: 100%;
            height: 100vh;
            border: none;
            display: none;
          }
          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #202223;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e3e3e3;
            border-top: 4px solid #5c6ac4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          p {
            font-size: 14px;
            color: #6d7175;
          }
        </style>
      </head>
      <body>
        <div id="loading" class="loading">
          <div class="spinner"></div>
          <h2>Cargando Dashboard FEL...</h2>
          <p>Por favor espera un momento</p>
        </div>
        <iframe
          id="dashboard-iframe"
          src="/?shopify_embedded=1"
          allow="fullscreen"
        ></iframe>

        <script>
          // Inicializar Shopify App Bridge
          const AppBridge = window['app-bridge'];
          const createApp = AppBridge.default;

          const app = createApp({
            apiKey: '${process.env.SHOPIFY_API_KEY}',
            host: '${host}',
            forceRedirect: false
          });

          console.log('✅ Shopify App Bridge initialized');
          console.log('🏪 Shop:', '${shop}');

          // Manejar cuando el iframe carga
          const iframe = document.getElementById('dashboard-iframe');
          const loading = document.getElementById('loading');

          iframe.onload = function() {
            console.log('✅ Dashboard loaded successfully');
            loading.style.display = 'none';
            iframe.style.display = 'block';
          };

          iframe.onerror = function() {
            console.error('❌ Error loading dashboard');
            loading.innerHTML = \`
              <div>
                <h2 style="color: #d72c0d;">❌ Error al cargar el dashboard</h2>
                <p>Por favor contacta al soporte técnico</p>
              </div>
            \`;
          };

          // Timeout de 10 segundos
          setTimeout(() => {
            if (loading.style.display !== 'none') {
              console.log('⏱️ Timeout reached, showing iframe anyway');
              iframe.style.display = 'block';
              loading.style.display = 'none';
            }
          }, 10000);
        </script>
      </body>
      </html>
    `);
  });

  console.log('✅ Shopify routes configured:');
  console.log('   - GET /api/shopify/auth');
  console.log('   - GET /api/shopify/auth/callback');
  console.log('   - GET /shopify');
}

module.exports = {
  createShopifyConfig,
  setupShopifyRoutes
};

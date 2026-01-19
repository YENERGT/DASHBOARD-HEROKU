import express from 'express';
import dotenv from 'dotenv';
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES?.split(',') || [],
  hostName: process.env.HOST?.replace(/https?:\/\//, '') || 'localhost',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true, // Importante: se ejecuta dentro de Shopify Admin
  isCustomStoreApp: false,
});

app.use(express.json());

// Middleware para logs
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Ruta principal - Inicia el flujo OAuth de Shopify
 */
app.get('/auth', async (req, res) => {
  try {
    const { shop } = req.query;

    if (!shop) {
      return res.status(400).send('Missing shop parameter');
    }

    // Validar que el parámetro shop sea válido
    shopify.utils.validateShop(shop);

    // Generar URL de autorización OAuth
    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: '/auth/callback',
      isOnline: false, // Usar token offline para acceso permanente
      rawRequest: req,
      rawResponse: res,
    });

    res.redirect(authRoute);
  } catch (error) {
    console.error('Error in /auth:', error);
    res.status(500).send('Authentication error');
  }
});

/**
 * Callback de OAuth - Shopify redirige aquí después de autorizar
 */
app.get('/auth/callback', async (req, res) => {
  try {
    const callback = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    const { session } = callback;

    // Aquí puedes guardar el session.accessToken en tu base de datos
    // para hacer llamadas a la API de Shopify después
    console.log('✅ Shop authenticated:', session.shop);
    console.log('Access Token:', session.accessToken);

    // Redirigir a la app principal
    const host = req.query.host;
    res.redirect(`/?shop=${session.shop}&host=${host}`);
  } catch (error) {
    console.error('Error in /auth/callback:', error);
    res.status(500).send('OAuth callback error');
  }
});

/**
 * Ruta principal de la app - Sirve el HTML con iframe
 */
app.get('/', (req, res) => {
  const { shop, host } = req.query;

  // Si no hay shop o host, redirigir a auth
  if (!shop || !host) {
    return res.status(400).send('Missing required parameters. Please install the app from Shopify Admin.');
  }

  // Servir HTML con iframe embebido
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard FEL</title>
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
        }
        iframe {
          width: 100%;
          height: 100vh;
          border: none;
        }
        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div id="loading" class="loading">
        <div>
          <h2>Cargando Dashboard...</h2>
          <p>Por favor espera un momento</p>
        </div>
      </div>
      <iframe
        id="dashboard-iframe"
        src="${process.env.DASHBOARD_URL}"
        style="display: none;"
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

        console.log('Shopify App Bridge initialized');

        // Manejar cuando el iframe carga
        const iframe = document.getElementById('dashboard-iframe');
        const loading = document.getElementById('loading');

        iframe.onload = function() {
          loading.style.display = 'none';
          iframe.style.display = 'block';
          console.log('Dashboard loaded successfully');
        };

        iframe.onerror = function() {
          loading.innerHTML = '<div><h2>Error al cargar el dashboard</h2><p>Por favor contacta al soporte</p></div>';
        };

        // Timeout de 10 segundos
        setTimeout(() => {
          if (loading.style.display !== 'none') {
            iframe.style.display = 'block';
            loading.style.display = 'none';
          }
        }, 10000);
      </script>
    </body>
    </html>
  `);
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dashboardUrl: process.env.DASHBOARD_URL
  });
});

/**
 * Endpoint para recibir webhooks de Shopify (opcional)
 */
app.post('/webhooks/:topic', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const { topic } = req.params;
    console.log(`Webhook received: ${topic}`);

    // Aquí puedes procesar webhooks de Shopify
    // Por ejemplo: orders/create, products/update, etc.

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing error');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n🚀 Shopify App Wrapper running');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🏪 Dashboard URL: ${process.env.DASHBOARD_URL}`);
  console.log(`\n📋 Installation URL:`);
  console.log(`   https://${process.env.HOST}/auth?shop=YOUR_STORE.myshopify.com\n`);
});

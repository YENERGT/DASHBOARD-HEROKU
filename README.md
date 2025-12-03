# Dashboard Heroku - Sistema FEL

Dashboard interactivo para gestión de facturación electrónica (FEL) de Guatemala, diseñado para Shopify.

## 🚀 Características

### ✅ Implementadas

- **Página de Inicio**: Resumen diario con métricas clave
  - Ventas del día con comparativa vs ayer
  - Facturas emitidas
  - IVA recaudado
  - Ticket promedio
  - Ventas por canal (gráfica de pastel)
  - Estado de facturas (pagadas/anuladas)
  - Últimas transacciones

- **Dashboard FEL**: Análisis completo de ingresos
  - Selector de períodos (Día/Mes/Año)
  - Comparativas automáticas con período anterior
  - Porcentajes de aumento/disminución
  - Gráficas de ingresos comparativos
  - Análisis de facturas
  - Top 10 clientes
  - Tabla detallada de todas las facturas

- **Tema Dark**: Interfaz moderna con tema oscuro

### 🔜 Por Implementar

- **Dashboard de Gastos**: Análisis de profit y rentabilidad
- Integración con Google Sheets API
- Autenticación
- Filtros avanzados
- Exportación de reportes

## 📊 Estructura de Datos (Google Sheets)

Columnas esperadas del Sheet:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| A | Pedido | #14883 |
| B | Productos | Set de empaques Isuzu... |
| C | Total General | 800 |
| D | Total IVA | 85.71 |
| E | NIT | 41361776 |
| F | Nombre NIT | GÓMEZ JUÁREZ, YENER YOVANI |
| G | UUID | DF93507C-... |
| H | Serie | 7EF5531E |
| I | No. Autorización | 7EF5531E-AB28-... |
| J | Fecha | 03/12/2025 13:21:29 |
| K | Estado | paid / ANULADO |
| L | PDF URL | https://app.felplex.com/pdf/... |
| M | Dirección | {...} |
| N | Teléfono | 50253431943 |
| O | Canal de Venta | Depósito bancario |
| P | Descuento | 0 |

## 🛠️ Tecnologías

- **React 18** + Vite
- **Tailwind CSS** - Estilos con tema dark
- **Recharts** - Gráficas interactivas
- **React Router** - Navegación
- **date-fns** - Manejo de fechas
- **Axios** - HTTP client (preparado para API)
- **Papa Parse** - CSV parsing (alternativa a API)

## 📁 Estructura del Proyecto

```
src/
├── components/
│   └── shared/
│       ├── Card.jsx          # Tarjetas con métricas
│       ├── Table.jsx         # Tabla reutilizable
│       ├── PeriodSelector.jsx # Selector Día/Mes/Año
│       └── Layout.jsx        # Layout principal
├── pages/
│   ├── Home.jsx              # Página de inicio
│   ├── FELDashboard.jsx      # Dashboard FEL
│   └── ExpensesDashboard.jsx # Dashboard de gastos
├── services/
│   └── dataService.js        # Servicio de datos
├── utils/
│   └── calculations.js       # Funciones de cálculo
└── data/
    └── sampleData.js         # Datos de ejemplo
```

## 🚀 Instalación y Uso

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:5173

### Build para Producción

```bash
npm run build
```

### Preview de Producción

```bash
npm run preview
```

## 🎨 Características del Diseño

### Comparativas Automáticas

El sistema calcula automáticamente comparativas según el período seleccionado:

- **Día**: Compara con el día anterior
- **Mes**: Compara con el mes anterior
- **Año**: Compara con el año anterior

Muestra:
- Diferencia en monto (Q)
- Porcentaje de cambio (%)
- Indicador visual (📈 verde / 📉 rojo)

### Tema Dark

- Fondo principal: `#0f172a`
- Tarjetas: `#1e293b`
- Bordes: `#334155`
- Texto: `#e2e8f0`
- Colores de acento: Azul primary, Verde success, Rojo danger

## 🔮 Próximos Pasos

1. Implementar Dashboard de Gastos
2. Conectar con Google Sheets API
3. Agregar filtros avanzados por fecha/cliente/canal
4. Exportación a PDF/Excel
5. Notificaciones en tiempo real
6. Deploy a Heroku

## 📝 Licencia

© 2025 Dashboard Heroku - Sistema FEL Guatemala

---

**Versión**: 1.0.0
**Última actualización**: Diciembre 2025

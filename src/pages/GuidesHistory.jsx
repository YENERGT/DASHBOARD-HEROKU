import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

// Logos de transportes (mismos que ShippingGuides)
const transportLogos = {
  'Guatex': 'https://cdn.shopify.com/s/files/1/0289/7264/6460/files/images_8f226455-dd06-4cde-b130-26b25cb721fb.png?v=1768922358',
  'Forza': 'https://cdn.shopify.com/s/files/1/0289/7264/6460/files/logoForza.png?v=1768922358',
  'Cargo Express': 'https://cdn.shopify.com/s/files/1/0289/7264/6460/files/logo_footer.webp?v=1768922358'
};

const GuidesHistory = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [filterTransport, setFilterTransport] = useState('all');

  useEffect(() => {
    loadData();
  }, [selectedPeriod, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}/guides/history`, {
        params: {
          period: selectedPeriod,
          date: selectedDate.toISOString()
        },
        withCredentials: true
      });

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError(response.data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error loading guides history:', err);
      setError(err.response?.data?.error || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return 'Hoy';
      case 'month': return 'Este Mes';
      case 'year': return 'Este Año';
      default: return '';
    }
  };

  const getPreviousPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day': return 'Ayer';
      case 'month': return 'Mes anterior';
      case 'year': return 'Año anterior';
      default: return '';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar guías para timeline
  const getFilteredGuides = () => {
    if (!stats?.current?.guides) return [];
    let guides = stats.current.guides;

    if (filterTransport !== 'all') {
      guides = guides.filter(g => g.transporte === filterTransport);
    }

    return guides.slice(0, 50); // Limitar a 50 para rendimiento
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const filteredGuides = getFilteredGuides();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Historial de Guías</h1>
          <p className="text-slate-400">
            Análisis de envíos y notificaciones - {getPeriodLabel()}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
          {['day', 'month', 'year'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {period === 'day' ? 'Día' : period === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex justify-end">
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Envíos */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Envíos</span>
            <span className="text-2xl">📦</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {stats?.current?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${
              stats?.comparison?.total >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats?.comparison?.total >= 0 ? '↑' : '↓'} {Math.abs(stats?.comparison?.total || 0)}%
            </span>
            <span className="text-slate-500 text-sm">vs {getPreviousPeriodLabel()}</span>
          </div>
        </div>

        {/* Por cada transporte */}
        {Object.entries(stats?.current?.byTransport || {}).map(([transport, count]) => (
          <div key={transport} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">{transport}</span>
              <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center">
                <img
                  src={transportLogos[transport]}
                  alt={transport}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{count}</div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                (stats?.comparison?.byTransport?.[transport] || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(stats?.comparison?.byTransport?.[transport] || 0) >= 0 ? '↑' : '↓'} {Math.abs(stats?.comparison?.byTransport?.[transport] || 0)}%
              </span>
              <span className="text-slate-500 text-sm">vs {getPreviousPeriodLabel()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-semibold text-white">Timeline de Envíos</h2>

        {/* Filter by Transport */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterTransport('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterTransport === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            Todos
          </button>
          {Object.keys(transportLogos).map(transport => (
            <button
              key={transport}
              onClick={() => setFilterTransport(transport)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filterTransport === transport
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              <img src={transportLogos[transport]} alt="" className="w-4 h-4 object-contain" />
              {transport}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline - Improved Layout */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {filteredGuides.length > 0 ? (
          <div className="divide-y divide-slate-700">
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                className="p-4 hover:bg-slate-700/50 transition-colors"
              >
                {/* Row Layout */}
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="w-12 h-12 bg-white rounded-lg p-1.5 flex-shrink-0">
                    <img
                      src={transportLogos[guide.transporte]}
                      alt={guide.transporte}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Guide Number + Status + Date */}
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <span className="font-mono font-semibold text-blue-400 text-lg">
                        {guide.numeroGuia || 'N/A'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        guide.estado === 'Enviado'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {guide.estado === 'Enviado' ? '✓ Enviado' : '✕ Fallido'}
                      </span>
                      <span className="text-slate-500 text-sm ml-auto">
                        {formatDate(guide.fechaEnvio)}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-slate-500">Destinatario: </span>
                        <span className="text-white">{guide.destinatario || 'Sin nombre'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Teléfono: </span>
                        <span className="text-slate-300 font-mono">{guide.telefono || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Pedido: </span>
                        <span className="text-slate-300">{guide.numeroPedido || 'Sin identificar'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Transporte: </span>
                        <span className="text-slate-300">{guide.transporte}</span>
                      </div>
                    </div>

                    {/* Address Row */}
                    <div className="mt-2 text-sm">
                      <span className="text-slate-500">Dirección: </span>
                      <span className="text-slate-400">{guide.direccion || 'Sin dirección'}</span>
                    </div>
                  </div>

                  {/* Image Button */}
                  <div className="flex-shrink-0">
                    {guide.imageUrl && (guide.imageUrl.startsWith('http') || guide.imageUrl.startsWith('data:image/')) ? (
                      <button
                        onClick={() => setSelectedImage(guide.imageUrl)}
                        className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-300 rounded-lg text-sm transition-colors flex items-center gap-2"
                      >
                        <span>📷</span>
                        <span className="hidden sm:inline">Ver</span>
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">Sin imagen</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-slate-400">No hay guías en este período</p>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-slate-800 rounded-xl p-4 max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Imagen de Guía</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Guía de envío"
              className="max-w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GuidesHistory;

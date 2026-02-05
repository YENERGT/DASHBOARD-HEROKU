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
        <p className="text-[#6B7280] font-mono">$ cargando historial<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 p-6 text-center">
          <p className="text-[#EF4444] mb-4 font-mono">[ERROR] {error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-[#3B82F6] text-white font-mono hover:bg-[#3B82F6]/80 transition-colors"
          >
            $ reintentar
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
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-[#10B981]">&gt;</span> historial_guias
          </h1>
          <p className="text-[#6B7280] text-sm">
            // analisis de envios - {getPeriodLabel().toLowerCase()}
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1 bg-[#111111] border border-[#1F1F1F] p-1">
          {['day', 'month', 'year'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 text-sm font-mono transition-all ${
                selectedPeriod === period
                  ? 'bg-[#10B981] text-[#0A0A0A]'
                  : 'text-[#6B7280] hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              {period === 'day' ? '$ dia' : period === 'month' ? '$ mes' : '$ año'}
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
          className="px-4 py-2 bg-[#111111] border border-[#1F1F1F] text-white font-mono focus:outline-none focus:border-[#10B981]"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Envíos */}
        <div className="bg-[#111111] border border-[#1F1F1F] p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6B7280] text-xs font-mono uppercase">// total_envios</span>
            <span className="text-[#10B981] font-mono">#</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1 font-mono">
            {stats?.current?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-mono ${
              stats?.comparison?.total >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
            }`}>
              [{stats?.comparison?.total >= 0 ? '+' : ''}{Math.abs(stats?.comparison?.total || 0)}%]
            </span>
            <span className="text-[#4B5563] text-sm font-mono">vs {getPreviousPeriodLabel().toLowerCase()}</span>
          </div>
        </div>

        {/* Por cada transporte */}
        {Object.entries(stats?.current?.byTransport || {}).map(([transport, count]) => (
          <div key={transport} className="bg-[#111111] border border-[#1F1F1F] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#6B7280] text-xs font-mono">// {transport.toLowerCase().replace(' ', '_')}</span>
              <div className="w-10 h-10 bg-white p-1 flex items-center justify-center">
                <img
                  src={transportLogos[transport]}
                  alt={transport}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1 font-mono">{count}</div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-mono ${
                (stats?.comparison?.byTransport?.[transport] || 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
              }`}>
                [{(stats?.comparison?.byTransport?.[transport] || 0) >= 0 ? '+' : ''}{Math.abs(stats?.comparison?.byTransport?.[transport] || 0)}%]
              </span>
              <span className="text-[#4B5563] text-sm font-mono">vs {getPreviousPeriodLabel().toLowerCase()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-bold text-white">
          <span className="text-[#10B981]">&gt;</span> timeline_envios
        </h2>

        {/* Filter by Transport */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterTransport('all')}
            className={`px-3 py-1.5 text-sm font-mono transition-all ${
              filterTransport === 'all'
                ? 'bg-[#10B981] text-[#0A0A0A]'
                : 'bg-[#1A1A1A] text-[#6B7280] border border-[#1F1F1F] hover:border-[#10B981]'
            }`}
          >
            $ todos
          </button>
          {Object.keys(transportLogos).map(transport => (
            <button
              key={transport}
              onClick={() => setFilterTransport(transport)}
              className={`px-3 py-1.5 text-sm font-mono transition-all flex items-center gap-2 ${
                filterTransport === transport
                  ? 'bg-[#10B981] text-[#0A0A0A]'
                  : 'bg-[#1A1A1A] text-[#6B7280] border border-[#1F1F1F] hover:border-[#10B981]'
              }`}
            >
              <img src={transportLogos[transport]} alt="" className="w-4 h-4 object-contain" />
              {transport.toLowerCase().replace(' ', '_')}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline - Improved Layout */}
      <div className="bg-[#111111] border border-[#1F1F1F] overflow-hidden">
        {filteredGuides.length > 0 ? (
          <div className="divide-y divide-[#1F1F1F]">
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                className="p-4 hover:bg-[#1A1A1A] transition-colors"
              >
                {/* Row Layout */}
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="w-12 h-12 bg-white p-1.5 flex-shrink-0">
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
                      <span className="font-mono font-semibold text-[#3B82F6] text-lg">
                        #{guide.numeroGuia || 'N/A'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-mono ${
                        guide.estado === 'Enviado'
                          ? 'bg-[#10B981]/20 text-[#10B981]'
                          : 'bg-[#EF4444]/20 text-[#EF4444]'
                      }`}>
                        {guide.estado === 'Enviado' ? '[enviado]' : '[fallido]'}
                      </span>
                      <span className="text-[#4B5563] text-sm font-mono ml-auto">
                        {formatDate(guide.fechaEnvio)}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-[#4B5563] font-mono">// dest: </span>
                        <span className="text-white">{guide.destinatario || 'Sin nombre'}</span>
                      </div>
                      <div>
                        <span className="text-[#4B5563] font-mono">// tel: </span>
                        <span className="text-[#FAFAFA] font-mono">{guide.telefono || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[#4B5563] font-mono">// pedido: </span>
                        <span className="text-[#FAFAFA]">{guide.numeroPedido || 'Sin identificar'}</span>
                      </div>
                      <div>
                        <span className="text-[#4B5563] font-mono">// trans: </span>
                        <span className="text-[#FAFAFA]">{guide.transporte}</span>
                      </div>
                    </div>

                    {/* Address Row */}
                    <div className="mt-2 text-sm">
                      <span className="text-[#4B5563] font-mono">// dir: </span>
                      <span className="text-[#6B7280]">{guide.direccion || 'Sin dirección'}</span>
                    </div>
                  </div>

                  {/* Image Button */}
                  <div className="flex-shrink-0">
                    {guide.imageUrl && (guide.imageUrl.startsWith('http') || guide.imageUrl.startsWith('data:image/')) ? (
                      <button
                        onClick={() => setSelectedImage(guide.imageUrl)}
                        className="px-3 py-2 bg-[#1A1A1A] border border-[#1F1F1F] hover:border-[#3B82F6] text-[#FAFAFA] text-sm transition-colors flex items-center gap-2 font-mono"
                      >
                        <span>[img]</span>
                      </button>
                    ) : (
                      <span className="text-[#4B5563] text-xs font-mono">--</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4 font-mono text-[#4B5563]">[empty]</div>
            <p className="text-[#6B7280] font-mono">// no hay guias en este periodo</p>
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
            className="bg-[#111111] border border-[#1F1F1F] p-4 max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                <span className="text-[#10B981]">&gt;</span> imagen_guia
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-[#6B7280] hover:text-[#EF4444] transition-colors font-mono"
              >
                [x]
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Guía de envío"
              className="max-w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default GuidesHistory;

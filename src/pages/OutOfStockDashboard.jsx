import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

const OutOfStockDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState({ pending: [], requested: [] });
  const [counts, setCounts] = useState({ total: 0, pending: 0, requested: 0 });
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingIds, setProcessingIds] = useState(new Set());

  // Cargar datos
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/inventory/out-of-stock`, {
        withCredentials: true
      });

      if (response.data.success) {
        setProducts({
          pending: response.data.data.pending || [],
          requested: response.data.data.requested || []
        });
        setCounts(response.data.counts || { total: 0, pending: 0, requested: 0 });
      } else {
        setError(response.data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error fetching out of stock products:', err);
      setError(err.response?.data?.error || 'Error al cargar productos agotados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrar por búsqueda
  const filteredProducts = (activeTab === 'pending' ? products.pending : products.requested)
    .filter(product => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        product.productTitle?.toLowerCase().includes(search) ||
        product.variantTitle?.toLowerCase().includes(search) ||
        product.sku?.toLowerCase().includes(search) ||
        product.displayName?.toLowerCase().includes(search)
      );
    });

  // Marcar producto como solicitado
  const markAsRequested = async (product) => {
    setProcessingIds(prev => new Set([...prev, product.variantId]));

    try {
      const response = await axios.post(
        `${API_URL}/inventory/mark-requested`,
        {
          variantId: product.variantId,
          productId: product.productId,
          productTitle: product.productTitle,
          variantTitle: product.variantTitle,
          sku: product.sku,
          image: product.image
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        // Mover el producto de pending a requested
        setProducts(prev => ({
          pending: prev.pending.filter(p => p.variantId !== product.variantId),
          requested: [
            {
              ...product,
              isRequested: true,
              requestedInfo: response.data.data
            },
            ...prev.requested
          ]
        }));
        setCounts(prev => ({
          ...prev,
          pending: prev.pending - 1,
          requested: prev.requested + 1
        }));
      } else {
        alert('Error: ' + (response.data.error || 'No se pudo marcar el producto'));
      }
    } catch (err) {
      console.error('Error marking product as requested:', err);
      alert('Error: ' + (err.response?.data?.error || 'Error al marcar producto'));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(product.variantId);
        return next;
      });
    }
  };

  // Cancelar solicitud (regresar a pendientes)
  const cancelRequest = async (product) => {
    setProcessingIds(prev => new Set([...prev, product.variantId]));

    try {
      const response = await axios.delete(
        `${API_URL}/inventory/cancel-requested/${product.variantId}`,
        { withCredentials: true }
      );

      if (response.data.success) {
        // Mover el producto de requested a pending
        setProducts(prev => ({
          requested: prev.requested.filter(p => p.variantId !== product.variantId),
          pending: [
            {
              ...product,
              isRequested: false,
              requestedInfo: null
            },
            ...prev.pending
          ]
        }));
        setCounts(prev => ({
          ...prev,
          pending: prev.pending + 1,
          requested: prev.requested - 1
        }));
      } else {
        alert('Error: ' + (response.data.error || 'No se pudo cancelar la solicitud'));
      }
    } catch (err) {
      console.error('Error canceling request:', err);
      alert('Error: ' + (err.response?.data?.error || 'Error al cancelar solicitud'));
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(product.variantId);
        return next;
      });
    }
  };

  // Formatear fecha
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6B7280] font-mono">$ cargando inventario<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#EF4444]/20 border border-[#EF4444]/30 p-6 text-center">
        <p className="text-[#EF4444] font-mono">[ERROR] {error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-[#EF4444] hover:bg-[#EF4444]/80 text-white font-mono"
        >
          $ reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            <span className="text-[#10B981]">&gt;</span> productos_agotados
          </h1>
          <p className="text-[#6B7280] text-sm font-mono">
            // {counts.total} items sin stock
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-[#3B82F6] hover:bg-[#3B82F6]/80 disabled:bg-[#1F1F1F] disabled:cursor-not-allowed text-white font-mono flex items-center gap-2 transition-colors"
        >
          $ refresh
        </button>
      </div>

      {/* Tabs y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-mono transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-[#EF4444] text-white'
                : 'bg-[#1A1A1A] text-[#6B7280] hover:bg-[#2A2A2A] border border-[#1F1F1F]'
            }`}
          >
            $ pendientes
            <span className={`px-2 py-0.5 text-xs font-mono ${
              activeTab === 'pending' ? 'bg-[#0A0A0A]/20' : 'bg-[#1F1F1F]'
            }`}>
              [{counts.pending}]
            </span>
          </button>
          <button
            onClick={() => setActiveTab('requested')}
            className={`px-4 py-2 font-mono transition-colors flex items-center gap-2 ${
              activeTab === 'requested'
                ? 'bg-[#3B82F6] text-white'
                : 'bg-[#1A1A1A] text-[#6B7280] hover:bg-[#2A2A2A] border border-[#1F1F1F]'
            }`}
          >
            $ solicitados
            <span className={`px-2 py-0.5 text-xs font-mono ${
              activeTab === 'requested' ? 'bg-[#0A0A0A]/20' : 'bg-[#1F1F1F]'
            }`}>
              [{counts.requested}]
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="$ grep producto|sku..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-[#111111] border border-[#1F1F1F] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#10B981] font-mono"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B5563]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Lista de productos */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#111111] border border-[#1F1F1F] p-8 text-center">
          <p className="text-[#4B5563] font-mono text-lg mb-2">$ ls --empty</p>
          <p className="text-[#4B5563] text-sm">
            {searchTerm
              ? `// no hay resultados para "${searchTerm}"`
              : activeTab === 'pending'
                ? '// no hay productos pendientes'
                : '// no hay productos solicitados'}
          </p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1F1F1F] overflow-hidden">
          {/* Header de la tabla */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-[#1A1A1A] border-b border-[#1F1F1F] text-xs font-mono text-[#6B7280] lowercase">
            <div className="col-span-1">img</div>
            <div className="col-span-4">producto</div>
            <div className="col-span-2">sku</div>
            <div className="col-span-1">stock</div>
            <div className="col-span-2">{activeTab === 'requested' ? 'fecha' : 'estado'}</div>
            <div className="col-span-2 text-right">accion</div>
          </div>

          {/* Lista de productos */}
          <div className="divide-y divide-[#1F1F1F]">
            {filteredProducts.map((product) => (
              <div
                key={product.variantId}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-[#1A1A1A] transition-colors"
              >
                {/* Imagen */}
                <div className="col-span-1 flex md:block items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Mobile: mostrar nombre junto a imagen */}
                  <div className="md:hidden flex-1">
                    <p className="text-white font-medium text-sm line-clamp-2">{product.displayName}</p>
                    {product.sku && <p className="text-slate-500 text-xs">SKU: {product.sku}</p>}
                  </div>
                </div>

                {/* Nombre del producto (desktop) */}
                <div className="hidden md:block col-span-4">
                  <p className="text-white font-medium text-sm line-clamp-2" title={product.displayName}>
                    {product.displayName}
                  </p>
                  {product.variantTitle && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      Variante: {product.variantTitle}
                    </p>
                  )}
                </div>

                {/* SKU (desktop) */}
                <div className="hidden md:block col-span-2">
                  <span className="text-slate-400 text-sm font-mono">
                    {product.sku || '-'}
                  </span>
                </div>

                {/* Stock */}
                <div className="hidden md:block col-span-1">
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full">
                    {product.inventoryQuantity}
                  </span>
                </div>

                {/* Estado / Fecha solicitado */}
                <div className="hidden md:block col-span-2">
                  {product.isRequested ? (
                    <div>
                      <div className="flex items-center gap-1 text-blue-400 text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Solicitado
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {formatDate(product.requestedInfo?.requested_at)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-red-400 text-sm">Pendiente</span>
                  )}
                </div>

                {/* Botón de acción */}
                <div className="col-span-1 md:col-span-2 flex justify-end">
                  {product.isRequested ? (
                    <button
                      onClick={() => cancelRequest(product)}
                      disabled={processingIds.has(product.variantId)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                        processingIds.has(product.variantId)
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      {processingIds.has(product.variantId) ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="hidden sm:inline">Cancelar</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsRequested(product)}
                      disabled={processingIds.has(product.variantId)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                        processingIds.has(product.variantId)
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {processingIds.has(product.variantId) ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          <span className="hidden sm:inline">Solicitar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Mobile: info adicional */}
                <div className="md:hidden col-span-1 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full">
                      Stock: {product.inventoryQuantity}
                    </span>
                    {product.isRequested && (
                      <span className="text-blue-400 text-xs">
                        Solicitado {formatDate(product.requestedInfo?.requested_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer con totales */}
      <div className="mt-6 bg-[#111111] border border-[#1F1F1F] p-4">
        <div className="flex flex-wrap gap-6 justify-center text-sm font-mono">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#EF4444]"></div>
            <span className="text-[#6B7280]">pendientes:</span>
            <span className="text-white font-semibold">[{counts.pending}]</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#3B82F6]"></div>
            <span className="text-[#6B7280]">solicitados:</span>
            <span className="text-white font-semibold">[{counts.requested}]</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#6B7280]"></div>
            <span className="text-[#6B7280]">total:</span>
            <span className="text-white font-semibold">[{counts.total}]</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutOfStockDashboard;

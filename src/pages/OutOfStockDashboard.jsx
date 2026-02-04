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
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 mx-auto text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400">Cargando productos agotados...</p>
          <p className="text-slate-500 text-sm mt-2">Esto puede tomar unos segundos si hay muchos productos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 text-center">
        <p className="text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Productos Agotados</h1>
          <p className="text-slate-400">
            {counts.total} productos/variantes sin stock en Shopify
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {/* Tabs y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Pendientes
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'pending' ? 'bg-red-500' : 'bg-slate-600'
            }`}>
              {counts.pending}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('requested')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'requested'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Solicitados
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'requested' ? 'bg-blue-500' : 'bg-slate-600'
            }`}>
              {counts.requested}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar producto, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Lista de productos */}
      {filteredProducts.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
          <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-slate-400">
            {searchTerm
              ? 'No se encontraron productos que coincidan con la búsqueda'
              : activeTab === 'pending'
                ? 'No hay productos agotados pendientes'
                : 'No hay productos marcados como solicitados'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {/* Header de la tabla */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-slate-900 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase">
            <div className="col-span-1">Imagen</div>
            <div className="col-span-4">Producto</div>
            <div className="col-span-2">SKU</div>
            <div className="col-span-1">Stock</div>
            <div className="col-span-2">{activeTab === 'requested' ? 'Solicitado' : 'Estado'}</div>
            <div className="col-span-2 text-right">Acción</div>
          </div>

          {/* Lista de productos */}
          <div className="divide-y divide-slate-700">
            {filteredProducts.map((product) => (
              <div
                key={product.variantId}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-700/30 transition-colors"
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
      <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex flex-wrap gap-6 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-slate-400">Pendientes:</span>
            <span className="text-white font-semibold">{counts.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-slate-400">Solicitados:</span>
            <span className="text-white font-semibold">{counts.requested}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
            <span className="text-slate-400">Total agotados:</span>
            <span className="text-white font-semibold">{counts.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutOfStockDashboard;

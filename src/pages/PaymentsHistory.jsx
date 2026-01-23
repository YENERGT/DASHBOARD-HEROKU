import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = '/api';

const PaymentsHistory = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('table'); // 'table' o 'cards'
  const [selectedImage, setSelectedImage] = useState(null);

  // Cargar datos
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/payments/history`, {
        params: {
          period,
          date: selectedDate.toISOString()
        },
        withCredentials: true
      });

      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error fetching payments history:', err);
      setError(err.response?.data?.error || 'Error al cargar el historial de pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, selectedDate]);

  // Formatear fecha para mostrar
  const formatPeriodLabel = () => {
    const options = {
      day: { day: 'numeric', month: 'long', year: 'numeric' },
      month: { month: 'long', year: 'numeric' },
      year: { year: 'numeric' }
    };
    return selectedDate.toLocaleDateString('es-GT', options[period]);
  };

  // Navegar entre períodos
  const navigatePeriod = (direction) => {
    const newDate = new Date(selectedDate);
    switch (period) {
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + direction);
        break;
    }
    setSelectedDate(newDate);
  };

  // Modal de imagen
  const ImageModal = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-slate-300"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={imageUrl}
          alt="Comprobante de pago"
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-400">Cargando historial...</p>
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Historial de Pagos</h1>
        <p className="text-slate-400">
          Visualiza y analiza los pagos registrados
        </p>
      </div>

      {/* Controles de período */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="flex gap-2">
          {[
            { value: 'day', label: 'Día' },
            { value: 'month', label: 'Mes' },
            { value: 'year', label: 'Año' }
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p.value
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigatePeriod(-1)}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="px-4 py-2 bg-slate-800 rounded-lg text-white font-medium min-w-[200px] text-center">
            {formatPeriodLabel()}
          </span>
          <button
            onClick={() => navigatePeriod(1)}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Pagos</span>
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{data?.current?.total || 0}</div>
          <div className={`text-sm ${data?.comparison?.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data?.comparison?.total >= 0 ? '+' : ''}{data?.comparison?.total || 0}% vs anterior
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Monto Total</span>
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            Q{(data?.current?.totalMonto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-sm ${data?.comparison?.monto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data?.comparison?.monto >= 0 ? '+' : ''}{data?.comparison?.monto || 0}% vs anterior
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Empresas</span>
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {Object.keys(data?.current?.byEmpresa || {}).length}
          </div>
          <div className="text-sm text-slate-400">empresas diferentes</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Promedio/Pago</span>
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            Q{data?.current?.total > 0
              ? ((data?.current?.totalMonto || 0) / data.current.total).toLocaleString('es-GT', { minimumFractionDigits: 2 })
              : '0.00'}
          </div>
          <div className="text-sm text-slate-400">por transacción</div>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Detalle de pagos</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'table' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              Tabla
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded text-sm ${viewMode === 'cards' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              Cards
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Producto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Imagen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {data?.current?.payments?.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white font-medium">{payment.empresa}</td>
                    <td className="px-4 py-3 text-slate-300">{payment.fecha}</td>
                    <td className="px-4 py-3 text-slate-300">{payment.producto}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-400 font-semibold">
                        Q{payment.monto?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </span>
                      {payment.monedaOriginal === 'USD' && (
                        <div className="text-xs text-slate-500">
                          (USD {payment.montoOriginal?.toLocaleString('es-GT', { minimumFractionDigits: 2 })})
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {payment.imageUrl ? (
                        <button
                          onClick={() => setSelectedImage(payment.imageUrl)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data?.current?.payments || data.current.payments.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No hay pagos registrados en este período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
            {data?.current?.payments?.map((payment) => (
              <div key={payment.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold">{payment.empresa}</div>
                    <div className="text-sm text-slate-400">{payment.fecha}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">
                      Q{payment.monto?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </div>
                    {payment.monedaOriginal === 'USD' && (
                      <div className="text-xs text-slate-500">USD {payment.montoOriginal}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-300 mb-3">{payment.producto}</div>
                {payment.imageUrl && (
                  <button
                    onClick={() => setSelectedImage(payment.imageUrl)}
                    className="w-full py-2 bg-slate-600 hover:bg-slate-500 rounded text-sm text-slate-300 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Ver comprobante
                  </button>
                )}
              </div>
            ))}
            {(!data?.current?.payments || data.current.payments.length === 0) && (
              <div className="col-span-full text-center text-slate-500 py-8">
                No hay pagos registrados en este período
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de imagen */}
      {selectedImage && (
        <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
};

export default PaymentsHistory;

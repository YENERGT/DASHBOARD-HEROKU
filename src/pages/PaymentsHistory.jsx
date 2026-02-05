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
      <div className="relative max-w-4xl max-h-[90vh] bg-[#111111] border border-[#1F1F1F] p-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">
            <span className="text-[#10B981]">&gt;</span> comprobante
          </h3>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#EF4444] font-mono"
          >
            [x]
          </button>
        </div>
        <img
          src={imageUrl}
          alt="Comprobante de pago"
          className="max-w-full max-h-[75vh] object-contain"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#6B7280] font-mono">$ cargando historial<span className="animate-pulse">_</span></p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 p-6 text-center">
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          <span className="text-[#10B981]">&gt;</span> historial_pagos
        </h1>
        <p className="text-[#6B7280] text-sm">
          // visualiza y analiza pagos registrados
        </p>
      </div>

      {/* Controles de período */}
      <div className="flex flex-wrap gap-4 mb-6 items-center justify-between">
        <div className="flex gap-1 bg-[#111111] border border-[#1F1F1F] p-1">
          {[
            { value: 'day', label: '$ dia' },
            { value: 'month', label: '$ mes' },
            { value: 'year', label: '$ año' }
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 font-mono text-sm transition-colors ${
                period === p.value
                  ? 'bg-[#10B981] text-[#0A0A0A]'
                  : 'text-[#6B7280] hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigatePeriod(-1)}
            className="p-2 bg-[#1A1A1A] border border-[#1F1F1F] hover:border-[#10B981] text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="px-4 py-2 bg-[#111111] border border-[#1F1F1F] text-white font-mono min-w-[200px] text-center">
            {formatPeriodLabel()}
          </span>
          <button
            onClick={() => navigatePeriod(1)}
            className="p-2 bg-[#1A1A1A] border border-[#1F1F1F] hover:border-[#10B981] text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-2 bg-[#10B981] hover:bg-[#10B981]/80 text-[#0A0A0A] text-sm font-mono"
          >
            $ hoy
          </button>
        </div>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111111] border border-[#1F1F1F] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6B7280] text-xs font-mono uppercase">// total_pagos</span>
            <span className="text-[#10B981] font-mono">#</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{data?.current?.total || 0}</div>
          <div className={`text-sm font-mono ${data?.comparison?.total >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            [{data?.comparison?.total >= 0 ? '+' : ''}{data?.comparison?.total || 0}%]
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1F1F1F] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6B7280] text-xs font-mono uppercase">// monto_total</span>
            <span className="text-[#3B82F6] font-mono">$</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            Q{(data?.current?.totalMonto || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-sm font-mono ${data?.comparison?.monto >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            [{data?.comparison?.monto >= 0 ? '+' : ''}{data?.comparison?.monto || 0}%]
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1F1F1F] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6B7280] text-xs font-mono uppercase">// empresas</span>
            <span className="text-[#8B5CF6] font-mono">@</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {Object.keys(data?.current?.byEmpresa || {}).length}
          </div>
          <div className="text-sm text-[#4B5563] font-mono">// diferentes</div>
        </div>

        <div className="bg-[#111111] border border-[#1F1F1F] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#6B7280] text-xs font-mono uppercase">// promedio</span>
            <span className="text-[#F59E0B] font-mono">~</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            Q{data?.current?.total > 0
              ? ((data?.current?.totalMonto || 0) / data.current.total).toLocaleString('es-GT', { minimumFractionDigits: 2 })
              : '0.00'}
          </div>
          <div className="text-sm text-[#4B5563] font-mono">// por transaccion</div>
        </div>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-[#111111] border border-[#1F1F1F] overflow-hidden">
        <div className="p-4 border-b border-[#1F1F1F] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            <span className="text-[#10B981]">&gt;</span> detalle_pagos
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-sm font-mono ${viewMode === 'table' ? 'bg-[#10B981] text-[#0A0A0A]' : 'bg-[#1A1A1A] text-[#6B7280] border border-[#1F1F1F]'}`}
            >
              $ tabla
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-sm font-mono ${viewMode === 'cards' ? 'bg-[#10B981] text-[#0A0A0A]' : 'bg-[#1A1A1A] text-[#6B7280] border border-[#1F1F1F]'}`}
            >
              $ cards
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1A1A1A]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-mono text-[#6B7280] uppercase">empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-[#6B7280] uppercase">fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-[#6B7280] uppercase">producto</th>
                  <th className="px-4 py-3 text-right text-xs font-mono text-[#6B7280] uppercase">monto</th>
                  <th className="px-4 py-3 text-center text-xs font-mono text-[#6B7280] uppercase">img</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]">
                {data?.current?.payments?.map((payment) => (
                  <tr key={payment.id} className="hover:bg-[#1A1A1A]">
                    <td className="px-4 py-3 text-white font-medium">{payment.empresa}</td>
                    <td className="px-4 py-3 text-[#FAFAFA] font-mono">{payment.fecha}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{payment.producto}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[#10B981] font-mono font-bold">
                        Q{payment.monto?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </span>
                      {payment.monedaOriginal === 'USD' && (
                        <div className="text-xs text-[#4B5563] font-mono">
                          (USD {payment.montoOriginal?.toLocaleString('es-GT', { minimumFractionDigits: 2 })})
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {payment.imageUrl ? (
                        <button
                          onClick={() => setSelectedImage(payment.imageUrl)}
                          className="text-[#3B82F6] hover:text-[#3B82F6]/80 font-mono text-sm"
                        >
                          [img]
                        </button>
                      ) : (
                        <span className="text-[#4B5563] font-mono">--</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data?.current?.payments || data.current.payments.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#4B5563] font-mono">
                      // no hay pagos en este periodo
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
            {data?.current?.payments?.map((payment) => (
              <div key={payment.id} className="bg-[#1A1A1A] border border-[#1F1F1F] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-semibold">{payment.empresa}</div>
                    <div className="text-sm text-[#6B7280] font-mono">{payment.fecha}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#10B981] font-bold font-mono">
                      Q{payment.monto?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                    </div>
                    {payment.monedaOriginal === 'USD' && (
                      <div className="text-xs text-[#4B5563] font-mono">USD {payment.montoOriginal}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-[#6B7280] mb-3">{payment.producto}</div>
                {payment.imageUrl && (
                  <button
                    onClick={() => setSelectedImage(payment.imageUrl)}
                    className="w-full py-2 bg-[#1F1F1F] hover:bg-[#3B82F6]/20 text-sm text-[#FAFAFA] flex items-center justify-center gap-2 font-mono"
                  >
                    $ ver_comprobante
                  </button>
                )}
              </div>
            ))}
            {(!data?.current?.payments || data.current.payments.length === 0) && (
              <div className="col-span-full text-center text-[#4B5563] py-8 font-mono">
                // no hay pagos en este periodo
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

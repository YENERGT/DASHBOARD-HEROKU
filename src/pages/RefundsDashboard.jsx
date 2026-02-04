import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_URL = '/api';

const RefundsDashboard = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refunds, setRefunds] = useState({ enProceso: [], completadas: [] });
  const [counts, setCounts] = useState({ enProceso: 0, completadas: 0 });
  const [activeTab, setActiveTab] = useState('enProceso');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [uploadedPdf, setUploadedPdf] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Cargar datos
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/refunds`, {
        withCredentials: true
      });

      if (response.data.success) {
        setRefunds({
          enProceso: response.data.data.enProceso || [],
          completadas: response.data.data.completadas || []
        });
        setCounts(response.data.counts || { enProceso: 0, completadas: 0 });
      } else {
        setError(response.data.error || 'Error al cargar datos');
      }
    } catch (err) {
      console.error('Error fetching refunds:', err);
      setError(err.response?.data?.error || 'Error al cargar las devoluciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrar por búsqueda
  const filteredRefunds = (activeTab === 'enProceso' ? refunds.enProceso : refunds.completadas)
    .filter(refund => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        refund.pedido?.toLowerCase().includes(search) ||
        refund.nombreCliente?.toLowerCase().includes(search) ||
        refund.telefono?.includes(search)
      );
    });

  // Manejar subida de PDF
  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo es muy grande. Máximo 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedPdf(e.target.result);
      setPdfPreview(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Abrir modal de confirmación
  const openConfirmModal = (refund) => {
    setSelectedRefund(refund);
    setShowConfirmModal(true);
  };

  // Completar devolución
  const completeRefund = async () => {
    if (!selectedRefund) return;

    setProcessingId(selectedRefund.rowIndex);
    setShowConfirmModal(false);

    try {
      const response = await axios.post(
        `${API_URL}/refunds/${selectedRefund.rowIndex}/complete`,
        {
          pdfBase64: uploadedPdf,
          sendWhatsApp: true
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        // Recargar datos
        await fetchData();
        // Limpiar estado
        setUploadedPdf(null);
        setPdfPreview(null);
        setExpandedCard(null);
        setSelectedRefund(null);
        // Mostrar mensaje de éxito
        alert(`Devolución completada exitosamente.\n${response.data.data.whatsapp?.success ? 'WhatsApp enviado.' : 'WhatsApp no enviado.'}`);
      } else {
        alert('Error: ' + (response.data.error || 'No se pudo completar la devolución'));
      }
    } catch (err) {
      console.error('Error completing refund:', err);
      alert('Error: ' + (err.response?.data?.error || 'Error al completar la devolución'));
    } finally {
      setProcessingId(null);
    }
  };

  // Reenviar WhatsApp
  const resendWhatsApp = async (refund) => {
    setProcessingId(refund.rowIndex);

    try {
      const response = await axios.post(
        `${API_URL}/refunds/${refund.rowIndex}/send-whatsapp`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        alert('WhatsApp enviado exitosamente');
      } else {
        alert('Error: ' + (response.data.error || 'No se pudo enviar el WhatsApp'));
      }
    } catch (err) {
      console.error('Error sending WhatsApp:', err);
      alert('Error: ' + (err.response?.data?.error || 'Error al enviar WhatsApp'));
    } finally {
      setProcessingId(null);
    }
  };

  // Formatear fecha
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Obtener color del método
  const getMethodColor = (metodo) => {
    switch (metodo?.toLowerCase()) {
      case 'efectivo': return 'bg-green-500/20 text-green-400';
      case 'deposito': return 'bg-blue-500/20 text-blue-400';
      case 'web': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  // Obtener texto del método
  const getMethodText = (metodo) => {
    switch (metodo?.toLowerCase()) {
      case 'efectivo': return 'Efectivo';
      case 'deposito': return 'Depósito Bancario';
      case 'web': return 'Reembolso Web';
      default: return metodo || 'Desconocido';
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
          <p className="text-slate-400">Cargando devoluciones...</p>
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
        <h1 className="text-2xl font-bold text-white mb-2">Devoluciones</h1>
        <p className="text-slate-400">
          Gestiona las devoluciones pendientes y completadas
        </p>
      </div>

      {/* Tabs y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('enProceso')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'enProceso'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            En Proceso
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'enProceso' ? 'bg-orange-500' : 'bg-slate-600'
            }`}>
              {counts.enProceso}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('completadas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'completadas'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Completadas
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'completadas' ? 'bg-green-500' : 'bg-slate-600'
            }`}>
              {counts.completadas}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Buscar pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Lista de devoluciones */}
      <div className="space-y-4">
        {filteredRefunds.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-slate-400">
              {searchTerm
                ? 'No se encontraron devoluciones que coincidan con la búsqueda'
                : `No hay devoluciones ${activeTab === 'enProceso' ? 'en proceso' : 'completadas'}`}
            </p>
          </div>
        ) : (
          filteredRefunds.map((refund) => (
            <div
              key={refund.rowIndex}
              className={`bg-slate-800 rounded-xl border transition-all ${
                expandedCard === refund.rowIndex ? 'border-blue-500' : 'border-slate-700'
              }`}
            >
              {/* Header de la card */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === refund.rowIndex ? null : refund.rowIndex)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      refund.estadoDevolucion === 'EN_PROCESO' ? 'bg-orange-500/20' : 'bg-green-500/20'
                    }`}>
                      {refund.estadoDevolucion === 'EN_PROCESO' ? (
                        <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">Pedido {refund.pedido}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getMethodColor(refund.metodoDevolucion)}`}>
                          {getMethodText(refund.metodoDevolucion)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-400">
                        {refund.nombreCliente} • {formatDate(refund.fechaInicioDevolucion)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">
                        Q{refund.montoDevolucion?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-400">Monto a devolver</div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedCard === refund.rowIndex ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Contenido expandido */}
              {expandedCard === refund.rowIndex && (
                <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Información del cliente */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Datos del Cliente</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="text-white">{refund.nombreCliente || 'Sin nombre'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-white">{refund.telefono || 'Sin teléfono'}</span>
                        </div>
                      </div>

                      {/* Items a devolver */}
                      <h4 className="text-sm font-semibold text-slate-400 uppercase mt-4 mb-3">Items a Devolver</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {refund.itemsDevolucion?.map((item, idx) => (
                          <div key={idx} className="bg-slate-700/50 rounded-lg p-2 text-sm">
                            <div className="text-white">{item.name}</div>
                            <div className="flex justify-between text-slate-400">
                              <span>Cantidad: {item.quantity}</span>
                              <span>Q{parseFloat(item.refundAmount || item.discountedPrice || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                        {(!refund.itemsDevolucion || refund.itemsDevolucion.length === 0) && (
                          <div className="text-slate-500 text-sm">Sin items especificados</div>
                        )}
                      </div>
                    </div>

                    {/* Datos bancarios (solo para depósito) */}
                    {refund.metodoDevolucion === 'deposito' && refund.datosDevolucion && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Datos Bancarios</h4>
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs text-slate-400">Banco</div>
                              <div className="text-white font-medium">{refund.datosDevolucion.banco || 'No especificado'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-400">Tipo de Cuenta</div>
                              <div className="text-white font-medium">{refund.datosDevolucion.tipoCuenta || 'No especificado'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-400">Número de Cuenta</div>
                              <div className="text-white font-medium font-mono text-lg">{refund.datosDevolucion.numeroCuenta || 'No especificado'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-400">Titular</div>
                              <div className="text-white font-medium">{refund.datosDevolucion.nombreCuenta || 'No especificado'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Info de completado (solo para completadas) */}
                    {refund.estadoDevolucion === 'COMPLETADO' && refund.datosDevolucion?.completado && (
                      <div>
                        <h4 className="text-sm font-semibold text-slate-400 uppercase mb-3">Info de Completado</h4>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Fecha:</span>
                              <span className="text-white">{refund.datosDevolucion.fechaCompletado || 'No registrada'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Por:</span>
                              <span className="text-white">{refund.datosDevolucion.completadoPor || 'admin'}</span>
                            </div>
                            {refund.datosDevolucion.pdfComprobanteUrl && (
                              <a
                                href={refund.datosDevolucion.pdfComprobanteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 mt-2 text-blue-400 hover:text-blue-300"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                Ver comprobante PDF
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    {refund.estadoDevolucion === 'EN_PROCESO' ? (
                      isAdmin ? (
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Upload de PDF */}
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={handlePdfUpload}
                              ref={fileInputRef}
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white flex items-center justify-center gap-2 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              {pdfPreview ? pdfPreview : 'Subir comprobante PDF'}
                            </button>
                            {uploadedPdf && (
                              <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                PDF cargado correctamente
                              </div>
                            )}
                          </div>

                          {/* Botón completar */}
                          <button
                            onClick={() => openConfirmModal(refund)}
                            disabled={processingId === refund.rowIndex}
                            className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
                              processingId === refund.rowIndex
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {processingId === refund.rowIndex ? (
                              <>
                                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando...
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Marcar como Completado
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Solo los administradores pueden completar devoluciones
                        </div>
                      )
                    ) : (
                      <div className="flex justify-end">
                        <button
                          onClick={() => resendWhatsApp(refund)}
                          disabled={processingId === refund.rowIndex}
                          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                            processingId === refund.rowIndex
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {processingId === refund.rowIndex ? (
                            <>
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              Reenviar WhatsApp
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmación */}
      {showConfirmModal && selectedRefund && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">Confirmar Devolución</h3>
            <p className="text-slate-300 mb-4">
              ¿Estás seguro de marcar como completada la devolución del pedido <strong>{selectedRefund.pedido}</strong>?
            </p>
            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">Cliente:</span>
                <span className="text-white">{selectedRefund.nombreCliente}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400">Monto:</span>
                <span className="text-green-400 font-semibold">Q{selectedRefund.montoDevolucion?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Método:</span>
                <span className="text-white">{getMethodText(selectedRefund.metodoDevolucion)}</span>
              </div>
            </div>
            {uploadedPdf && (
              <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                PDF de comprobante adjunto
              </div>
            )}
            <div className="flex items-center gap-2 text-blue-400 text-sm mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Se enviará WhatsApp al cliente notificando la devolución
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedRefund(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={completeRefund}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundsDashboard;

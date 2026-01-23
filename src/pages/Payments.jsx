import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const API_URL = '/api';

const Payments = () => {
  // Estados principales
  const [step, setStep] = useState(1); // 1: Cargar imagen, 2: Revisar, 3: Resultados
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveResults, setSaveResults] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Tasa de conversión USD a GTQ
  const USD_TO_GTQ_RATE = 8;

  // Manejar carga de imagen
  const handleImageChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
      setImageBase64(event.target.result);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Procesar imagen
  const processImage = async () => {
    if (!imageBase64) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/payments/process-image`,
        { image: imageBase64 },
        { withCredentials: true }
      );

      if (response.data.success) {
        setPayments(response.data.payments);
        setStep(2);
      } else {
        setError(response.data.error || 'Error al procesar la imagen');
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError(err.response?.data?.error || 'Error al procesar la imagen. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selección de pago
  const togglePaymentSelection = (paymentId) => {
    setPayments(payments.map(p =>
      p.id === paymentId ? { ...p, selected: !p.selected } : p
    ));
  };

  // Seleccionar/Deseleccionar todas
  const toggleAllPayments = () => {
    const allSelected = payments.every(p => p.selected);
    setPayments(payments.map(p => ({ ...p, selected: !allSelected })));
  };

  // Editar pago
  const updatePayment = (paymentId, field, value) => {
    setPayments(payments.map(p => {
      if (p.id === paymentId) {
        const updated = { ...p, [field]: value };

        // Si se cambia la moneda o el monto, recalcular el monto convertido
        if (field === 'moneda' || field === 'monto') {
          const monto = field === 'monto' ? parseFloat(value) || 0 : p.monto;
          const moneda = field === 'moneda' ? value : p.moneda;
          updated.montoConvertido = moneda === 'USD' ? monto * USD_TO_GTQ_RATE : monto;
        }

        return updated;
      }
      return p;
    }));
  };

  // Eliminar pago
  const removePayment = (paymentId) => {
    setPayments(payments.filter(p => p.id !== paymentId));
  };

  // Guardar pagos
  const savePayments = async () => {
    const selectedPayments = payments.filter(p => p.selected);
    if (selectedPayments.length === 0) {
      setError('Selecciona al menos un pago para guardar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/payments/save`,
        {
          payments,
          imageBase64
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSaveResults(response.data);
        setPayments(response.data.results);
        setStep(3);
      } else {
        setError(response.data.error || 'Error al guardar pagos');
      }
    } catch (err) {
      console.error('Error saving payments:', err);
      setError(err.response?.data?.error || 'Error al guardar pagos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar proceso
  const resetProcess = () => {
    setStep(1);
    setImagePreview(null);
    setImageBase64(null);
    setPayments([]);
    setError(null);
    setSaveResults(null);
  };

  // Volver al paso anterior
  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const selectedCount = payments.filter(p => p.selected).length;
  const totalMonto = payments.filter(p => p.selected).reduce((acc, p) => acc + (p.montoConvertido || 0), 0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Registro de Pagos</h1>
        <p className="text-slate-400">
          Procesa imágenes de comprobantes de pago y registra los datos automáticamente
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-xl">
          {[
            { num: 1, label: 'Imagen' },
            { num: 2, label: 'Revisar' },
            { num: 3, label: 'Guardado' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold
                ${step >= s.num ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}
              `}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${step >= s.num ? 'text-white' : 'text-slate-500'}`}>
                {s.label}
              </span>
              {idx < 2 && (
                <div className={`w-16 sm:w-24 h-1 mx-2 ${step > s.num ? 'bg-green-600' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Step 1: Cargar Imagen */}
      {step === 1 && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            Cargar imagen del comprobante de pago
          </h2>

          {/* Área de carga */}
          <div className="mb-6">
            {!imagePreview ? (
              <div className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center">
                <div className="text-6xl mb-4">💳</div>
                <p className="text-slate-400 mb-6">
                  Toma una foto o carga una imagen del comprobante de pago
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Tomar Foto
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Cargar Imagen
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-slate-900">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-96 mx-auto object-contain"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                    }}
                    className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={processImage}
                  disabled={loading}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Procesando imagen...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Procesar Imagen
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Revisar Pagos */}
      {step === 2 && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Revisar datos detectados ({payments.length})
            </h2>
            <button onClick={goBack} className="text-slate-400 hover:text-white">
              ← Cambiar imagen
            </button>
          </div>

          {/* Info de conversión */}
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-sm text-blue-400">
              <span className="font-semibold">Nota:</span> Si el monto está en USD, selecciona la moneda correspondiente.
              Se convertirá automáticamente a GTQ (×{USD_TO_GTQ_RATE}).
            </p>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-700/50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={payments.every(p => p.selected)}
                onChange={toggleAllPayments}
                className="w-5 h-5 rounded border-slate-500 bg-slate-600 text-green-600 focus:ring-green-500"
              />
              <span className="text-slate-300">Seleccionar todos</span>
            </label>
            <div className="text-right">
              <span className="text-slate-400">
                {selectedCount} de {payments.length} seleccionados
              </span>
              <div className="text-green-400 font-semibold">
                Total: Q{totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Lista de pagos */}
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`
                  p-4 rounded-lg border transition-all
                  ${payment.selected
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-slate-600 bg-slate-700/50'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={payment.selected}
                    onChange={() => togglePaymentSelection(payment.id)}
                    className="mt-1 w-5 h-5 rounded border-slate-500 bg-slate-600 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-slate-500">Empresa</label>
                      <input
                        type="text"
                        value={payment.empresa}
                        onChange={(e) => updatePayment(payment.id, 'empresa', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Fecha</label>
                      <input
                        type="date"
                        value={payment.fecha}
                        onChange={(e) => updatePayment(payment.id, 'fecha', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Monto</label>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={payment.moneda}
                          onChange={(e) => updatePayment(payment.id, 'moneda', e.target.value)}
                          className="px-2 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        >
                          <option value="GTQ">GTQ</option>
                          <option value="USD">USD</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={payment.monto}
                          onChange={(e) => updatePayment(payment.id, 'monto', e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      {payment.moneda === 'USD' && (
                        <p className="text-xs text-green-400 mt-1">
                          = Q{payment.montoConvertido?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Producto/Servicio</label>
                      <input
                        type="text"
                        value={payment.producto}
                        onChange={(e) => updatePayment(payment.id, 'producto', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removePayment(payment.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded"
                    title="Eliminar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botón de guardar */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={resetProcess}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={savePayments}
              disabled={selectedCount === 0 || loading}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar {selectedCount} pago{selectedCount !== 1 ? 's' : ''} (Q{totalMonto.toLocaleString('es-GT', { minimumFractionDigits: 2 })})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Resultados */}
      {step === 3 && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            Pagos registrados exitosamente
          </h2>

          {saveResults && (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-400">{saveResults.summary.saved}</div>
                  <div className="text-sm text-green-400">Guardados</div>
                </div>
                <div className="p-4 bg-slate-700 border border-slate-600 rounded-lg text-center">
                  <div className="text-3xl font-bold text-slate-300">{saveResults.summary.skipped}</div>
                  <div className="text-sm text-slate-400">Omitidos</div>
                </div>
              </div>

              {/* Total guardado */}
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <p className="text-sm text-slate-400 mb-1">Total registrado</p>
                <p className="text-2xl font-bold text-green-400">
                  Q{payments.filter(p => p.status === 'saved').reduce((acc, p) => acc + (p.montoConvertido || 0), 0).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Lista de resultados */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className={`
                      p-3 rounded-lg flex items-center justify-between
                      ${payment.status === 'saved' ? 'bg-green-500/10 border border-green-500/30' :
                        'bg-slate-700/50 border border-slate-600'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {payment.status === 'saved' ? (
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                          ✓
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white">
                          -
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">{payment.empresa}</div>
                        <div className="text-sm text-slate-400">{payment.producto}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        payment.status === 'saved' ? 'text-green-400' : 'text-slate-500'
                      }`}>
                        Q{payment.montoConvertido?.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500">{payment.fecha}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón para nuevo proceso */}
              <button
                onClick={resetProcess}
                className="mt-6 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Registrar nuevos pagos
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Payments;

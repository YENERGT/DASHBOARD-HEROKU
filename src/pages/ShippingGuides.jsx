import { useState, useRef, useCallback } from 'react';
import axios from 'axios';

// Usar ruta relativa /api para que funcione tanto en desarrollo como en producción (Heroku/Shopify)
const API_URL = '/api';

const ShippingGuides = () => {
  // Estados principales
  const [step, setStep] = useState(1); // 1: Seleccionar transporte, 2: Cargar imagen, 3: Revisar, 4: Enviar
  const [transport, setTransport] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sendResults, setSendResults] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Transportes disponibles con logos
  const transports = [
    {
      id: 'guatex',
      name: 'Guatex',
      color: 'bg-blue-600',
      logo: 'https://cdn.shopify.com/s/files/1/0289/7264/6460/files/images_8f226455-dd06-4cde-b130-26b25cb721fb.png?v=1768922358'
    },
    {
      id: 'forza',
      name: 'Forza',
      color: 'bg-green-600',
      logo: 'https://cdn.shopify.com/s/files/1/0289/7264/6460/files/logoForza.png?v=1768922358'
    },
    {
      id: 'cargo_express',
      name: 'Cargo Express',
      color: 'bg-orange-600',
      logo: 'https://cdn.shopify.com/s/files/1/0289/7264/6460/files/logo_footer.webp?v=1768922358'
    }
  ];

  // Seleccionar transporte
  const handleSelectTransport = (transportId) => {
    setTransport(transportId);
    setStep(2);
    setError(null);
  };

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
    if (!imageBase64 || !transport) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_URL}/guides/process-image`,
        { image: imageBase64, transport },
        { withCredentials: true }
      );

      if (response.data.success) {
        setGuides(response.data.guides);
        setStep(3);
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

  // Toggle selección de guía
  const toggleGuideSelection = (guideId) => {
    setGuides(guides.map(g =>
      g.id === guideId ? { ...g, selected: !g.selected } : g
    ));
  };

  // Seleccionar/Deseleccionar todas
  const toggleAllGuides = () => {
    const allSelected = guides.every(g => g.selected);
    setGuides(guides.map(g => ({ ...g, selected: !allSelected })));
  };

  // Editar guía
  const updateGuide = (guideId, field, value) => {
    setGuides(guides.map(g =>
      g.id === guideId ? { ...g, [field]: value } : g
    ));
  };

  // Eliminar guía
  const removeGuide = (guideId) => {
    setGuides(guides.filter(g => g.id !== guideId));
  };

  // Enviar por WhatsApp
  const sendWhatsAppMessages = async () => {
    const selectedGuides = guides.filter(g => g.selected);
    if (selectedGuides.length === 0) {
      setError('Selecciona al menos una guía para enviar');
      return;
    }

    setLoading(true);
    setError(null);
    setStep(4);

    try {
      const response = await axios.post(
        `${API_URL}/guides/send-whatsapp`,
        {
          guides,
          transport,
          imageBase64 // Enviar imagen completa para subir a Supabase
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        setSendResults(response.data);
        setGuides(response.data.results);
      } else {
        setError(response.data.error || 'Error al enviar mensajes');
      }
    } catch (err) {
      console.error('Error sending messages:', err);
      setError(err.response?.data?.error || 'Error al enviar mensajes. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar proceso
  const resetProcess = () => {
    setStep(1);
    setTransport(null);
    setImagePreview(null);
    setImageBase64(null);
    setGuides([]);
    setError(null);
    setSendResults(null);
  };

  // Volver al paso anterior
  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const selectedCount = guides.filter(g => g.selected).length;
  const transportInfo = transports.find(t => t.id === transport);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          <span className="text-[#10B981]">&gt;</span> guias_envio
        </h1>
        <p className="text-[#6B7280] text-sm">
          // procesa imagenes y envia whatsapp
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl">
          {[
            { num: 1, label: 'transporte' },
            { num: 2, label: 'imagen' },
            { num: 3, label: 'revisar' },
            { num: 4, label: 'enviar' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <div className={`
                w-10 h-10 flex items-center justify-center font-bold font-mono
                ${step >= s.num ? 'bg-[#10B981] text-[#0A0A0A]' : 'bg-[#1A1A1A] text-[#6B7280] border border-[#1F1F1F]'}
              `}>
                {step > s.num ? '++' : `#${s.num}`}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline font-mono ${step >= s.num ? 'text-white' : 'text-[#4B5563]'}`}>
                {s.label}
              </span>
              {idx < 3 && (
                <div className={`w-12 sm:w-20 h-0.5 mx-2 ${step > s.num ? 'bg-[#10B981]' : 'bg-[#1F1F1F]'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] font-mono">
          <div className="flex items-center gap-2">
            [ERROR] {error}
          </div>
        </div>
      )}

      {/* Step 1: Seleccionar Transporte */}
      {step === 1 && (
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <h2 className="text-lg font-bold text-white mb-6">
            <span className="text-[#10B981]">&gt;</span> seleccionar_transporte
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {transports.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelectTransport(t.id)}
                className={`
                  p-4 border transition-all duration-200 flex flex-col items-center justify-center
                  ${transport === t.id
                    ? 'border-[#10B981] bg-[#10B981]/10'
                    : 'border-[#1F1F1F] bg-[#1A1A1A] hover:border-[#3B82F6]'
                  }
                `}
              >
                <div className="w-full h-24 bg-white flex items-center justify-center p-3 mb-4">
                  <img
                    src={t.logo}
                    alt={t.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-sm font-mono text-white">{t.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Cargar Imagen */}
      {step === 2 && (
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              <span className="text-[#10B981]">&gt;</span> cargar_imagen --{transportInfo?.name.toLowerCase().replace(' ', '_')}
            </h2>
            <button onClick={goBack} className="text-[#6B7280] hover:text-white font-mono text-sm">
              $ cd ..
            </button>
          </div>

          {/* Área de carga */}
          <div className="mb-6">
            {!imagePreview ? (
              <div className="border-2 border-dashed border-[#1F1F1F] p-12 text-center">
                <div className="text-4xl mb-4 font-mono text-[#4B5563]">[img]</div>
                <p className="text-[#6B7280] mb-6 font-mono">
                  // toma una foto o carga una imagen de las guías
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-6 py-3 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white font-mono text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    $ tomar_foto
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-[#1A1A1A] border border-[#1F1F1F] hover:border-[#3B82F6] text-white font-mono text-sm flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    $ cargar_imagen
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
                <div className="relative overflow-hidden bg-[#0A0A0A] border border-[#1F1F1F]">
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
                    className="absolute top-4 right-4 p-2 bg-[#EF4444] hover:bg-[#EF4444]/80 text-white"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={processImage}
                  disabled={loading}
                  className="w-full py-4 bg-[#10B981] hover:bg-[#10B981]/80 disabled:bg-[#1A1A1A] disabled:text-[#4B5563] disabled:cursor-not-allowed text-[#0A0A0A] font-mono font-bold flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      $ procesando<span className="animate-pulse">_</span>
                    </>
                  ) : (
                    <>$ procesar_imagen</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Revisar Guías */}
      {step === 3 && (
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              <span className="text-[#10B981]">&gt;</span> revisar_guias --count {guides.length}
            </h2>
            <button onClick={goBack} className="text-[#6B7280] hover:text-white font-mono text-sm">
              $ cd ..
            </button>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-between mb-4 p-3 bg-[#1A1A1A] border border-[#1F1F1F]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={guides.every(g => g.selected)}
                onChange={toggleAllGuides}
                className="w-5 h-5 border-[#1F1F1F] bg-[#0A0A0A] text-[#10B981] focus:ring-[#10B981]"
              />
              <span className="text-[#FAFAFA] font-mono text-sm">$ select --all</span>
            </label>
            <span className="text-[#6B7280] font-mono text-sm">
              [{selectedCount}/{guides.length}]
            </span>
          </div>

          {/* Lista de guías */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {guides.map((guide) => (
              <div
                key={guide.id}
                className={`
                  p-4 border transition-all
                  ${guide.selected
                    ? 'border-[#10B981] bg-[#10B981]/10'
                    : 'border-[#1F1F1F] bg-[#1A1A1A]'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={guide.selected}
                    onChange={() => toggleGuideSelection(guide.id)}
                    className="mt-1 w-5 h-5 border-[#1F1F1F] bg-[#0A0A0A] text-[#10B981] focus:ring-[#10B981]"
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-[#4B5563] font-mono">// no_guia</label>
                      <input
                        type="text"
                        value={guide.numeroGuia}
                        onChange={(e) => updateGuide(guide.id, 'numeroGuia', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-[#0A0A0A] border border-[#1F1F1F] text-white text-sm font-mono focus:border-[#10B981] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#4B5563] font-mono">// destinatario</label>
                      <input
                        type="text"
                        value={guide.destinatario}
                        onChange={(e) => updateGuide(guide.id, 'destinatario', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-[#0A0A0A] border border-[#1F1F1F] text-white text-sm focus:border-[#10B981] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#4B5563] font-mono">// telefono</label>
                      <input
                        type="text"
                        value={guide.telefono}
                        onChange={(e) => updateGuide(guide.id, 'telefono', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-[#0A0A0A] border border-[#1F1F1F] text-white text-sm font-mono focus:border-[#10B981] focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-[#4B5563] font-mono">// direccion</label>
                      <input
                        type="text"
                        value={guide.direccion}
                        onChange={(e) => updateGuide(guide.id, 'direccion', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-[#0A0A0A] border border-[#1F1F1F] text-white text-sm focus:border-[#10B981] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#4B5563] font-mono">// no_pedido</label>
                      <input
                        type="text"
                        value={guide.numeroPedido}
                        onChange={(e) => updateGuide(guide.id, 'numeroPedido', e.target.value)}
                        className="w-full mt-1 px-3 py-2 bg-[#0A0A0A] border border-[#1F1F1F] text-white text-sm font-mono focus:border-[#10B981] focus:outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeGuide(guide.id)}
                    className="p-2 text-[#EF4444] hover:bg-[#EF4444]/20"
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

          {/* Botón de envío */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={resetProcess}
              className="px-6 py-3 bg-[#1A1A1A] border border-[#1F1F1F] hover:border-[#EF4444] text-[#FAFAFA] font-mono"
            >
              $ cancelar
            </button>
            <button
              onClick={sendWhatsAppMessages}
              disabled={selectedCount === 0 || loading}
              className="flex-1 py-3 bg-[#10B981] hover:bg-[#10B981]/80 disabled:bg-[#1A1A1A] disabled:text-[#4B5563] disabled:cursor-not-allowed text-[#0A0A0A] font-mono font-bold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              $ enviar_whatsapp --count {selectedCount}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Resultados de envío */}
      {step === 4 && (
        <div className="bg-[#111111] border border-[#1F1F1F] p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            <span className="text-[#10B981]">&gt;</span> {loading ? 'enviando' : 'resultados_envio'}
            {loading && <span className="animate-pulse">_</span>}
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <svg className="animate-spin w-12 h-12 mx-auto text-[#10B981] mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-[#6B7280] font-mono">$ enviando mensajes por whatsapp<span className="animate-pulse">_</span></p>
            </div>
          ) : sendResults && (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/30 text-center">
                  <div className="text-3xl font-bold text-[#10B981] font-mono">{sendResults.summary.sent}</div>
                  <div className="text-sm text-[#10B981] font-mono">// enviados</div>
                </div>
                <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/30 text-center">
                  <div className="text-3xl font-bold text-[#EF4444] font-mono">{sendResults.summary.failed}</div>
                  <div className="text-sm text-[#EF4444] font-mono">// fallidos</div>
                </div>
                <div className="p-4 bg-[#1A1A1A] border border-[#1F1F1F] text-center">
                  <div className="text-3xl font-bold text-[#6B7280] font-mono">{sendResults.summary.skipped}</div>
                  <div className="text-sm text-[#4B5563] font-mono">// omitidos</div>
                </div>
              </div>

              {/* Lista de resultados */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {guides.map((guide) => (
                  <div
                    key={guide.id}
                    className={`
                      p-3 flex items-center justify-between
                      ${guide.status === 'sent' ? 'bg-[#10B981]/10 border border-[#10B981]/30' :
                        guide.status === 'failed' ? 'bg-[#EF4444]/10 border border-[#EF4444]/30' :
                        'bg-[#1A1A1A] border border-[#1F1F1F]'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center font-mono font-bold
                        ${guide.status === 'sent' ? 'bg-[#10B981]/20 text-[#10B981]' :
                          guide.status === 'failed' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
                          'bg-[#1F1F1F] text-[#4B5563]'}
                      `}>
                        {guide.status === 'sent' ? '++' : guide.status === 'failed' ? '--' : '..'}
                      </div>
                      <div>
                        <div className="text-white font-medium">{guide.destinatario}</div>
                        <div className="text-sm text-[#6B7280] font-mono">{guide.telefono}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-mono ${
                        guide.status === 'sent' ? 'text-[#10B981]' :
                        guide.status === 'failed' ? 'text-[#EF4444]' :
                        'text-[#4B5563]'
                      }`}>
                        [{guide.status === 'sent' ? 'enviado' :
                         guide.status === 'failed' ? 'fallido' :
                         'omitido'}]
                      </div>
                      {guide.error && (
                        <div className="text-xs text-[#EF4444] font-mono">{guide.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón para nuevo proceso */}
              <button
                onClick={resetProcess}
                className="mt-6 w-full py-3 bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white font-mono font-bold"
              >
                $ procesar_nuevas_guias
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ShippingGuides;

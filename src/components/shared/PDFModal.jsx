import Modal from './Modal';

const PDFModal = ({ isOpen, onClose, pdfUrl, invoiceNumber }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Factura ${invoiceNumber || ''}`}
    >
      <div className="w-full h-full">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0 rounded-lg"
            title={`PDF Factura ${invoiceNumber}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No hay PDF disponible</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PDFModal;

// ====================================
// Modal de Eliminación
// ====================================
interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
  itemName: string
}

const DeleteNetworkModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  itemName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn">

        <h2 className="text-xl font-semibold text-white mb-4">
          Eliminar red
        </h2>

        <p className="text-gray-300 mb-6">
          ¿Estás seguro de que deseas eliminar la red{" "}
          <span className="text-white font-medium">{itemName}</span>?  
          Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-200 transition disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition disabled:opacity-50"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>

      </div>
    </div>
  );
};
export default DeleteNetworkModal;
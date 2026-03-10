interface ConfirmationModalProps {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmationModal({ open, message, onCancel, onConfirm }: ConfirmationModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-60">
      <div className="bg-white rounded-lg w-105 shadow-xl overflow-hidden">
        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2"> Document Already Exists</h3>
          <p className="text-sm text-gray-600">{message} <br /> Do you want to override the existing document? </p>
        </div>

        <div className="border-t border-gray-100 px-6 py-3 flex justify-end gap-3 bg-white">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">Override</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
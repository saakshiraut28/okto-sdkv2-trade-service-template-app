import React from "react";
import { Copy } from "lucide-react";

interface RequestResponseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  payload: any;
  isRequest?: boolean;
  onConfirm?: () => Promise<any>;
}

const RequestResponseModal: React.FC<RequestResponseModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  payload,
  isRequest = false,
  onConfirm,
}) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 3000); 
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 overscroll-auto">
      <div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">
        <div className="flex justify-between items-start mb-2">
          <div className="w-full">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <div className="mt-2 border-2 border-blue-500 bg-blue-50 dark:bg-gray-900 dark:border-blue-400 p-3 rounded">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-300 ">ℹ️</span>
                <p className="text-sm text-gray-700 dark:text-white whitespace-pre-line">{subtitle}</p>
              </div>
            </div>
          </div>
          <button onClick={handleCopy} className="text-gray-500 hover:text-gray-800 dark:hover:text-blue-400">
            <Copy className="w-5 h-5" />
            {copied && (
              <p className="text-blue-700 bg-white py-1 px-2 rounded-full ml-2">Copied!</p>
            )}
          </button>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-auto text-xs whitespace-pre-wrap break-words">
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </div>

        <div className="flex justify-end mt-4 gap-2">
          {isRequest ? (
            <button
              onClick={handleConfirm}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Send Request
            </button>
          ) : (
            <button
              onClick={onClose}
              className="bg-gray-300 dark:bg-red-700 text-black dark:text-white px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-600"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestResponseModal;
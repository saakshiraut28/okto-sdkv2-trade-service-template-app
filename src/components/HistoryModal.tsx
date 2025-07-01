import React from "react";
import { Copy, CheckCheck } from "lucide-react";
import { stringifySafe } from "../utils/stringifySafe";

interface HistoryEntry {
  title: string;
  requestPayload: any;
  responsePayload: any;
}

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  history: HistoryEntry[];
}

const HistoryModal: React.FC<HistoryModalProps> = ({ open, onClose, history }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = async (index: number) => {
    const entry = history[index];
    if (entry) {
      await navigator.clipboard.writeText(stringifySafe({
        title: entry.title,
        requestPayload: entry.requestPayload,
        responsePayload: entry.responsePayload,
      }));
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 3000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 overscroll-auto">
      <div className="bg-gray-900 text-white rounded-xl shadow-xl w-full max-w-4xl p-6 relative font-mono text-sm max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">History</h2>
          <button
            onClick={onClose}
            className="bg-red-700 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            X
          </button>
        </div>
        <div className="space-y-6">
          {history.map((entry, index) => (
            <div key={index} className="border border-blue-700 rounded p-4 bg-gray-900">
              <div className="flex justify-between items-center mb-2">
                <span className="text-blue-700 bg-white p-1">******** {entry.title} ********</span>
                <button
                  onClick={() => handleCopy(index)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-200 text-xs"
                >
                  {copiedIndex === index ? (
                    <CheckCheck className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-blue-400" />
                  )}
                  {copiedIndex === index ? "Copied" : "Copy"}
                </button>
              </div>
              <div>
                <span className="text-blue-700 bg-white">*Request*:</span>
                <pre className="whitespace-pre-wrap break-words">
                  {stringifySafe(entry.requestPayload)}
                </pre>
                <span className="text-blue-700 bg-white">*Response*:</span>
                <pre className="whitespace-pre-wrap break-words mt-2">
                  {stringifySafe(entry.responsePayload)}
                </pre>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-blue-400 text-center">No history available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;

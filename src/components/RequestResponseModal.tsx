import React from "react";
import { CheckCheck, Copy } from "lucide-react";

interface RequestResponseModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  payload?: any;
  requestPayload?: any;
  responsePayload?: any;
  isRequest?: boolean;
  onConfirm?: () => Promise<any>;
}

export function stringifySafe(obj: any, spacing = 2) {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
    spacing
  );
}

const RequestResponseModal: React.FC<RequestResponseModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  payload,
  requestPayload,
  responsePayload,
  isRequest = false,
  onConfirm,
}) => {
  const [copiedRequest, setCopiedRequest] = React.useState(false);
  const [copiedResponse, setCopiedResponse] = React.useState(false);

  const handleCopyRequest = async () => {
    if (requestPayload) {
      await navigator.clipboard.writeText(stringifySafe(requestPayload));
      setCopiedRequest(true);
      setTimeout(() => setCopiedRequest(false), 3000);
    }
  };

  const handleCopyResponse = async () => {
    if (responsePayload) {
      await navigator.clipboard.writeText(stringifySafe(responsePayload));
      setCopiedResponse(true);
      setTimeout(() => setCopiedResponse(false), 3000);
    }
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
  };

  if (!open) return null;

  // Show side by side when both request and response are available
  const showSideBySide = requestPayload && responsePayload;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 overscroll-auto">
      <div className={`bg-white dark:bg-gray-900 text-black dark:text-white rounded-xl shadow-xl w-full ${showSideBySide ? 'max-w-6xl' : 'max-w-2xl'} p-6 relative`}>
        <div className="flex justify-between items-start mb-4">
          <div className="w-full">
            <h2 className="text-xl font-semibold text-black dark:text-white">{title}</h2>
            <div className="mt-2 border-2 border-blue-500 bg-blue-50 dark:bg-gray-800 dark:border-blue-400 p-3 rounded">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-300">ℹ️</span>
                <p className="text-sm text-gray-700 dark:text-white whitespace-pre-line">{subtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {showSideBySide ? (
          // Side by side layout
          <div className="grid grid-cols-2 gap-4">
            {/* Request Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Request</h3>
                <button
                  onClick={handleCopyRequest}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-800 dark:hover:text-blue-400 text-sm"
                >
                  {copiedRequest ? <CheckCheck className="w-4 h-4 text-indigo-400" /> : <Copy className="w-4 h-4 text-white" />}
                </button>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-auto text-xs">
                <pre className="whitespace-pre-wrap break-words">{stringifySafe(requestPayload)}</pre>
              </div>
            </div>

            {/* Response Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Response</h3>
                <button
                  onClick={handleCopyResponse}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-800 dark:hover:text-blue-400 text-sm"
                >
                  {copiedResponse ? <CheckCheck className="w-4 h-4 text-indigo-400" /> : <Copy className="w-4 h-4 text-white" />}
                </button>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-auto text-xs">
                <pre className="whitespace-pre-wrap break-words">{stringifySafe(responsePayload)}</pre>
              </div>
            </div>
          </div>
        ) : (
          // Single column layout (existing behavior)
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {requestPayload ? 'Request' : 'Response'}
              </h3>
              <button
                onClick={requestPayload ? handleCopyRequest : handleCopyResponse}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-800 dark:hover:text-blue-400 text-sm"
              >
                <Copy className="w-4 h-4" />
                {(requestPayload ? copiedRequest : copiedResponse) ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-auto text-xs">
              <pre className="whitespace-pre-wrap break-words">
                {stringifySafe(requestPayload || responsePayload)}
              </pre>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6 gap-2">
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
                Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestResponseModal;
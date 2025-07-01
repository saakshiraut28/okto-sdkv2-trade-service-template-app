import React from "react";

interface StepIndicatorProps {
  logs: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ logs }) => {
  return (
    <div className="mt-4 bg-gray-900 text-blue-400 font-mono text-sm p-4 rounded-md border border-gray-700 w-full max-w-full overflow-y-auto max-h-64">
      {logs.map((log, index) => (
        <div key={index}>
          <span className="text-white mr-2">$</span>{log}
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;

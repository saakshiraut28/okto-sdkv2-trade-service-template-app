import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Props {
  title: string;
  children: React.ReactNode;
  variant?: "info" | "warning" | "error" | "success";
  defaultOpen?: boolean;
}

const VARIANT_STYLES = {
  info: "bg-gray-900 border-blue-400 text-white",
  warning: "bg-yellow-900  border-yellow-600 text-yellow-200",
  error: "bg-red-900 border-red-600 text-red-200",
  success: "bg-emerald-900 border-emerald-600 text-emerald-200",
};

const VARIANT_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
};

export default function CollapsibleCallout({
  title,
  children,
  variant = "info",
  defaultOpen = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const Icon = VARIANT_ICONS[variant];

  return (
    <div
      className={`border rounded-lg px-3 py-2 transition-all duration-300 ${VARIANT_STYLES[variant]}`}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Icon size={18} />
          <span className="font-bold text-sm">{title}</span>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </div>
      {isOpen && (
        <div className="mt-3 text-sm">
          {children}
        </div>
      )}
    </div>
  );
}

import { FC } from "react";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onMaxClick?: () => void;
  tokenSymbol?: string;
  balance?: string | null;
  disabled?: boolean;
}

const AmountInput: FC<AmountInputProps> = ({
  value,
  onChange,
  onMaxClick,
  tokenSymbol,
  balance,
  disabled,
}) => {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label
        className="block font-semibold mb-2 text-sm text-gray-300"
      >
        Amount
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="number"
          inputMode="decimal"
          className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="Enter amount"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          onWheel={(e) => {
            (e.target as HTMLInputElement).blur();
          }}
        />
        {onMaxClick && (
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
            onClick={onMaxClick}
            disabled={disabled || !balance}
          >
            Max
          </button>
        )}
      </div>
    </div>
  );
};

export default AmountInput;

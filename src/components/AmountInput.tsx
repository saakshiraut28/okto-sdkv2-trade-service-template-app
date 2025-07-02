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
          className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
            className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded-xl hover:bg-blue-800 transition"
            onClick={onMaxClick}
            disabled={disabled || !balance}
          >
            Max
          </button>
        )}
      </div>
      {tokenSymbol && (
        <div className="mt-2 text-sm text-gray-400">
          Balance: {balance ? `${balance} ${tokenSymbol}` : "Loading..."}
        </div>
      )}
    </div>
  );
};

export default AmountInput;

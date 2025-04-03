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
        style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
      >
        Amount
      </label>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="number"
          style={{
            flex: 1,
            padding: "0.5rem",
            fontSize: "1rem",
            borderRadius: "0.5rem",
          }}
          placeholder="Enter amount"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        {onMaxClick && (
          <button
            type="button"
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.9rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
            onClick={onMaxClick}
            disabled={disabled || !balance}
          >
            Max
          </button>
        )}
      </div>
      {balance && tokenSymbol && (
        <p style={{ fontSize: "0.9rem", color: "#aaa", marginTop: "0.5rem" }}>
          Balance: {balance} {tokenSymbol}
        </p>
      )}
    </div>
  );
};

export default AmountInput;

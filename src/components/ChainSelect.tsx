import { FC } from "react";
import { CHAIN_ID_TO_NAME } from "../constants/chains";

interface ChainSelectProps {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (chainId: string) => void;
}

const ChainSelect: FC<ChainSelectProps> = ({
  label,
  value,
  disabled,
  onChange,
}) => {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label
        style={{ display: "block", fontWeight: "bold", marginBottom: "0.5rem" }}
      >
        {label}
      </label>
      <select
        style={{
          width: "100%",
          padding: "0.5rem",
          borderRadius: "0.5rem",
          fontSize: "1rem",
        }}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {Object.entries(CHAIN_ID_TO_NAME).map(([id, name]) => (
          <option key={id} value={`eip155:${id}`}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ChainSelect;

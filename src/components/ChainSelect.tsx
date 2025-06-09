import { Component } from "react";
import { CAIP_TO_NAME } from "../constants/chains";

interface Props {
  label: string;
  value: string;
  allowedChains: string[];
  disabled?: boolean;
  onChange: (chainId: string) => void;
}

class ChainSelect extends Component<Props> {
  handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    this.props.onChange(newValue);
  };

  render() {
    const { label, value, allowedChains, disabled } = this.props;

    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "block",
            fontWeight: "bold",
            marginBottom: "0.5rem",
          }}
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
          onChange={this.handleChange}
        >
          <option value="">-- Select Chain --</option>
          {allowedChains.map((id) => (
            <option key={id} value={id}>
              {CAIP_TO_NAME[id] || id}
            </option>
          ))}
        </select>
      </div>
    );
  }
}

export default ChainSelect;

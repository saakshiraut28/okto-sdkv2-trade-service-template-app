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
          className="block text-sm font-semibold text-gray-300 mb-2"
        >
          {label}
        </label>
        <select
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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

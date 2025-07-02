import { Component } from "react";
import React from "react";
import { CAIP_TO_NAME } from "../constants/chains";
import { InfoIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  allowedChains: string[];
  disabled?: boolean;
  onChange: (chainId: string) => void;
}

interface State {
  showTooltip: boolean;
}

class ChainSelect extends Component<Props, State> {
  private tooltipRef = React.createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);
    this.state = {
      showTooltip: false
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

  handleClickOutside = (event: MouseEvent) => {
    if (this.tooltipRef.current && !this.tooltipRef.current.contains(event.target as Node)) {
      this.setState({ showTooltip: false });
    }
  };

  handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    this.props.onChange(newValue);
  };

  toggleTooltip = () => {
    this.setState(prevState => ({
      showTooltip: !prevState.showTooltip
    }));
  };

  render() {
    const { label, value, allowedChains, disabled } = this.props;
    const { showTooltip } = this.state;

    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-300">
            {label}
          </label>
          <div className="relative" ref={this.tooltipRef}>
            <button
              type="button"
              onClick={this.toggleTooltip}
              className="text-blue-500 hover:text-blue-700 focus:outline-none focus:text-blue-200 transition-colors bg-gray-700 rounded-full p-1"
              aria-label="Info"
            >
              <InfoIcon className="w-5 h-5" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-6 z-10 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3">
                <div className="text-sm text-gray-200">
                  <span className="text-md text-gray-200 font-normal">
                    Trade Service only supports mainnets. For more information on the chains and tokens supported by Okto Trade Service, check{" "}
                    <a
                      className="text-indigo-400 hover:text-indigo-300"
                      href="https://docs.okto.tech/docs/trade-service/supported-networks-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Supported Chains and Tokens
                    </a>.
                  </span>
                </div>
                <div className="absolute -top-2 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
              </div>
            )}
          </div>
        </div>
        <select
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-1 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
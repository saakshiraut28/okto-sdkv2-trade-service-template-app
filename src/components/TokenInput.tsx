import { Component, createRef } from "react";
import {
  getEvmTokenMetadata,
} from "../utils/chainHelpers";
import { ethers } from "ethers";
import { CHAIN_ID_TO_KNOWN_TOKENS, CAIP_TO_NATIVE_SYMBOL } from "../constants/chains";
import { InfoIcon } from "lucide-react";

interface Props {
  chainId: string;
  label: string;
  forceToken?: {
    address: string;
    symbol: string;
    decimals: number;
    isNative?: boolean;
  };
  disabled?: boolean;
  onValidToken: (
    address: string,
    symbol: string,
    decimals: number,
    isNative: boolean
  ) => void;
}

interface State {
  tokenAddress: string;
  tokenSymbol: string;
  showTooltip: boolean;
}

class TokenInput extends Component<Props, State> {
  tooltipRef: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.state = {
      tokenAddress: "",
      tokenSymbol: "",
      showTooltip: false,
    };
    this.tooltipRef = createRef();
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  componentDidMount() {
    document.addEventListener("mousedown", this.handleOutsideClick);
  }

  componentWillUnmount() {
    document.removeEventListener("mousedown", this.handleOutsideClick);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.chainId !== this.props.chainId && !this.props.forceToken) {
      this.setState({ tokenAddress: "", tokenSymbol: "" });
    }
    if (prevProps.forceToken && !this.props.forceToken) {
      this.setState({ tokenAddress: "", tokenSymbol: "" });
    }
  }

  handleOutsideClick = (event: MouseEvent) => {
    if (
      this.state.showTooltip &&
      this.tooltipRef.current &&
      !this.tooltipRef.current.contains(event.target as Node)
    ) {
      this.setState({ showTooltip: false });
    }
  }

  async handleAddressChange(newAddress: string) {
    this.setState({ tokenAddress: newAddress });
    const { chainId, onValidToken } = this.props;
    if (!newAddress || !chainId) return;
    if (newAddress.toLowerCase() === "native") return;

    try {
      const [chainType, chainKey] = chainId.split(":");
      if (chainType === "eip155") {
        const { symbol, decimals } = await getEvmTokenMetadata(
          parseInt(chainKey),
          newAddress
        );
        onValidToken(newAddress, symbol, decimals, false);
        this.setState({ tokenSymbol: symbol });
      }
    } catch (err) {
      console.error("Invalid token address or unable to fetch metadata", err);
    }
  }

  async handleQuickSelect(symbol: string) {
    const { chainId, onValidToken } = this.props;
    if (!chainId) return;
    const [chainType, chainKey] = chainId.split(":");

    const knownTokens = CHAIN_ID_TO_KNOWN_TOKENS[chainKey];
    const tokenAddress = knownTokens?.[symbol];

    if (symbol === "NATIVE") {
      const decimals = 18;
      const symbolStr = CAIP_TO_NATIVE_SYMBOL[chainId] || "ETH";
      this.setState({ tokenAddress: "native", tokenSymbol: symbolStr });
      onValidToken(ethers.ZeroAddress, symbolStr, decimals, true);
      return;
    }

    if (tokenAddress) {
      try {
        const { symbol: resolvedSymbol, decimals } = await getEvmTokenMetadata(parseInt(chainKey), tokenAddress);
        this.setState({ tokenAddress, tokenSymbol: resolvedSymbol });
        onValidToken(tokenAddress, resolvedSymbol, decimals, false);
      } catch (err) {
        console.error("Failed to fetch token metadata for quick select", err);
      }
    } else {
      console.warn(`Token ${symbol} not known for chain ${chainId}`);
    }
  }

  render() {
    const { chainId, label, forceToken, disabled } = this.props;
    const { tokenAddress, tokenSymbol, showTooltip } = this.state;

    const inputValue = forceToken
      ? forceToken.isNative
        ? "native"
        : forceToken.address
      : tokenAddress;

    const knownTokens = chainId ? CHAIN_ID_TO_KNOWN_TOKENS[chainId.split(":")[1]] || {} : {};

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-300">
              {label}
            </label>
            {chainId && !forceToken && (
              <div className="flex items-center gap-1 flex-wrap px-4">
                <span className="text-sm text-gray-400 px-1">Quick Select:</span>
                {Object.keys(
                  CHAIN_ID_TO_KNOWN_TOKENS[chainId.split(":")[1]] || {}
                ).map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded-full hover:bg-blue-800 transition"
                    onClick={() => this.handleQuickSelect(symbol)}
                  >
                    {symbol}
                  </button>
                ))}
                <button
                  type="button"
                  className="text-xs bg-gray-700 text-white px-2 py-0.5 rounded-full hover:bg-blue-800 transition"
                  onClick={() => this.handleQuickSelect("NATIVE")}
                >
                  {CAIP_TO_NATIVE_SYMBOL[chainId] || "NATIVE"}
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={this.tooltipRef}>
            <button
              onClick={() => this.setState({ showTooltip: !showTooltip })}
              className="text-blue-500 hover:text-blue-700 focus:outline-none focus:text-blue-200 transition-colors bg-gray-700 rounded-full p-1"
            >
              <InfoIcon className="w-5 h-5" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-8 z-20 w-72 bg-gray-800 border border-gray-600 rounded p-3 text-xs text-gray-300 shadow-lg">
                Quick select buttons are provided for demonstration purposes. To test other tokens, simply enter their token address in the given field.
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => this.handleAddressChange(e.target.value)}
            placeholder="Token address"
            disabled={disabled || !!forceToken}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-1 text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {tokenSymbol && (
            <p className="text-sm text-emerald-400 mt-1">
              Selected Token: <strong>{tokenSymbol}</strong>
            </p>
          )}
        </div>

        {forceToken && (
          <p className="text-sm text-gray-400 mt-1">
            Token locked: {forceToken.symbol} ({forceToken.isNative ? "native" : forceToken.address})
          </p>
        )}
      </div>
    );
  }
}

export default TokenInput;
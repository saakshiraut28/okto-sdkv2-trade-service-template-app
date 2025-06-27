import { Component } from "react";
import {
  getEvmTokenMetadata,
  getSolanaTokenMetadata,
} from "../utils/chainHelpers";
import { ethers } from "ethers";
import { CHAIN_ID_TO_KNOWN_TOKENS } from "../constants/chains";

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
}

class TokenInput extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      tokenAddress: "",
      tokenSymbol: "",
    };
  }

  componentDidUpdate(prevProps: Props) {
    // If chainId changed, clear the input
    if (prevProps.chainId !== this.props.chainId && !this.props.forceToken) {
      this.setState({ tokenAddress: "", tokenSymbol: "" });
    }

    // If forceToken was removed, clear the input
    if (prevProps.forceToken && !this.props.forceToken) {
      this.setState({ tokenAddress: "", tokenSymbol: "" });
    }
  }

  async handleAddressChange(newAddress: string) {
    this.setState({ tokenAddress: newAddress });

    const { chainId, onValidToken } = this.props;
    if (!newAddress || !chainId) return;

    // Prevent processing if user types "native"
    if (newAddress.toLowerCase() === "native") return;

    try {
      const chainType = chainId.split(":")[0];
      const chainKey = chainId.split(":")[1]; // EVM or Solana ID
      if (chainType === "eip155") {
        const { symbol, decimals } = await getEvmTokenMetadata(
          parseInt(chainKey),
          newAddress
        );
        onValidToken(newAddress, symbol, decimals, false);
        this.setState({ tokenSymbol: symbol });
      } else if (chainType === "solana") {
        const { symbol, decimals } = await getSolanaTokenMetadata(newAddress);
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

    const caipParts = chainId.split(":");
    const chainType = caipParts[0];
    const chainKey = caipParts[1]; // EVM or Solana ID

    const knownTokens = CHAIN_ID_TO_KNOWN_TOKENS[chainKey];
    const tokenAddress = knownTokens?.[symbol];

    if (symbol === "NATIVE") {
      const isSol = chainType === "solana";
      const decimals = isSol ? 9 : 18;
      const symbolStr = isSol ? "SOL" : "ETH";

      this.setState({ tokenAddress: "native", tokenSymbol: symbolStr });
      onValidToken(ethers.ZeroAddress, symbolStr, decimals, true);
      return;
    }

    if (tokenAddress) {
      // Fetch decimals dynamically
      try {
        const { symbol: resolvedSymbol, decimals } =
          chainType === "eip155"
            ? await getEvmTokenMetadata(parseInt(chainKey), tokenAddress)
            : await getSolanaTokenMetadata(tokenAddress);

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
    const { tokenAddress } = this.state;

    // Determine the displayed address or "native"
    const inputValue = forceToken
      ? forceToken.isNative
        ? "native"
        : forceToken.address
      : tokenAddress;

    return (
      <div className="mb-6">
        <label
          className="block text-sm font-semibold text-gray-300 mb-2"
        >
          {label}
        </label>
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => this.handleAddressChange(e.target.value)}
            placeholder="Token address"
            disabled={disabled || !!forceToken}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          {this.state.tokenSymbol && (
            <p
              className="text-sm text-emerald-400 mt-1"
            >
              Selected Token: <strong>{this.state.tokenSymbol}</strong>
            </p>
          )}
        </div>
        <span className="text-md text-gray-400 font-normal">
          (For demonstration purposes, we have hardcoded token addresses on these chains. In practice, the trade service can be used with any available token on that chain.)
        </span>
        {/* Quick select buttons */}
        {chainId && !forceToken && (
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.keys(
              CHAIN_ID_TO_KNOWN_TOKENS[chainId.split(":")[1]] || {}
            ).map((symbol) => (
              <button
                key={symbol}
                type="button"
                className="text-sm border border-white text-white px-3 py-1 rounded-md hover:bg-gray-700 transition"
                onClick={() => this.handleQuickSelect(symbol)}
              >
                {symbol}
              </button>
            ))}
            <button
              type="button"
              className="text-sm border border-white text-white px-3 py-1 rounded-md hover:bg-gray-700 transition"
              onClick={() => this.handleQuickSelect("NATIVE")}
            >
              Native Token
            </button>
          </div>
        )}

        {/* Show forced token info if applicable */}
        {forceToken && (
          <p className="text-sm text-gray-400 mt-1">
            Token locked: {forceToken.symbol} (
            {forceToken.isNative ? "native" : forceToken.address})
          </p>
        )}
      </div>
    );
  }
}

export default TokenInput;

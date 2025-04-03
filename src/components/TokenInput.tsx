import { Component } from "react";
import { ethers } from "ethers";
import { CHAIN_NATIVE_SYMBOL, CHAIN_ID_TO_RPC } from "../constants/chains";
import styles from "../styles/components/TokenInputStyles";

interface TokenInputProps {
  chainId: string;
  label: string;
  onValidToken: (
    address: string,
    symbol: string,
    decimals: number,
    isNative: boolean
  ) => void;
}

interface TokenInputState {
  tokenAddress: string;
  symbol: string | null;
  decimals: number | null;
  loading: boolean;
  error: string | null;
}

class TokenInput extends Component<TokenInputProps, TokenInputState> {
  constructor(props: TokenInputProps) {
    super(props);
    this.state = {
      tokenAddress: "",
      symbol: null,
      decimals: null,
      loading: false,
      error: null,
    };
  }

  handleAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.trim();
    this.setState({
      tokenAddress: input,
      error: null,
      symbol: null,
      decimals: null,
    });
    const chainIdNum = parseInt(this.props.chainId.split(":")[1], 10);
    const rpcUrl = CHAIN_ID_TO_RPC[chainIdNum];

    if (!rpcUrl) {
      this.setState({ error: "Unsupported chain for token lookup" });
      return;
    }

    // Handle native token inputs
    if (
      input === "" ||
      input.toLowerCase() === "native" ||
      input.toLowerCase() === "eth"
    ) {
      const nativeSymbol = this.getNativeSymbol();
      this.setState({ symbol: nativeSymbol, decimals: 18, loading: false });
      this.props.onValidToken("native", nativeSymbol, 18, true);
      return;
    }

    if (!ethers.isAddress(input)) {
      this.setState({ error: "Invalid address" });
      return;
    }

    try {
      this.setState({ loading: true });

      const provider = new ethers.JsonRpcProvider(rpcUrl);

      const erc20 = new ethers.Contract(
        input,
        [
          "function symbol() view returns (string)",
          "function decimals() view returns (uint8)",
        ],
        provider
      );

      const [symbol, decimals] = await Promise.all([
        erc20.symbol(),
        erc20.decimals(),
      ]);

      this.setState({ symbol, decimals, loading: false });
      this.props.onValidToken(input, symbol, decimals, false);
    } catch (error: any) {
      this.setState({
        error: "Failed to fetch token metadata",
        loading: false,
      });
      console.error(error);
    }
  };

  getNativeSymbol = (): string => {
    const chainId = parseInt(this.props.chainId.split(":")[1], 10);
    return CHAIN_NATIVE_SYMBOL[chainId] || "NATIVE";
  };

  render() {
    const { label } = this.props;
    const { tokenAddress, symbol, decimals, loading, error } = this.state;

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
        <input
          type="text"
          placeholder="Enter token address or 'native'"
          disabled={loading}
          value={tokenAddress}
          onChange={this.handleAddressChange}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
            fontSize: "1rem",
          }}
        />
        <div style={styles.tokenActions}>
          <button
            type="button"
            style={styles.nativeButton}
            onClick={() => {
              this.setState({
                tokenAddress: "native",
                error: null,
                symbol: "ETH",
                decimals: 18,
              });
              this.props.onValidToken("native", "ETH", 18, true);
            }}
          >
            Use Native
          </button>
        </div>

        {loading && <p style={{ color: "#ffcc00" }}>Loading token info...</p>}
        {symbol && decimals !== null && (
          <p style={{ color: "#00e676" }}>
            Symbol: <strong>{symbol}</strong>, Decimals:{" "}
            <strong>{decimals}</strong>
          </p>
        )}
        {error && <p style={{ color: "tomato" }}>{error}</p>}
      </div>
    );
  }
}

export default TokenInput;

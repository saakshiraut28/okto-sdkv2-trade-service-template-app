import { Component } from "react";
import { CAIP_TO_NAME } from "../constants/chains";

import { connectEVMWallet, disconnectEvmWallet } from "../utils/evmWallet";
import {
  connectSolanaWallet,
  disconnectSolanaWallet,
} from "../utils/solanaWallet";

import { WalletContext } from "../context/WalletContext";

interface Props {
  evmWalletAddress: string | null;
  evmChainId: number | null;
  isEvmConnected: boolean;

  // solanaWalletAddress: string | null;
  // solanaNetwork: "mainnet" | "devnet" | "testnet" | null;
  // isSolanaConnected: boolean;
}

class WalletInfoCard extends Component<Props> {
  static contextType = WalletContext;
  declare context: React.ContextType<typeof WalletContext>;

  render() {
    const {
      evmWalletAddress,
      evmChainId,
      isEvmConnected,
      // solanaWalletAddress,
      // solanaNetwork,
      // isSolanaConnected,
    } = this.props;

    const evmCaip = evmChainId ? `eip155:${evmChainId}` : null;
    // const solanaCaip = solanaNetwork ? `solana:${solanaNetwork}` : null;

    const evmNetworkName = evmCaip
      ? CAIP_TO_NAME[evmCaip] || evmCaip
      : "Unknown";
    // const solanaNetworkName = solanaCaip
    //   ? CAIP_TO_NAME[solanaCaip] || solanaCaip
    //   : "Unknown";

    return (
      <div style={styles.card}>
        <h3>Wallet Status</h3>

        <div style={styles.walletRow}>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={isEvmConnected} readOnly />
            EVM Wallet Connected
          </label>
          {isEvmConnected ? (
            <button style={styles.button} onClick={() => disconnectEvmWallet()}>
              Disconnect
            </button>
          ) : (
            <button
              style={styles.button}
              onClick={() => connectEVMWallet(this.context.setWalletState)}
            >
              Connect
            </button>
          )}
        </div>

        <p>
          <strong>EVM Wallet:</strong>{" "}
          {evmWalletAddress ?? <span style={styles.dim}>Not Connected</span>}
        </p>
        <p>
          <strong>EVM Network:</strong>{" "}
          {isEvmConnected ? (
            evmNetworkName
          ) : (
            <span style={styles.dim}>Unknown</span>
          )}
        </p>

        <hr style={styles.hr} />

        {/* <div style={styles.walletRow}>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={isSolanaConnected} readOnly />
            Solana Wallet Connected
          </label>
          {isSolanaConnected ? (
            <button
              style={styles.button}
              onClick={() =>
                disconnectSolanaWallet(this.context.setWalletState)
              }
            >
              Disconnect
            </button>
          ) : (
            <button
              style={styles.button}
              onClick={() => connectSolanaWallet(this.context.setWalletState)}
            >
              Connect
            </button>
          )}
        </div>

        <p>
          <strong>Solana Wallet:</strong>{" "}
          {solanaWalletAddress ?? <span style={styles.dim}>Not Connected</span>}
        </p>
        <p>
          <strong>Solana Network:</strong>{" "}
          {isSolanaConnected ? (
            solanaNetworkName
          ) : (
            <span style={styles.dim}>Unknown</span>
          )}
        </p> */}
      </div>
    );
  }
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    marginBottom: "1rem",
    padding: "1rem",
    borderRadius: "0.5rem",
    backgroundColor: "#1e1e1e",
    border: "1px solid #444",
  },
  dim: {
    color: "#888",
    fontStyle: "italic",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  walletRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "0.5rem",
    marginBottom: "0.5rem",
  },
  button: {
    padding: "0.4rem 0.8rem",
    backgroundColor: "#333",
    color: "#fff",
    border: "1px solid #666",
    borderRadius: "4px",
    cursor: "pointer",
  },
  hr: {
    margin: "1rem 0",
    border: "none",
    borderTop: "1px solid #333",
  },
};

export default WalletInfoCard;

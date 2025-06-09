import { Component } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";

import WalletInfoCard from "../components/WalletInfoCard";
import { WalletContext } from "../context/WalletContext";

import { connectEVMWallet, disconnectEvmWallet } from "../utils/evmWallet";
import {
  connectSolanaWallet,
  disconnectSolanaWallet,
} from "../utils/solanaWallet";

import styles from "../styles/HomePageStyles";

interface HomePageProps {
  navigate: NavigateFunction;
}

class HomePage extends Component<HomePageProps> {
  static contextType = WalletContext;
  declare context: React.ContextType<typeof WalletContext>;

  handleTradeNavigation = () => {
    const { isEvmConnected, isSolanaConnected } = this.context;
    if (isEvmConnected || isSolanaConnected) {
      console.log("Navigating to trade page...");
      this.props.navigate("/trade");
    } else {
      alert("Please connect your wallet to access the trade form.");
    }
  };

  render() {
    const {
      evmWalletAddress,
      evmChainId,
      isEvmConnected,
      solanaWalletAddress,
      solanaNetwork,
      isSolanaConnected,
    } = this.context;

    const isAnyWalletConnected = isEvmConnected || isSolanaConnected;

    return (
      <div style={styles.container}>
        <div style={styles.contentWrapper}>
          <h1 style={styles.title}>Trade Service Client App</h1>
          <p style={styles.description}>
            This is a simple frontend client for a trade service.
          </p>

          <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem" }}>
            {isEvmConnected ? (
              <button
                onClick={() => disconnectEvmWallet()}
                style={styles.button}
              >
                Disconnect MetaMask (EVM)
              </button>
            ) : (
              <button
                onClick={() => connectEVMWallet(this.context.setWalletState)}
                style={styles.button}
              >
                Connect MetaMask (EVM)
              </button>
            )}

            {isSolanaConnected ? (
              <button
                onClick={() =>
                  disconnectSolanaWallet(this.context.setWalletState)
                }
                style={styles.button}
              >
                Disconnect Phantom (Solana)
              </button>
            ) : (
              <button
                onClick={() => connectSolanaWallet(this.context.setWalletState)}
                style={styles.button}
              >
                Connect Phantom (Solana)
              </button>
            )}
          </div>

          <button
            onClick={this.handleTradeNavigation}
            style={{
              ...styles.secondaryButton,
              opacity: isAnyWalletConnected ? 1 : 0.5,
              cursor: isAnyWalletConnected ? "pointer" : "not-allowed",
            }}
            disabled={!isAnyWalletConnected}
          >
            Go to Trade Page →
          </button>

          <WalletInfoCard
            evmWalletAddress={evmWalletAddress}
            evmChainId={evmChainId}
            isEvmConnected={isEvmConnected}
            solanaWalletAddress={solanaWalletAddress}
            solanaNetwork={solanaNetwork}
            isSolanaConnected={isSolanaConnected}
          />
        </div>
      </div>
    );
  }
}

// Wrap the class component with useNavigate
const HomePageWithNavigate = () => {
  const navigate = useNavigate();
  return <HomePage navigate={navigate} />;
};

export default HomePageWithNavigate;

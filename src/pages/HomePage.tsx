import { Component } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";

import WalletInfoCard from "../components/WalletInfoCard";
import { WalletContext } from "../context/WalletContext";

import { connectWallet } from "../utils/wallet";

import styles from "../styles/HomePageStyles";

interface HomePageProps {
  navigate: NavigateFunction;
}

class HomePage extends Component<HomePageProps> {
  static contextType = WalletContext;
  declare context: React.ContextType<typeof WalletContext>;

  renderConnectButton = () => (
    <button
      onClick={() => connectWallet(this.context.setWalletState)}
      style={styles.button}
    >
      Connect MetaMask
    </button>
  );

  handleTradeNavigation = () => {
    const { isConnected } = this.context;
    if (isConnected) {
      this.props.navigate("/trade");
    } else {
      alert("Please connect your wallet to access the trade form.");
    }
  };

  render() {
    const { walletAddress, chainId, isConnected } = this.context;

    return (
      <div style={styles.container}>
        <div style={styles.contentWrapper}>
          <h1 style={styles.title}>Trade Service Client App</h1>
          <p style={styles.description}>
            This is a simple frontend client for a trade service.
          </p>
          <button
            onClick={this.handleTradeNavigation}
            style={{
              ...styles.secondaryButton,
              opacity: isConnected ? 1 : 0.5,
              cursor: isConnected ? "pointer" : "not-allowed",
            }}
            disabled={!isConnected}
          >
            Go to Trade Page →
          </button>

          {!isConnected && (
            <p style={styles.warningText}>
              ⚠️ Connect your wallet to access the trade form.
            </p>
          )}

          {isConnected ? (
            <>
              <h3 style={styles.cardTitle}>Wallet Info</h3>
              <WalletInfoCard walletAddress={walletAddress} chainId={chainId} />
            </>
          ) : (
            this.renderConnectButton()
          )}
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

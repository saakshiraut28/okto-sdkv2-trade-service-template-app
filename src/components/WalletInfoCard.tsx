import { Component } from "react";
import { CHAIN_ID_TO_NAME } from "../constants/chains";

interface Props {
  walletAddress: string | null;
  chainId: number | null;
}

class WalletInfoCard extends Component<Props> {
  render() {
    const { walletAddress, chainId } = this.props;
    const networkName = chainId
      ? CHAIN_ID_TO_NAME[chainId] || `Chain ${chainId}`
      : null;

    return (
      <div style={styles.card}>
        <p>
          <strong>Wallet:</strong>{" "}
          {walletAddress ? (
            walletAddress
          ) : (
            <span style={styles.dim}>Not Connected</span>
          )}
        </p>
        <p>
          <strong>Network:</strong>{" "}
          {networkName ? networkName : <span style={styles.dim}>Unknown</span>}
        </p>
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
};

export default WalletInfoCard;

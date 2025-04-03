import { createContext, Component, ReactNode } from "react";
import { ethers } from "ethers";

interface WalletContextType {
  walletAddress: string | null;
  chainId: number | null;
  isConnected: boolean;
  isWalletContextReady: boolean;
  setWalletState: (wallet: {
    walletAddress: string | null;
    chainId: number | null;
    isConnected: boolean;
  }) => void;
}

export const WalletContext = createContext<WalletContextType>({
  walletAddress: null,
  chainId: null,
  isConnected: false,
  isWalletContextReady: false,
  setWalletState: () => {},
});

interface WalletProviderProps {
  children: ReactNode;
}

interface WalletProviderState {
  walletAddress: string | null;
  chainId: number | null;
  isConnected: boolean;
  isWalletContextReady: boolean;
}

export class WalletProvider extends Component<
  WalletProviderProps,
  WalletProviderState
> {
  constructor(props: WalletProviderProps) {
    super(props);
    this.state = {
      walletAddress: null,
      chainId: null,
      isConnected: false,
      isWalletContextReady: false,
    };
  }

  setWalletState = ({
    walletAddress,
    chainId,
    isConnected,
  }: {
    walletAddress: string | null;
    chainId: number | null;
    isConnected: boolean;
  }) => {
    this.setState({
      walletAddress,
      chainId,
      isConnected,
      isWalletContextReady: true,
    });
  };

  async componentDidMount() {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const walletAddress = await signer.getAddress();
          const network = await provider.getNetwork();

          this.setState({
            walletAddress,
            chainId: Number(network.chainId),
            isConnected: true,
            isWalletContextReady: true,
          });
          return;
        }
      } catch (err) {
        console.error("Wallet auto-connect failed:", err);
      }
    }

    // Even if not connected, set context as ready
    this.setState({ isWalletContextReady: true });
  }

  render() {
    const { children } = this.props;
    return (
      <WalletContext.Provider
        value={{
          ...this.state,
          setWalletState: this.setWalletState,
        }}
      >
        {children}
      </WalletContext.Provider>
    );
  }
}

import { createContext, Component, ReactNode } from "react";
import { toast } from "react-toastify";
import { ethers } from "ethers";

export interface WalletContextType {
  // EVM Wallet (MetaMask)
  evmWalletAddress: string | null;
  evmChainId: number | null;
  isEvmConnected: boolean;

  // Solana Wallet (Phantom)
  solanaWalletAddress: string | null;
  solanaNetwork: "mainnet" | "devnet" | "testnet" | null;
  isSolanaConnected: boolean;

  // App readiness
  isWalletContextReady: boolean;

  // Setter
  setWalletState: (wallet: Partial<WalletContextType>) => void;
}

export const WalletContext = createContext<WalletContextType>({
  evmWalletAddress: null,
  evmChainId: null,
  isEvmConnected: false,

  solanaWalletAddress: null,
  solanaNetwork: null,
  isSolanaConnected: false,

  isWalletContextReady: false,

  setWalletState: () => {},
});

interface WalletProviderProps {
  children: ReactNode;
}

export class WalletProvider extends Component<
  WalletProviderProps,
  WalletContextType
> {
  pollingInterval: NodeJS.Timeout | null = null;

  constructor(props: WalletProviderProps) {
    super(props);
    this.state = {
      evmWalletAddress: null,
      evmChainId: null,
      isEvmConnected: false,

      solanaWalletAddress: null,
      solanaNetwork: null,
      isSolanaConnected: false,

      isWalletContextReady: false,

      setWalletState: this.setWalletState,
    };
  }

  setWalletState = (wallet: Partial<WalletContextType>) => {
    this.setState((prev) => ({
      ...prev,
      ...wallet,
      isWalletContextReady: true,
    }));
  };

  async componentWillUnmount() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  async componentDidMount() {
    const stateUpdates: Partial<WalletContextType> = {
      isWalletContextReady: true,
    };
    console.log("State", this.state);

    // Poll every 5 seconds for MetaMask account changes
    this.pollingInterval = setInterval(async () => {
      const eth = window.ethereum as any;

      const metamask = eth?.providers
        ? eth.providers.find((p: any) => p.isMetaMask)
        : eth;

      if (!metamask || !metamask.request) {
        console.warn("MetaMask not found");
        return;
      }

      if (eth && metamask) {
        try {
          const accounts = await metamask.request({ method: "eth_accounts" });
          const account = accounts[0] ?? null;
          // console.log("MetaMask accounts:", accounts);

          if (!account && this.state.isEvmConnected) {
            console.log("MetaMask disconnected manually, resetting state");
            this.setWalletState({
              evmWalletAddress: null,
              evmChainId: null,
              isEvmConnected: false,
            });
          }
        } catch (err) {
          console.error("Failed to poll MetaMask accounts", err);
        }
      }
    }, 5000);

    // Try auto-connect for MetaMask (EVM)
    if (window.ethereum) {
      try {
        const eth = window.ethereum as any;
        const metamask = eth.providers
          ? eth.providers.find((p: any) => p.isMetaMask)
          : eth;

        if (!metamask || !metamask.request) {
          toast.error("MetaMask not found");
          return;
        }

        const accounts = await metamask.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(metamask);
          const signer = await provider.getSigner();
          const walletAddress = await signer.getAddress();
          const network = await provider.getNetwork();

          stateUpdates.evmWalletAddress = walletAddress;
          stateUpdates.evmChainId = Number(network.chainId);
          stateUpdates.isEvmConnected = true;
        }
      } catch (err) {
        console.error("MetaMask auto-connect failed:", err);
      }
    }

    // Try auto-connect for Phantom (Solana)
    const solana = (window as any).phantom?.solana;
    if (solana?.isPhantom) {
      try {
        const resp = await solana.connect({ onlyIfTrusted: true });
        if (resp?.publicKey) {
          stateUpdates.solanaWalletAddress = resp.publicKey.toString();
          stateUpdates.solanaNetwork = solana.network || "mainnet";
          stateUpdates.isSolanaConnected = true;
        }
      } catch (err) {
        console.error("Phantom auto-connect failed:", err);
      }

      const handlePhantomAccountChanged = (publicKey: any) => {
        console.log("Phantom account changed:", publicKey?.toString());

        if (publicKey) {
          this.setWalletState({
            solanaWalletAddress: publicKey.toString(),
            solanaNetwork: solana.network || "mainnet",
            isSolanaConnected: true,
          });
        } else {
          // No publicKey means disconnected
          this.setWalletState({
            solanaWalletAddress: null,
            solanaNetwork: null,
            isSolanaConnected: false,
          });
        }
      };

      solana.on("accountChanged", handlePhantomAccountChanged);
    }

    this.setState((prev) => ({
      ...prev,
      ...stateUpdates,
    }));
  }

  render() {
    const { children } = this.props;
    return (
      <WalletContext.Provider value={this.state}>
        {children}
      </WalletContext.Provider>
    );
  }
}

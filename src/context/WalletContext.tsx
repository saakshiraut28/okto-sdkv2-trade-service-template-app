import React, { createContext, useState, useEffect } from "react";
import { useAccount } from "wagmi";

export interface WalletContextType {
  evmWalletAddress: string | null;
  evmChainId: number | null;
  isEvmConnected: boolean;

  solanaWalletAddress: string | null;
  solanaNetwork: "mainnet" | "devnet" | "testnet" | null;
  isSolanaConnected: boolean;

  isWalletContextReady: boolean;

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

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected, chain } = useAccount();

  const [solanaWalletAddress, setSolanaWalletAddress] = useState<string | null>(null);
  const [solanaNetwork, setSolanaNetwork] = useState<"mainnet" | "devnet" | "testnet" | null>(null);
  const [isSolanaConnected, setIsSolanaConnected] = useState(false);
  const [isWalletContextReady, setIsWalletContextReady] = useState(false);

  const setWalletState = (wallet: Partial<WalletContextType>) => {
    if (wallet.solanaWalletAddress !== undefined) setSolanaWalletAddress(wallet.solanaWalletAddress);
    if (wallet.solanaNetwork !== undefined) setSolanaNetwork(wallet.solanaNetwork);
    if (wallet.isSolanaConnected !== undefined) setIsSolanaConnected(wallet.isSolanaConnected);
    setIsWalletContextReady(true);
  };

  // Phantom auto-connect & listener
  useEffect(() => {
    const solana = (window as any).phantom?.solana;

    if (solana?.isPhantom) {
      solana.connect({ onlyIfTrusted: true })
        .then((resp: any) => {
          if (resp?.publicKey) {
            setSolanaWalletAddress(resp.publicKey.toString());
            setSolanaNetwork(solana.network || "mainnet");
            setIsSolanaConnected(true);
          }
        })
        .catch(() => { });

      const handlePhantomAccountChanged = (publicKey: any) => {
        if (publicKey) {
          setSolanaWalletAddress(publicKey.toString());
          setSolanaNetwork(solana.network || "mainnet");
          setIsSolanaConnected(true);
        } else {
          setSolanaWalletAddress(null);
          setSolanaNetwork(null);
          setIsSolanaConnected(false);
        }
      };

      solana.on("accountChanged", handlePhantomAccountChanged);
    }

    setIsWalletContextReady(true);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        evmWalletAddress: address || null,
        evmChainId: chain?.id || null,
        isEvmConnected: isConnected,
        solanaWalletAddress,
        solanaNetwork,
        isSolanaConnected,
        isWalletContextReady,
        setWalletState,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

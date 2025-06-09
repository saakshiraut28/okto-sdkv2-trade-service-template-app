import { ethers } from "ethers";
import { toast } from "react-toastify";

export const getProvider = (): ethers.BrowserProvider | null => {
  if (window.ethereum) return new ethers.BrowserProvider(window.ethereum);
  return null;
};

export const tryEagerConnect = async (
  setWalletState: (wallet: Partial<any>) => void
) => {
  console.log(
    "Eager connect effect ran. evmWalletManuallyDisconnected =",
    localStorage.getItem("evmWalletManuallyDisconnected")
  );

  try {
    const wasDisconnected =
      localStorage.getItem("evmWalletManuallyDisconnected") === "true";
    if (wasDisconnected) {
      console.log(
        "Skipping eager connect: evmWalletManuallyDisconnected flag is true"
      );
      return;
    }

    const eth = window.ethereum as any;
    const metamask = eth.providers
      ? eth.providers.find((p: any) => p.isMetaMask)
      : eth;

    if (!metamask || !metamask.request) {
      toast.error("MetaMask not found");
      return;
    }

    const accounts = await metamask.request({ method: "eth_accounts" });

    const provider = new ethers.BrowserProvider(metamask);
    if (accounts.length > 0) {
      const network = await provider.getNetwork();
      setWalletState({
        evmWalletAddress: accounts[0],
        evmChainId: Number(network.chainId),
        isEvmConnected: true,
      });
    }
  } catch (error) {
    console.error("Eager connect failed:", error);
  }
};

export const connectEVMWallet = async (
  setWalletState: (wallet: Partial<any>) => void
) => {
  try {
    console.log("connectWallet triggered");
    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    const eth = window.ethereum as any;
    const metamask = eth.providers
      ? eth.providers.find((p: any) => p.isMetaMask)
      : eth;

    if (!metamask || !metamask.request) {
      toast.error("MetaMask not found");
      return;
    }

    const accounts = await metamask.request({ method: "eth_requestAccounts" });
    if (accounts.length === 0) {
      toast.error("No accounts returned from MetaMask");
      return;
    }
    console.dir({
      metamask,
      accounts,
    });

    const provider = new ethers.BrowserProvider(metamask);
    const network = await provider.getNetwork();
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    setWalletState({
      evmWalletAddress: address,
      evmChainId: Number(network.chainId),
      isEvmConnected: true,
    });
    localStorage.setItem("evmWalletManuallyDisconnected", "false");
  } catch (err) {
    console.error("MetaMask connection error:", err);
    alert("Failed to connect MetaMask");
  }
};

export const handleAccountsChanged = (
  accounts: string[],
  setWalletState: (wallet: Partial<any>) => void,
  currentChainId: number | null
) => {
  if (accounts.length === 0) {
    setWalletState({
      evmWalletAddress: null,
      evmChainId: null,
      isEvmConnected: false,
    });
    localStorage.setItem("evmWalletManuallyDisconnected", "true");
    toast.info("Wallet disconnected");
  } else {
    setWalletState({
      evmWalletAddress: accounts[0],
      evmChainId: currentChainId,
      isEvmConnected: true,
    });
    localStorage.setItem("evmWalletManuallyDisconnected", "false");
  }
};

export const handleChainChanged = async (
  setWalletState: (wallet: Partial<any>) => void,
  currentWalletAddress: string | null,
  isConnected: boolean
) => {
  try {
    const eth = window.ethereum as any;
    const metamask = eth.providers
      ? eth.providers.find((p: any) => p.isMetaMask)
      : eth;

    if (!metamask || !metamask.request) {
      toast.error("MetaMask not found");
      return;
    }
    const provider = new ethers.BrowserProvider(metamask);
    const network = await provider.getNetwork();
    setWalletState({
      evmWalletAddress: currentWalletAddress,
      evmChainId: Number(network.chainId),
      isEvmConnected: isConnected,
    });
  } catch (error) {
    console.error("Failed to handle chain change:", error);
  }
};

export const disconnectEvmWallet = () => {
  toast.info(
    "Please disconnect MetaMask manually from the wallet extension. This app cannot disconnect automatically."
  );
};

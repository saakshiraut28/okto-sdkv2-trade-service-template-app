import { ethers } from "ethers";
import { toast } from "react-toastify";

export const getProvider = (): ethers.BrowserProvider | null => {
  if (window.ethereum) return new ethers.BrowserProvider(window.ethereum);
  return null;
};

export const tryEagerConnect = async (setWalletState: Function) => {
  try {
    const provider = getProvider();
    if (!provider) return;

    const wasDisconnected = localStorage.getItem("wasDisconnected") === "true";
    if (wasDisconnected) return;

    const accounts = await provider.send("eth_accounts", []);
    if (accounts.length > 0) {
      const network = await provider.getNetwork();
      setWalletState({
        walletAddress: accounts[0],
        chainId: Number(network.chainId),
        isConnected: true,
      });
      localStorage.setItem("wasDisconnected", "false");
    }
  } catch (error) {
    console.error("Eager connect failed:", error);
  }
};

export const connectWallet = async (setWalletState: Function) => {
  const provider = getProvider();
  if (!provider) {
    alert("MetaMask is not installed");
    return;
  }

  try {
    const accounts = await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();
    setWalletState({
      walletAddress: accounts[0],
      chainId: Number(network.chainId),
      isConnected: true,
    });
    localStorage.setItem("wasDisconnected", "false");
    toast.success("Wallet connected");
  } catch (error) {
    console.error("Failed to connect:", error);
  }
};

export const handleAccountsChanged = (
  accounts: string[],
  setWalletState: Function,
  currentChainId: number | null
) => {
  if (accounts.length === 0) {
    setWalletState({
      walletAddress: null,
      chainId: null,
      isConnected: false,
    });
    localStorage.setItem("wasDisconnected", "true");
    toast.info("Wallet disconnected");
  } else {
    setWalletState({
      walletAddress: accounts[0],
      chainId: currentChainId,
      isConnected: true,
    });
    localStorage.setItem("wasDisconnected", "false");
  }
};

export const handleChainChanged = async (
  setWalletState: Function,
  currentWalletAddress: string | null,
  isConnected: boolean
) => {
  try {
    const provider = getProvider();
    if (!provider) return;

    const network = await provider.getNetwork();
    setWalletState({
      walletAddress: currentWalletAddress,
      chainId: Number(network.chainId),
      isConnected,
    });
  } catch (error) {
    console.error("Failed to handle chain change:", error);
  }
};

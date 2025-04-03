import { useContext, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import HomePage from "./pages/HomePage";
import TradePage from "./pages/TradePage";

import {
  tryEagerConnect,
  handleAccountsChanged,
  handleChainChanged,
} from "./utils/wallet";
import { WalletContext } from "./context/WalletContext";

function App() {
  const { walletAddress, chainId, isConnected, setWalletState } =
    useContext(WalletContext);

  useEffect(() => {
    tryEagerConnect(setWalletState);

    const accountListener = (accounts: string[]) => {
      handleAccountsChanged(accounts, setWalletState, chainId);
    };

    const chainListener = () => {
      handleChainChanged(setWalletState, walletAddress, isConnected);
    };

    window.ethereum?.on("accountsChanged", accountListener);
    window.ethereum?.on("chainChanged", chainListener);

    return () => {
      window.ethereum?.removeListener("accountsChanged", accountListener);
      window.ethereum?.removeListener("chainChanged", chainListener);
    };
  }, [chainId, walletAddress, isConnected, setWalletState]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/trade" element={<TradePage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;

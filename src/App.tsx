import { useContext, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import HomePage from "./pages/HomePage";
import TradePage from "./pages/TradePage";

import { Buffer } from "buffer";

window.Buffer = Buffer;

import {
  tryEagerConnect,
  handleAccountsChanged,
  handleChainChanged,
} from "./utils/evmWallet";
import { WalletContext } from "./context/WalletContext";

function App() {
  const { evmWalletAddress, evmChainId, isEvmConnected, setWalletState } =
    useContext(WalletContext);

  useEffect(() => {
    tryEagerConnect(setWalletState);

    const eth = window.ethereum as any;
    if (!eth) return;

    const accountListener = (accounts: string[]) => {
      handleAccountsChanged(accounts, setWalletState, evmChainId);
    };

    const chainListener = () => {
      handleChainChanged(setWalletState, evmWalletAddress, isEvmConnected);
    };

    eth.on("accountsChanged", accountListener);
    eth.on("chainChanged", chainListener);

    return () => {
      eth.removeListener("accountsChanged", accountListener);
      eth.removeListener("chainChanged", chainListener);
    };
  }, [evmChainId, evmWalletAddress, isEvmConnected, setWalletState]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/trade" element={<TradePage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;

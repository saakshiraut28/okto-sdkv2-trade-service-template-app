import React from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import WalletInfoCard from "../components/WalletInfoCard";
import TradeServiceSecret from "../components/TradeServiceSecret";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const { address: evmWalletAddress, isConnected: isEvmConnected, chainId } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();

  const handleTradeNavigation = () => {
    if (isEvmConnected) {
      navigate("/trade");
    } else {
      alert("Please connect your wallet to access the trade form.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-[#1e1e1e] p-8 rounded-xl shadow-lg">
        <TradeServiceSecret />
        <div className="flex flex-wrap gap-4 mb-6">
          {isEvmConnected ? (
            <button
              onClick={() => disconnectEvm()}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition"
            >
              Disconnect Wallet
            </button>
          ) : (
            <ConnectButton />
          )}
        </div>

        <button
          onClick={handleTradeNavigation}
          className={`w-full text-center py-2 px-4 rounded font-semibold ${isEvmConnected
              ? "bg-blue-600 hover:bg-blue-500 cursor-pointer"
              : "bg-blue-800 cursor-not-allowed opacity-50"
            }`}
          disabled={!isEvmConnected}
        >
          Go to Trade Page →
        </button>

        <div className="mt-6">
          <WalletInfoCard
            evmWalletAddress={evmWalletAddress || ""}
            evmChainId={chainId || null}
            isEvmConnected={isEvmConnected}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;

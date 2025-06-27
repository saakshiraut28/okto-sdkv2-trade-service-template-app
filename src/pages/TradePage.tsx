import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import TradeServiceSecret from "../components/TradeServiceSecret";
import SameChainTradePage from "./SameChainTradePage";
import CrossChainTradePage from "./CrossChainTradePage";

function TradePage() {
  const { isConnected } = useAccount();
  const [showSameChain, setShowSameChain] = useState(false);
  const [showCrossChain, setShowCrossChain] = useState(false);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center border border-indigo-500 rounded-xl p-8 bg-gray-800 shadow-lg">
          <h1 className="text-3xl font-bold mb-4">Trade Service Client</h1>
          <p className="mb-6 text-gray-300">Connect your wallet to start trading</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 ">
      <div className="max-w-5xl mx-auto bg-gray-800 rounded-2xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold mb-2">
            Trade Service Demo App
          </h2>
          <ConnectButton />
        </div>

        <div>
          <TradeServiceSecret />
        </div>

        <div className="flex w-full justify-center items-center mt-4">
          <div className="flex gap-2 bg-gray-800 rounded-full w-fit">
            <button
              onClick={() => {
                setShowCrossChain(false);
                setShowSameChain(true);
              }}
              className={`px-4 py-1 rounded-full text-md font-medium transition-all duration-200 ${showSameChain ? 'bg-blue-600 text-white' : 'text-gray-300'
                }`}
            >
              Same Chain
            </button>
            <button
              onClick={() => {
                setShowSameChain(false);
                setShowCrossChain(true);
              }}
              className={`px-4 py-1 rounded-full text-md font-medium transition-all duration-200 ${showCrossChain ? 'bg-purple-600 text-white' : 'text-gray-300'
                }`}
            >
              Cross Chain
            </button>
          </div>
        </div>

        {showSameChain && (
          <SameChainTradePage />
        )}

        {showCrossChain && (
          <CrossChainTradePage />
        )}

      </div>
    </div>
  );
}

export default TradePage;

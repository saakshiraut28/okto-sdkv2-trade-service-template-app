import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import TradeServiceSecret from "../components/TradeServiceSecret";
import SameChainTradePage from "./SameChainTradePage";
import CrossChainTradePage from "./CrossChainTradePage";
import { useTradeService } from "../context/TradeServiceContext";

function TradePage() {
  const { isConnected } = useAccount();
  const { secret } = useTradeService();
  const [showSameChain, setShowSameChain] = useState(false);
  const [showCrossChain, setShowCrossChain] = useState(false);

  const canTrade = isConnected && !!secret;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-700">

        <h2 className="text-2xl font-bold mb-4 text-center">Trade Service Client</h2>

        <div className="flex flex-col gap-4 mb-6 items-center justify-center">
          <ConnectButton />
          {isConnected && <TradeServiceSecret />}
        </div>

        {!canTrade && (
          <p className="text-center text-sm text-red-400 mb-4">
            Please connect your wallet and enter your Trade Service secret key to continue.
          </p>
        )}

        {canTrade && (
          <div className="mb-6 mx-auto w-full border-1 border-yellow-700 bg-gray-900 text-white p-4 rounded-lg shadow-sm">
            <p className="text-sm">
              ⚠️ In case of transaction failure, a refund will be processed on either the source or destination chain, depending on the state of the transaction when the failure occurred. For detailed information on refund eligibility and processing, refer to the <a href="https://docs.okto.tech/docs/trade-service/refunds" target="_blank" className="text-indigo-400 hover:text-blue-400 hover:underline">Trade Service Refund</a> documentation.
            </p>
          </div>
        )}

        {canTrade && (
          <>
            <div className="flex justify-center mt-4">
              <div className="flex gap-2 bg-gray-700 rounded-full w-fit p-1">
                <button
                  onClick={() => {
                    setShowCrossChain(false);
                    setShowSameChain(true);
                  }}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-all duration-200 ${showSameChain ? "bg-blue-600 text-white" : "text-gray-300"
                    }`}
                >
                  Same Chain Swap
                </button>
                <button
                  onClick={() => {
                    setShowSameChain(false);
                    setShowCrossChain(true);
                  }}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-all duration-200 ${showCrossChain ? "bg-purple-600 text-white" : "text-gray-300"
                    }`}
                >
                  Cross Chain Swap
                </button>
              </div>
            </div>

            {showSameChain && <SameChainTradePage />}
            {showCrossChain && <CrossChainTradePage />}
          </>
        )}
      </div>
    </div>
  );
}

export default TradePage;

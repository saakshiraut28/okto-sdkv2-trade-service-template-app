import { Component } from "react";
import { NavigateFunction, useNavigate } from "react-router-dom";

import WalletInfoCard from "../components/WalletInfoCard";
import { WalletContext } from "../context/WalletContext";

import { connectEVMWallet, disconnectEvmWallet } from "../utils/evmWallet";
import {
  connectSolanaWallet,
  disconnectSolanaWallet,
} from "../utils/solanaWallet";
import TradeServiceSecret from "../components/TradeServiceSecret";

interface HomePageProps {
  navigate: NavigateFunction;
}

class HomePage extends Component<HomePageProps> {
  static contextType = WalletContext;
  declare context: React.ContextType<typeof WalletContext>;

  handleTradeNavigation = () => {
    const { isEvmConnected, isSolanaConnected } = this.context;
    if (isEvmConnected || isSolanaConnected) {
      this.props.navigate("/trade");
    } else {
      alert("Please connect your wallet to access the trade form.");
    }
  };

  render() {
    const {
      evmWalletAddress,
      evmChainId,
      isEvmConnected,
      solanaWalletAddress,
      solanaNetwork,
      isSolanaConnected,
    } = this.context;

    const isAnyWalletConnected = isEvmConnected || isSolanaConnected;

    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-3xl bg-[#1e1e1e] p-8 rounded-xl shadow-lg">
          <TradeServiceSecret />
          <div className="flex flex-wrap gap-4 mb-6">
            {isEvmConnected ? (
              <button
                onClick={() => disconnectEvmWallet()}
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition"
              >
                Disconnect MetaMask (EVM)
              </button>
            ) : (
              <button
                onClick={() => connectEVMWallet(this.context.setWalletState)}
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition"
              >
                Connect MetaMask (EVM)
              </button>
            )}

            {isSolanaConnected ? (
              <button
                onClick={() =>
                  disconnectSolanaWallet(this.context.setWalletState)
                }
                className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition"
              >
                Disconnect Phantom (Solana)
              </button>
            ) : (
              <button
                  onClick={() =>
                    connectSolanaWallet(this.context.setWalletState)
                  }
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition"
              >
                Connect Phantom (Solana)
              </button>
            )}
          </div>

          <button
            onClick={this.handleTradeNavigation}
            className={`w-full text-center py-2 px-4 rounded font-semibold ${isAnyWalletConnected
              ? "bg-blue-600 hover:bg-blue-500 cursor-pointer"
              : "bg-blue-800 cursor-not-allowed opacity-50"
              }`}
            disabled={!isAnyWalletConnected}
          >
            Go to Trade Page →
          </button>

          <div className="mt-6">
            <WalletInfoCard
              evmWalletAddress={evmWalletAddress}
              evmChainId={evmChainId}
              isEvmConnected={isEvmConnected}
              solanaWalletAddress={solanaWalletAddress}
              solanaNetwork={solanaNetwork}
              isSolanaConnected={isSolanaConnected}
            />
          </div>
        </div>
      </div>
    );
  }
}

// Wrap the class component with useNavigate
const HomePageWithNavigate = () => {
  const navigate = useNavigate();
  return <HomePage navigate={navigate} />;
};

export default HomePageWithNavigate;

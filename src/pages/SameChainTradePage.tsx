import React from "react";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import {
  useAccount,
  useSwitchChain,
  useBalance,
  usePublicClient,
  useWalletClient
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import SameChainFlow from '../assets/same-chain-swaps-flow.png';

// Import your existing components
import TokenInput from "../components/TokenInput";
import AmountInput from "../components/AmountInput";
import RequestResponseModal from "../components/RequestResponseModal";

import { CAIP_TO_NAME } from "../constants/chains";
import {
  getQuote,
  getBestRoute,
} from "../api/tradeServiceClient";

// Types
interface SameChainTradeState {
  environment: string;
  chainId: string;
  fromToken: {
    address: string;
    symbol: string;
    decimals: number;
    isNative: boolean;
  } | null;
  toToken: {
    address: string;
    symbol: string;
    decimals: number;
    isNative: boolean;
  } | null;
  toUserWalletAddress: string | null;
  amount: string;
  quoteOutputAmount: string | null;
  routeOutputAmount: string | null;
  routeResponse: any | null;
  currentAction: "idle" | "get_quote" | "get_best_route" | "approve" | "swap";
  isQuoteLoading: boolean;
  isRouteLoading: boolean;
  isTxSubmitting: boolean;
  modalOpen: boolean;
  modalTitle: string;
  modalSubtitle: string;
  modalRequestPayload?: any;
  modalResponsePayload?: any;
  isRequestModal: boolean;
  onConfirmModal?: () => void;
}

function SameChainTradePage() {
  const { address, isConnected, chainId: connectedChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [state, setState] = React.useState<SameChainTradeState>({
    environment: "sandbox",
    chainId: "",
    fromToken: null,
    toToken: null,
    toUserWalletAddress: "",
    amount: "",
    quoteOutputAmount: null,
    routeOutputAmount: null,
    routeResponse: null,
    currentAction: "idle",
    isQuoteLoading: false,
    isRouteLoading: false,
    isTxSubmitting: false,
    modalOpen: false,
    modalTitle: "",
    modalSubtitle: "",
    modalRequestPayload: null,
    modalResponsePayload: null,
    isRequestModal: true,
  });

  // Get balance for from token
  const { data: balance } = useBalance({
    address: address,
    token: state.fromToken?.isNative ? undefined : state.fromToken?.address as `0x${string}`,
    chainId: connectedChainId,
    query: {
      enabled: !!address && !!state.fromToken,
    }
  });

  // Set chain ID when wallet connects
  React.useEffect(() => {
    if (connectedChainId) {
      const caipChainId = `eip155:${connectedChainId}`;
      setState(prev => ({ ...prev, chainId: caipChainId }));
    }
  }, [connectedChainId]);

  // Modal management
  const openRequestModal = (
    title: string,
    subtitle: string,
    payload: any,
    onConfirm: () => Promise<void>
  ) => {
    setState(prev => ({
      ...prev,
      modalOpen: true,
      modalTitle: title,
      modalSubtitle: subtitle,
      modalRequestPayload: payload,
      modalResponsePayload: undefined,
      isRequestModal: true,
      onConfirmModal: onConfirm,
    }));
  };

  const openResponseModal = (title: string, subtitle: string, payload: any): Promise<void> => {
    return new Promise((resolve) => {
      setState(prev => ({
        ...prev,
        modalOpen: true,
        modalTitle: title,
        modalSubtitle: subtitle,
        modalRequestPayload: undefined,
        modalResponsePayload: payload,
        isRequestModal: false,
        onConfirmModal: resolve,
      }));
    });
  };

  const openRequestResponseModal = (
    title: string,
    subtitle: string,
    requestPayload: any,
    responsePayload: any
  ) => {
    return new Promise<void>((resolve) => {
      setState(prev => ({
        ...prev,
        modalOpen: true,
        modalTitle: title,
        modalSubtitle: subtitle,
        modalRequestPayload: requestPayload,
        modalResponsePayload: responsePayload,
        isRequestModal: false,
        onConfirmModal: () => {
          setState(prev => ({ ...prev, modalOpen: false }));
          resolve();
        }
      }));
    });
  };

  // Handle chain switching
  const handleChainChange = async (newChainId: string) => {
    const [chainType, chainIdStr] = newChainId.split(":");
    const chainId = parseInt(chainIdStr, 10);

    if (chainType === "eip155" && chainId !== connectedChainId) {
      try {
        await switchChain({ chainId });
        setState(prev => ({
          ...prev,
          chainId: newChainId,
          fromToken: null,
          toToken: null,
          amount: "",
          quoteOutputAmount: null,
          routeOutputAmount: null,
          currentAction: "idle",
        }));
      } catch (error) {
        console.error("Chain switch failed:", error);
        toast.error("Failed to switch chain");
      }
    } else {
      setState(prev => ({
        ...prev,
        chainId: newChainId,
        fromToken: null,
        toToken: null,
        amount: "",
        quoteOutputAmount: null,
        routeOutputAmount: null,
        currentAction: "idle",
      }));
    }
  };

  const handleGetQuote = async () => {
    if (!address || !state.chainId || !state.fromToken || !state.toToken || !state.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    if (state.fromToken.address === state.toToken.address) {
      toast.error("From and To tokens cannot be the same");
      return;
    }

    try {
      setState(prev => ({ ...prev, isQuoteLoading: true }));

      const fromAmount = ethers.parseUnits(state.amount, state.fromToken.decimals).toString();
      const fromTokenAddress = state.fromToken.isNative ? "" : state.fromToken.address;
      const toTokenAddress = state.toToken.isNative ? "" : state.toToken.address;
      const toUserWalletAddress = state.toUserWalletAddress || address;

      const quotePayload = {
        fromChain: state.chainId,
        toChain: state.chainId, // Same chain
        fromToken: fromTokenAddress.toLowerCase(),
        toToken: toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress: address,
        toUserWalletAddress: toUserWalletAddress,
      };

      await new Promise<void>((resolve) => {
        openRequestModal(
          "1. Get Quote Request",
          `Step 1: Get Quote Request
          📍Note: The 'Get Quote' request is optional and provides a quick estimate of the output amount. Use this step for faster previews without executing a full route calculation.`,
          quotePayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      const quoteRes = await getQuote(state.environment, quotePayload);
      console.log("Get Quote Response: ", quoteRes);

      await openRequestResponseModal(
        "1. Get Quote Response",
        `Step 1: Get Quote
          📍Note: The 'Get Quote' request is optional and provides a quick estimate of the output amount. Use this step for faster previews without executing a full route calculation.`,
        quotePayload,
        quoteRes
      );

      const quoteOutputAmount = ethers.formatUnits(
        quoteRes.outputAmount,
        state.toToken.decimals
      );

      setState(prev => ({
        ...prev,
        quoteOutputAmount,
        isQuoteLoading: false,
        currentAction: "get_best_route", // Set next state
      }));

    } catch (err) {
      console.error("Failed to get quote:", err);
      toast.error("Failed to get quote");
      setState(prev => ({
        ...prev,
        isQuoteLoading: false,
        quoteOutputAmount: null,
        currentAction: "idle",
      }));
    }
  };

  // Get best route
  const handleGetBestRoute = async () => {
    if (!address || !state.chainId || !state.fromToken || !state.toToken || !state.amount) {
      toast.error("Missing required fields for route calculation");
      return;
    }

    try {
      setState(prev => ({ ...prev, isRouteLoading: true }));
      const fromAmount = ethers.parseUnits(state.amount, state.fromToken.decimals).toString();
      const fromTokenAddress = state.fromToken.isNative ? "" : state.fromToken.address;
      const toTokenAddress = state.toToken.isNative ? "" : state.toToken.address;
      const toUserWalletAddress = state.toUserWalletAddress || address;

      const quotePayload = {
        fromChain: state.chainId,
        toChain: state.chainId,
        fromToken: fromTokenAddress.toLowerCase(),
        toToken: toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress: address,
        toUserWalletAddress: toUserWalletAddress,
      };

      // Get best route
      await new Promise<void>((resolve) => {
        openRequestModal(
          "2. Get Best Route Request",
          `Step 2: Get Best Route Request  
        📍 This response provides the most optimized route for your swap, along with the exact steps required to execute the trade across the involved chains and protocols.`,
          quotePayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      const routeRes = await getBestRoute(state.environment, quotePayload);
      console.log("Get Best Route Response: ", routeRes);

      await openRequestResponseModal(
        "2. Get Best Route Response",
        `Step 2: Get Best Route  
        📍 This response provides the most optimized route for your swap, along with the exact steps required to execute the trade across the involved chains and protocols.`,
        quotePayload,
        routeRes
      );

      const routeOutputAmount = ethers.formatUnits(
        // @ts-ignore
        routeRes.outputAmount,
        state.toToken.decimals
      );

      // Determine next action based on route steps
      const steps = routeRes.steps || [];

      if (steps.length > 0 && steps[0].metadata?.transactionType === "approval") {
        setState(prev => ({
          ...prev,
          routeOutputAmount,
          isRouteLoading: false,
          routeResponse: routeRes,
          currentAction: "approve",
        }));
      } else {
        setState(prev => ({
          ...prev,
          routeOutputAmount,
          isRouteLoading: false,
          routeResponse: routeRes,
          currentAction: "swap",
        }));
      }

    } catch (err) {
      console.error("Failed to get best route:", err);
      toast.error("Failed to get best route");
      setState(prev => ({
        ...prev,
        isRouteLoading: false,
        routeOutputAmount: null,
        currentAction: "idle",
      }));
    }
  };

  // Submit transaction
  const submitTransaction = async (type: "approval" | "dex") => {
    if (!state.routeResponse || !address || !walletClient) {
      toast.error("Missing required data");
      return;
    }

    const steps = state.routeResponse.steps || [];
    const step = steps.find((s: any) => s.metadata?.transactionType === type);

    if (!step || !step.txnData) {
      toast.error(`No ${type} transaction found`);
      return;
    }

    try {
      setState(prev => ({ ...prev, isTxSubmitting: true }));

      const txRequest = step.txnData;

      await new Promise<void>((resolve) => {
        openRequestModal(
          `3. Execute Same Chain Swap`,
          `Step 3: Executing ${type} transaction
          📍 This transaction executes the actual token swap. Make sure to review and confirm the transaction in your wallet (e.g., MetaMask) to proceed.`,
          txRequest,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      const hash = await walletClient.sendTransaction({
        account: address,
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        gas: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
        kzg: undefined,
        chain: undefined,
      });

      toast.info(`${type} transaction submitted: ${hash}`);

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });

      await openResponseModal(
        `Transaction Complete`,
        `The token has been successfully swapped on the same chain. Below is the transaction receipt for your reference.`,
        receipt
      );

      toast.success(`${type} transaction confirmed`);


      setState(prev => ({ ...prev, currentAction: "idle" }));
      // Reset form after successful swap
      setState(prev => ({
        ...prev,
        fromToken: null,
        toToken: null,
        toUserWalletAddress: "",
        amount: "",
        quoteOutputAmount: null,
        routeOutputAmount: null,
        routeResponse: null,
      }));


    } catch (err) {
      console.error(`Failed to send ${type} transaction:`, err);
      toast.error(`Failed to complete ${type} transaction`);
    } finally {
      setState(prev => ({ ...prev, isTxSubmitting: false }));
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Same Chain Trading</h1>
          <p className="mb-6 text-gray-300">Connect your wallet to start trading on the same chain</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const isDisabled =
    state.isQuoteLoading ||
    state.isRouteLoading ||
    !state.chainId ||
    !state.fromToken ||
    !state.toToken ||
    !state.amount ||
    (balance && parseFloat(state.amount) > parseFloat(balance.formatted)) ||
    state.isTxSubmitting;

  const outputAmount = state.routeOutputAmount || state.quoteOutputAmount;

  const actionLabel = {
    approve: "Approve Token",
    swap: "Execute Swap",
    idle: "Get Best Route",
    get_best_route: "Get Best Route",
    get_quote: "Getting Quote..",
  }[state.currentAction];

  return (
    <div className="my-4">
      <div className="mb-6">
        <label className="block text-sm font-medium mb-1">Chain:{" "}
          <span className="text-md text-gray-200 font-normal">
            Trade Service only works on mainnet. For more information on chains and tokens supported by Okto Trade Service; check <a className="text-indigo-400" href="https://docs.okto.tech/docs/trade-service/supported-networks-tokens" target="_blank">Supported Chains and Tokens</a>
          </span>
        </label>
        <select
          className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
          value={state.chainId}
          onChange={(e) => handleChainChange(e.target.value)}
        >
          <option value="">Select Network</option>
          {Object.entries(CAIP_TO_NAME)
            .filter(([id]) => id.startsWith("eip155"))
            .map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))
          }
        </select>
      </div>

      <RequestResponseModal
        open={state.modalOpen}
        onClose={() => {
          setState(prev => ({ ...prev, modalOpen: false }));
          if (state.onConfirmModal) {
            state.onConfirmModal();
            setState(prev => ({ ...prev, onConfirmModal: undefined }));
          }
        }}
        title={state.modalTitle}
        subtitle={state.modalSubtitle}
        // Handle both old and new payload formats
        requestPayload={state.modalRequestPayload || (state.isRequestModal ? state.modalRequestPayload : undefined)}
        responsePayload={state.modalResponsePayload || (!state.isRequestModal ? state.modalResponsePayload : undefined)}
        isRequest={state.isRequestModal}
        onConfirm={
          state.isRequestModal && state.onConfirmModal
            ? async () => state.onConfirmModal!()
            : undefined
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (state.currentAction === "approve") {
            submitTransaction("approval");
          } else if (state.currentAction === "get_best_route") {
            handleGetBestRoute();
          } else if (state.currentAction === "swap") {
            submitTransaction("dex");
          } else if (state.currentAction === "get_quote") {
            handleGetQuote();
          }
        }}
        className="space-y-6"
      >
        <TokenInput
          chainId={state.chainId}
          label="From Token"
          disabled={!state.chainId}
          onValidToken={(address, symbol, decimals, isNative) => {
            setState(prev => ({
              ...prev,
              fromToken: { address, symbol, decimals, isNative },
              quoteOutputAmount: null,
              routeOutputAmount: null,
              currentAction: "idle",
              routeResponse: null,
            }));
          }}
        />

        <AmountInput
          value={state.amount}
          onChange={(val) => {
            setState(prev => ({
              ...prev,
              amount: val,
              quoteOutputAmount: null,
              routeOutputAmount: null,
              currentAction: "idle",
              routeResponse: null,
            }));
          }}
          onMaxClick={() => balance && setState(prev => ({ ...prev, amount: balance.formatted }))}
          tokenSymbol={state.fromToken?.symbol}
          balance={balance?.formatted}
        />

        {balance && (
          <p className="text-sm text-gray-400">
            Balance: {balance.formatted} {balance.symbol}
          </p>
        )}

        <TokenInput
          chainId={state.chainId}
          label="To Token"
          disabled={!state.chainId}
          onValidToken={(address, symbol, decimals, isNative) => {
            setState(prev => ({
              ...prev,
              toToken: { address, symbol, decimals, isNative },
              quoteOutputAmount: null,
              routeOutputAmount: null,
              currentAction: "idle",
              routeResponse: null,
            }));
          }}
        />

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Recipient Wallet Address{" "}
            <span className="text-sm text-gray-200 font-normal">
              (Optional — defaults to your connected address)
            </span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="0x... or leave blank to use your wallet"
              className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 text-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={state.toUserWalletAddress || ""}
              onChange={(e) => setState(prev => ({ ...prev, toUserWalletAddress: e.target.value }))}
            />
          </div>
        </div>

        {outputAmount && (
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-green-400 text-lg">
              Expected Output: <strong>{outputAmount} {state.toToken?.symbol}</strong>
              {state.isRouteLoading && <span className="text-yellow-400"> (calculating...)</span>}
            </p>
          </div>
        )}

        <div className="text-sm border border-gray-400 p-3 my-3 rounded-lg bg-gray-800 text-gray-200">
          <h1 className="font-semibold mb-1">ℹ️ Understanding Get Quote & Get Best Route</h1>
          <p>
            → Using <strong>Get Quote</strong> is optional. It provides a faster API call to quickly estimate the output amount for your trade.
            <br />
            → <strong>Get Best Route</strong>, however, is mandatory for executing trades. It returns the optimal route along with all the steps required to complete the trade.
            <br />
            → Read the <a className="text-indigo-400" href="https://docsv2.okto.tech/docs/trade-service" target="_blank">Trade Service Guide</a> for more details on how to use these APIs effectively.
          </p>
          <br />
          <span>Here's the diagram explaining the <strong>Same Chain Swap Flow using Okto Trade Service:</strong></span>
          <img src={SameChainFlow} />
        </div>

        <div className="flex gap-4">
          {/* Get Quote Button */}
          <button
            type="button"
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition ${state.quoteOutputAmount
              ? "bg-gray-600 hover:bg-gray-700"
              : isDisabled
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
              }`}
            disabled={isDisabled}
            onClick={() => {
              handleGetQuote();
            }}
          >
            {state.isTxSubmitting && state.currentAction === "get_quote"
              ? "Getting Quote..."
              : state.quoteOutputAmount
                ? "Proceed with Get Best Route →"
                : "Get Quote"
            }
          </button>

          <button
            type="submit"
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition ${isDisabled
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
              }`}
            disabled={isDisabled}
          >
            {state.isTxSubmitting ? "Processing..." : actionLabel}
          </button>   

          <button
            type="button"
            className="px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 transition font-medium"
            onClick={() => {
              setState(prev => ({
                ...prev,
                fromToken: null,
                toToken: null,
                amount: "",
                quoteOutputAmount: null,
                routeOutputAmount: null,
                currentAction: "idle",
                routeResponse: null,
              }));
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

export default SameChainTradePage;
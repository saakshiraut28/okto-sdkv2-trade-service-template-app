import React, { useState } from "react";
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
import HistoryModal from "../components/HistoryModal";
import { InfoIcon } from "lucide-react";
import CollapsibleCallout from "../components/CollapsibleCallout";
import StepIndicator from "../components/StepIndicatior";
import { useTradeService } from "../context/TradeServiceContext";

interface HistoryEntry {
  title: string;
  requestPayload: any;
  responsePayload: any;
}

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
  currentAction: "idle" | "get_quote" | "get_best_route" | "approval" | "swap";
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
  showChainTooltip: boolean;
}

function SameChainTradePage() {
  const { environment } = useTradeService();
  const { address, isConnected, chainId: connectedChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>(["Initializing same-chain trade flow..."]);

  const [state, setState] = React.useState<SameChainTradeState>({
    environment: environment,
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
    showChainTooltip: false,
  });

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, showChainTooltip: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleChainTooltip = () => {
    setState(prev => ({
      ...prev,
      showChainTooltip: !prev.showChainTooltip
    }));
  };

  const addToHistory = (title: string, requestPayload: any, responsePayload: any) => {
    setHistory((prev) => [
      ...prev,
      { title, requestPayload, responsePayload },
    ]);
  };

  // Get balance for from token
  const { data: balance } = useBalance({
    address: address,
    token: state.fromToken?.isNative ? undefined : state.fromToken?.address as `0x${string}`,
    chainId: connectedChainId,
    query: {
      enabled: !!address && !!state.fromToken,
    }
  });

  const areTokensSame = (fromToken, toToken) => {
    if (!fromToken || !toToken) return false;
    return fromToken.address === toToken.address && fromToken.symbol === toToken.symbol;
  };

  const showSameTokenWarning = areTokensSame(state.fromToken, state.toToken)

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

      setLogs(prev => [...prev, "✔️ Quote obtained, proceeding to get best route"]);
      addToHistory("Get Quote", quotePayload, quoteRes);

      const quoteOutputAmount = ethers.formatUnits(
        quoteRes.outputAmount,
        state.toToken.decimals
      );

      setState(prev => ({
        ...prev,
        quoteOutputAmount,
        isQuoteLoading: false,
        currentAction: "get_best_route", 
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

      setLogs(prev => [...prev, "✔️ Best route obtained, proceed to executing transaction."]);
      addToHistory("Get Best Route", quotePayload, routeRes);

      const routeOutputAmount = ethers.formatUnits(
        // @ts-ignore
        routeRes.outputAmount,
        state.toToken.decimals
      );

      // Determine next action based on route steps
      const steps = routeRes.steps || [];
      const hasApproval = steps.some((step: any) => step.metadata?.transactionType === "approval");
      const hasDex = steps.some((step: any) => step.metadata?.transactionType === "dex");

      let nextAction: "approval" | "swap" | "idle";

      if (hasApproval && hasDex) {
        nextAction = "approval";
        toast.info("Approval steps found, proceeding to approval transaction.");
        setLogs(prev => [...prev, "✔️ Approval steps found, proceeding to approval transaction."]);
      } else if (hasDex) {
        nextAction = "swap";
        toast.info("No approval steps found, proceeding directly to DEX swap transaction.");
        setLogs(prev => [...prev, "✔️ No approval steps found, proceeding directly to DEX swap transaction."]);
      } else {
        nextAction = "idle";
        toast.error("Invalid route: No executable steps");
      }

      setState(prev => ({
        ...prev,
        routeOutputAmount,
        isRouteLoading: false,
        routeResponse: routeRes,
        currentAction: nextAction,
      }));

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
  const handleApproval = async () => {
    if (!state.routeResponse || !address || !walletClient) {
      toast.error("Missing required data");
      return;
    }

    const steps = state.routeResponse.steps || [];
    const approvalStep = steps.find((s: any) => s.metadata?.transactionType === "approval");

    if (!approvalStep || !approvalStep.txnData) {
      toast.error("No approval transaction found");
      return;
    }

    try {
      setState(prev => ({ ...prev, isTxSubmitting: true }));
      toast.info("Step 1/2: Processing token approval...");

      await new Promise<void>((resolve) => {
        openRequestModal(
          `2. Token Approval Required`,
          `Step 2: Approving token spend
        📍 This transaction allows the DEX to spend your tokens. You'll need to confirm this approval in your wallet first.`,
          approvalStep.txnData,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      const approvalHash = await walletClient.sendTransaction({
        account: address,
        to: approvalStep.txnData.to,
        data: approvalStep.txnData.data,
        value: approvalStep.txnData.value ? BigInt(approvalStep.txnData.value) : undefined,
        gas: approvalStep.txnData.gasLimit ? BigInt(approvalStep.txnData.gasLimit) : undefined,
        kzg: undefined,
        chain: undefined,
      });

      toast.info(`Approval transaction submitted: ${approvalHash}`);

      const approvalReceipt = await publicClient?.waitForTransactionReceipt({
        hash: approvalHash
      });

      if (approvalReceipt?.status === 'success') {
        toast.success("Token approval confirmed");
        addToHistory("Approval Tx", approvalStep.txnData, approvalReceipt);
        setLogs(prev => [...prev, "✔️ Token approval confirmed, proceeding to DEX swap."]);

        // Small delay to ensure approval is fully processed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Automatically proceed to DEX swap after successful approval
        setState(prev => ({ ...prev, currentAction: "swap" }));
      } else {
        throw new Error("Approval transaction failed");
      }

    } catch (err) {
      console.error("Failed to complete approval transaction:", err);
      toast.error(`Approval failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setState(prev => ({ ...prev, isTxSubmitting: false }));
    }
    // Note: isTxSubmitting will be set to false in handleDex
  };

  const handleDex = async () => {
    if (!state.routeResponse || !address || !walletClient) {
      toast.error("Missing required data");
      return;
    }

    const steps = state.routeResponse.steps || [];
    const dexStep = steps.find((s: any) => s.metadata?.transactionType === "dex");

    if (!dexStep || !dexStep.txnData) {
      toast.error("No DEX transaction found");
      return;
    }

    try {
      // Only set isTxSubmitting if it's not already set (i.e., called directly, not from handleApproval)
      if (!state.isTxSubmitting) {
        setState(prev => ({ ...prev, isTxSubmitting: true }));
      }

      const hasApprovalStep = steps.some((s: any) => s.metadata?.transactionType === "approval");
      toast.info(hasApprovalStep ? "Step 2/2: Executing token swap..." : "Executing token swap...");

      await new Promise<void>((resolve) => {
        openRequestModal(
          `Execute Same Chain Swap`,
          `Executing DEX transaction
        📍 This transaction executes the actual token swap. Make sure to review and confirm the transaction in your wallet (e.g., MetaMask) to proceed.`,
          dexStep.txnData,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      const swapHash = await walletClient.sendTransaction({
        account: address,
        to: dexStep.txnData.to,
        data: dexStep.txnData.data,
        value: dexStep.txnData.value ? BigInt(dexStep.txnData.value) : undefined,
        gas: dexStep.txnData.gasLimit ? BigInt(dexStep.txnData.gasLimit) : undefined,
        kzg: undefined,
        chain: undefined,
      });

      toast.info(`Swap transaction submitted: ${swapHash}`);

      const swapReceipt = await publicClient?.waitForTransactionReceipt({
        hash: swapHash
      });

      await openResponseModal(
        `Transaction Complete`,
        `The token has been successfully swapped on the same chain. Below is the transaction receipt for your reference.`,
        swapReceipt
      );

      toast.success("Swap transaction confirmed");
      addToHistory("Execute Swap Tx", dexStep.txnData, swapReceipt);
      setState(prev => ({ ...prev, currentAction: "idle" }));
      setLogs(prev => [...prev, "✔️ Swap transaction confirmed, same chain swap completed successfully."]);

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
      console.error("Failed to complete DEX transaction:", err);
      toast.error(`Swap failed`);
      setLogs(prev => [...prev, `❌ Swap failed`]);
      setState(prev => ({
        ...prev,
        isTxSubmitting: false,
        currentAction: "idle",
      }));
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
    approval: "Execute Approval Tx",
    swap: "Execute Swap Tx",
    idle: "Execute",
    get_best_route: "Get Best Route",
    get_quote: "Getting Quote..",
  }[state.currentAction];

  return (
    <div className="my-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium mb-1">Chain
          </label>
          <div className="relative" ref={tooltipRef}>
            <button
              type="button"
              onClick={toggleChainTooltip}
              className="text-blue-500 hover:text-blue-700 focus:outline-none focus:text-blue-200 transition-colors bg-gray-700 rounded-full p-1"
              aria-label="Info"
            >
              <InfoIcon className="w-5 h-5" />
            </button>
            {state.showChainTooltip && (
              <div className="absolute right-0 top-6 z-10 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-3">
                <div className="text-sm text-gray-200">
                  <span className="text-md text-gray-200 font-normal">
                    Trade Service only works on mainnet. For more information on chains and tokens supported by Okto Trade Service; check{" "}
                    <a
                      className="text-indigo-400 hover:text-indigo-300"
                      href="https://docs.okto.tech/docs/trade-service/supported-networks-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Supported Chains and Tokens
                    </a>
                  </span>
                </div>
                <div className="absolute -top-2 right-3 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-800"></div>
              </div>
            )}
          </div>
        </div>
        <select
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-1"
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
          if (state.currentAction === "approval") {
            handleApproval();
          } else if (state.currentAction === "get_best_route") {
            handleGetBestRoute();
          } else if (state.currentAction === "swap") {
            handleDex();
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

        {showSameTokenWarning && (
          <div className="bg-yellow-900 border border-yellow-600 p-4 rounded-lg">
            <p className="text-yellow-300">
              ⚠️ Source and destination tokens are the same. Please select different tokens for same-chain trading.
            </p>
          </div>
        )}

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
              className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-1 text-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={state.toUserWalletAddress || ""}
              onChange={(e) => setState(prev => ({ ...prev, toUserWalletAddress: e.target.value }))}
            />
          </div>
        </div>

        <div className="text-sm border border-gray-400 p-3 my-3 rounded-lg bg-gray-800 text-gray-200 text-center">
          <span>Refer to the diagram give below to understand the <strong>Same Chain Swap Flow using Okto Trade Service.</strong></span>
          <img src={SameChainFlow} />
        </div>

        <CollapsibleCallout title="Understanding Get Quote & Get Best Route" variant="info" defaultOpen={false}>
          <p>
            → Using <strong>Get Quote</strong> is optional. It provides a faster API call to quickly estimate the output amount for your trade.
            <br />
            → <strong>Get Best Route</strong>, however, is mandatory for executing trades. It returns the optimal route along with all the steps required to complete the trade.
            <br />
            → Read the <a className="text-indigo-400" href="https://docsv2.okto.tech/docs/trade-service" target="_blank">Trade Service Guide</a> for more details on how to use these APIs effectively.
          </p>
        </CollapsibleCallout>

        {outputAmount && (
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-green-400 text-lg">
              Expected Output: <strong>{outputAmount} {state.toToken?.symbol}</strong>
              {state.isRouteLoading && <span className="text-yellow-400"> (calculating...)</span>}
            </p>
          </div>
        )}

        <div className="flex gap-4 justify-center flex-wrap">
          {!state.routeResponse && (
            <>
          <button
            type="button"
                className={`w-[220px] px-6 py-3 text-sm rounded-full font-medium transition ${isDisabled
                ? "bg-gray-600 cursor-not-allowed"
              : state.quoteOutputAmount || state.routeResponse
                ? "bg-gray-600 text-gray-200"
                : "bg-blue-600 hover:bg-blue-700"
              }`}
            disabled={isDisabled}
            onClick={() => handleGetQuote()}
          >
            {state.isTxSubmitting && state.currentAction === "get_quote"
              ? "Getting Quote..."
              : state.quoteOutputAmount || state.routeResponse
                ? "Proceed to Get Best Route →"
                : "Get Quote"
            }
          </button>

          <button
            type="button"
                className={`w-[220px] px-6 py-3 text-sm rounded-full font-medium transition ${isDisabled
              ? "bg-gray-600 cursor-not-allowed"
              : state.routeResponse
                ? "bg-gray-600 text-gray-200"
                : "bg-blue-600 hover:bg-blue-700"
              }`}
            disabled={isDisabled}
            onClick={() => handleGetBestRoute()}
          >
            {state.isTxSubmitting && state.currentAction === "get_best_route"
              ? "Getting Route..."
              : state.routeResponse
                ? "Get Route Done "
                : "Get Route"
            }
          </button>
            </>)}

          <button
            type="submit"
            className={`w-[220px] px-6 py-3 text-sm rounded-full font-medium transition ${!state.routeOutputAmount
              ? "bg-gray-600 cursor-not-allowed"
              : isDisabled
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
              }`}
            disabled={isDisabled}
          >
            {state.isTxSubmitting ? "Processing..." : actionLabel}
          </button>
        </div>
      </form>
      <div className="mt-6 flex justify-end gap-6 w-full ">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="text-sm text-indigo-400 hover:text-indigo-300 underline transition"
        >
          View Request/Response History
        </button>
        <button
          type="button"
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
            setLogs([]);
            setHistory([]);
            setIsHistoryOpen(false);
          }}
          className="px-5 py-2 rounded-full bg-red-700 hover:bg-red-600 text-gray-200 text-sm font-medium transition"
        >
          Clear
        </button></div>
      <HistoryModal
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
      />
      {logs.length > 0 && (<StepIndicator logs={logs} />)}

    </div>
  );
}

export default SameChainTradePage;
import React from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useBalance,
  usePublicClient,
  useWalletClient
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Import your existing components
import TokenInput from "../components/TokenInput";
import ChainSelect from "../components/ChainSelect";
import AmountInput from "../components/AmountInput";
import RequestResponseModal from "../components/RequestResponseModal";

import { CAIP_TO_NAME } from "../constants/chains";
import {
  getQuote,
  getBestRoute,
  getCallData,
  registerIntent,
} from "../api/tradeServiceClient";

// Types
interface CrossChainTradeState {
  environment: string;
  fromChain: string;
  toChain: string;
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
  amount: string;
  quoteOutputAmount: string | null;
  routeOutputAmount: string | null;
  routeResponse: any | null;
  currentAction: "idle" | "get_quote" | "accept" | "generate_call_data" | "init_bridge_txn" | "register_intent";
  isQuoteLoading: boolean;
  isRouteLoading: boolean;
  isTxSubmitting: boolean;
  modalOpen: boolean;
  modalTitle: string;
  modalSubtitle: string;
  modalPayload: any;
  isRequestModal: boolean;
  onConfirmModal?: () => void;
  permitSignature: string | null;
  permitData: unknown | null;
  callDataResponse: any | null;
}

function CrossChainTradePage() {
  const { address, isConnected, chainId: connectedChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [state, setState] = React.useState<CrossChainTradeState>({
    environment: "sandbox",
    fromChain: "",
    toChain: "",
    fromToken: null,
    toToken: null,
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
    modalPayload: null,
    isRequestModal: true,
    permitSignature: null,
    permitData: null,
    callDataResponse: null,
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

  // Set initial chains when wallet connects
  React.useEffect(() => {
    if (connectedChainId) {
      const caipChainId = `eip155:${connectedChainId}`;
      setState(prev => ({
        ...prev,
        fromChain: caipChainId,
        // Don't auto-set toChain to force user to select different chain
      }));
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
      modalPayload: payload,
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
        modalPayload: payload,
        isRequestModal: false,
        onConfirmModal: resolve,
      }));
    });
  };

  // Handle from chain change (requires wallet switch)
  const handleFromChainChange = async (newFromChain: string) => {
    const [chainType, chainIdStr] = newFromChain.split(":");
    const chainId = parseInt(chainIdStr, 10);

    if (chainType === "eip155" && chainId !== connectedChainId) {
      try {
        await switchChain({ chainId });
        setState(prev => ({
          ...prev,
          fromChain: newFromChain,
          fromToken: null,
          amount: "",
          quoteOutputAmount: null,
          routeOutputAmount: null,
          currentAction: "idle",
        }));
      } catch (error) {
        console.error("Chain switch failed:", error);
        toast.error("Failed to switch chain");
      }
    }
  };

  // Handle to chain change
  const handleToChainChange = (newToChain: string) => {
    if (newToChain === state.fromChain) {
      toast.error("Destination chain must be different from source chain");
      return;
    }

    setState(prev => ({
      ...prev,
      toChain: newToChain,
      toToken: null,
      quoteOutputAmount: null,
      routeOutputAmount: null,
      currentAction: "idle",
    }));
  };

  // Get quote and route for cross-chain
  const handleGetQuote = async () => {
    if (!address || !state.fromChain || !state.toChain || !state.fromToken || !state.toToken || !state.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    if (state.fromChain === state.toChain) {
      toast.error("Please select different chains for cross-chain trading");
      return;
    }

    try {
      setState(prev => ({ ...prev, isQuoteLoading: true, isRouteLoading: false }));

      const fromAmount = ethers.parseUnits(state.amount, state.fromToken.decimals).toString();
      const fromTokenAddress = state.fromToken.isNative ? "" : state.fromToken.address;
      const toTokenAddress = state.toToken.isNative ? "" : state.toToken.address;

      const quotePayload = {
        fromChain: state.fromChain,
        toChain: state.toChain,
        fromToken: fromTokenAddress.toLowerCase(),
        toToken: toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress: address,
        toUserWalletAddress: address,
      };

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Cross-Chain Quote Request",
          "Step 1: Getting cross-chain quote",
          quotePayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      const quoteRes = await getQuote(state.environment, quotePayload);

      await openResponseModal(
        "Cross-Chain Quote Response",
        "Step 1: Quote received",
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
        isRouteLoading: true,
      }));

      // Get best route
      await new Promise<void>((resolve) => {
        openRequestModal(
          "Cross-Chain Route Request",
          "Step 2: Finding best cross-chain route",
          quotePayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      const routeRes = await getBestRoute(state.environment, quotePayload);

      await openResponseModal(
        "Cross-Chain Route Response",
        "Step 2: Best route found",
        routeRes
      );

      const routeOutputAmount = ethers.formatUnits(
        // @ts-ignore
        routeRes.outputAmount,
        state.toToken.decimals
      );

      setState(prev => ({
        ...prev,
        routeOutputAmount,
        isRouteLoading: false,
        routeResponse: routeRes,
        currentAction: "accept",
      }));

    } catch (err) {
      console.error("Failed to get cross-chain quote/route:", err);
      toast.error("Failed to get cross-chain quote or route");
      setState(prev => ({
        ...prev,
        isQuoteLoading: false,
        isRouteLoading: false,
        quoteOutputAmount: null,
        routeOutputAmount: null,
        currentAction: "idle",
      }));
    }
  };

  // Accept cross-chain trade
  const handleAccept = async () => {
    if (!state.routeResponse || !address || !walletClient) {
      toast.error("Missing required data for accepting trade");
      return;
    }

    try {
      // Check if permit signature is required
      if (state.routeResponse.permitDataToSign) {
        const permitData = JSON.parse(state.routeResponse.permitDataToSign as string);

        const signature = await walletClient.signTypedData({
          account: address,
          ...permitData,
        });

        setState(prev => ({
          ...prev,
          currentAction: "generate_call_data",
          permitSignature: signature,
          permitData: permitData,
        }));
      } else {
        setState(prev => ({ ...prev, currentAction: "generate_call_data" }));
      }
    } catch (err) {
      console.error("Failed to sign permit:", err);
      toast.error("Failed to sign permit");
      setState(prev => ({ ...prev, currentAction: "idle" }));
    }
  };

  // Generate call data
  const handleGenerateCallData = async () => {
    if (!state.routeResponse || !address) {
      toast.error("Missing route data");
      return;
    }

    try {
      const callDataPayload = {
        routeId: state.routeResponse.routeId,
        fromToken: state.fromToken?.isNative ? "" : state.fromToken?.address,
        toToken: state.toToken?.isNative ? "" : state.toToken?.address,
        fromChain: state.fromChain,
        toChain: state.toChain,
        fromAmount: ethers.parseUnits(state.amount, state.fromToken?.decimals).toString(),
        toTokenAmountMinimum: ethers
          .parseUnits(
            state.routeOutputAmount ?? state.routeResponse.outputAmount ?? "0",
            state.toToken?.decimals
          )
          .toString(),
        slippage: "0.5",
        fromUserWalletAddress: address,
        toUserWalletAddress: address,
        permitSignature: state.permitSignature ?? undefined,
        permitData: state.permitData ? JSON.stringify(state.permitData) : undefined,
      };

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Generate Call Data Request",
          "Step 3: Generating transaction call data",
          callDataPayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });
      // @ts-ignore
      const callDataRes = await getCallData(state.environment, callDataPayload);
      setState(prev => ({ ...prev, callDataResponse: callDataRes }));

      await openResponseModal(
        "Generate Call Data Response",
        "Step 3: Call data generated",
        callDataRes
      );

      const nextBridgeStep = callDataRes?.steps?.find(
        (s) =>
          s.metadata?.serviceType === "bridge" &&
          (s.metadata.transactionType === "init" || !s.metadata.transactionType)
      );

      if (!nextBridgeStep) {
        toast.error("No bridge-related step found");
        return;
      }

      const { transactionType } = nextBridgeStep?.metadata ?? {};

      if (transactionType === "init") {
        setState(prev => ({ ...prev, currentAction: "init_bridge_txn" }));
      } else if (!transactionType) {
        setState(prev => ({ ...prev, currentAction: "register_intent" }));
      } else {
        toast.error("Unknown bridge transaction type");
        setState(prev => ({ ...prev, currentAction: "idle" }));
      }

    } catch (err) {
      console.error("Failed to generate call data:", err);
      toast.error("Failed to generate call data");
    }
  };

  // Initialize bridge transaction
  const handleInitBridgeTransaction = async () => {
    const responseToUse = state.callDataResponse;

    if (!responseToUse || !address || !walletClient) {
      toast.error("Missing required data");
      return;
    }

    const step = responseToUse.steps.find((s: any) =>
      s.metadata?.transactionType === "init" &&
      s.metadata?.protocol === "Okto-ULL" &&
      s.metadata?.serviceType === "bridge"
    );

    if (!step || !step.txnData) {
      toast.error("No bridge transaction found");
      return;
    }

    try {
      setState((prev) => ({ ...prev, isTxSubmitting: true }));

      const txRequest = step.txnData;

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Bridge Transaction Request",
          "Step 4: Initiating cross-chain bridge",
          txRequest,
          async () => {
            setState((prev) => ({ ...prev, modalOpen: false }));
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
      });

      toast.info(`Bridge transaction submitted: ${hash}`);

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });

      await openResponseModal(
        "Bridge Transaction Complete",
        "Step 4: Bridge transaction confirmed",
        receipt
      );

      toast.success("Bridge transaction confirmed");

      setState((prev) => ({ ...prev, currentAction: "idle" }));
    } catch (err) {
      console.error("Failed to send bridge transaction:", err);
      toast.error("Failed to complete bridge transaction");
    } finally {
      setState((prev) => ({ ...prev, isTxSubmitting: false }));
    }
  };

  // Register intent (final step)
  const handleRegisterIntent = async () => {
    const responseToUse = state.callDataResponse
    console.log("CALLDATA RES: ", responseToUse)
    if (!responseToUse || !address) {
      toast.error("Missing route data for intent registration");
      return;
    }

    try {
      setState(prev => ({ ...prev, isTxSubmitting: true }));

      const orderTypedDataRaw = state.callDataResponse.orderTypedData;

      if (!orderTypedDataRaw) {
        toast.error("Missing order typed data.");
        setState(prev => ({ ...prev, currentAction: "idle", isTxSubmitting: false }));
        return;
      }

      const parsedData = typeof orderTypedDataRaw === "string"
        ? JSON.parse(orderTypedDataRaw)
        : orderTypedDataRaw;

      const params = [address, JSON.stringify(parsedData)];

      let signature;
      try {
        signature = await walletClient?.transport.request({
          method: 'eth_signTypedData_v4',
          params,
        });
      } catch (err) {
        toast.error("Signing failed");
        console.error(err);
        return;
      }

      const intentStep = state.callDataResponse.steps?.find(
        (s: any) =>
          s.type === "intent" &&
          s.metadata?.serviceType === "bridge" &&
          s.metadata?.protocol === "Okto-ULL"
      );

      const intentCalldata = intentStep?.intentCalldata;

      if (!intentCalldata) {
        toast.error("Missing call data bytes.");
        return;
      }

      const registerPayload = {
        orderBytes: intentCalldata,
        orderBytesSignature: signature,
        caipId: state.fromChain,
      };

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Register Intent Request",
          "Step 5: Registering cross-chain intent",
          registerPayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      // @ts-ignore
      const intentRes = await registerIntent(state.environment, registerPayload);

      await openResponseModal(
        "Register Intent Response",
        "Step 5: Cross-chain order registered",
        intentRes
      );

      toast.success("Cross-chain trade completed successfully!");

      // Reset form after successful trade
      setState(prev => ({
        ...prev,
        fromToken: null,
        toToken: null,
        amount: "",
        quoteOutputAmount: null,
        routeOutputAmount: null,
        routeResponse: null,
        currentAction: "idle",
        permitSignature: null,
        permitData: null,
        callDataResponse: null,
      }));

    } catch (err) {
      console.error("Failed to register intent:", err);
      toast.error("Failed to register intent");
      setState(prev => ({ ...prev, currentAction: "idle", isTxSubmitting: false }));
    }
  };


  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Cross-Chain Trading</h1>
          <p className="mb-6 text-gray-300">Connect your wallet to start cross-chain trading</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const isDisabled =
    state.isQuoteLoading ||
    state.isRouteLoading ||
    !state.fromChain ||
    !state.toChain ||
    !state.fromToken ||
    !state.toToken ||
    !state.amount ||
    (balance && parseFloat(state.amount) > parseFloat(balance.formatted)) ||
    state.isTxSubmitting ||
    state.fromChain === state.toChain;

  const outputAmount = state.routeOutputAmount || state.quoteOutputAmount;

  const actionLabel = {
    accept: "Accept Cross-Chain Trade",
    generate_call_data: "Generate Call Data",
    init_bridge_txn: "Initialize Bridge",
    register_intent: "Complete Trade",
    idle: "Get Quote",
    get_quote: "Getting Quote...",
  }[state.currentAction];

  return (
   <div className="my-4">
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Environment</label>
          <select
            className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
            value={state.environment}
            onChange={(e) => setState(prev => ({ ...prev, environment: e.target.value }))}
          >
            <option value="staging">Staging</option>
            <option value="sandbox">Sandbox</option>
            <option value="production">Production</option>
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
          payload={state.modalPayload}
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
            if (state.currentAction === "accept") {
              handleAccept();
            } else if (state.currentAction === "generate_call_data") {
              handleGenerateCallData();
            } else if (state.currentAction === "init_bridge_txn") {
              handleInitBridgeTransaction();
            } else if (state.currentAction === "register_intent") {
              handleRegisterIntent();
            } else {
              handleGetQuote();
            }
          }}
          className="space-y-6"
        >
          <ChainSelect
            label="From Chain (Source)"
            value={state.fromChain}
            disabled={false}
            allowedChains={Object.keys(CAIP_TO_NAME).filter(id => id.startsWith("eip155"))}
            onChange={handleFromChainChange}
          />

          <TokenInput
            chainId={state.fromChain}
            label="From Token"
            disabled={!state.fromChain}
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

          <ChainSelect
            label="To Chain (Destination)"
            value={state.toChain}
            disabled={false}
            allowedChains={Object.keys(CAIP_TO_NAME)
              .filter(id => id.startsWith("eip155"))
              .filter(id => id !== state.fromChain)
            }
            onChange={handleToChainChange}
          />

          <TokenInput
            chainId={state.toChain}
            label="To Token"
            disabled={!state.toChain}
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

          {state.fromChain === state.toChain && state.fromChain && state.toChain && (
            <div className="bg-yellow-900 border border-yellow-600 p-4 rounded-lg">
              <p className="text-yellow-300">
                ⚠️ Source and destination chains are the same. Please select different chains for cross-chain trading.
              </p>
            </div>
          )}

          {outputAmount && state.fromChain !== state.toChain && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-green-400 text-lg">
                Expected Output: <strong>{outputAmount} {state.toToken?.symbol}</strong>
                {state.isRouteLoading && <span className="text-yellow-400"> (calculating...)</span>}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Cross-chain trade from {CAIP_TO_NAME[state.fromChain]} to {CAIP_TO_NAME[state.toChain]}
              </p>
            </div>
          )}

          <div className="flex gap-4">
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
                  permitSignature: null,
                  permitData: null,
                  callDataResponse: null,
                }));
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
  );
}

export default CrossChainTradePage;
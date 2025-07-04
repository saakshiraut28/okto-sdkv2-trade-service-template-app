import React, { useState } from "react";
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
import CrossChainFlow from "../assets/cross-chain-swaps-fst-flow.png";
import CrossChainFlowNfst from "../assets/cross-chain-swaps-nfst-flow.png";

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
  getOrderDetails,
} from "../api/tradeServiceClient";
import HistoryModal from "../components/HistoryModal";
import CollapsibleCallout from "../components/CollapsibleCallout";
import StepIndicator from "../components/StepIndicatior";
import OrderStatusPolling from "../components/OrderStatusPolling";
import { useTradeService } from "../context/TradeServiceContext";
import { extractOrderIdFromReceipt } from "../utils/extractOrderId";

// Types
interface HistoryEntry {
  title: string;
  requestPayload: any;
  responsePayload: any;
}

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
  toUserWalletAddress: string | null;
  quoteOutputAmount: string | null;
  routeOutputAmount: string | null;
  routeResponse: any | null;
  currentAction: "idle" | "get_quote" | "accept" | "generate_call_data" | "init_bridge_txn" | "register_intent" | "get_best_route" | "approval" | "get_order_details";
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
  permitSignature: string | null;
  permitData: unknown | null;
  callDataResponse: any | null;
  registerIntentReq: any | null;
  registerIntentResponse: any | null;
  orderId?: `0x${string}` | string;
}

function CrossChainTradePage() {
  const { environment } = useTradeService();
  const { address, isConnected, chainId: connectedChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>(["Initializing cross-chain trade flow..."]);
  const fstSupportedTokens = ["USDC"];
  const [state, setState] = React.useState<CrossChainTradeState>({
    environment: environment,
    fromChain: "",
    toChain: "",
    fromToken: null,
    toToken: null,
    amount: "",
    toUserWalletAddress: "",
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
    permitSignature: null,
    permitData: null,
    callDataResponse: null,
    registerIntentReq: null,
    registerIntentResponse: null,
    orderId: "",
  });

  const isFstFlow = state.fromToken?.symbol === undefined || fstSupportedTokens.includes(state.fromToken?.symbol);

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

  // Get quote for cross-chain
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
      setState(prev => ({ ...prev, isQuoteLoading: true }));

      const fromAmount = ethers.parseUnits(state.amount, state.fromToken.decimals).toString();
      const fromTokenAddress = state.fromToken.isNative ? "" : state.fromToken.address;
      const toTokenAddress = state.toToken.isNative ? "" : state.toToken.address;
      const toUserWalletAddress = state.toUserWalletAddress || address;

      const quotePayload = {
        fromChain: state.fromChain,
        toChain: state.toChain,
        fromToken: fromTokenAddress.toLowerCase(),
        toToken: toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress: address,
        toUserWalletAddress: toUserWalletAddress,
      };

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Get Quote Request",
          `Get Quote Request
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
        "Get Quote Response",
        `Get Quote
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

      return { quoteRes, quotePayload };

    } catch (err) {
      console.error("Failed to get cross-chain quote:", err);
      toast.error("Failed to get cross-chain quote");
      setState(prev => ({
        ...prev,
        isQuoteLoading: false,
        quoteOutputAmount: null,
        currentAction: "idle",
      }));
      throw err;
    }
  };
  // Get the Best Route for trade
  const handleGetBestRoute = async () => {
    console.log("calling getBestRoute");
    if (!address || !state.fromChain || !state.toChain || !state.fromToken || !state.toToken || !state.amount) {
      toast.error("Please fill all required fields");
      return;
    }

    if (state.fromChain === state.toChain) {
      toast.error("Please select different chains for cross-chain trading");
      return;
    }

    try {
      setState(prev => ({ ...prev, isRouteLoading: true }));

      const fromAmount = ethers.parseUnits(state.amount, state.fromToken.decimals).toString();
      const fromTokenAddress = state.fromToken.isNative ? "" : state.fromToken.address;
      const toTokenAddress = state.toToken.isNative ? "" : state.toToken.address;
      const toUserWalletAddress = state.toUserWalletAddress || address;

      const quotePayload = {
        fromChain: state.fromChain,
        toChain: state.toChain,
        fromToken: fromTokenAddress.toLowerCase(),
        toToken: toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress: address,
        toUserWalletAddress: toUserWalletAddress,
      };

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Get Best Route Request",
          `Get Best Route Request
        📍 This response provides the most optimized route for your swap, along with the exact steps required to execute the trade across the involved chains and protocols.`,
          quotePayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      const routeRes = await getBestRoute(state.environment, quotePayload);

      await openRequestResponseModal(
        "Get Best Route Response",
        `Get Best Route
        📍 This response provides the most optimized route for your swap, along with the exact steps required to execute the trade across the involved chains and protocols.`,
        quotePayload,
        routeRes
      );

      setLogs(prev => [...prev, "✔️ Best route obtained, proceed to sign permit."]);
      addToHistory("Get Best Route", quotePayload, routeRes);

      const routeOutputAmount = ethers.formatUnits(
        // @ts-ignore
        routeRes.outputAmount,
        state.toToken.decimals
      );

      console.log("set current action state to accept");

      setState(prev => ({
        ...prev,
        routeOutputAmount,
        isRouteLoading: false,
        routeResponse: routeRes,
        currentAction: "accept",
      }));

      return routeRes;

    } catch (err) {
      console.error("Failed to get best route:", err);
      toast.error("Failed to get best route");
      setState(prev => ({
        ...prev,
        isRouteLoading: false,
        routeOutputAmount: null,
        currentAction: "idle",
      }));
      throw err;
    }
  };

  // Accept cross-chain trade
  const handleAccept = async () => {
    console.log("Accept called ")
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

        console.log("After Permit signature set the current Action state to generate_call_data");
        toast.info("Permit signature obtained, proceeding to generate call data");
        setLogs(prev => [...prev, "✔️ Permit signature obtained, proceeding to generate call data"]);
        setState(prev => ({
          ...prev,
          currentAction: "generate_call_data",
          permitSignature: signature,
          permitData: permitData,
        }));
      } else {
        toast.info("No permit signature required, proceeding to generate call data");
        setLogs(prev => [...prev, "✔️ No permit signature required, proceeding to generate call data"]);
        console.log("without Permit signature set the current Action state to generate_call_data");
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
    console.log("Generate Call Data called");
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
          `Generating transaction call data
        📍 This generates the call data for trade.`,
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

      await openRequestResponseModal(
        "Generate Call Data Response",
        `Generating the Call data response
        📍 This response provides generated call data for cross chain trade.`,
        callDataPayload,
        callDataRes
      );

      setLogs(prev => [...prev, "✔️ Call data generated, proceeding to approval if required"]);
      addToHistory("Generate Call Data", callDataPayload, callDataRes);

      const approvalStep = callDataRes?.steps?.find(
        (s) => s.metadata?.transactionType === "approval"
      );

      if (approvalStep) {
        toast.info("Approval step found, proceeding to approval");
        console.log("Approval step found, setting current action to approval");
        setLogs(prev => [...prev, "✔️ Approval step found, proceeding to approval"]);
        setState(prev => ({ ...prev, currentAction: "approval" }));
        return;
      } else {
        toast.info("No approval step found, proceeding to next step");
      }

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
        console.log("after call data if txn type is 'init' set current action state to init_bridge_txn");
        setLogs(prev => [...prev, "✔️ Approval not needed, proceeding to initialize bridge transaction"]);
        setState(prev => ({ ...prev, currentAction: "init_bridge_txn" }));
      } else if (!transactionType) {
        console.log("after call data if txn type is not available set current action state to register_intent");
        setLogs(prev => [...prev, "✔️ Approval not needed, proceeding to register intent"]);
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

  const handleApproval = async () => {
    console.log("Approval called");
    if (!state.callDataResponse || !address || !walletClient) {
      toast.error("Missing required data for approval");
      return;
    }

    const approvalStep = state.callDataResponse.steps?.find(
      (s) => s.metadata?.transactionType === "approval"
    );

    if (!approvalStep || !approvalStep.txnData) {
      toast.error("No approval transaction found");
      return;
    }

    try {
      setState(prev => ({ ...prev, isTxSubmitting: true }));

      const txRequest = approvalStep.txnData;

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Approval Transaction",
          `Approving token spend
      📍 This approves the bridge contract to spend your tokens.`,
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

      toast.info(`Approval transaction submitted: ${hash}`);

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });

      await openResponseModal(
        "Approval Transaction Complete",
        "Token approval confirmed",
        receipt
      );

      addToHistory("Approval Transaction", txRequest, receipt);

      toast.success("Approval transaction confirmed");

      // Determine next step after approval
      const remainingSteps = state.callDataResponse.steps.filter(
        (s) => s.metadata?.transactionType !== "approval"
      );

      if (remainingSteps.length !== 1) {
        toast.error("Invalid remaining steps after approval");
        setState(prev => ({ ...prev, currentAction: "idle" }));
        return;
      }

      const nextStep = remainingSteps[0];
      const metaData = nextStep.metadata;

      if (!metaData) {
        toast.error("Remaining step does not have metadata");
        setState(prev => ({ ...prev, currentAction: "idle" }));
        return;
      }

      if (metaData.serviceType === "bridge") {
        if (metaData.transactionType === "init") {
          console.log("After approval, moving to init_bridge_txn");
          setLogs(prev => [...prev, "✔️ Approval transaction confirmed, proceeding to execute init txn"]);
          setState(prev => ({ ...prev, currentAction: "init_bridge_txn" }));
        } else if (!metaData.transactionType) {
          console.log("After approval, moving to register_intent");
          setLogs(prev => [...prev, "✔️ Approval transaction confirmed, proceeding to execute sign order data"]);
          setState(prev => ({ ...prev, currentAction: "register_intent" }));
        } else {
          toast.error("Unknown transaction type after approval");
          setState(prev => ({ ...prev, currentAction: "idle" }));
        }
      } else {
        toast.error("Unknown service type after approval");
        setState(prev => ({ ...prev, currentAction: "idle" }));
      }

    } catch (err) {
      console.error("Failed to send approval transaction:", err);
      toast.error("Failed to complete approval transaction");
    } finally {
      setState(prev => ({ ...prev, isTxSubmitting: false }));
    }
  };

  // Initialize bridge transaction
  const handleInitBridgeTransaction = async () => {
    console.log("Init Bridge Transaction called");
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
          "Calling Bridge Transaction",
          `Generating transaction call data
        📍 This generates the call data for bridge transaction.`,
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

      toast.info(`Bridge transaction submitted: ${hash}`);

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });

      await openResponseModal(
        "Bridge Transaction Complete",
        "Save the txn receipt",
        receipt
      );

      setLogs(prev => [...prev, "✔️ Bridge transaction confirmed."]);
      addToHistory("Bridge Transaction", txRequest, receipt);

      console.log("Extract the order id from the receipt");
      const orderId = extractOrderIdFromReceipt(receipt);
      if (!orderId) {
        toast.error("Failed to extract order ID from receipt");
        setState((prev) => ({ ...prev, currentAction: "idle" }));
        return;
      }
      setState((prev) => ({ ...prev, orderId: orderId }));
      console.log("Order ID extracted: ", orderId);
      setLogs(prev => [...prev, "✔️ Order Id extracted, proceeding with get order details."]);

      console.log("End of the flow init_bridge_txn flow");
      toast.success("Bridge transaction confirmed");
      setState((prev) => ({ ...prev, currentAction: "get_order_details" }));
    } catch (err) {
      console.error("Failed to send bridge transaction:", err);
      toast.error("Failed to complete bridge transaction");
    } finally {
      setState((prev) => ({ ...prev, isTxSubmitting: false }));
    }
  };

  // Register intent (final step)
  const handleRegisterIntent = async () => {
    console.log("Register Intent called");
    const responseToUse = state.callDataResponse;
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
        setLogs(prev => [...prev, "✔️ Order signature obtained, proceeding to register intent"]);
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
      setState(prev => ({ ...prev, registerIntentReq: registerPayload }));

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Register Intent Request",
          "Registering cross-chain intent",
          registerPayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      // @ts-ignore
      const intentRes = await registerIntent(state.environment, registerPayload);
      setState(prev => ({ ...prev, registerIntentResponse: intentRes }));

      await openResponseModal(
        "Register Intent Response",
        "Cross-chain order registered",
        intentRes
      );
      addToHistory("Register Intent", registerPayload, intentRes);
      console.log("Register Intent Response: ", intentRes);
      setState(prev => ({ ...prev, orderId: intentRes }));
      setLogs(prev => [...prev, "✔️ Cross-chain order registered successfully, proceeding to get order details"]);
      setState(prev => ({ ...prev, currentAction: "get_order_details", isTxSubmitting: false }));
    } catch (err) {
      console.error("Failed to register intent:", err);
      toast.error("Failed to register intent");
      setState(prev => ({ ...prev, currentAction: "idle", isTxSubmitting: false }));
    }
  };

  const handleGetOrderDetails = async (orderId: string) => {
    console.log("Get Order Details called with orderId:", orderId);

    if (!orderId || !state.fromChain) {
      toast.error("Missing orderId or chain information for fetching order details");
      return;
    }

    const orderDetailsPayload = {
      orderId,
      caipId: state.fromChain,
    };

    try {
      console.log("Order Details Payload:", orderDetailsPayload);

      await new Promise<void>((resolve) => {
        openRequestModal(
          "Get Order Details Request",
          "Get Order Details",
          orderDetailsPayload,
          async () => {
            setState(prev => ({ ...prev, modalOpen: false }));
            resolve();
          }
        );
      });

      // @ts-ignore
      const orderDetailsRes = await getOrderDetails(state.environment, orderDetailsPayload);
      console.log("Get Order Details Response:", orderDetailsRes);

      addToHistory("Get Order Details", orderDetailsPayload, orderDetailsRes);

      await openRequestResponseModal(
        "Get Order Details Response",
        "Order details retrieved",
        orderDetailsPayload,
        orderDetailsRes
      );

      toast.success("Order details retrieved successfully!");
      setLogs(prev => [...prev, "✔️ Order details retrieved successfully!"]);
      setState(prev => ({
        ...prev,
        currentAction: "idle",
        isTxSubmitting: false,
      }));

    } catch (err) {
      console.error("Failed to get order details:", err);
      toast.error("Failed to get order details");
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
    accept: "Sign Permit Data",
    approval: "Sign & Execute Approve Tx",
    generate_call_data: "Get Call Data",
    init_bridge_txn: "Sign & Execute Init Txn",
    register_intent: "Register Intent",
    get_best_route: "Get Best Route",
    idle: "Sign Permit Data",
    get_quote: "Get Quote",
    get_order_details: "Get Order Details",
  }[state.currentAction];

  return (
    <div className="my-4">

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
          if (state.currentAction === "accept") {
            handleAccept();
          } else if (state.currentAction === "approval") {
            handleApproval();
          } else if (state.currentAction === "generate_call_data") {
            handleGenerateCallData();
          } else if (state.currentAction === "init_bridge_txn") {
            handleInitBridgeTransaction();
          } else if (state.currentAction === "register_intent") {
            handleRegisterIntent();
          } else if (state.currentAction === "get_quote") {
            handleGetQuote();
          } else if (state.currentAction === "get_best_route") {
            handleGetBestRoute();
          } else if (state.currentAction === "get_order_details") {
            handleGetOrderDetails(state.orderId);
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
              placeholder="0x... or leave blank to use your current connect wallet"
              className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-1 text-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={state.toUserWalletAddress || ""}
              onChange={(e) => setState(prev => ({ ...prev, toUserWalletAddress: e.target.value }))}
            />
          </div>
        </div>

        <div className="text-sm border border-gray-400 p-3 my-3 rounded-lg bg-gray-800 text-gray-200 text-center mx-auto">
          <span>
            Refer to the diagram below to understand the{" "}
            <strong>Cross Chain Swap Flow using Okto Trade Service.</strong>
          </span>

          {isFstFlow ? (
            <img
              src={CrossChainFlow}
              alt="Cross Chain FST Flow"
              className="mt-3 mr-2 mx-auto max-w-[900px] w-auto h-auto"
            />
          ) : (
            <img
              src={CrossChainFlowNfst}
              alt="Cross Chain NFST Flow"
              className="mt-3 mx-auto max-w-[900px] w-auto h-auto"
            />
          )}
        </div>

        <CollapsibleCallout title="Understanding Get Quote & Get Best Route" variant="info" defaultOpen={false}>
          <p>
            → Using <strong>Get Quote</strong> is optional. It provides a faster API call to quickly estimate the output amount for your trade.
            <br />
            → <strong>Get Best Route</strong>, however, is mandatory for executing trades. It returns the optimal route along with all the steps required to complete the trade.
            <br />
            → Read the <a className="text-indigo-400" href="https://docs.okto.tech/docs/trade-service" target="_blank">Trade Service Guide</a> for more details on how to use these APIs effectively.
          </p>
        </CollapsibleCallout>

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

        <div className="flex gap-4 justify-center flex-wrap">
          {!state.routeResponse && (
            <>
              {!state.quoteOutputAmount && (
                <button
                  type="button"
                  className={`w-[220px] px-6 py-3 text-sm rounded-full font-medium transition ${state.quoteOutputAmount || state.routeOutputAmount
                    ? "bg-gray-600 cursor-not-allowed"
                    : isDisabled
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  disabled={isDisabled}
                  onClick={handleGetQuote}
                >
                  {state.isTxSubmitting && state.currentAction === "get_quote"
                    ? "Getting Quote..."
                    : state.quoteOutputAmount || state.routeOutputAmount
                      ? "Proceed with Get Best Route →"
                      : "Get Quote"
                  }
                </button>
              )}

              <button
                type="button"
                className={`w-[220px] px-6 py-3 text-sm rounded-full font-medium transition ${state.routeOutputAmount
                  ? "bg-gray-600 cursor-not-allowed"
                  : isDisabled
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                  }`}
                disabled={isDisabled}
                onClick={handleGetBestRoute}
              >
                {state.isTxSubmitting && state.currentAction === "get_best_route"
                  ? "Getting Route Info..."
                  : state.routeOutputAmount
                    ? "Proceed with Sign Permit Data →"
                    : "Get Best Route"
                }
              </button>
            </>
          )}

          {state.routeResponse && (
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
          )}

        </div>
      </form>

      <OrderStatusPolling
        orderId={state.orderId}
        fromChain={state.fromChain}
        environment={state.environment}
        isVisible={!!state.orderId}
      />

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
              fromChain: "",
              toChain: "",
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
        </button>
      </div>
      <HistoryModal
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
      />
      {logs.length > 0 && (<StepIndicator logs={logs} />)}
    </div>
  );
}

export default CrossChainTradePage;

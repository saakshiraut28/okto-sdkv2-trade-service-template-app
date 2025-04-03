import { Component } from "react";
import {
  Link,
  NavigateFunction,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { toast } from "react-toastify";
import { ethers } from "ethers";

// custom components
import TokenInput from "../components/TokenInput";
import WalletInfoCard from "../components/WalletInfoCard";
import ChainSelect from "../components/ChainSelect";
import AmountInput from "../components/AmountInput";

import { WalletContext } from "../context/WalletContext";
import { CHAIN_ID_TO_NAME } from "../constants/chains";
import styles from "../styles/TradePageStyles";
import { TokenInfo } from "../utils/chainHelpers";

import {
  getQuote,
  getBestRoute,
  getCallData,
  registerIntent,
} from "../api/tradeService";
import {
  GetBestRouteRequest,
  GetQuoteRequest,
  GetBestRouteResponse,
  GetCallDataResponse,
} from "../types/api/tradeService";

import type { Eip1193Provider } from "ethers";

// extend window type globally
declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

interface TradePageProps {
  navigate: NavigateFunction;
}

interface TradePageState {
  switchingChain: boolean;
  isTxSubmitting: boolean;
  isQuoteLoading: boolean;
  isRouteLoading: boolean;
  currentAction:
    | "idle"
    | "get_quote"
    | "accept"
    | "approve"
    | "swap"
    | "generate_call_data"
    | "init_bridge_txn"
    | "register_intent";
  fromChain: string;
  toChain: string;
  fromToken: TokenInfo | null;
  toToken: TokenInfo | null;
  amount: string;
  balance: string | null;
  quoteOutputAmount: string | null;
  routeOutputAmount: string | null;
  routeResponse: GetBestRouteResponse | null;
  permitSignature: string | null;
  permitData: unknown | null;
  callDataResponse: GetCallDataResponse | null;
}

class TradePage extends Component<TradePageProps, TradePageState> {
  static contextType = WalletContext;
  declare context: React.ContextType<typeof WalletContext>;
  private prevContextChainId: number | null = null;
  private prevWalletAddress: string | null = null;

  constructor(props: TradePageProps) {
    super(props);
    this.state = {
      fromChain: "",
      toChain: "",
      switchingChain: false,
      fromToken: null,
      toToken: null,
      amount: "",
      balance: null,
      quoteOutputAmount: null,
      routeOutputAmount: null,
      isQuoteLoading: false,
      isRouteLoading: false,
      currentAction: "idle",
      routeResponse: null,
      isTxSubmitting: false,
      permitSignature: null,
      permitData: null,
      callDataResponse: null,
    };
  }

  componentDidMount(): void {
    const { chainId } = this.context;
    const caipChainId = chainId ? `eip155:${chainId}` : "";

    this.setState({
      fromChain: caipChainId,
      toChain: caipChainId, // keep this just for initial default
    });

    this.prevContextChainId = chainId;
  }

  componentDidUpdate(_: unknown, prevState: TradePageState): void {
    const currentContextChainId = this.context.chainId;

    if (
      currentContextChainId &&
      currentContextChainId !== this.prevContextChainId
    ) {
      const caip = `eip155:${currentContextChainId}`;
      this.setState({ fromChain: caip });
      this.prevContextChainId = currentContextChainId;
    }

    if (
      prevState.fromToken !== this.state.fromToken ||
      prevState.fromChain !== this.state.fromChain ||
      this.context.walletAddress !== this.prevWalletAddress
    ) {
      if (this.state.fromToken) this.fetchBalance();
      this.prevWalletAddress = this.context.walletAddress;
    }
  }

  renderChainOptions = () => {
    return Object.entries(CHAIN_ID_TO_NAME).map(([id, name]) => (
      <option key={id} value={`eip155:${id}`}>
        {name}
      </option>
    ));
  };

  switchChain = async (caipChainId: string) => {
    const chainIdHex = `0x${parseInt(caipChainId.split(":")[1], 10).toString(
      16
    )}`;

    try {
      this.setState({ switchingChain: true });
      await window.ethereum?.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });

      toast.success("Network switched successfully");
    } catch (err) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof (err as { code: unknown }).code === "number"
      ) {
        const errorCode = (err as { code: number }).code;
        if (errorCode === 4902) {
          toast.error("Chain not found in MetaMask");
        } else {
          toast.error("Failed to switch network");
        }
      } else {
        console.error("Unexpected error during switchChain:", err);
        toast.error("Unexpected error while switching network");
      }
    } finally {
      this.setState({ switchingChain: false });
    }
  };

  resetTradeState = () => {
    this.setState({
      quoteOutputAmount: null,
      routeOutputAmount: null,
      isQuoteLoading: false,
      isRouteLoading: false,
      currentAction: "idle",
      routeResponse: null,
    });
  };

  handleAmountChange = (input: string) => {
    const { fromToken } = this.state;
    if (!fromToken) return;

    try {
      const parsed = parseFloat(input);
      if (isNaN(parsed)) return;

      const amountInLowestDenom = BigInt(
        Math.floor(parsed * Math.pow(10, fromToken.decimals))
      ).toString();

      this.setState({ amount: amountInLowestDenom });
    } catch (err) {
      console.error("Failed to parse amount", err);
    }
  };

  fetchBalance = async () => {
    const { fromChain, fromToken } = this.state;
    const { walletAddress } = this.context;
    if (!walletAddress || !fromChain || !fromToken || !window.ethereum) {
      toast.error("Missing required data for fetching balance");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      if (fromToken.isNative) {
        const bal = await provider.getBalance(walletAddress);
        const formatted = ethers.formatUnits(bal, fromToken.decimals);
        this.setState({ balance: formatted });
      } else {
        const tokenContract = new ethers.Contract(
          fromToken.address,
          ["function balanceOf(address owner) view returns (uint256)"],
          provider
        );
        const bal = await tokenContract.balanceOf(walletAddress);
        const formatted = ethers.formatUnits(bal, fromToken.decimals);
        this.setState({ balance: formatted });
      }
    } catch (err) {
      console.error("Failed to fetch balance", err);
      this.setState({ balance: null });
    }
  };

  handleGetQuote = async () => {
    const { walletAddress } = this.context;
    const { fromChain, toChain, fromToken, toToken, amount } = this.state;

    if (!fromChain || !toChain || !fromToken || !toToken || !amount) {
      console.warn("Missing required fields");
      return;
    }

    try {
      const fromAmount = ethers
        .parseUnits(amount, fromToken.decimals)
        .toString();

      // Send empty string if native token
      const fromTokenAddress = fromToken.isNative ? "" : fromToken.address;
      const toTokenAddress = toToken.isNative ? "" : toToken.address;

      const getQuotePayload: GetQuoteRequest = {
        fromChain,
        toChain,
        fromToken: fromTokenAddress.toLowerCase(),
        toToken: toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress: walletAddress || undefined,
        toUserWalletAddress: walletAddress || undefined,
      };

      this.setState({
        isQuoteLoading: true,
        isRouteLoading: false,
        quoteOutputAmount: null,
        routeOutputAmount: null,
      });

      // Step 1: Call getQuote
      const quoteRes = await getQuote(getQuotePayload);
      console.dir({ quoteRes });
      const quoteOutputAmount = ethers.formatUnits(
        quoteRes.outputAmount,
        toToken.decimals
      );

      this.setState({
        quoteOutputAmount,
        isQuoteLoading: false,
        isRouteLoading: true,
      });

      if (!walletAddress) {
        toast.error("Please connect wallet to proceed");
        return;
      }

      const getBestRoutePayload: GetBestRouteRequest = {
        fromChain,
        toChain,
        fromToken: fromTokenAddress.toLowerCase(),
        toToken: toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress: walletAddress,
        toUserWalletAddress: walletAddress,
      };

      // Step 2: Call getBestRoute
      const routeRes = await getBestRoute(getBestRoutePayload);
      console.dir({ routeRes });
      if (!routeRes.outputAmount) {
        toast.error("Failed to get route output amount");
        return;
      }
      const routeOutputAmount = ethers.formatUnits(
        routeRes.outputAmount,
        toToken.decimals
      );

      if (!routeOutputAmount) {
        toast.error("Failed to get route output amount");
        return;
      }

      this.setState({
        routeOutputAmount,
        isRouteLoading: false,
        currentAction: "accept",
        routeResponse: routeRes,
      });
    } catch (err) {
      console.error("Failed to get quote/route:", err);
      toast.error("Failed to get quote or route");
      this.setState({
        isQuoteLoading: false,
        isRouteLoading: false,
        quoteOutputAmount: null,
        routeOutputAmount: null,
        currentAction: "idle",
      });
    }
  };

  handleAccept = async () => {
    const { fromChain, toChain, routeOutputAmount, routeResponse } = this.state;
    const { walletAddress } = this.context;

    if (
      !routeOutputAmount ||
      !fromChain ||
      !toChain ||
      !routeResponse ||
      !window.ethereum
    ) {
      toast.error("Missing required data for accepting trade");
      return;
    }

    const fromChainId = fromChain.split(":")[1];
    const toChainId = toChain.split(":")[1];

    const isCrossChain = fromChainId !== toChainId;

    if (isCrossChain && routeResponse.permitDataToSign && walletAddress) {
      try {
        const permitData = JSON.parse(routeResponse.permitDataToSign as string);

        const signature = await window.ethereum.request({
          method: "eth_signTypedData_v4",
          params: [walletAddress, JSON.stringify(permitData)],
        });

        this.setState({
          currentAction: "generate_call_data",
          permitSignature: signature,
          permitData: permitData,
        });
      } catch (err) {
        console.error("Permit signature failed:", err);
        toast.error("Failed to sign permit");
        this.setState({ currentAction: "idle" });
      }
    } else if (isCrossChain) {
      this.setState({ currentAction: "generate_call_data" });
    } else {
      // Same chain → check for approval
      const steps = routeResponse.steps || [];
      if (
        steps.length > 0 &&
        steps[0].metadata?.transactionType === "approval"
      ) {
        this.setState({ currentAction: "approve" });
      } else {
        this.setState({ currentAction: "swap" });
      }
    }
  };

  generateCallData = async () => {
    const {
      routeResponse,
      fromToken,
      toToken,
      fromChain,
      toChain,
      amount,
      permitSignature,
      permitData,
      routeOutputAmount,
    } = this.state;
    const { walletAddress } = this.context;

    if (
      !routeResponse ||
      !fromToken ||
      !toToken ||
      !walletAddress ||
      !amount ||
      !window.ethereum
    ) {
      console.dir({
        routeResponse,
        fromToken,
        toToken,
        walletAddress,
        amount,
      });
      toast.error("Missing required data to generate call data.");
      return;
    }

    try {
      this.setState({ isTxSubmitting: true });

      const payload = {
        routeId: routeResponse.routeId ?? "",
        fromToken: fromToken.isNative ? "" : fromToken.address,
        toToken: toToken.isNative ? "" : toToken.address,
        fromChain,
        toChain,
        fromAmount: ethers.parseUnits(amount, fromToken.decimals).toString(),
        toTokenAmountMinimum: ethers
          .parseUnits(
            routeOutputAmount ?? routeResponse.outputAmount ?? "0",
            toToken.decimals
          )
          .toString(),
        slippage: "0.5",
        fromUserWalletAddress: walletAddress,
        toUserWalletAddress: walletAddress,
        permitSignature: permitSignature ?? undefined,
        permitData: permitData ? JSON.stringify(permitData) : undefined,
      };

      const callDataResponse = await getCallData(payload);

      this.setState({ callDataResponse });

      const steps = callDataResponse.steps || [];
      const firstStep = steps[0];

      if (!firstStep || !firstStep.metadata) {
        toast.error("Invalid response from call data");
        this.setState({ currentAction: "idle" });
        return;
      }

      const { transactionType, protocol, serviceType } = firstStep.metadata;

      if (transactionType === "approval") {
        this.setState({ currentAction: "approve" });
      } else if (
        transactionType === "init" &&
        protocol === "Okto-ULL" &&
        serviceType === "bridge"
      ) {
        this.setState({ currentAction: "init_bridge_txn" });
      } else if (
        protocol === "Okto-ULL" &&
        serviceType === "bridge" &&
        !transactionType
      ) {
        this.setState({ currentAction: "register_intent" });
      } else {
        toast.error("Unrecognized call data response");
        this.setState({ currentAction: "idle" });
      }

      toast.success("Call data generated successfully.");
    } catch (err) {
      console.error("Failed to generate call data", err);
      toast.error("Failed to generate call data.");
      this.setState({ isTxSubmitting: false });
    } finally {
      this.setState({ isTxSubmitting: false });
    }
  };

  submitTransactionByType = async (type: "approval" | "dex") => {
    const { routeResponse, callDataResponse } = this.state;
    const { walletAddress } = this.context;

    const responseToUse = callDataResponse ? callDataResponse : routeResponse;

    if (
      !responseToUse ||
      !walletAddress ||
      !responseToUse.steps ||
      responseToUse.steps.length === 0 ||
      !window.ethereum
    ) {
      toast.error("Some required data missing");
      return;
    }

    if (responseToUse.steps.length === 0) {
      toast.error("No steps found in route response");
      return;
    }

    const step = responseToUse.steps.find(
      (s) => s.metadata?.transactionType === type
    );

    if (!step || !step.txnData) {
      console.warn(`No ${type} transaction found`);
      return;
    }

    try {
      this.setState({ isTxSubmitting: true });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(walletAddress);

      const txRequest: any = step.txnData;
      const tx = await signer.sendTransaction({
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        gasLimit: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
      });

      toast.info(`${type} tx submitted: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log(`${type} tx confirmed`, receipt);
      toast.success(`${type} transaction confirmed`);

      // Move to next step
      if (type === "approval") {
        const remainingSteps = responseToUse.steps.filter(
          (s) => s.metadata?.transactionType !== "approval"
        );

        if (remainingSteps.length != 1) {
          toast.error("Invalid remaining steps after approval");
          return;
        }

        const nextStep = remainingSteps[0];
        const metaData = nextStep.metadata;
        if (!metaData) {
          toast.error("Remaining step does not have metadata");
          return;
        }

        if (metaData.serviceType === "bridge") {
          if (metaData.transactionType === "init") {
            this.setState({ currentAction: "init_bridge_txn" });
            return;
          } else if (!metaData.transactionType) {
            this.setState({ currentAction: "register_intent" });
            return;
          }
          toast.error("Unknown transaction type");
          this.resetTradeState();
          this.setState({ currentAction: "idle" });
        }

        this.setState({ currentAction: "swap" });
      } else {
        this.setState({ currentAction: "idle" });
      }
    } catch (err) {
      console.error(`Failed to send ${type} transaction`, err);
      toast.error(`Failed to complete ${type} transaction`);
    } finally {
      this.setState({ isTxSubmitting: false });
    }
  };

  handleInitBridgeTxn = async () => {
    const { callDataResponse } = this.state;
    const { walletAddress } = this.context;

    if (
      !walletAddress ||
      !callDataResponse ||
      !callDataResponse.steps ||
      !window.ethereum
    ) {
      toast.error("Missing data to initiate bridge transaction.");
      return;
    }

    const step = callDataResponse.steps.find(
      (s) =>
        s.metadata?.transactionType === "init" &&
        s.metadata?.protocol === "Okto-ULL" &&
        s.metadata?.serviceType === "bridge"
    );

    if (!step || !step.txnData) {
      toast.error("No bridge transaction data found.");
      return;
    }

    try {
      this.setState({ isTxSubmitting: true });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(walletAddress);

      const txRequest = step.txnData as any;
      const tx = await signer.sendTransaction({
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        gasLimit: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
      });

      toast.info(`Bridge tx submitted: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log("Bridge transaction confirmed", receipt);
      toast.success("Bridge transaction confirmed");

      this.setState({ currentAction: "idle" });
    } catch (err) {
      console.error("Failed to send bridge transaction", err);
      toast.error("Failed to send bridge transaction");
    } finally {
      this.setState({ isTxSubmitting: false });
    }
  };

  handleRegisterIntent = async () => {
    const { callDataResponse, fromChain } = this.state;
    const { walletAddress } = this.context;

    if (!walletAddress || !callDataResponse || !window.ethereum || !fromChain) {
      console.dir({
        walletAddress,
        callDataResponse,
        window,
        fromChain,
      });
      toast.error("Missing required data to register intent.");
      return;
    }

    try {
      this.setState({ isTxSubmitting: true });

      const orderTypedData = callDataResponse.orderTypedData;

      if (!orderTypedData) {
        toast.error("Missing order typed data.");
        this.setState({ currentAction: "idle", isTxSubmitting: false });
        return;
      }

      const parsedData = JSON.parse(orderTypedData as string);

      const signature = await window.ethereum.request({
        method: "eth_signTypedData_v4",
        params: [walletAddress, JSON.stringify(parsedData)],
      });

      const crossChainOrderStep = callDataResponse.steps?.find(
        (s) =>
          s.metadata?.serviceType === "bridge" &&
          s.metadata.protocol === "Okto-ULL"
      );
      const intentCalldata = crossChainOrderStep?.intentCalldata as string;

      if (!intentCalldata) {
        toast.error("Missing call data bytes.");
        this.setState({ currentAction: "idle", isTxSubmitting: false });
        return;
      }

      const intentRes = await registerIntent({
        orderBytes: intentCalldata,
        orderBytesSignature: signature,
        caipId: fromChain,
      });

      console.log("Register intent response", intentRes);
      toast.success("Cross chain order registered successfully.");

      this.setState({ currentAction: "idle" });
    } catch (err) {
      console.error("Failed to register intent", err);
      toast.error("Failed to register cross chain intent.");
      this.setState({ currentAction: "idle" });
    } finally {
      this.setState({ isTxSubmitting: false });
    }
  };

  render() {
    const { walletAddress, chainId, isConnected, isWalletContextReady } =
      this.context;
    const {
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      balance,
      isQuoteLoading,
      isRouteLoading,
      quoteOutputAmount,
      routeOutputAmount,
      currentAction,
      switchingChain,
      isTxSubmitting,
    } = this.state;

    if (!isWalletContextReady) return null;
    if (!isConnected) return <Navigate to="/" replace />;

    const isDisabled =
      isQuoteLoading ||
      isRouteLoading ||
      currentAction === "get_quote" ||
      isTxSubmitting;

    const outputAmount = routeOutputAmount || quoteOutputAmount;

    const actionLabel = {
      accept: "Accept",
      generate_call_data: "Generate Call Data",
      approve: "Approve",
      swap: "Swap",
      idle: "Get Quote",
      get_quote: "Get Quote",
      init_bridge_txn: "Initiate Cross Chain Transaction",
      register_intent: "Sign Cross Chain Order",
    }[currentAction];

    return (
      <div style={styles.container}>
        <div style={styles.contentWrapper}>
          <Link to="/" style={styles.link}>
            ← Back to Home
          </Link>

          <h1 style={styles.title}>Trade Service Client App</h1>
          <p style={styles.description}>Swap tokens across EVM chains.</p>

          <WalletInfoCard walletAddress={walletAddress} chainId={chainId} />
          {switchingChain && (
            <p style={{ color: "#ffcc00", marginBottom: "1rem" }}>
              Switching network...
            </p>
          )}

          <h2 style={styles.sectionTitle}>Trade Form</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (currentAction === "accept") {
                this.handleAccept();
              } else if (currentAction === "approve") {
                this.submitTransactionByType("approval");
              } else if (currentAction === "swap") {
                this.submitTransactionByType("dex");
              } else if (currentAction === "generate_call_data") {
                this.generateCallData();
              } else if (currentAction === "init_bridge_txn") {
                this.handleInitBridgeTxn();
              } else if (currentAction === "register_intent") {
                this.handleRegisterIntent();
              } else {
                this.handleGetQuote();
              }
            }}
          >
            <ChainSelect
              label="From Chain"
              value={fromChain}
              disabled={switchingChain}
              onChange={(chainId) => {
                this.setState({ fromChain: chainId });
                this.switchChain(chainId);
                this.resetTradeState();
              }}
            />

            <TokenInput
              chainId={fromChain}
              label="From Token"
              onValidToken={(address, symbol, decimals, isNative) => {
                this.resetTradeState();
                this.setState({
                  fromToken: { address, symbol, decimals, isNative },
                });
              }}
            />

            <AmountInput
              value={amount}
              onChange={(val) => {
                this.resetTradeState();
                this.setState({ amount: val });
              }}
              onMaxClick={() => balance && this.setState({ amount: balance })}
              tokenSymbol={fromToken?.symbol}
              balance={balance}
            />

            <ChainSelect
              label="To Chain"
              value={toChain}
              onChange={(chainId) => {
                this.resetTradeState();
                this.setState({ toChain: chainId });
              }}
            />

            <TokenInput
              chainId={toChain}
              label="To Token"
              onValidToken={(address, symbol, decimals, isNative) => {
                this.resetTradeState();
                this.setState({
                  toToken: { address, symbol, decimals, isNative },
                });
              }}
            />

            {outputAmount && (
              <p style={styles.outputText}>
                Output Amount:{" "}
                <strong>
                  {outputAmount} {toToken?.symbol}
                </strong>
                {isRouteLoading && <span> (refining...)</span>}
              </p>
            )}

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(isDisabled ? styles.submitButtonDisabled : {}),
              }}
              disabled={isDisabled}
            >
              {actionLabel}
            </button>
          </form>
        </div>
      </div>
    );
  }
}

const WithNavigation = () => {
  const navigate = useNavigate();
  return <TradePage navigate={navigate} />;
};

export default WithNavigation;

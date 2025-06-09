import { Component } from "react";
import {
  Link,
  NavigateFunction,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

// custom components
import TokenInput from "../components/TokenInput";
import WalletInfoCard from "../components/WalletInfoCard";
import ChainSelect from "../components/ChainSelect";
import AmountInput from "../components/AmountInput";

import { WalletContext } from "../context/WalletContext";
import { CAIP_TO_NAME, CHAIN_ID_TO_NAME } from "../constants/chains";
import styles from "../styles/TradePageStyles";

import {
  getQuote,
  getBestRoute,
  getCallData,
  registerIntent,
} from "../api/tradeServiceClient";
import {
  GetBestRouteRequest,
  GetQuoteRequest,
  GetBestRouteResponse,
  GetCallDataResponse,
} from "../types/api/tradeService";

import type { Eip1193Provider } from "ethers";
import { connectEVMWallet } from "../utils/evmWallet";
import { connectSolanaWallet } from "../utils/solanaWallet";
import {
  SolanaTxPayload,
  submitPhantomSolanaTransaction,
} from "../utils/solanaTxnUtils";

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
  environment: string;
  switchingChain: boolean;
  isTxSubmitting: boolean;
  isQuoteLoading: boolean;
  isRouteLoading: boolean;
  balanceLoading: boolean;
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
  balance: string | null;
  quoteOutputAmount: string | null;
  routeOutputAmount: string | null;
  routeResponse: GetBestRouteResponse | null;
  permitSignature: string | null;
  permitData: unknown | null;
  callDataResponse: GetCallDataResponse | null;
}

// Feature flag for cross-chain Solana ↔ EVM swaps
const FEATURE_ENABLE_SOLANA_EVM_CROSS_CHAIN = false;

const SOLANA_USDC = {
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  symbol: "USDC",
  decimals: 6,
};

class TradePage extends Component<TradePageProps, TradePageState> {
  static contextType = WalletContext;
  declare context: React.ContextType<typeof WalletContext>;

  constructor(props: TradePageProps) {
    super(props);
    this.state = {
      environment: "production",
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
      balanceLoading: false,
      currentAction: "idle",
      routeResponse: null,
      isTxSubmitting: false,
      permitSignature: null,
      permitData: null,
      callDataResponse: null,
    };
  }

  componentDidMount(): void {
    const { evmChainId } = this.context;
    const caipChainId = evmChainId ? `eip155:${evmChainId}` : "";

    this.setState({
      fromChain: caipChainId,
      toChain: caipChainId, // keep this just for initial default
    });
  }

  renderChainOptions = () => {
    return Object.entries(CHAIN_ID_TO_NAME).map(([id, name]) => (
      <option key={id} value={`eip155:${id}`}>
        {name}
      </option>
    ));
  };

  getMetamaskProvider = (eth: any) => {
    if (eth.providers) {
      return eth.providers.find((p: any) => p.isMetaMask);
    }
    return eth;
  };

  handleFromChainChange = async (newFromChain: string) => {
    this.setState({
      switchingChain: true,
    });
    const chainType = newFromChain.split(":")[0];
    const chainId = newFromChain.split(":")[1];
    const { isEvmConnected, isSolanaConnected, setWalletState } = this.context;

    console.dir({ chainType, isEvmConnected, isSolanaConnected });

    if (chainType === "solana") {
      const phantom = (window as any).phantom?.solana;
      if (!phantom?.isPhantom) {
        toast.error("Phantom Wallet not found");
        return;
      }
      if (!isSolanaConnected) {
        connectSolanaWallet(setWalletState);
      }
      this.setState({
        fromChain: newFromChain,
        toChain: FEATURE_ENABLE_SOLANA_EVM_CROSS_CHAIN ? "" : newFromChain,
        fromToken: null,
        toToken: null,
        amount: "",
        balance: null,
        switchingChain: false,
      });
    } else {
      // EVM chain
      if (!isEvmConnected) {
        await connectEVMWallet(setWalletState);
      }
      const metamask = this.getMetamaskProvider(window.ethereum);

      if (!metamask || !metamask.request) {
        toast.error("MetaMask not found");
        return;
      }
      const chainIdHex = `0x${parseInt(chainId, 10).toString(16)}`;

      await metamask.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });

      setWalletState({
        evmChainId: Number(chainId),
        isEvmConnected: true,
      });
      this.setState({
        fromChain: newFromChain,
        toChain: "",
        fromToken: null,
        toToken: null,
        amount: "",
        balance: null,
        switchingChain: false,
      });
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

  getAssociatedTokenAddress = (
    mint: PublicKey,
    owner: PublicKey
  ): PublicKey => {
    const [associatedTokenAddress] = PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return associatedTokenAddress;
  };

  fetchBalance = async () => {
    this.setState({ balanceLoading: true });
    const { fromChain, fromToken } = this.state;
    const { evmWalletAddress, solanaWalletAddress } = this.context;

    if (!fromChain || !fromToken) {
      toast.error("Select a chain and token first");
      this.setState({ balanceLoading: false });
      return;
    }

    const chainType = fromChain.split(":")[0];

    if (chainType === "eip155") {
      if (!evmWalletAddress || !window.ethereum) {
        toast.error("EVM wallet not connected");
        this.setState({ balanceLoading: false });
        return;
      }

      try {
        const metamask = this.getMetamaskProvider(window.ethereum);
        const provider = new ethers.BrowserProvider(metamask);

        // console.dir(fromToken);
        if (
          fromToken.isNative ||
          !fromToken.address ||
          fromToken.address === ""
        ) {
          const bal = await provider.getBalance(evmWalletAddress);
          const formatted = ethers.formatUnits(bal, fromToken.decimals);
          this.setState({ balance: formatted, balanceLoading: false });
        } else {
          const tokenContract = new ethers.Contract(
            fromToken.address,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );
          // console.log({
          //   evmWalletAddress,
          //   tokenAddress: fromToken.address,
          //   tokenContract,
          // });
          const bal = await tokenContract.balanceOf(evmWalletAddress);
          const formatted = ethers.formatUnits(bal, fromToken.decimals);
          this.setState({ balance: formatted, balanceLoading: false });
        }
      } catch (err) {
        console.error("Failed to fetch EVM balance", err);
        this.setState({ balance: null, balanceLoading: false });
      }
    } else if (chainType === "solana") {
      if (!solanaWalletAddress) {
        toast.error("Solana wallet not connected");
        return;
      }

      // either use solana url from env or use public node
      const solanaURl =
        import.meta.env.VITE_SOLANA_RPC_URL ||
        "https://api.mainnet-beta.solana.com";

      try {
        const connection = new Connection(solanaURl);
        const owner = new PublicKey(solanaWalletAddress);

        let balanceLamports: bigint;

        if (fromToken.isNative) {
          balanceLamports = BigInt(await connection.getBalance(owner));
        } else {
          const mint = new PublicKey(fromToken.address);
          const ata = this.getAssociatedTokenAddress(mint, owner);

          const accountInfo = await connection.getParsedAccountInfo(ata);
          const parsedInfo = (accountInfo.value?.data as any)?.parsed?.info;

          if (!parsedInfo || !parsedInfo.tokenAmount) {
            balanceLamports = BigInt(0);
          } else {
            balanceLamports = BigInt(parsedInfo.tokenAmount.amount);
          }
        }

        const decimals = fromToken.decimals || 6;
        const formatted = (Number(balanceLamports) / 10 ** decimals).toString();
        this.setState({ balance: formatted, balanceLoading: false });
      } catch (err) {
        console.error("Failed to fetch Solana balance", err);
        this.setState({ balance: null, balanceLoading: false });
      }
    } else {
      toast.error("Unsupported chain type for balance fetching");
      this.setState({ balance: null, balanceLoading: false });
    }
  };

  getAllowedToChains = () => {
    const { fromChain } = this.state;
    if (!fromChain) return [];
    // console.log("getAllowedToChains", { fromChain });
    const fromType = fromChain?.split(":")[0];

    if (!FEATURE_ENABLE_SOLANA_EVM_CROSS_CHAIN) {
      if (fromType === "solana") return [fromChain];
      if (fromType === "eip155")
        return Object.keys(CAIP_TO_NAME).filter((id) =>
          id.startsWith("eip155")
        );
    }
    return Object.keys(CHAIN_ID_TO_NAME);
  };

  handleClearForm = () => {
    try {
      this.setState({
        fromToken: null,
        toToken: null,
        amount: "",
        balance: null,
        quoteOutputAmount: null,
        routeOutputAmount: null,
        currentAction: "idle",
        routeResponse: null,
        permitSignature: null,
        permitData: null,
        callDataResponse: null,
      });
    } catch (err) {
      console.error("Failed to clear form:", err);
      toast.error("Failed to clear form");
    }
  };

  handleGetQuote = async () => {
    const { evmWalletAddress, solanaWalletAddress } = this.context;
    const { fromChain, toChain, fromToken, toToken, amount } = this.state;

    if (!fromChain || !toChain || !fromToken || !toToken || !amount) {
      console.warn("Missing required fields");
      return;
    }
    let fromUserWalletAddress, toUserWalletAddress;
    let isFromChainSolana = fromChain.startsWith("solana");
    let isToChainSolana = toChain.startsWith("solana");

    // user wallet address depends on chain. If fromChain is EVM, use evmWalletAddress
    // if fromChain is Solana, use solanaWalletAddress
    // similar for toChain
    if (fromChain.startsWith("eip155")) {
      if (!evmWalletAddress) {
        toast.error("Please connect wallet to proceed");
        return;
      }
      fromUserWalletAddress = evmWalletAddress;
    } else if (fromChain.startsWith("solana")) {
      if (!solanaWalletAddress) {
        toast.error("Please connect solana wallet to proceed");
        return;
      }
      fromUserWalletAddress = solanaWalletAddress;
      isFromChainSolana = true;
    } else {
      toast.error("Unsupported fromChain");
      return;
    }

    if (toChain.startsWith("eip155")) {
      if (!evmWalletAddress) {
        toast.error("Please connect wallet to proceed");
        return;
      }
      toUserWalletAddress = evmWalletAddress;
    } else if (toChain.startsWith("solana")) {
      if (!solanaWalletAddress) {
        toast.error("Please connect solana wallet to proceed");
        return;
      }
      toUserWalletAddress = solanaWalletAddress;
      isToChainSolana = true;
    } else {
      toast.error("Unsupported toChain");
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
        fromToken: isFromChainSolana
          ? fromTokenAddress
          : fromTokenAddress.toLowerCase(),
        toToken: isToChainSolana
          ? toTokenAddress
          : toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress,
        toUserWalletAddress,
      };

      this.setState({
        isQuoteLoading: true,
        isRouteLoading: false,
        quoteOutputAmount: null,
        routeOutputAmount: null,
      });

      // Step 1: Call getQuote
      const quoteRes = await getQuote(this.state.environment, getQuotePayload);
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

      if (!evmWalletAddress) {
        toast.error("Please connect wallet to proceed");
        return;
      }

      const getBestRoutePayload: GetBestRouteRequest = {
        fromChain,
        toChain,
        fromToken: isFromChainSolana
          ? fromTokenAddress
          : fromTokenAddress.toLowerCase(),
        toToken: isToChainSolana
          ? toTokenAddress
          : toTokenAddress.toLowerCase(),
        fromAmount,
        fromUserWalletAddress,
        toUserWalletAddress,
      };

      // Step 2: Call getBestRoute
      const routeRes = await getBestRoute(
        this.state.environment,
        getBestRoutePayload
      );
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
    const { evmWalletAddress, solanaWalletAddress } = this.context;

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

    // check if the from chain is evm
    if (fromChain.startsWith("eip155")) {
      console.log("EVM chain selected");
      if (!evmWalletAddress) {
        toast.error("Please connect EVM wallet to proceed");
        return;
      }
      const metamask = this.getMetamaskProvider(window.ethereum);

      if (!metamask || !metamask.request) {
        toast.error("MetaMask not found");
        return;
      }

      const fromChainId = fromChain.split(":")[1];
      const toChainId = toChain.split(":")[1];

      const isCrossChain = fromChainId !== toChainId;

      console.log("isCrossChain: ", isCrossChain);

      if (isCrossChain && routeResponse.permitDataToSign && evmWalletAddress) {
        try {
          const permitData = JSON.parse(
            routeResponse.permitDataToSign as string
          );

          console.log("requesting permit signature: ", {
            data: JSON.stringify(permitData, null, 2),
            wallet: evmWalletAddress,
          });

          const signature = await metamask.request({
            method: "eth_signTypedData_v4",
            params: [evmWalletAddress, JSON.stringify(permitData)],
          });

          console.log("Permit signature: ", signature);

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
        // check if to chain is solana. This is currently not supported
        if (toChain.startsWith("solana")) {
          toast.error("Cross-chain swaps to Solana are not supported yet");
          return;
        }

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
    } else if (fromChain.startsWith("solana")) {
      console.log("Solana chain selected");
      if (!solanaWalletAddress) {
        toast.error("Please connect Solana wallet to proceed");
        return;
      }
      const fromChainId = fromChain.split(":")[1];
      const toChainId = toChain.split(":")[1];

      const isCrossChain = fromChainId !== toChainId;

      if (isCrossChain) {
        toast.error("Cross-chain swaps from Solana are not supported yet");
      } else {
        // Same chain -> log response for now
        console.log("Route response:", routeResponse);

        if (
          !routeResponse.steps ||
          routeResponse.steps.length === 0 ||
          !routeResponse.steps[0].txnData
        ) {
          toast.error("No steps found in route response");
          return;
        }

        const solanaTxId = await submitPhantomSolanaTransaction(
          routeResponse.steps[0].txnData as SolanaTxPayload
        );

        console.dir({
          solanaTxId,
          routeResponse,
        });
      }
    } else {
      toast.error("Unsupported chain type");
      return;
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
    const { evmWalletAddress } = this.context;

    if (
      !routeResponse ||
      !fromToken ||
      !toToken ||
      !evmWalletAddress ||
      !amount ||
      !window.ethereum
    ) {
      console.dir({
        routeResponse,
        fromToken,
        toToken,
        evmWalletAddress,
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
        fromUserWalletAddress: evmWalletAddress,
        toUserWalletAddress: evmWalletAddress,
        permitSignature: permitSignature ?? undefined,
        permitData: permitData ? JSON.stringify(permitData) : undefined,
      };

      const callDataResponse = await getCallData(
        this.state.environment,
        payload
      );

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
    const { evmWalletAddress } = this.context;

    const responseToUse = callDataResponse ? callDataResponse : routeResponse;

    if (
      !responseToUse ||
      !evmWalletAddress ||
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

      const metamask = this.getMetamaskProvider(window.ethereum);
      const provider = new ethers.BrowserProvider(metamask);

      const signer = await provider.getSigner(evmWalletAddress);

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
    const { evmWalletAddress } = this.context;

    if (
      !evmWalletAddress ||
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

      const metamask = this.getMetamaskProvider(window.ethereum);
      const provider = new ethers.BrowserProvider(metamask);

      const signer = await provider.getSigner(evmWalletAddress);

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
    const { evmWalletAddress } = this.context;

    if (
      !evmWalletAddress ||
      !callDataResponse ||
      !window.ethereum ||
      !fromChain
    ) {
      console.dir({
        evmWalletAddress,
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

      const metamask = this.getMetamaskProvider(window.ethereum);

      const signature = await metamask.request({
        method: "eth_signTypedData_v4",
        params: [evmWalletAddress, JSON.stringify(parsedData)],
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

      const intentRes = await registerIntent(this.state.environment, {
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
    const {
      evmWalletAddress,
      evmChainId,
      isEvmConnected,
      solanaWalletAddress,
      solanaNetwork,
      isSolanaConnected,
      isWalletContextReady,
    } = this.context;
    const {
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      balance,
      isQuoteLoading,
      isRouteLoading,
      balanceLoading,
      quoteOutputAmount,
      routeOutputAmount,
      currentAction,
      switchingChain,
      isTxSubmitting,
    } = this.state;

    if (!isWalletContextReady) return null;
    if (!(isEvmConnected || isSolanaConnected))
      return <Navigate to="/" replace />;

    const isDisabled =
      isQuoteLoading ||
      isRouteLoading ||
      switchingChain ||
      !fromChain ||
      !toChain ||
      !fromToken ||
      !toToken ||
      !amount ||
      (balance && parseFloat(amount) > parseFloat(balance)) ||
      currentAction === "get_quote" ||
      isTxSubmitting;

    const isLoading =
      switchingChain ||
      isQuoteLoading ||
      isRouteLoading ||
      isTxSubmitting ||
      balanceLoading ||
      !isWalletContextReady;

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

    // 🚨 IMPORTANT: Determine if forced USDC is needed
    const forceUSDC =
      FEATURE_ENABLE_SOLANA_EVM_CROSS_CHAIN &&
      fromChain.startsWith("solana") &&
      toChain &&
      !toChain.startsWith("solana");

    return (
      <div style={styles.container}>
        <div style={styles.contentWrapper}>
          <Link to="/" style={styles.link}>
            ← Back to Home
          </Link>

          <h1 style={styles.title}>Trade Service Client App</h1>
          <p style={styles.description}>Swap tokens across EVM and Solana.</p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Environment</label>
            <select
              style={styles.select}
              value={this.state.environment}
              onChange={(e) => this.setState({ environment: e.target.value })}
            >
              <option value="staging">Staging</option>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </div>

          <WalletInfoCard
            evmWalletAddress={evmWalletAddress}
            evmChainId={evmChainId}
            isEvmConnected={isEvmConnected}
            solanaWalletAddress={solanaWalletAddress}
            solanaNetwork={solanaNetwork}
            isSolanaConnected={isSolanaConnected}
          />
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
            {/* FROM CHAIN */}
            <ChainSelect
              label="From Chain"
              value={fromChain}
              disabled={switchingChain}
              allowedChains={Object.keys(CAIP_TO_NAME)}
              onChange={(chainId) => this.handleFromChainChange(chainId)}
            />

            {/* FROM TOKEN */}
            <TokenInput
              chainId={fromChain}
              label="From Token"
              forceToken={
                forceUSDC
                  ? {
                      address: SOLANA_USDC.address,
                      symbol: SOLANA_USDC.symbol,
                      decimals: SOLANA_USDC.decimals,
                    }
                  : undefined
              }
              disabled={switchingChain}
              onValidToken={(address, symbol, decimals, isNative) => {
                console.log("Selected from token:", {
                  address,
                  symbol,
                  decimals,
                  isNative,
                });
                this.resetTradeState();
                this.setState(
                  {
                    fromToken: { address, symbol, decimals, isNative },
                  },
                  () => {
                    this.fetchBalance();
                  }
                );
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

            {/* TO CHAIN */}
            <ChainSelect
              label="To Chain"
              value={toChain}
              disabled={switchingChain}
              allowedChains={this.getAllowedToChains()}
              onChange={(chainId) => {
                this.setState({
                  toChain: chainId,
                  toToken: null, // 🔥 RESET TO TOKEN
                  quoteOutputAmount: null,
                  routeOutputAmount: null,
                  isQuoteLoading: false,
                  isRouteLoading: false,
                  currentAction: "idle",
                  routeResponse: null,
                });
              }}
            />

            {/* TO TOKEN */}
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

            <div>
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

              <button
                type="button"
                style={{
                  ...styles.submitButton,
                  ...(isDisabled ? styles.submitButtonDisabled : {}),
                  marginLeft: "1.5rem",
                }}
                disabled={isLoading}
                onClick={() => this.handleClearForm()}
              >
                Clear Form
              </button>
            </div>
          </form>
          {isLoading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
                borderRadius: "0.5rem",
                width: "100%",
                height: "100%",
              }}
            >
              <div className="loader" />
              <span
                style={{ color: "#fff", marginLeft: "1rem", height: "100%" }}
              >
                Loading...
              </span>
            </div>
          )}
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

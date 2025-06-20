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
import RequestResponseModal from "../components/RequestResponseModal";

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
  modalOpen: boolean;
  modalTitle: string;
  modalSubtitle: string;
  modalPayload: any;
  isRequestModal: boolean;
  onConfirmModal?: () => void;
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
      environment: "sandbox",
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
      modalOpen: false,
      modalTitle: "",
      modalSubtitle: "",
      modalPayload: null,
      isRequestModal: true,
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

  openRequestModal = (
    title: string,
    subtitle: string,
    payload: any,
    onConfirm: () => Promise<void>
  ) => {
    this.setState({
      modalOpen: true,
      modalTitle: title,
      modalSubtitle: subtitle,
      modalPayload: payload,
      isRequestModal: true,
      onConfirmModal: onConfirm,
    });
  };

  openResponseModal = (title: string, subtitle: string, payload: any): Promise<void> => {
    return new Promise((resolve) => {
      this.setState({
        modalOpen: true,
        modalTitle: title,
        modalSubtitle: subtitle,
        modalPayload: payload,
        isRequestModal: false,
        onConfirmModal: resolve,
      });
    });
  };


  closeModal = () => {
    this.setState({ modalOpen: false });
  };

  waitForUserToSendRequest = (
    title: string,
    subtitle: string,
    payload: any
  ): Promise<void> => {
    return new Promise((resolve) => {
      this.setState({
        modalOpen: true,
        modalTitle: title,
        modalSubtitle: subtitle,
        modalPayload: payload,
        isRequestModal: true,
        onConfirmModal: async () => {
          this.setState({ modalOpen: false });
          resolve();
        },
      });
    });
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

      console.log("Payload: ", getQuotePayload);
      await this.waitForUserToSendRequest("Get Quote Request Payload", `Step 1: Get Quote Request

      📍Note: 'Get Quote' and 'Get Best Route' are not sequential — they can be used independently or together.

      - Use 'Get Quote' for faster output previews.
      - Use 'Get Best Route' for detailed execution planning.
      - Some apps may use both: first for estimate, then for final routing.

      This demo shows both, to help you compare.`, getQuotePayload);

      // Step 1: Call getQuote
      const quoteRes = await getQuote(this.state.environment, getQuotePayload);
      console.dir({ quoteRes });
      await this.openResponseModal("Get Quote Response", `Step 1: Get Quote Response

      - Use 'Get Quote' when you need a quick estimate of the output amount.
      - For more accurate routing and execution details, we recommend using 'Get Best Route'.

      Click "Next" to procceed with the Get Best Route flow.`, quoteRes);

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

      await this.waitForUserToSendRequest("Get Best Route Request Payload", `Step 2: Get Best Route Request

      📍Note: 'Get Quote' and 'Get Best Route' are not sequential — they can be used independently or together based on your use case.

      - Use 'Get Best Route' to retrieve the most optimal path for execution.
      - It provides detailed routing, fee breakdowns, and expected output.

      This API is typically used for executing real swaps across chains.`, getBestRoutePayload);
      // Step 2: Call getBestRoute
      const routeRes = await getBestRoute(
        this.state.environment,
        getBestRoutePayload
      );
      console.dir({ routeRes });
      await this.openResponseModal("Get Best Route Response", `Step 2: Get Best Route Response
      
      - This response includes the most optimized route for your swap.
      - Use this data to construct and execute the actual trade.`, routeRes);
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

      await this.waitForUserToSendRequest("Generate Call Data Payload", `Step 3: Generate Call Data
      - This step generates the on-chain calldata required to perform the swap.
      - It is triggered after the user has signed the transaction (if using a permit).
      - The payload includes routing info, token details, slippage, amount, and optional permit data.`, payload);

      const callDataResponse = await getCallData(
        this.state.environment,
        payload
      );

      await this.openResponseModal("Generate Call Data Response", `Step 3: Generate Call Data
    - This API response contains the fully encoded calldata and execution steps.
    - It can be directly used to construct and broadcast the transaction on-chain.
    - Supports both same-chain and cross-chain swaps with optional permit integration.`, callDataResponse);

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

      await this.waitForUserToSendRequest(
        "DEX Swap Transaction Request Payload",
        `Step 4: Execute DEX Swap

        - This transaction performs the actual token swap using a DEX.
        - Confirm the transaction request via Metamask.`,
        txRequest
      );

      const tx = await signer.sendTransaction({
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        gasLimit: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
      });

      toast.info(`${type} tx submitted: ${tx.hash}`);

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      await this.openResponseModal(
        "DEX Swap Transaction Response",
        `Step 4: Executed DEX Swap-
        - The token swap transaction has been completed.
          
        📍If you're performing a same-chain swap: this completes the flow.
        📍If you're performing a cross-chain swap: continue with the next step so the correct sequence — including bridging or intent registration — can be triggered.`,
        receipt
      );
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
      await this.waitForUserToSendRequest(
        "Init Bridge Transaction Payload",
        `Step 4: Init Bridge Transaction

      - This step initiates the cross-chain transfer using a bridge protocol.
      - A transaction will be sent to the bridge smart contract from the user's wallet.
      - Once this is confirmed, the tokens will be bridged to the destination chain.`,
        txRequest
      );

      const tx = await signer.sendTransaction({
        to: txRequest.to,
        data: txRequest.data,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        gasLimit: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
      });

      toast.info(`Bridge tx submitted: ${tx.hash}`);

      const receipt = await tx.wait();

      await this.openResponseModal(
        "Init Bridge Transaction Response",
        `Step 4: Init Bridge Transaction

      - Transaction has been submitted to the bridge protocol on the source chain.
      - Once it's confirmed, the destination chain will process the swap or claim.`,
        receipt
      );

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

      await this.waitForUserToSendRequest(
        "Register Intent Payload",
        `Step 4: Register Intent

      - This step is required for cross-chain swaps using relayer-based bridges like Okto-ULL.
      - The user signs a message (EIP-712 typed data) to authorize the swap.
      - The signed intent is sent to the relayer via API — no on-chain transaction is sent.`,
        {
          orderBytes: intentCalldata,
          orderBytesSignature: signature,
          caipId: fromChain,
        }
      );

      const intentRes = await registerIntent(this.state.environment, {
        orderBytes: intentCalldata,
        orderBytesSignature: signature,
        caipId: fromChain,
      });

      await this.openResponseModal(
        "Register Intent Response",
        `Step 4: Register Intent

      - The signed order intent has been successfully registered with the bridge relayer.
      - The relayer will monitor the source chain and execute the transaction when funds arrive on the destination chain.`,
        intentRes
      );

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
      accept: "Accept Txn",
      generate_call_data: "Generate Call Data",
      approve: "Approve Txn",
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
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto bg-gray-800 rounded-2xl shadow-lg p-8 relative">
          <Link to="/" className="text-blue-400 hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>

          <h1 className="text-3xl font-bold mb-2">Trade Service Client App</h1>
          <p className="mb-6 text-gray-300">Swap tokens across EVM and Solana.</p>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Environment</label>
            <select
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2"
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
            <p className="text-yellow-400 mb-4">Switching network...</p>
          )}

          <h2 className="text-xl font-semibold mb-4 mt-6">Trade Form</h2>
          <RequestResponseModal
            open={this.state.modalOpen}
            onClose={() => {
              this.setState({ modalOpen: false });
              if (this.state.onConfirmModal) {
                this.state.onConfirmModal(); // resolve the promise
                this.setState({ onConfirmModal: undefined });
              }
            }}
            title={this.state.modalTitle}
            subtitle={this.state.modalSubtitle}
            payload={this.state.modalPayload}
            isRequest={this.state.isRequestModal}
            onConfirm={
              this.state.isRequestModal && this.state.onConfirmModal
                ? async () => {
                  this.state.onConfirmModal!(); // wrap in async fn
                }
                : undefined
            }
          />
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
            className="space-y-6"
          >
            <ChainSelect
              label="From Chain"
              value={fromChain}
              disabled={switchingChain}
              allowedChains={Object.keys(CAIP_TO_NAME)}
              onChange={(chainId) => this.handleFromChainChange(chainId)}
            />

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

            <ChainSelect
              label="To Chain"
              value={toChain}
              disabled={switchingChain}
              allowedChains={this.getAllowedToChains()}
              onChange={(chainId) => {
                this.setState({
                  toChain: chainId,
                  toToken: null, 
                  quoteOutputAmount: null,
                  routeOutputAmount: null,
                  isQuoteLoading: false,
                  isRouteLoading: false,
                  currentAction: "idle",
                  routeResponse: null,
                });
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
              <p className="text-green-400">
                Output Amount: <strong>{outputAmount} {toToken?.symbol}</strong>
                {isRouteLoading && <span> (refining...)</span>}
              </p>
            )}

            <div className="flex gap-6">
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
                className="px-6 py-2 rounded bg-gray-600 hover:bg-gray-700 transition"
                disabled={isLoading}
                onClick={() => this.handleClearForm()}
              >
                Clear Form
              </button>
            </div>
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

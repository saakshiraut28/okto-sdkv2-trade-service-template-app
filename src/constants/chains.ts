export const CHAIN_ID_TO_NAME: Record<number, string> = {
  1: "Ethereum",
  56: "Binance Smart Chain",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
};

export const CHAIN_NATIVE_SYMBOL: Record<number, string> = {
  1: "ETH", // Ethereum
  56: "BNB", // BNB Chain
  137: "MATIC", // Polygon
  8453: "BASE", // Base
  42161: "ETH", // Arbitrum
  10: "ETH", // Optimism
};

export const CHAIN_ID_TO_RPC: Record<number, string> = {
  1: import.meta.env.VITE_RPC_ETHEREUM || "https://ethereum-rpc.publicnode.com",
  56: import.meta.env.VITE_RPC_BSC || "https://bsc-rpc.publicnode.com",
  137:
    import.meta.env.VITE_RPC_POLYGON ||
    "https://polygon-bor-rpc.publicnode.com",
  8453: import.meta.env.VITE_RPC_BASE || "https://base-rpc.publicnode.com",
  42161:
    import.meta.env.VITE_RPC_ARBITRUM ||
    "https://arbitrum-one-rpc.publicnode.com",
  10:
    import.meta.env.VITE_RPC_OPTIMISM || "https://optimism-rpc.publicnode.com",
};

export const CAIP_TO_NAME: Record<string, string> = {
  "eip155:1": "Ethereum",
  "eip155:56": "Binance Smart Chain",
  "eip155:137": "Polygon",
  "eip155:8453": "Base",
  "eip155:42161": "Arbitrum",
  "eip155:10": "Optimism",
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "Solana Mainnet",
};

export const CAIP_TO_NATIVE_SYMBOL: Record<string, string> = {
  "eip155:1": "ETH",
  "eip155:56": "BNB",
  "eip155:137": "MATIC",
  "eip155:8453": "BASE",
  "eip155:42161": "ETH",
  "eip155:10": "ETH",
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": "SOL",
};

export const CHAIN_ID_TO_KNOWN_TOKENS: Record<
  string,
  Record<string, string>
> = {
  "1": {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  "56": {
    BUSD: "0x55d398326f99059fF775485246999027B3197955",
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  },
  "137": {
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    USDC: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  "8453": {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  "42161": {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
};

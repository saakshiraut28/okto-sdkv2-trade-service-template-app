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
  1: import.meta.env.VITE_RPC_ETHEREUM || "",
  56: import.meta.env.VITE_RPC_BSC || "",
  137: import.meta.env.VITE_RPC_POLYGON || "",
  8453: import.meta.env.VITE_RPC_BASE || "",
  42161: import.meta.env.VITE_RPC_ARBITRUM || "",
  10: import.meta.env.VITE_RPC_OPTIMISM || "",
};

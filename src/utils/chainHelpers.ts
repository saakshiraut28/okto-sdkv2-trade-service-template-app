import { ethers } from "ethers";
import { CHAIN_ID_TO_RPC } from "../constants/chains";

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
}

// Utility: Get EVM token metadata
export async function getEvmTokenMetadata(
  chainId: number,
  tokenAddress: string
) {
  console.log(`Using RPC for chain ${chainId}:`, CHAIN_ID_TO_RPC[chainId]);
  const url = CHAIN_ID_TO_RPC[chainId];
  const provider = new ethers.JsonRpcProvider(url);

  if (!ethers.isAddress(tokenAddress)) {
    throw new Error("Invalid token address");
  }

  // Native token
  if (tokenAddress === ethers.ZeroAddress) {
    return { symbol: "ETH", decimals: 18, isNative: true };
  }

  const abi = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ];

  const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
  const [symbol, decimals] = await Promise.all([
    tokenContract.symbol(),
    tokenContract.decimals(),
  ]);

  return { symbol, decimals, isNative: false, address: tokenAddress };
}

// Utility: Get Solana token metadata
export async function getSolanaTokenMetadata(tokenMint: string) {
  // either use solana url from env or use public node
  const solanaURl =
    import.meta.env.VITE_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";

  const connection = new (await import("@solana/web3.js")).Connection(
    solanaURl
  );

  const mintPublicKey = new (await import("@solana/web3.js")).PublicKey(
    tokenMint
  );

  const mintAccount = await connection.getParsedAccountInfo(mintPublicKey);
  const decimals =
    (mintAccount.value?.data as any)?.parsed?.info?.decimals ?? 6;

  // For demo purposes, just return USDC or fallback symbol
  const symbol =
    tokenMint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      ? "USDC"
      : "TOKEN";

  return { symbol, decimals, isNative: false, address: tokenMint };
}

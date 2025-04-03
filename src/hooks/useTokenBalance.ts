import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { TokenInfo } from "../utils/chainHelpers";

export function useTokenBalance(
  token: TokenInfo | null,
  chainId: string,
  walletAddress: string | null
) {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!token || !walletAddress || !chainId) return;

      const provider = new ethers.BrowserProvider(window.ethereum);

      try {
        if (token.isNative) {
          const bal = await provider.getBalance(walletAddress);
          setBalance(ethers.formatUnits(bal, token.decimals));
        } else {
          const contract = new ethers.Contract(
            token.address,
            ["function balanceOf(address owner) view returns (uint256)"],
            provider
          );
          const bal = await contract.balanceOf(walletAddress);
          setBalance(ethers.formatUnits(bal, token.decimals));
        }
      } catch (err) {
        console.error("Failed to fetch balance", err);
        setBalance(null);
      }
    };

    fetch();
  }, [token, chainId, walletAddress]);

  return balance;
}

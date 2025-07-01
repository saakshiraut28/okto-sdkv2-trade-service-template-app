import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { TokenInfo } from "../utils/chainHelpers";
import { toast } from "react-toastify";

export function useTokenBalance(
  token: TokenInfo | null,
  chainId: string,
  walletAddress: string | null
) {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!token || !walletAddress || !chainId) return;

      const eth = window.ethereum as any;
      const metamask = eth.providers
        ? eth.providers.find((p: any) => p.isMetaMask)
        : eth;

      if (!metamask || !metamask.request) {
        toast.error("MetaMask not found");
        return;
      }

      try {
        if (token.isNative) {
          const bal = await metamask.getBalance(walletAddress);
          setBalance(ethers.formatUnits(bal, token.decimals));
        } else {
          const contract = new ethers.Contract(
            token.address,
            ["function balanceOf(address owner) view returns (uint256)"],
            metamask
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

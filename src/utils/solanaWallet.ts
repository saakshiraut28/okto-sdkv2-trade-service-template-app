export const connectSolanaWallet = async (
  setWalletState: (wallet: Partial<any>) => void
) => {
  try {
    const phantom = (window as any).phantom?.solana;
    if (!phantom?.isPhantom) {
      alert(
        "Phantom Wallet not found. Please install it from https://phantom.app"
      );
      return;
    }
    console.log("Phantom wallet detected, connecting");

    let response;
    try {
      response = await phantom.connect(); // opens the popup
    } catch (connectErr: any) {
      console.error("Phantom connect call failed:", connectErr);
      alert(
        "Failed to connect to Phantom. Please check if the wallet extension is working correctly and reload the page."
      );
      return;
    }

    if (!response?.publicKey) {
      alert("Wallet connection failed");
      return;
    }

    const publicKey = response.publicKey.toString();
    const network = phantom.network || "mainnet";

    setWalletState({
      solanaWalletAddress: publicKey,
      solanaNetwork: network,
      isSolanaConnected: true,
    });
  } catch (err: any) {
    console.error("Phantom connect error:", err);
    alert(
      "Unexpected error while connecting to Phantom. Try closing and reopening the browser or reloading the extension."
    );
  }
};

export const disconnectSolanaWallet = (
  setWalletState: (wallet: Partial<any>) => void
) => {
  setWalletState({
    solanaWalletAddress: null,
    solanaNetwork: null,
    isSolanaConnected: false,
  });
};

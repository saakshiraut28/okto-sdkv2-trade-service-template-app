import {
  PublicKey,
  TransactionInstruction,
  Connection,
  AddressLookupTableAccount,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { toast } from "react-toastify";

// Define the input structure (can be customized if needed)
interface SolanaRawInstruction {
  programId: string;
  keys: {
    pubkey: string;
    isWritable: boolean;
    isSigner: boolean;
  }[];
  data: number[];
}

export interface SolanaTxPayload {
  from: string;
  rawInstructions: SolanaRawInstruction[];
  addressLookupTableAddresses: string[];
}

export const submitPhantomSolanaTransaction = async (
  payload: SolanaTxPayload
): Promise<string> => {
  try {
    const provider = (window as any).phantom?.solana;
    // either use solana url from env or use public node
    const solanaURl =
      import.meta.env.VITE_SOLANA_RPC_URL ||
      "https://api.mainnet-beta.solana.com";

    if (!provider || !provider.isPhantom) {
      throw new Error("Phantom Wallet not found");
    }

    // Connect Phantom if not already connected
    if (!provider.publicKey) {
      await provider.connect();
    }

    const connection = new Connection(solanaURl);
    const userPublicKey = provider.publicKey as PublicKey;

    // Convert raw instructions to TransactionInstruction[]
    const instructions: TransactionInstruction[] = payload.rawInstructions.map(
      (ix) => {
        return new TransactionInstruction({
          programId: new PublicKey(ix.programId),
          keys: ix.keys.map((k) => ({
            pubkey: new PublicKey(k.pubkey),
            isWritable: k.isWritable,
            isSigner: k.isSigner,
          })),
          data: Buffer.from(ix.data),
        });
      }
    );

    // Fetch Address Lookup Tables
    const lookupTables: AddressLookupTableAccount[] = [];

    for (const address of payload.addressLookupTableAddresses) {
      const resp = await connection.getAddressLookupTable(
        new PublicKey(address)
      );
      if (resp.value) {
        lookupTables.push(resp.value);
      }
    }

    // Build Versioned Transaction
    const latestBlockhash = await connection.getLatestBlockhash();

    const message = new TransactionMessage({
      payerKey: userPublicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message(lookupTables);

    const versionedTx = new VersionedTransaction(message);

    // Sign using Phantom
    const signedTx = await provider.signTransaction(versionedTx);

    // Send and confirm
    const txid = await connection.sendTransaction(signedTx, {
      skipPreflight: true,
    });
    toast.info(`Transaction sent: ${txid}`);

    await connection.confirmTransaction(
      {
        signature: txid,
        ...latestBlockhash,
      },
      "confirmed"
    );
    toast.success("🎉 Transaction confirmed!");

    return txid;
  } catch (err: any) {
    console.error("Failed to submit Solana transaction", err);
    throw new Error(err.message || "Solana transaction failed");
  }
};

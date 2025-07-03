/**
 * Extracts the `orderId` (bytes32) from a transaction receipt by locating the `OrderInitiated` event emitted by the OktoULL bridge contract.
 * 
 * @param receipt The transaction receipt returned by `publicClient.waitForTransactionReceipt` after the bridge transaction.
 * @returns The extracted `orderId` as a hex string (e.g., `0x...`), or `null` if the event is not found in the receipt logs.
 * 
 */


// Okto ULL bridge 
const ORDER_INITIATED_TOPIC = "0xfba6a68bf5ec51e167735408b7eb881b28929f9c0c3ed0db4ea6eb1015261fd6";

export function extractOrderIdFromReceipt(
  receipt: any
): `0x${string}` | null {
  try {
    if (!receipt?.logs?.length) {
      console.warn("[extractOrderIdFromReceipt] Receipt has no logs.");
      return null;
    }

    const orderLog = receipt.logs.find(
      (log) => log?.topics[0]?.toLowerCase() === ORDER_INITIATED_TOPIC
    );

    if (!orderLog) {
      console.warn("[extractOrderIdFromReceipt] OrderInitiated event not found.");
      return null;
    }

    // Extract the first 32 bytes (64 hex chars) from the data field from the data and then append 0x in start
    const orderId = `0x${orderLog.data.slice(2, 66)}`;

    console.log("[extractOrderIdFromReceipt] Extracted OrderId:", orderId);
    return orderId as `0x${string}`;
  } catch (error) {
    console.error("[extractOrderIdFromReceipt] Error extracting orderId:", error);
    return null;
  }
}

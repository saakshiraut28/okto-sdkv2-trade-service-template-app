export const getChainIdFromCaip = (caipId: string): number =>
  parseInt(caipId.split(":")[1]);

export const toCaipChainId = (chainId: number): string => `eip155:${chainId}`;

export const toHexChainId = (caipId: string): string => {
  const chainId = getChainIdFromCaip(caipId);
  return `0x${chainId.toString(16)}`;
};

export type TokenInfo = {
  address: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
};

export type ChainKey = "monad" | "baseSepolia";

export interface ChainConfig {
  key: ChainKey;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  testnet: boolean;
  color: string;
  /** CAIP-2 network identifier (e.g. "eip155:10143") */
  caip2: string;
}

export const CHAINS: Record<ChainKey, ChainConfig> = {
  monad: {
    key: "monad",
    name: "Monad Testnet",
    chainId: 10143,
    rpcUrl: "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://testnet.monadexplorer.com",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    testnet: true,
    color: "#8100D1",
    caip2: "eip155:10143",
  },
  baseSepolia: {
    key: "baseSepolia",
    name: "Base Sepolia",
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    testnet: true,
    color: "#0052FF",
    caip2: "eip155:84532",
  },
};

export const CHAIN_LIST = Object.values(CHAINS);

/** Hub contract lives on Monad, payments accepted from any chain */
export const HUB_CHAIN: ChainKey = "monad";
export const DEFAULT_CHAIN: ChainKey = "monad";

export function getChainByChainId(chainId: number): ChainConfig | undefined {
  return CHAIN_LIST.find((c) => c.chainId === chainId);
}

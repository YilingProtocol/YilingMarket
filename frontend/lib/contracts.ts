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
  /** Whether wagmi/viem can manage this chain. Non-EVM chains (e.g. Solana)
   *  will need separate signer plumbing when they are re-introduced. */
  isEvm: boolean;
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
    isEvm: true,
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
    isEvm: true,
  },
};

/** Chains wagmi can manage today. Additional non-EVM chains may be added later. */
export const EVM_CHAINS = Object.values(CHAINS).filter((c) => c.isEvm);

/** Hub contract lives on Monad, payments accepted from any supported chain. */
export const HUB_CHAIN: ChainKey = "monad";
export const DEFAULT_CHAIN: ChainKey = "monad";

export function getChainByChainId(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find((c) => c.chainId === chainId);
}

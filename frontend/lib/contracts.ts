export type ChainKey = "monad" | "baseSepolia" | "solanaDevnet";

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
  /** Whether this is an EVM chain (false for Solana etc.) */
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
  solanaDevnet: {
    key: "solanaDevnet",
    name: "Solana Devnet",
    chainId: 0, // Not EVM — chainId not applicable
    rpcUrl: "https://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com/?cluster=devnet",
    nativeCurrency: { name: "Solana", symbol: "SOL", decimals: 9 },
    testnet: true,
    color: "#9945FF",
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    isEvm: false,
  },
};

/** Only EVM chains that wagmi can handle */
export const EVM_CHAINS = Object.values(CHAINS).filter((c) => c.isEvm);

/** Hub contract lives on Monad, payments accepted from any chain */
export const HUB_CHAIN: ChainKey = "monad";
export const DEFAULT_CHAIN: ChainKey = "monad";

export function getChainByChainId(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find((c) => c.chainId === chainId);
}

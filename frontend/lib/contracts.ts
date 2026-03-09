export type ChainKey = "base" | "monad";

export interface ChainConfig {
  key: ChainKey;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  contractAddress: `0x${string}`;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  testnet: boolean;
  color: string;
  apiUrl: string;
  wsUrl: string;
}

export const CHAINS: Record<ChainKey, ChainConfig> = {
  base: {
    key: "base",
    name: "Base Sepolia",
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    contractAddress: "0x100647AC385271d5f955107c5C18360B3029311c",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    testnet: true,
    color: "#0052FF",
    apiUrl: process.env.NEXT_PUBLIC_BASE_API_URL || process.env.NEXT_PUBLIC_API_URL || "",
    wsUrl: process.env.NEXT_PUBLIC_BASE_WS_URL || process.env.NEXT_PUBLIC_WS_URL || "",
  },
  monad: {
    key: "monad",
    name: "Monad Testnet",
    chainId: 10143,
    rpcUrl: "https://testnet-rpc.monad.xyz",
    explorerUrl: "https://testnet.monadexplorer.com",
    contractAddress: "0xDb44158019a88FEC76E1aBC1F9fE80c6C87DAD65",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    testnet: true,
    color: "#836EF9",
    apiUrl: process.env.NEXT_PUBLIC_MONAD_API_URL || "",
    wsUrl: process.env.NEXT_PUBLIC_MONAD_WS_URL || "",
  },
};

export const DEFAULT_CHAIN: ChainKey = "base";

// Helper to get chain config by chainId
export function getChainByChainId(chainId: number): ChainConfig | undefined {
  return Object.values(CHAINS).find((c) => c.chainId === chainId);
}

// Legacy exports for backward compatibility
export const CONTRACT_ADDRESS = CHAINS.base.contractAddress;
export const CHAIN_ID = CHAINS.base.chainId;
export const RPC_URL = CHAINS.base.rpcUrl;
export const EXPLORER_URL = CHAINS.base.explorerUrl;
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

export const CONTRACT_ABI = [
  {
    type: "function",
    name: "createMarket",
    inputs: [
      { name: "question", type: "string" },
      { name: "alpha", type: "uint256" },
      { name: "k", type: "uint256" },
      { name: "flatReward", type: "uint256" },
      { name: "bondAmount", type: "uint256" },
      { name: "liquidityParam", type: "uint256" },
      { name: "initialPrice", type: "uint256" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "predict",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "probability", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "claimPayout",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "forceResolve",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMarketCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketInfo",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "question", type: "string" },
      { name: "currentPrice", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "resolved", type: "bool" },
      { name: "totalPool", type: "uint256" },
      { name: "predictionCount", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMarketParams",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "alpha", type: "uint256" },
      { name: "k", type: "uint256" },
      { name: "flatReward", type: "uint256" },
      { name: "bondAmount", type: "uint256" },
      { name: "liquidityParam", type: "uint256" },
      { name: "createdAt", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPayoutAmount",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "predictor", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPrediction",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "index", type: "uint256" },
    ],
    outputs: [
      { name: "predictor", type: "address" },
      { name: "probability", type: "uint256" },
      { name: "priceBefore", type: "uint256" },
      { name: "priceAfter", type: "uint256" },
      { name: "bond", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPredictionCount",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProtocolConfig",
    inputs: [],
    outputs: [
      { name: "_owner", type: "address" },
      { name: "_treasury", type: "address" },
      { name: "_protocolFeeBps", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isMarketActive",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasPredicted",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasClaimed",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "alpha", type: "uint256", indexed: false },
      { name: "initialPrice", type: "uint256", indexed: false },
      { name: "creator", type: "address", indexed: false },
      { name: "liquidityParam", type: "uint256", indexed: false },
      { name: "bondAmount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PredictionMade",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "predictor", type: "address", indexed: true },
      { name: "probability", type: "uint256", indexed: false },
      { name: "priceBefore", type: "uint256", indexed: false },
      { name: "predictionIndex", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "finalPrice", type: "uint256", indexed: false },
      { name: "totalPredictions", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PayoutClaimed",
    inputs: [
      { name: "marketId", type: "uint256", indexed: true },
      { name: "predictor", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

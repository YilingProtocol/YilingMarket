export const CONTRACT_ADDRESS = "0x100647AC385271d5f955107c5C18360B3029311c" as const;
export const CHAIN_ID = 84532;
export const RPC_URL = "https://sepolia.base.org";
export const EXPLORER_URL = "https://sepolia.basescan.org";
export const WS_URL = "ws://localhost:8765";

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

import dotenv from "dotenv";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: join(__dirname, "..", "agents", ".env") });

export const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";
export const CHAIN_ID = 84532;
export const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

// Multi-chain config
export const CHAINS = {
  base: {
    rpcUrl: process.env.RPC_URL || "https://sepolia.base.org",
    contractAddress: process.env.CONTRACT_ADDRESS || "",
    chainId: 84532,
    name: "Base Sepolia",
    symbol: "ETH",
  },
  monad: {
    rpcUrl: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
    contractAddress: process.env.MONAD_CONTRACT_ADDRESS || "0xDb44158019a88FEC76E1aBC1F9fE80c6C87DAD65",
    chainId: 10143,
    name: "Monad Testnet",
    symbol: "MON",
  },
};

export const AGENT_KEYS = Array.from({ length: 7 }, (_, i) =>
  process.env[`AGENT_KEY_${i + 1}`] || ""
);
export const OWNER_KEY = process.env.OWNER_KEY || "";

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
export const LLM_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

// Market defaults (WAD = 1e18)
export const DEFAULT_ALPHA = BigInt("100000000000000000"); // 0.1e18
export const DEFAULT_K = 2;
export const DEFAULT_FLAT_REWARD = BigInt("1000000000000000"); // 0.001e18
export const DEFAULT_BOND_AMOUNT = BigInt("1000000000000000"); // 0.001e18
export const DEFAULT_LIQUIDITY_PARAM = BigInt("3000000000000000"); // 0.003e18
export const DEFAULT_INITIAL_PRICE = BigInt("500000000000000000"); // 0.5e18
export const MAX_ROUNDS_PER_MARKET = 30;
export const DELAY_BETWEEN_PREDICTIONS = 2; // seconds

export const WAD = BigInt("1000000000000000000"); // 1e18

export function loadABI() {
  // Try Foundry build artifacts
  const foundryPath = join(__dirname, "..", "contracts", "out", "PredictionMarket.sol", "PredictionMarket.json");
  try {
    const data = JSON.parse(readFileSync(foundryPath, "utf8"));
    return data.abi;
  } catch {}

  // Try bundled abi.json in agents-node
  const bundledPath = join(__dirname, "abi.json");
  try {
    return JSON.parse(readFileSync(bundledPath, "utf8"));
  } catch {}

  // Try bundled abi.json in agents (python dir)
  const agentsPath = join(__dirname, "..", "agents", "abi.json");
  try {
    return JSON.parse(readFileSync(agentsPath, "utf8"));
  } catch {}

  // Fallback: use the ABI from frontend contracts.ts (hardcoded)
  return CONTRACT_ABI;
}

// Inline ABI (same as frontend/lib/contracts.ts)
const CONTRACT_ABI = [
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
    name: "sweepResidual",
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
    type: "function",
    name: "getMarketBondStats",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "totalBonds", type: "uint256" },
      { name: "totalPayoutsAllocated", type: "uint256" },
    ],
    stateMutability: "view",
  },
];

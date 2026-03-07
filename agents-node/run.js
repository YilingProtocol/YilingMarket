#!/usr/bin/env node
/**
 * Yiling Protocol - Self-Resolving Prediction Market (Node.js)
 *
 * Oracle-free prediction market on Base Sepolia with AI agent predictions.
 *
 * Usage:
 *   node run.js --mode orchestrate    # Full: run agents + watch for markets
 *   node run.js --mode watch          # Read-only: monitor chain events
 */

import { parseArgs } from "node:util";
import {
  RPC_URL, CONTRACT_ADDRESS, AGENT_KEYS, OWNER_KEY,
  OPENAI_API_KEY, LLM_MODEL,
  DEFAULT_BOND_AMOUNT, DEFAULT_LIQUIDITY_PARAM,
  DELAY_BETWEEN_PREDICTIONS, WAD,
} from "./config.js";
import { AGENT_PROFILES } from "./profiles.js";
import { MarketClient } from "./marketClient.js";
import { BaseAgent } from "./baseAgent.js";
import { Orchestrator } from "./orchestrator.js";
import { MarketWatcher } from "./marketWatcher.js";
import { EventBroadcaster } from "./eventBroadcaster.js";
import { startApiServer, setSharedState } from "./apiServer.js";

const { values: args } = parseArgs({
  options: {
    mode: { type: "string", default: "orchestrate" },
    delay: { type: "string", default: String(DELAY_BETWEEN_PREDICTIONS) },
    "ws-port": { type: "string", default: "8765" },
    "poll-interval": { type: "string", default: "5" },
    "api-port": { type: "string", default: "8000" },
  },
});

const mode = args.mode;
const delay = parseFloat(args.delay);
const wsPort = parseInt(args["ws-port"]);
const pollInterval = parseFloat(args["poll-interval"]);
const apiPort = parseInt(args["api-port"]);

async function main() {
  if (!CONTRACT_ADDRESS) {
    console.error("ERROR: CONTRACT_ADDRESS not set. Deploy the contract first and set it in .env");
    process.exit(1);
  }

  if (mode === "orchestrate") {
    await runOrchestrateMode();
  } else {
    await runWatchMode();
  }
}

async function runOrchestrateMode() {
  if (!OPENAI_API_KEY) {
    console.error("ERROR: No LLM API keys set. Set at least OPENAI_API_KEY in .env");
    process.exit(1);
  }
  console.log("  LLM providers available: openai");

  // Build agents
  const activeProfiles = [];
  const activeKeys = [];
  for (let i = 0; i < AGENT_PROFILES.length; i++) {
    const key = AGENT_KEYS[i];
    if (key) {
      activeProfiles.push(AGENT_PROFILES[i]);
      activeKeys.push(key);
    } else {
      console.log(`WARNING: AGENT_KEY_${i + 1} not set — skipping ${AGENT_PROFILES[i].name}`);
    }
  }

  if (!activeKeys.length) {
    console.error("ERROR: No agent keys configured. Set at least AGENT_KEY_1 in .env");
    process.exit(1);
  }

  const marketClient = new MarketClient(RPC_URL, CONTRACT_ADDRESS, activeKeys[0]);

  const predictionAgents = activeProfiles.map((profile, i) =>
    new BaseAgent({
      name: profile.name,
      systemPrompt: profile.prompt,
      privateKey: activeKeys[i],
      rpcUrl: RPC_URL,
      contractAddress: CONTRACT_ADDRESS,
      llmModel: profile.llm_model || LLM_MODEL,
      llmProvider: profile.llm_provider || "openai",
      apiKey: OPENAI_API_KEY,
    })
  );

  const broadcaster = new EventBroadcaster(wsPort);

  let ownerClient = null;
  if (OWNER_KEY) {
    ownerClient = new MarketClient(RPC_URL, CONTRACT_ADDRESS, OWNER_KEY);
  }

  const orchestrator = new Orchestrator({
    agents: predictionAgents,
    marketClient,
    broadcaster,
    bondAmount: DEFAULT_BOND_AMOUNT,
    delay,
    ownerClient,
  });

  // Get protocol config
  const protocolConfig = await marketClient.getProtocolConfig();

  // Print banner
  console.log();
  console.log("  +---------------------------------------------------+");
  console.log("  |         YILING PROTOCOL                      |");
  console.log("  |   Self-Resolving Prediction Market (SKC)          |");
  console.log("  |   Bond-Based - Oracle-Free - Base Sepolia          |");
  console.log("  +---------------------------------------------------+");
  console.log();
  console.log(`  Contract  : ${CONTRACT_ADDRESS}`);
  console.log(`  Treasury  : ${protocolConfig.treasury} (on-chain)`);
  console.log(`  Fee       : ${protocolConfig.protocolFeeBps / 100}% (on-chain)`);
  console.log(`  Network   : Base Sepolia (${RPC_URL})`);
  console.log(`  Agents    : ${predictionAgents.length} active`);
  for (const a of predictionAgents) {
    console.log(`               - ${a.name} (${a.llm.providerName})`);
  }
  console.log(`  Bond      : ${Number(DEFAULT_BOND_AMOUNT) / 1e18} ETH`);
  console.log(`  Liquidity : ${Number(DEFAULT_LIQUIDITY_PARAM) / 1e18} ETH (b param)`);
  console.log(`  Mode      : ORCHESTRATE (built-in agents)`);
  console.log(`  Poll      : every ${pollInterval}s`);
  console.log(`  Dashboard : frontend/index.html (ws://localhost:${wsPort})`);
  console.log();

  // Start services
  broadcaster.start();
  setSharedState(marketClient, orchestrator);
  startApiServer(apiPort);

  const watcher = new MarketWatcher({
    marketClient,
    orchestrator,
    broadcaster,
    pollInterval,
  });
  await watcher.start();

  console.log("  Watching for new markets... (Ctrl+C to stop)\n");

  // Poll loop
  const pollLoop = async () => {
    while (true) {
      await watcher.poll();
      await new Promise((r) => setTimeout(r, pollInterval * 1000));
    }
  };

  process.on("SIGINT", () => {
    console.log("\n[MarketWatcher] Stopped.");
    watcher.stop();
    process.exit(0);
  });

  await pollLoop();
}

async function runWatchMode() {
  const readKey = AGENT_KEYS.find((k) => k) || "";
  if (!readKey) {
    console.error("ERROR: At least one AGENT_KEY needed for RPC access.");
    process.exit(1);
  }

  const marketClient = new MarketClient(RPC_URL, CONTRACT_ADDRESS, readKey);
  const protocolConfig = await marketClient.getProtocolConfig();
  const broadcaster = new EventBroadcaster(wsPort);

  console.log();
  console.log("  +---------------------------------------------------+");
  console.log("  |         YILING PROTOCOL                      |");
  console.log("  |   Self-Resolving Prediction Market (SKC)          |");
  console.log("  |   Bond-Based - Oracle-Free - Base Sepolia          |");
  console.log("  +---------------------------------------------------+");
  console.log();
  console.log(`  Contract  : ${CONTRACT_ADDRESS}`);
  console.log(`  Treasury  : ${protocolConfig.treasury} (on-chain)`);
  console.log(`  Fee       : ${protocolConfig.protocolFeeBps / 100}% (on-chain)`);
  console.log(`  Network   : Base Sepolia (${RPC_URL})`);
  console.log(`  Mode      : WATCH (read-only)`);
  console.log(`  Poll      : every ${pollInterval}s`);
  console.log(`  Dashboard : frontend/index.html (ws://localhost:${wsPort})`);
  console.log();

  broadcaster.start();
  setSharedState(marketClient, null);
  startApiServer(apiPort);

  let baseline = await marketClient.getMarketCount();
  console.log(`[Watcher] Baseline: ${baseline} markets`);
  broadcaster.emit("system", { message: `Watcher active — monitoring (baseline: ${baseline})` });

  console.log("  Watching chain for events... (Ctrl+C to stop)\n");

  process.on("SIGINT", () => {
    console.log("\n[Watcher] Stopped.");
    process.exit(0);
  });

  while (true) {
    try {
      const count = await marketClient.getMarketCount();
      if (count > baseline) {
        for (let i = baseline; i < count; i++) {
          const info = await marketClient.getMarketInfo(i);
          const price = Number(info.currentPrice) / 1e18;
          console.log(`[Watcher] New market #${i}: ${info.question}`);
          broadcaster.marketCreated(i, info.question, price, "User", "user");
        }
        baseline = count;
      }
    } catch (e) {
      console.error(`[Watcher] Poll error: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, pollInterval * 1000));
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

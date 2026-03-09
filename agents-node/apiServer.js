import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { AGENT_PROFILES } from "./profiles.js";
import { AGENT_KEYS, OPENAI_API_KEY, CHAINS } from "./config.js";
import { ReadOnlyMarketClient } from "./marketClient.js";
import { ethers } from "ethers";

let _marketClient = null; // default (base) client for orchestrator
let _orchestrator = null;

// Read-only clients per chain (lazy initialized)
const _chainClients = {};

function getChainClient(chainKey) {
  // If it's the default chain and we have the orchestrator's client, use that
  if (chainKey === "base" && _marketClient) return _marketClient;

  if (!_chainClients[chainKey]) {
    const cfg = CHAINS[chainKey];
    if (!cfg || !cfg.contractAddress) return null;
    _chainClients[chainKey] = new ReadOnlyMarketClient(cfg.rpcUrl, cfg.contractAddress);
  }
  return _chainClients[chainKey];
}

function resolveClient(req) {
  const chain = req.query.chain || "base";
  const client = getChainClient(chain);
  return { client, chain };
}

export function setSharedState(marketClient, orchestrator) {
  _marketClient = marketClient;
  _orchestrator = orchestrator;
}

function getAgentNameMap() {
  const mapping = {};
  for (let i = 0; i < AGENT_PROFILES.length; i++) {
    const key = AGENT_KEYS[i];
    if (key) {
      try {
        const wallet = new ethers.Wallet(key);
        mapping[wallet.address.toLowerCase()] = AGENT_PROFILES[i].name;
      } catch {}
    }
  }
  return mapping;
}

export function startApiServer(port = 8000) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Initialize monad client eagerly so it's ready
  getChainClient("monad");

  const statsCache = { data: null, ts: 0 };
  app.get("/api/stats", async (req, res) => {
    const now = Date.now();
    if (statsCache.data && now - statsCache.ts < 60000) {
      return res.json(statsCache.data);
    }
    const { client } = resolveClient(req);
    if (!client) return res.json({ total_agents: 0, total_markets: 0 });
    try {
      const marketCount = await client.getMarketCount();
      const total_agents = AGENT_PROFILES.length;
      const result = { total_agents, total_markets: marketCount };
      statsCache.data = result;
      statsCache.ts = now;
      res.json(result);
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      mode: _orchestrator ? "orchestrate" : "standalone",
      market_client: !!_marketClient,
      orchestrator: !!_orchestrator,
      chains: Object.keys(CHAINS),
    });
  });

  app.get("/api/chains", (req, res) => {
    res.json(
      Object.entries(CHAINS).map(([key, cfg]) => ({
        key,
        name: cfg.name,
        chainId: cfg.chainId,
        symbol: cfg.symbol,
        active: !!cfg.contractAddress,
      }))
    );
  });

  app.get("/api/markets", async (req, res) => {
    const { client } = resolveClient(req);
    if (!client) return res.status(503).json({ detail: "Chain not initialized" });
    try {
      const count = await client.getMarketCount();
      const markets = [];
      for (let i = 0; i < count; i++) {
        try {
          const [info, active] = await Promise.all([
            client.getMarketInfo(i),
            client.isMarketActive(i),
          ]);
          markets.push({
            market_id: i,
            question: info.question,
            creator: info.creator,
            current_price: Number(info.currentPrice) / 1e18,
            resolved: info.resolved,
            is_active: active,
            prediction_count: info.predictionCount,
            total_pool: Number(info.totalPool) / 1e18,
          });
        } catch {}
      }
      res.json(markets);
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get("/api/markets/count", async (req, res) => {
    const { client } = resolveClient(req);
    if (!client) return res.status(503).json({ detail: "Chain not initialized" });
    try {
      const count = await client.getMarketCount();
      res.json({ count });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    const { client } = resolveClient(req);
    if (!client) return res.status(503).json({ detail: "Chain not initialized" });
    const marketId = parseInt(req.params.id);
    try {
      const info = await client.getMarketInfo(marketId);
      const params = await client.getMarketParams(marketId);
      const predictions = await client.getPredictions(marketId);
      res.json({
        market_id: marketId,
        question: info.question,
        current_price: Number(info.currentPrice) / 1e18,
        creator: info.creator,
        resolved: info.resolved,
        total_pool: Number(info.totalPool) / 1e18,
        prediction_count: info.predictionCount,
        params: {
          alpha: Number(params.alpha) / 1e18,
          k: params.k,
          flat_reward: Number(params.flatReward) / 1e18,
          bond_amount: Number(params.bondAmount) / 1e18,
          liquidity_param: Number(params.liquidityParam) / 1e18,
          created_at: params.createdAt,
        },
        predictions: predictions.map((p, i) => ({
          index: i,
          predictor: p.predictor,
          probability: Number(p.probability) / 1e18,
          price_before: Number(p.priceBefore) / 1e18,
          price_after: Number(p.priceAfter) / 1e18,
          bond: Number(p.bond) / 1e18,
          timestamp: p.timestamp,
        })),
      });
    } catch (e) {
      res.status(404).json({ detail: `Market not found: ${e.message}` });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    const { client } = resolveClient(req);
    if (!client) return res.json({ rankings: [] });
    try {
      const nameMap = getAgentNameMap();
      const agentAddresses = Object.keys(nameMap);
      if (!agentAddresses.length) return res.json({ rankings: [] });

      const marketCount = await client.getMarketCount();
      const totals = {};
      for (const addr of agentAddresses) {
        totals[addr] = 0;
      }

      for (let i = 0; i < marketCount; i++) {
        const info = await client.getMarketInfo(i);
        if (!info.resolved) continue;

        await Promise.all(agentAddresses.map(async (addr) => {
          try {
            const predicted = await client.hasPredicted(i, addr);
            if (!predicted) return;
            const payout = await client.getPayout(i, addr);
            const params = await client.getMarketParams(i);
            const net = Number(payout) / 1e18 - Number(params.bondAmount) / 1e18;
            totals[addr] += net;
          } catch {}
        }));
      }

      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      res.json({
        rankings: sorted.map(([addr, eth], i) => ({
          rank: i + 1,
          agent: nameMap[addr] || addr,
          total_eth: Math.round(eth * 1e6) / 1e6,
        })),
      });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get("/api/markets/:id/leaderboard", async (req, res) => {
    const { client } = resolveClient(req);
    if (!client) return res.json({ rankings: [] });
    const marketId = parseInt(req.params.id);
    try {
      const info = await client.getMarketInfo(marketId);
      if (!info.resolved) return res.json({ rankings: [] });

      const nameMap = getAgentNameMap();
      const predictions = await client.getPredictions(marketId);
      const params = await client.getMarketParams(marketId);
      const bondAmt = Number(params.bondAmount) / 1e18;

      const rankings = await Promise.all(predictions.map(async (p, i) => {
        const addr = p.predictor.toLowerCase();
        try {
          const payout = await client.getPayout(marketId, p.predictor);
          const net = Number(payout) / 1e18 - bondAmt;
          return {
            rank: 0,
            agent: nameMap[addr] || `${p.predictor.slice(0, 6)}...${p.predictor.slice(-4)}`,
            address: p.predictor,
            total_eth: Math.round(net * 1e6) / 1e6,
            probability: Number(p.probability) / 1e18,
          };
        } catch {
          return null;
        }
      }));

      const valid = rankings.filter(Boolean).sort((a, b) => b.total_eth - a.total_eth);
      valid.forEach((r, i) => r.rank = i + 1);

      res.json({ rankings: valid });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.post("/api/validate-question", async (req, res) => {
    const { question } = req.body;
    if (!question || question.trim().length < 10) {
      return res.json({ valid: false, reason: "Question is too short. Please provide a more detailed question." });
    }

    try {
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a question validator for a self-resolving prediction market (based on the paper "Self-Resolving Prediction Markets for Unverifiable Outcomes" by Yiling Chen et al.).

This market is designed for questions that are either:
1. UNVERIFIABLE — No oracle, API, or data source can definitively determine the true answer. These are subjective, philosophical, or opinion-based questions.
2. LONG-HORIZON — The outcome is so far in the future (years/decades) that no current oracle can resolve it, and locking capital until resolution is impractical.

REJECT questions that are:
- Short-term verifiable facts (e.g., "Will ETH hit $5000 tomorrow?" — a price oracle can verify this)
- Already known or easily googleable (e.g., "Is the Earth round?")
- Binary sports/election results with near-term resolution dates and available oracles

Respond in JSON: {"valid": true/false, "reason": "brief explanation in English"}`
          },
          {
            role: "user",
            content: `Is this question suitable for a self-resolving prediction market?\n\nQuestion: "${question.trim()}"`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content);
      res.json({ valid: !!result.valid, reason: result.reason || "" });
    } catch (e) {
      console.error(`[Validate] LLM error: ${e.message}`);
      res.json({ valid: true, reason: "Validation unavailable, proceeding." });
    }
  });

  app.get("/api/agent-names", (req, res) => {
    res.json(getAgentNameMap());
  });

  app.get("/api/protocol", async (req, res) => {
    const { client } = resolveClient(req);
    if (!client) return res.status(503).json({ detail: "Chain not initialized" });
    try {
      const config = await client.getProtocolConfig();
      res.json({
        owner: config.owner,
        treasury: config.treasury,
        protocol_fee_bps: config.protocolFeeBps,
        protocol_fee_percent: config.protocolFeeBps / 100,
      });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`[API] REST server running on http://0.0.0.0:${port}`);
    console.log(`[API] Supported chains: ${Object.keys(CHAINS).join(", ")}`);
    console.log(`[API] Usage: /api/markets?chain=base or /api/markets?chain=monad`);
  });

  return server;
}

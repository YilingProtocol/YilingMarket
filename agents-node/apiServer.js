import express from "express";
import cors from "cors";
import { AGENT_PROFILES } from "./profiles.js";
import { AGENT_KEYS } from "./config.js";
import { ethers } from "ethers";

let _marketClient = null;
let _orchestrator = null;

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

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      mode: _orchestrator ? "orchestrate" : "standalone",
      market_client: !!_marketClient,
      orchestrator: !!_orchestrator,
    });
  });

  app.get("/api/markets", async (req, res) => {
    if (!_marketClient) return res.status(503).json({ detail: "Not initialized" });
    try {
      const count = await _marketClient.getMarketCount();
      const markets = [];
      for (let i = 0; i < count; i++) {
        try {
          const [info, active] = await Promise.all([
            _marketClient.getMarketInfo(i),
            _marketClient.isMarketActive(i),
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
    if (!_marketClient) return res.status(503).json({ detail: "Not initialized" });
    try {
      const count = await _marketClient.getMarketCount();
      res.json({ count });
    } catch (e) {
      res.status(500).json({ detail: e.message });
    }
  });

  app.get("/api/markets/:id", async (req, res) => {
    if (!_marketClient) return res.status(503).json({ detail: "Not initialized" });
    const marketId = parseInt(req.params.id);
    try {
      const info = await _marketClient.getMarketInfo(marketId);
      const params = await _marketClient.getMarketParams(marketId);
      const predictions = await _marketClient.getPredictions(marketId);
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

  app.get("/api/leaderboard", (req, res) => {
    if (!_orchestrator) return res.json({ rankings: [] });
    const sorted = Object.entries(_orchestrator.leaderboard).sort((a, b) => b[1] - a[1]);
    res.json({
      rankings: sorted.map(([name, mon], i) => ({
        rank: i + 1,
        agent: name,
        total_eth: Math.round(mon * 1e6) / 1e6,
      })),
    });
  });

  app.get("/api/agent-names", (req, res) => {
    res.json(getAgentNameMap());
  });

  app.get("/api/protocol", async (req, res) => {
    if (!_marketClient) return res.status(503).json({ detail: "Not initialized" });
    try {
      const config = await _marketClient.getProtocolConfig();
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
    console.log(`[API] Docs: http://localhost:${port}/api/health`);
  });

  return server;
}

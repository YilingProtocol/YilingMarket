import { WAD } from "./config.js";
import { AGENT_PROFILES } from "./profiles.js";

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const AGENT_TITLES = Object.fromEntries(AGENT_PROFILES.map((p) => [p.name, p.title]));

export class Orchestrator {
  constructor({ agents, marketClient, broadcaster, bondAmount, delay = 2, ownerClient = null }) {
    this.agents = agents;
    this.marketClient = marketClient;
    this.broadcaster = broadcaster;
    this.bondAmount = bondAmount;
    this.delay = delay;
    this.ownerClient = ownerClient;
    this.leaderboard = Object.fromEntries(agents.map((a) => [a.name, 0]));
  }

  async _updateGas() {
    try {
      const gasPrice = await this.marketClient.getGasPrice();
      const gwei = Number(gasPrice) / 1e9;
      this.broadcaster.gasUpdate(Math.round(gwei * 100) / 100);
    } catch {}
  }

  async runMarket(marketId) {
    const results = [];
    const totalAgents = this.agents.length;

    await this._updateGas();

    const agentOrder = shuffle(this.agents);

    for (let i = 0; i < agentOrder.length; i++) {
      const agent = agentOrder[i];
      const roundNum = i + 1;

      this.broadcaster.roundUpdate(roundNum, totalAgents, agent.name);
      this.broadcaster.agentThinking(agent.name, marketId);
      await sleep(500);

      try {
        // Balance check
        const balance = await agent.client.getBalance(agent.address);
        const gasPrice = await agent.client.getGasPrice();
        const needed = this.bondAmount + 500000n * gasPrice;
        if (balance < needed) {
          console.log(`[${agent.name}] Insufficient balance (${Number(balance) / 1e18} ETH), skipping`);
          this.broadcaster.emit("error", {
            agent: agent.name,
            message: `Low balance: ${(Number(balance) / 1e18).toFixed(4)} ETH, skipping turn`,
          });
          continue;
        }

        // Observe
        const state = await agent.observeMarket(marketId);
        if (state.resolved) {
          return await this._generateReport(marketId, results);
        }

        // Reason (LLM call)
        const reasoning = await agent.reason(state);
        const prob = reasoning.probability;
        const confidence = reasoning.confidence || 0;

        this.broadcaster.agentReasoning(agent.name, reasoning.reasoning, prob, confidence);

        // Submit prediction on-chain
        let probWad = BigInt(Math.round(prob * 1e18));
        const minProb = BigInt("10000000000000000");
        const maxProb = BigInt("990000000000000000");
        if (probWad < minProb) probWad = minProb;
        if (probWad > maxProb) probWad = maxProb;

        const t0 = Date.now();
        const receipt = await agent.client.predict(marketId, probWad, this.bondAmount);
        const confirmTime = ((Date.now() - t0) / 1000).toFixed(1);

        const txHash = receipt.hash;
        const gasUsed = Number(receipt.gasUsed || 0);

        this.broadcaster.predictionSubmitted(agent.name, prob, txHash, gasUsed, parseFloat(confirmTime));

        // Check if market resolved (dice roll)
        const marketInfo = await agent.client.getMarketInfo(marketId);
        const resolved = marketInfo.resolved;

        await sleep(300);
        this.broadcaster.diceRoll(marketId, !resolved);

        results.push({
          round: roundNum,
          agent: agent.name,
          probability: prob,
          reasoning: reasoning.reasoning,
          confidence,
          tx_hash: txHash,
          gas_used: gasUsed,
          confirm_time: parseFloat(confirmTime),
          status: "predicted",
        });

        if (resolved) {
          this.broadcaster.marketResolved(marketId, prob, AGENT_TITLES[agent.name] || agent.name, roundNum);
          return await this._generateReport(marketId, results);
        }
      } catch (e) {
        console.error(`[${agent.name}] Error: ${e.message}`);
        this.broadcaster.emit("error", { agent: agent.name, message: e.message });
        results.push({
          round: roundNum,
          agent: agent.name,
          status: "error",
          error: e.message,
        });
      }

      await this._updateGas();
      await sleep(this.delay * 1000);
    }

    // All agents predicted, market not resolved -> force resolve
    const marketInfo = await this.marketClient.getMarketInfo(marketId);
    if (!marketInfo.resolved) {
      this.broadcaster.emit("system", {
        message: `All agents predicted on market #${marketId}. Force-resolving...`,
      });
      try {
        const resolveClient = this.ownerClient || this.marketClient;
        await resolveClient.forceResolve(marketId);
        await sleep(2000);
        const finalInfo = await this.marketClient.getMarketInfo(marketId);
        const finalPrice = Number(finalInfo.currentPrice) / Number(WAD);
        this.broadcaster.diceRoll(marketId, false);
        this.broadcaster.marketResolved(marketId, finalPrice, "All agents predicted", finalInfo.predictionCount);
      } catch (e) {
        console.error(`[Orchestrator] Force-resolve failed: ${e.message}`);
        this.broadcaster.emit("error", { message: `Force-resolve failed: ${e.message}` });
      }
    }

    return await this._generateReport(marketId, results);
  }

  async _generateReport(marketId, results) {
    const market = await this.marketClient.getMarket(marketId);

    if (market.resolved) {
      const allPreds = await this.marketClient.getPredictions(marketId);
      for (const agent of this.agents) {
        try {
          const payout = await this.marketClient.getPayout(marketId, agent.address);
          const predCount = allPreds.filter(
            (p) => p.predictor.toLowerCase() === agent.address.toLowerCase()
          ).length;
          const totalBonds = BigInt(predCount) * this.bondAmount;

          const netEth = payout > 0n
            ? Number(payout - totalBonds) / Number(WAD)
            : -Number(totalBonds) / Number(WAD);

          this.leaderboard[agent.name] = (this.leaderboard[agent.name] || 0) + netEth;

          this.broadcaster.payoutUpdate(
            agent.name,
            Math.round(netEth * 1e6) / 1e6,
            Math.round(this.leaderboard[agent.name] * 1e6) / 1e6,
          );
        } catch {}
      }
    }

    // Broadcast leaderboard
    const sortedLb = Object.entries(this.leaderboard).sort((a, b) => b[1] - a[1]);
    this.broadcaster.emit("leaderboard", {
      rankings: sortedLb.map(([agent, totalEth]) => ({
        agent,
        total_eth: Math.round(totalEth * 1e6) / 1e6,
      })),
    });

    const price = Number(market.currentPrice) / Number(WAD);
    console.log(`\nMarket #${marketId} Report:`);
    console.log(`  Question: ${market.question}`);
    console.log(`  Final Price: ${price.toFixed(4)}`);
    console.log(`  Resolved: ${market.resolved}`);
    console.log(`  Predictions: ${market.predictionCount}`);

    return { market_id: marketId, market, results, leaderboard: { ...this.leaderboard } };
  }
}

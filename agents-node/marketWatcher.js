export class MarketWatcher {
  constructor({ marketClient, orchestrator, broadcaster, pollInterval = 5 }) {
    this.marketClient = marketClient;
    this.orchestrator = orchestrator;
    this.broadcaster = broadcaster;
    this.pollInterval = pollInterval;
    this.baseline = 0;
    this.running = false;
    this.busy = false;
  }

  async start() {
    this.baseline = await this.marketClient.getMarketCount();
    this.running = true;
    console.log(`[MarketWatcher] Baseline: ${this.baseline} existing markets`);
    console.log(`[MarketWatcher] Polling every ${this.pollInterval}s for new markets...`);
    this.broadcaster.emit("system", {
      message: `Watcher active — monitoring for new markets (baseline: ${this.baseline})`,
    });
  }

  stop() {
    this.running = false;
  }

  async poll() {
    if (!this.running || this.busy) return;

    let currentCount;
    try {
      currentCount = await this.marketClient.getMarketCount();
    } catch (e) {
      console.error(`[MarketWatcher] Poll error: ${e.message}`);
      return;
    }

    if (currentCount <= this.baseline) return;

    // New markets detected
    for (let marketId = this.baseline; marketId < currentCount; marketId++) {
      await this._handleNewMarket(marketId);
    }
    this.baseline = currentCount;
  }

  async _handleNewMarket(marketId) {
    this.busy = true;
    try {
      const info = await this.marketClient.getMarketInfo(marketId);
      const price = Number(info.currentPrice) / 1e18;

      console.log(`[MarketWatcher] New market #${marketId} detected!`);
      console.log(`  Creator: ${info.creator}`);
      console.log(`  Question: ${info.question}`);

      this.broadcaster.marketCreated(marketId, info.question, price, "User", "user");
      this.broadcaster.emit("system", {
        message: `Market #${marketId} detected — dispatching agents...`,
      });

      const report = await this.orchestrator.runMarket(marketId);

      // Claim payouts if resolved
      if (report.market && report.market.resolved) {
        await this._claimPayouts(marketId);
      }
    } catch (e) {
      console.error(`[MarketWatcher] Error handling market #${marketId}: ${e.message}`);
      this.broadcaster.emit("error", {
        message: `Watcher error on market #${marketId}: ${e.message}`,
      });
    } finally {
      this.busy = false;
    }
  }

  async _claimPayouts(marketId) {
    for (const agent of this.orchestrator.agents) {
      try {
        const payout = await this.marketClient.getPayout(marketId, agent.address);
        if (payout > 0n) {
          await agent.client.claimPayout(marketId);
          console.log(`[MarketWatcher] Claimed payout for ${agent.name} on market #${marketId}`);
        }
      } catch (e) {
        console.error(`[MarketWatcher] Claim failed for ${agent.name}: ${e.message}`);
      }
    }
  }
}

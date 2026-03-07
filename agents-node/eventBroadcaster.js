import { WebSocketServer } from "ws";

export class EventBroadcaster {
  constructor(port = 8765) {
    this.port = port;
    this.clients = new Set();
    this.readyClients = new Set();
    this.marketEvents = [];
    this.wss = null;
  }

  start() {
    this.wss = new WebSocketServer({ port: this.port, host: "0.0.0.0" });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      console.log(`[EventBroadcaster] Client connected (${this.clients.size} total)`);

      // Replay buffered events
      for (const msg of this.marketEvents) {
        try { ws.send(msg); } catch { break; }
      }
      this.readyClients.add(ws);

      ws.on("close", () => {
        this.clients.delete(ws);
        this.readyClients.delete(ws);
        console.log(`[EventBroadcaster] Client disconnected (${this.clients.size} total)`);
      });

      ws.on("error", () => {
        this.clients.delete(ws);
        this.readyClients.delete(ws);
      });
    });

    this.wss.on("error", (err) => {
      console.error(`[EventBroadcaster] Server error: ${err.message}`);
    });

    console.log(`[EventBroadcaster] WebSocket server running on ws://0.0.0.0:${this.port}`);
  }

  emit(eventType, data) {
    const message = JSON.stringify({
      type: eventType,
      data,
      timestamp: Date.now() / 1000,
    });

    // Buffer for replay (reset on new market)
    if (eventType === "market_created") {
      this.marketEvents = [];
    }
    this.marketEvents.push(message);

    // Broadcast to ready clients
    const dead = [];
    for (const client of this.readyClients) {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        } else {
          dead.push(client);
        }
      } catch {
        dead.push(client);
      }
    }
    for (const d of dead) {
      this.readyClients.delete(d);
      this.clients.delete(d);
    }

    // Terminal log
    if (eventType !== "gas_update") {
      const preview = JSON.stringify(data).slice(0, 200);
      console.log(`[EVENT] ${eventType}: ${preview}`);
    }
  }

  // ---- Convenience event methods ----

  marketCreated(marketId, question, initialPrice, category = "", source = "ai") {
    this.emit("market_created", { market_id: marketId, question, initial_price: initialPrice, category, source });
  }

  agentThinking(agentName, marketId) {
    this.emit("agent_thinking", { agent_name: agentName, market_id: marketId });
  }

  agentReasoning(agentName, reasoning, probability, confidence) {
    this.emit("agent_reasoning", { agent_name: agentName, reasoning, probability, confidence });
  }

  predictionSubmitted(agentName, probability, txHash, gasUsed, confirmTime) {
    this.emit("prediction_submitted", { agent_name: agentName, probability, tx_hash: txHash, gas_used: gasUsed, confirm_time: confirmTime });
  }

  diceRoll(marketId, continues) {
    this.emit("dice_roll", { market_id: marketId, continues });
  }

  marketResolved(marketId, finalPrice, refereeAgent, totalPredictions) {
    this.emit("market_resolved", { market_id: marketId, final_price: finalPrice, referee: refereeAgent, total_predictions: totalPredictions });
  }

  payoutUpdate(agentName, amount, totalEarned) {
    this.emit("payout_update", { agent_name: agentName, amount, total_earned: totalEarned });
  }

  gasUpdate(gasPriceGwei) {
    this.emit("gas_update", { gas_price_gwei: gasPriceGwei });
  }

  roundUpdate(roundNum, maxRounds, currentAgent) {
    this.emit("round_update", { round: roundNum, max_rounds: maxRounds, current_agent: currentAgent });
  }
}

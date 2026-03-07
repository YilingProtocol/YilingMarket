import { MarketClient } from "./marketClient.js";
import { createLLMProvider } from "./llmProvider.js";
import { WAD } from "./config.js";

export class BaseAgent {
  constructor({ name, privateKey, rpcUrl, contractAddress, systemPrompt = "", llmModel = "gpt-4o-mini", llmProvider = "openai", apiKey = null }) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.client = new MarketClient(rpcUrl, contractAddress, privateKey);
    this.address = this.client.address;
    this.llm = createLLMProvider(llmProvider, llmModel, apiKey);
    this.llmModel = llmModel;
  }

  async observeMarket(marketId) {
    const market = await this.client.getMarket(marketId);
    const predictions = await this.client.getPredictions(marketId);

    const history = predictions.map((p) => ({
      predictor: p.predictor.slice(0, 10) + "...",
      probability: Number(p.probability * 10000n / WAD) / 10000,
      price_before: Number(p.priceBefore * 10000n / WAD) / 10000,
      price_after: Number(p.priceAfter * 10000n / WAD) / 10000,
    }));

    return {
      question: market.question,
      current_price: Number(market.currentPrice * 10000n / WAD) / 10000,
      prediction_count: market.predictionCount,
      resolved: market.resolved,
      history,
    };
  }

  async reason(marketState) {
    const userPrompt = `Market Question: ${marketState.question}
Current Market Price: ${marketState.current_price} (probability)
Number of Previous Predictions: ${marketState.prediction_count}
Prediction History: ${JSON.stringify(marketState.history, null, 2)}

Based on your analysis, what probability do you assign to this question?
Respond in JSON format:
{"reasoning": "your reasoning here", "probability": 0.XX, "confidence": 0.XX}

Rules:
- probability must be between 0.02 and 0.98
- confidence is how sure you are about your probability estimate (0-1)
- Be specific in your reasoning`;

    const content = await this.llm.chat(this.systemPrompt, userPrompt);
    const result = JSON.parse(content);

    // Clamp probability
    result.probability = Math.max(0.02, Math.min(0.98, parseFloat(result.probability || 0.5)));
    return result;
  }

  async act(marketId, stakeAmount) {
    console.log(`[${this.name}] Observing market ${marketId}...`);
    const state = await this.observeMarket(marketId);

    if (state.resolved) {
      console.log(`[${this.name}] Market already resolved.`);
      return { status: "resolved" };
    }

    console.log(`[${this.name}] Reasoning about: ${state.question}`);
    const reasoning = await this.reason(state);
    const prob = reasoning.probability;
    console.log(`[${this.name}] Prediction: ${prob.toFixed(4)} (confidence: ${reasoning.confidence || "N/A"})`);
    console.log(`[${this.name}] Reasoning: ${reasoning.reasoning.slice(0, 200)}...`);

    // Convert to WAD and submit
    let probWad = BigInt(Math.round(prob * 1e18));
    const minProb = BigInt("10000000000000000"); // 0.01e18
    const maxProb = BigInt("990000000000000000"); // 0.99e18
    if (probWad < minProb) probWad = minProb;
    if (probWad > maxProb) probWad = maxProb;

    console.log(`[${this.name}] Submitting prediction on-chain...`);
    const receipt = await this.client.predict(marketId, probWad, stakeAmount);
    console.log(`[${this.name}] TX: ${receipt.hash}`);

    const marketInfo = await this.client.getMarketInfo(marketId);

    return {
      status: "predicted",
      probability: prob,
      reasoning: reasoning.reasoning,
      confidence: reasoning.confidence,
      tx_hash: receipt.hash,
      market_resolved: marketInfo.resolved,
    };
  }
}

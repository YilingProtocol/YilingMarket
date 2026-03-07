import json
from openai import OpenAI
from market_client import MarketClient, WAD
from llm_providers import LLMProvider, create_llm_provider, OpenAIProvider


class BaseAgent:
    """Yiling Protocol - AI prediction agent driven by a system prompt."""

    def __init__(self, name: str, private_key: str, rpc_url: str,
                 contract_address: str, openai_api_key: str = "",
                 system_prompt: str = "", llm_model: str = "gpt-4o-mini",
                 llm_provider: str = "openai", llm_api_key: str = None):
        self.name = name
        self.system_prompt = system_prompt
        self.client = MarketClient(rpc_url, contract_address, private_key)
        self.address = self.client.address

        # Initialize LLM provider
        if isinstance(llm_provider, str):
            # Determine API key: explicit > provider-specific env > openai fallback
            key = llm_api_key or openai_api_key or None
            try:
                self.llm = create_llm_provider(llm_provider, model=llm_model, api_key=key)
            except (ImportError, ValueError):
                # Fallback to OpenAI if provider unavailable
                print(f"[{name}] Provider '{llm_provider}' unavailable, falling back to OpenAI")
                self.llm = OpenAIProvider(model=llm_model, api_key=openai_api_key)
        else:
            # Already an LLMProvider instance
            self.llm = llm_provider

        self.llm_model = llm_model

    def observe_market(self, market_id: int) -> dict:
        """Read current market state including question, price, and prediction history."""
        market = self.client.get_market(market_id)
        predictions = self.client.get_predictions(market_id)

        history = []
        for p in predictions:
            history.append({
                "predictor": p["predictor"][:10] + "...",
                "probability": round(p["probability"] / WAD, 4),
                "price_before": round(p["price_before"] / WAD, 4),
                "price_after": round(p["price_after"] / WAD, 4),
            })

        return {
            "question": market["question"],
            "current_price": round(market["current_price"] / WAD, 4),
            "prediction_count": market["prediction_count"],
            "resolved": market["resolved"],
            "history": history,
        }

    def get_system_prompt(self) -> str:
        """Return the system prompt for this agent."""
        return self.system_prompt

    def reason(self, market_state: dict) -> dict:
        """Use LLM to reason about the market and produce a probability."""
        system_prompt = self.get_system_prompt()

        user_prompt = f"""Market Question: {market_state['question']}
Current Market Price: {market_state['current_price']} (probability)
Number of Previous Predictions: {market_state['prediction_count']}
Prediction History: {json.dumps(market_state['history'], indent=2)}

Based on your analysis, what probability do you assign to this question?
Respond in JSON format:
{{"reasoning": "your reasoning here", "probability": 0.XX, "confidence": 0.XX}}

Rules:
- probability must be between 0.02 and 0.98
- confidence is how sure you are about your probability estimate (0-1)
- Be specific in your reasoning"""

        content = self.llm.chat(system_prompt, user_prompt)
        result = json.loads(content)

        # Clamp probability to valid range
        prob = max(0.02, min(0.98, float(result.get("probability", 0.5))))
        result["probability"] = prob

        return result

    def act(self, market_id: int, stake_amount: int) -> dict:
        """Full cycle: observe → reason → predict on-chain."""
        print(f"[{self.name}] Observing market {market_id}...")
        state = self.observe_market(market_id)

        if state["resolved"]:
            print(f"[{self.name}] Market already resolved.")
            return {"status": "resolved"}

        print(f"[{self.name}] Reasoning about: {state['question']}")
        reasoning = self.reason(state)
        prob = reasoning["probability"]
        print(f"[{self.name}] Prediction: {prob:.4f} (confidence: {reasoning.get('confidence', 'N/A')})")
        print(f"[{self.name}] Reasoning: {reasoning['reasoning'][:200]}...")

        # Convert to WAD and submit on-chain
        prob_wad = int(prob * WAD)
        prob_wad = max(int(0.01e18), min(int(0.99e18), prob_wad))

        print(f"[{self.name}] Submitting prediction on-chain...")
        receipt = self.client.predict(market_id, prob_wad, stake_amount)
        tx_hash = receipt["transactionHash"].hex()
        print(f"[{self.name}] TX: {tx_hash}")

        # Check if market resolved after this prediction
        market_info = self.client.get_market_info(market_id)
        resolved = market_info["resolved"]

        return {
            "status": "predicted",
            "probability": prob,
            "reasoning": reasoning["reasoning"],
            "confidence": reasoning.get("confidence"),
            "tx_hash": tx_hash,
            "market_resolved": resolved,
        }

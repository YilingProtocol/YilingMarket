"""
Yiling Protocol - Remote Agent Proxy
Wraps an external agent's webhook endpoint so it behaves like a local BaseAgent.
The orchestrator calls observe/reason/act on this proxy, and the proxy
forwards predict_request to the remote webhook and returns the response.
"""

import time
import json
import requests
from market_client import MarketClient, WAD


class RemoteAgent:
    """Proxy that makes a remote webhook-based agent look like a local BaseAgent."""

    def __init__(
        self,
        agent_id: str,
        name: str,
        webhook_url: str,
        wallet_address: str,
        market_client: MarketClient,
        timeout: float = 30.0,
    ):
        self.agent_id = agent_id
        self.name = name
        self.webhook_url = webhook_url
        self.wallet_address = wallet_address
        self.client = market_client
        self.address = wallet_address
        self.timeout = timeout

    def observe_market(self, market_id: int) -> dict:
        """Read current market state (same as BaseAgent)."""
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

    def reason(self, market_state: dict) -> dict:
        """Send market state to the remote webhook and get back a prediction.

        The webhook receives a POST with:
        {
            "event": "predict_request",
            "market_id": <int>,
            "question": <str>,
            "current_price": <float>,
            "prediction_history": [...],
            "deadline_seconds": 30
        }

        Expected response:
        {
            "probability": <float 0.02-0.98>,
            "reasoning": <str>,
            "confidence": <float 0-1>
        }
        """
        payload = {
            "event": "predict_request",
            "market_id": market_state.get("market_id"),
            "question": market_state["question"],
            "current_price": market_state["current_price"],
            "prediction_history": market_state["history"],
            "prediction_count": market_state["prediction_count"],
            "deadline_seconds": self.timeout,
        }

        try:
            resp = requests.post(
                self.webhook_url,
                json=payload,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            result = resp.json()
        except requests.Timeout:
            print(f"[{self.name}] Webhook timed out after {self.timeout}s")
            return {
                "probability": market_state["current_price"],
                "reasoning": f"Webhook timed out — defaulting to current price",
                "confidence": 0.0,
            }
        except requests.RequestException as e:
            print(f"[{self.name}] Webhook error: {e}")
            return {
                "probability": market_state["current_price"],
                "reasoning": f"Webhook error: {e} — defaulting to current price",
                "confidence": 0.0,
            }

        # Validate and clamp
        prob = float(result.get("probability", market_state["current_price"]))
        prob = max(0.02, min(0.98, prob))

        return {
            "probability": prob,
            "reasoning": result.get("reasoning", "No reasoning provided"),
            "confidence": float(result.get("confidence", 0.5)),
        }

    def act(self, market_id: int, stake_amount: int) -> dict:
        """Full cycle: observe → reason → submit on-chain.
        Note: The remote agent only provides the probability.
        The actual on-chain TX is submitted by a shared signing key,
        NOT the remote agent's wallet (they don't hold private keys here)."""
        state = self.observe_market(market_id)

        if state["resolved"]:
            return {"status": "resolved"}

        state["market_id"] = market_id
        reasoning = self.reason(state)
        prob = reasoning["probability"]

        # Submit on-chain using the shared market client
        prob_wad = int(prob * WAD)
        prob_wad = max(int(0.01e18), min(int(0.99e18), prob_wad))

        t0 = time.time()
        receipt = self.client.predict(market_id, prob_wad, stake_amount)
        confirm_time = round(time.time() - t0, 1)

        tx_hash = receipt["transactionHash"].hex()

        market_info = self.client.get_market_info(market_id)
        resolved = market_info["resolved"]

        return {
            "status": "predicted",
            "probability": prob,
            "reasoning": reasoning["reasoning"],
            "confidence": reasoning.get("confidence"),
            "tx_hash": tx_hash,
            "confirm_time": confirm_time,
            "market_resolved": resolved,
        }
